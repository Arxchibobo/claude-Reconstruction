/**
 * Art Task Revenue Sync Logic
 *
 * 从 MCP 获取数据，计算 Bot 收入指标，写入 Supabase
 */

import { db, botRevenueSnapshots, dailySummarySnapshots } from "./db/index.js";
import { executeSQL } from "./mcp/client.js";

// ============================================================================
// Types
// ============================================================================

// Source data types (from MCP/Bytebase external database)
// 这些类型来自外部数据库，无法从我们的 schema 推导
interface ArtTask {
  user_id: number;
  bot_id: number;
  bot_name: string;
  slug_id: string;
  status: string;
  created_date: string;
}

interface StripeOrder {
  user_id: number;
  article_id: string;
  amount: number;
  status: string;
  created_date: string;
}

interface PayPalOrder {
  user_id: number;
  amount: number;
  status: string;
  biz_type: string;
  extra: string;
  created_date: string;
}

interface EnergyUsageRow {
  bot_id: number;
  user_id: number;
  total_energy: string;
}

// Drizzle inferred types
type BotRevenueInsert = typeof botRevenueSnapshots.$inferInsert;
type DailySummaryInsert = typeof dailySummarySnapshots.$inferInsert;

// ============================================================================
// Data Fetching
// ============================================================================

async function getArtTasks(
  startDate: string,
  endDate: string
): Promise<ArtTask[]> {
  const sql = `
    SELECT user_id, bot_id, bot_name, slug_id, status, created_date
    FROM art_task
    WHERE status = 'done'
    AND created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'
    ORDER BY created_date ASC
  `;
  return executeSQL<ArtTask>(sql);
}

async function getStripeOrders(
  startDate: string,
  endDate: string
): Promise<StripeOrder[]> {
  const sql = `
    SELECT user_id, article_id, amount, status, created_date
    FROM user_subscription_stripe_orders
    WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'
  `;
  return executeSQL<StripeOrder>(sql);
}

async function getPayPalOrders(
  startDate: string,
  endDate: string
): Promise<PayPalOrder[]> {
  const sql = `
    SELECT user_id, amount, status, biz_type, extra, created_date
    FROM user_subscription_paypal_orders
    WHERE status = 'ORDER_STATUS_SUCCESS'
    AND created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'
  `;
  const rows = await executeSQL<PayPalOrder>(sql);

  // 修正 ENERGY 类型订单的金额
  return rows
    .map((order) => {
      if (order.biz_type === "ENERGY" && order.amount === 0) {
        try {
          const extra = JSON.parse(order.extra);
          const energy = parseInt(extra.energy || "0");
          if (energy === 500) order.amount = 6.99;
          else if (energy === 2000) order.amount = 20.99;
        } catch {
          // ignore parse error
        }
      }
      return order;
    })
    .filter((order) => order.amount > 0);
}

async function getBotEnergyUsageByUser(
  startDate: string,
  endDate: string
): Promise<Map<number, Map<number, number>>> {
  const sql = `
    SELECT bot_id, user_id, SUM(energy) as total_energy
    FROM user_energy_bot_usage_logs
    WHERE created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'
    GROUP BY bot_id, user_id
  `;
  const rows = await executeSQL<EnergyUsageRow>(sql);

  const usageMap = new Map<number, Map<number, number>>();
  for (const row of rows) {
    const botId = row.bot_id;
    const userId = row.user_id;
    const energy = parseFloat(row.total_energy || "0");

    if (!usageMap.has(botId)) {
      usageMap.set(botId, new Map());
    }
    usageMap.get(botId)!.set(userId, energy);
  }

  return usageMap;
}

// ============================================================================
// Calculation Logic
// ============================================================================

function calculateBotUsage(
  tasks: ArtTask[]
): Map<string, { slug_id: string; bot_name: string; bot_id: number; task_count: number; unique_users: number }> {
  const usageMap = new Map<
    string,
    { slug_id: string; bot_name: string; bot_id: number; task_count: number; unique_users: number }
  >();

  for (const task of tasks) {
    const key = task.slug_id;
    if (!usageMap.has(key)) {
      usageMap.set(key, {
        slug_id: task.slug_id,
        bot_name: task.bot_name,
        bot_id: task.bot_id,
        task_count: 0,
        unique_users: 0,
      });
    }
    usageMap.get(key)!.task_count++;
  }

  for (const [slug_id, usage] of usageMap) {
    const uniqueUsers = new Set(
      tasks.filter((t) => t.slug_id === slug_id).map((t) => t.user_id)
    );
    usage.unique_users = uniqueUsers.size;
  }

  return usageMap;
}

function calculateUserSpending(
  stripeOrders: StripeOrder[],
  paypalOrders: PayPalOrder[]
): Map<number, number> {
  const spendingMap = new Map<number, number>();

  for (const order of stripeOrders) {
    spendingMap.set(
      order.user_id,
      (spendingMap.get(order.user_id) || 0) + order.amount
    );
  }

  for (const order of paypalOrders) {
    spendingMap.set(
      order.user_id,
      (spendingMap.get(order.user_id) || 0) + order.amount
    );
  }

  return spendingMap;
}

function calculateBotRevenueLastTouch(
  tasks: ArtTask[],
  stripeOrders: StripeOrder[],
  paypalOrders: PayPalOrder[]
): Map<string, number> {
  const revenueMap = new Map<string, number>();
  const sortedTasks = tasks.sort(
    (a, b) =>
      new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );

  const allOrders = [
    ...stripeOrders.map((o) => ({ ...o, source: "stripe" as const })),
    ...paypalOrders.map((o) => ({ ...o, source: "paypal" as const })),
  ];

  for (const order of allOrders) {
    const tasksBeforeOrder = sortedTasks.filter(
      (t) =>
        t.user_id === order.user_id &&
        new Date(t.created_date) <= new Date(order.created_date)
    );

    if (tasksBeforeOrder.length > 0) {
      const lastTask = tasksBeforeOrder[tasksBeforeOrder.length - 1];
      revenueMap.set(
        lastTask.slug_id,
        (revenueMap.get(lastTask.slug_id) || 0) + order.amount
      );
    }
  }

  return revenueMap;
}

function calculateBotRevenueLastTouchOptimized(
  tasks: ArtTask[],
  stripeOrders: StripeOrder[],
  paypalOrders: PayPalOrder[]
): Map<string, number> {
  const revenueMap = new Map<string, number>();
  const sortedTasks = tasks.sort(
    (a, b) =>
      new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );

  const allOrders = [
    ...stripeOrders.map((o) => ({ ...o, source: "stripe" as const })),
    ...paypalOrders.map((o) => ({ ...o, source: "paypal" as const })),
  ];

  for (const order of allOrders) {
    const tasksBeforeOrder = sortedTasks.filter(
      (t) =>
        t.user_id === order.user_id &&
        new Date(t.created_date) <= new Date(order.created_date)
    );

    if (tasksBeforeOrder.length > 0) {
      const lastTask = tasksBeforeOrder[tasksBeforeOrder.length - 1];
      revenueMap.set(
        lastTask.slug_id,
        (revenueMap.get(lastTask.slug_id) || 0) + order.amount
      );
    } else {
      const tasksAfterOrder = sortedTasks.filter(
        (t) =>
          t.user_id === order.user_id &&
          new Date(t.created_date) > new Date(order.created_date)
      );

      if (tasksAfterOrder.length > 0) {
        const firstTask = tasksAfterOrder[0];
        revenueMap.set(
          firstTask.slug_id,
          (revenueMap.get(firstTask.slug_id) || 0) + order.amount
        );
      }
    }
  }

  return revenueMap;
}

interface BotRevenueCalcResult {
  revenueProportional: number;
  revenueLastTouch: number;
  revenueLastTouchOptimized: number;
  paidUserTasks: number;
  freeUserTasks: number;
  energyCost: number;
  paidUserEnergy: number;
  freeUserEnergy: number;
}

function calculateBotRevenue(
  tasks: ArtTask[],
  usageMap: Map<string, { slug_id: string; bot_name: string; bot_id: number; task_count: number; unique_users: number }>,
  spendingMap: Map<number, number>,
  lastTouchRevenue: Map<string, number>,
  lastTouchRevenueOptimized: Map<string, number>,
  energyUsageByUser: Map<number, Map<number, number>>
): Map<string, BotRevenueCalcResult> {
  const userBotUsage = new Map<number, Map<string, number>>();
  for (const task of tasks) {
    if (!userBotUsage.has(task.user_id)) {
      userBotUsage.set(task.user_id, new Map());
    }
    const botUsage = userBotUsage.get(task.user_id)!;
    botUsage.set(task.slug_id, (botUsage.get(task.slug_id) || 0) + 1);
  }

  const paidUsers = new Set(spendingMap.keys());
  const resultMap = new Map<string, BotRevenueCalcResult>();

  for (const [slug_id, usage] of usageMap) {
    let totalEnergy = 0;
    let paidUserEnergy = 0;
    let freeUserEnergy = 0;

    if (energyUsageByUser.has(usage.bot_id)) {
      const userEnergyMap = energyUsageByUser.get(usage.bot_id)!;
      for (const [userId, energy] of userEnergyMap) {
        totalEnergy += energy;
        if (paidUsers.has(userId)) {
          paidUserEnergy += energy;
        } else {
          freeUserEnergy += energy;
        }
      }
    }

    resultMap.set(slug_id, {
      revenueProportional: 0,
      revenueLastTouch: lastTouchRevenue.get(slug_id) || 0,
      revenueLastTouchOptimized: lastTouchRevenueOptimized.get(slug_id) || 0,
      paidUserTasks: 0,
      freeUserTasks: 0,
      energyCost: totalEnergy * 0.01,
      paidUserEnergy,
      freeUserEnergy,
    });
  }

  // 统计付费/免费用户任务数
  for (const task of tasks) {
    const result = resultMap.get(task.slug_id);
    if (result) {
      if (paidUsers.has(task.user_id)) {
        result.paidUserTasks++;
      } else {
        result.freeUserTasks++;
      }
    }
  }

  // 按使用比例分配收入
  for (const [user_id, totalSpending] of spendingMap) {
    const botUsage = userBotUsage.get(user_id);
    if (!botUsage) continue;

    const totalTasks = Array.from(botUsage.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    for (const [slug_id, taskCount] of botUsage) {
      const result = resultMap.get(slug_id);
      if (result) {
        result.revenueProportional += totalSpending * (taskCount / totalTasks);
      }
    }
  }

  return resultMap;
}

// ============================================================================
// Main Sync Function
// ============================================================================

export interface SyncResult {
  success: boolean;
  snapshot_date: string;
  period: { start: string; end: string };
  stats: {
    total_tasks: number;
    total_bots: number;
    total_paying_users: number;
    total_revenue_lt_optimized: string;
  };
}

export async function generateRevenueSnapshot(
  startDate?: string,
  endDate?: string
): Promise<SyncResult> {
  // 计算日期范围 (默认昨天，东八区)
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset);
  const beijingYesterday = new Date(beijingNow.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = beijingYesterday.toISOString().split("T")[0];

  const end = endDate ? new Date(endDate) : new Date(yesterdayStr);
  const start = startDate ? new Date(startDate) : new Date(yesterdayStr);

  const startDateStr = start.toISOString().split("T")[0];
  const endDateStr = end.toISOString().split("T")[0];
  const snapshotDate = endDateStr;

  console.log(`[revenue] Period: ${startDateStr} to ${endDateStr}`);

  // 1. 获取数据 (串行执行，便于调试)
  console.log("[revenue] Fetching art tasks...");
  const tasks = await getArtTasks(startDateStr, endDateStr);
  console.log("[revenue] Got", tasks.length, "tasks");

  console.log("[revenue] Fetching stripe orders...");
  const stripeOrders = await getStripeOrders(startDateStr, endDateStr);
  console.log("[revenue] Got", stripeOrders.length, "stripe orders");

  console.log("[revenue] Fetching paypal orders...");
  const paypalOrders = await getPayPalOrders(startDateStr, endDateStr);
  console.log("[revenue] Got", paypalOrders.length, "paypal orders");

  console.log("[revenue] Fetching energy usage...");
  const energyUsageByUser = await getBotEnergyUsageByUser(startDateStr, endDateStr);
  console.log("[revenue] Got energy usage for", energyUsageByUser.size, "bots");

  console.log(
    `[sync-art-revenue] Data: ${tasks.length} tasks, ${stripeOrders.length} stripe, ${paypalOrders.length} paypal`
  );

  // 2. 计算指标
  const usageMap = calculateBotUsage(tasks);
  const spendingMap = calculateUserSpending(stripeOrders, paypalOrders);
  const lastTouchRevenue = calculateBotRevenueLastTouch(
    tasks,
    stripeOrders,
    paypalOrders
  );
  const lastTouchRevenueOptimized = calculateBotRevenueLastTouchOptimized(
    tasks,
    stripeOrders,
    paypalOrders
  );
  const revenueCalcMap = calculateBotRevenue(
    tasks,
    usageMap,
    spendingMap,
    lastTouchRevenue,
    lastTouchRevenueOptimized,
    energyUsageByUser
  );

  // 计算 bot 首次任务日期
  const botFirstTaskDate = new Map<string, string>();
  for (const task of tasks) {
    if (!botFirstTaskDate.has(task.slug_id)) {
      botFirstTaskDate.set(task.slug_id, task.created_date);
    }
  }

  const currentTime = new Date();

  console.log(`[revenue] Calculated ${usageMap.size} bots`);

  // 3. 写入 bot_revenue_snapshots
  for (const [slugId, usage] of usageMap) {
    const calc = revenueCalcMap.get(slugId)!;
    const firstTaskDate = botFirstTaskDate.get(slugId) || currentTime.toISOString();
    const daysOnline = Math.floor(
      (currentTime.getTime() - new Date(firstTaskDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const paidUserPercentage =
      usage.task_count > 0
        ? (calc.paidUserTasks / usage.task_count) * 100
        : 0;
    const revenueCostRatio =
      calc.energyCost > 0 ? calc.revenueLastTouchOptimized / calc.energyCost : 0;

    const snapshot: BotRevenueInsert = {
      snapshotDate,
      periodStart: new Date(startDateStr),
      periodEnd: new Date(endDateStr),
      slugId: usage.slug_id,
      botName: usage.bot_name,
      botId: usage.bot_id,
      taskCount: usage.task_count,
      uniqueUsers: usage.unique_users,
      paidUserTasks: calc.paidUserTasks,
      freeUserTasks: calc.freeUserTasks,
      paidUserPercentage: paidUserPercentage.toFixed(2),
      revenueProportional: calc.revenueProportional.toFixed(2),
      revenueLastTouch: calc.revenueLastTouch.toFixed(2),
      revenueLastTouchOptimized: calc.revenueLastTouchOptimized.toFixed(2),
      energyCost: calc.energyCost.toFixed(2),
      paidUserEnergy: calc.paidUserEnergy.toFixed(2),
      freeUserEnergy: calc.freeUserEnergy.toFixed(2),
      revenueCostRatio: revenueCostRatio.toFixed(2),
      daysOnline,
      firstTaskDate: new Date(firstTaskDate),
    };

    await db
      .insert(botRevenueSnapshots)
      .values(snapshot)
      .onConflictDoUpdate({
        target: [botRevenueSnapshots.snapshotDate, botRevenueSnapshots.slugId],
        set: {
          botName: snapshot.botName,
          botId: snapshot.botId,
          taskCount: snapshot.taskCount,
          uniqueUsers: snapshot.uniqueUsers,
          paidUserTasks: snapshot.paidUserTasks,
          freeUserTasks: snapshot.freeUserTasks,
          paidUserPercentage: snapshot.paidUserPercentage,
          revenueProportional: snapshot.revenueProportional,
          revenueLastTouch: snapshot.revenueLastTouch,
          revenueLastTouchOptimized: snapshot.revenueLastTouchOptimized,
          energyCost: snapshot.energyCost,
          paidUserEnergy: snapshot.paidUserEnergy,
          freeUserEnergy: snapshot.freeUserEnergy,
          revenueCostRatio: snapshot.revenueCostRatio,
          daysOnline: snapshot.daysOnline,
          firstTaskDate: snapshot.firstTaskDate,
        },
      });
  }

  // 4. 汇总指标
  let totalRevenueProportional = 0;
  let totalRevenueLastTouch = 0;
  let totalRevenueLastTouchOptimized = 0;
  let totalEnergyCost = 0;

  for (const calc of revenueCalcMap.values()) {
    totalRevenueProportional += calc.revenueProportional;
    totalRevenueLastTouch += calc.revenueLastTouch;
    totalRevenueLastTouchOptimized += calc.revenueLastTouchOptimized;
    totalEnergyCost += calc.energyCost;
  }

  // 5. 写入 daily_summary_snapshots
  const summary: DailySummaryInsert = {
    snapshotDate,
    periodStart: new Date(startDateStr),
    periodEnd: new Date(endDateStr),
    totalTasks: tasks.length,
    totalBots: usageMap.size,
    totalUniqueUsers: new Set(tasks.map((t) => t.user_id)).size,
    totalPayingUsers: spendingMap.size,
    totalRevenueProportional: totalRevenueProportional.toFixed(2),
    totalRevenueLastTouch: totalRevenueLastTouch.toFixed(2),
    totalRevenueLastTouchOptimized: totalRevenueLastTouchOptimized.toFixed(2),
    totalEnergyCost: totalEnergyCost.toFixed(2),
    stripeOrderCount: stripeOrders.length,
    paypalOrderCount: paypalOrders.length,
  };

  await db
    .insert(dailySummarySnapshots)
    .values(summary)
    .onConflictDoUpdate({
      target: dailySummarySnapshots.snapshotDate,
      set: {
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        totalTasks: summary.totalTasks,
        totalBots: summary.totalBots,
        totalUniqueUsers: summary.totalUniqueUsers,
        totalPayingUsers: summary.totalPayingUsers,
        totalRevenueProportional: summary.totalRevenueProportional,
        totalRevenueLastTouch: summary.totalRevenueLastTouch,
        totalRevenueLastTouchOptimized: summary.totalRevenueLastTouchOptimized,
        totalEnergyCost: summary.totalEnergyCost,
        stripeOrderCount: summary.stripeOrderCount,
        paypalOrderCount: summary.paypalOrderCount,
      },
    });

  console.log(`[revenue] Success: ${usageMap.size} bots synced`);

  return {
    success: true,
    snapshot_date: snapshotDate,
    period: { start: startDateStr, end: endDateStr },
    stats: {
      total_tasks: tasks.length,
      total_bots: usageMap.size,
      total_paying_users: spendingMap.size,
      total_revenue_lt_optimized: totalRevenueLastTouchOptimized.toFixed(2),
    },
  };
}

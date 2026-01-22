/**
 * Alert Data Queries
 *
 * 两种报警：
 * 1. 每日简报 - 整体概览 + 异常检测
 * 2. 每周盈亏分析 - 亏损 bot + 盈亏状态变化
 */

import { db, botRevenueSnapshots, dailySummarySnapshots } from "./db/index.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

// 变化数据
export interface ChangeData {
  value: number;
  dodChange: number;      // 环比（vs 昨日）
  wowChange: number;      // 同比（vs 上周同期）
}

// 每日简报
export interface DailySummary {
  date: string;

  // 整体概览（带变化 - 全部环比+同比）
  totalRevenue: number;
  totalRevenueChange: ChangeData;  // 总收入环比+同比

  paidUserCost: number;
  paidUserCostChange: ChangeData;  // 付费成本环比+同比
  freeUserCost: number;
  freeUserCostChange: ChangeData;  // 免费成本环比+同比

  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  grossMarginPercentChange: ChangeData;  // 毛利率环比+同比

  dau: number;  // 日活跃用户数（发起生成任务的用户）
  dauChange: ChangeData;  // DAU 环比+同比

  activeBots: number;
  totalTasks: number;
  totalTasksChange: ChangeData;

  // 今日亏损 Bot
  losingBotsCount: number;
  losingBotsTotalLoss: number;
  losingBots: LosingBot[];  // 亏损 Bot 详情

  // 今日被白嫖严重（免费成本占比>80%）
  heavyFreeUseBots: HeavyFreeUseBot[];
  heavyFreeUseBotsTotal: number;  // 总数量（不限制）

  // Top 5 高低毛利率 Bot
  topHighMarginBots: ProfitableBot[];  // 高毛利率 Top5
  topLowMarginBots: LosingBot[];  // 低毛利率 Top5
}

export interface HeavyFreeUseBot {
  slugId: string;
  botName: string;
  freeUserCost: number;
  paidUserCost: number;
  totalCost: number;
  freeUserCostPercent: number;  // 免费成本占比
  revenue: number;
  grossMarginPercent: number;
  // 变化数据
  revenueDodChange?: number;  // 收入环比变化%
  revenueWowChange?: number;  // 收入同比变化%
}

// 每周盈亏分析
export interface WeeklyAnalysis {
  weekStart: string;
  weekEnd: string;
  previousWeekStart: string;
  previousWeekEnd: string;

  // 持续亏损 bot（连续2周亏损）
  continuouslyLosingBots: LosingBot[];
  continuouslyLosingTotalLoss: number;

  // 白嫖严重 bot（免费成本占比>80%）
  heavyFreeUseBots: HeavyFreeUseBot[];

  // 持续盈利 bot（连续2周盈利）
  continuouslyProfitableBots: ProfitableBot[];

  // 盈亏状态变化
  turnedLosing: StatusChangeBot[];
  turnedProfitable: StatusChangeBot[];
}

export interface LosingBot {
  slugId: string;
  botName: string;
  revenue: number;
  totalCost: number;
  paidUserCost: number;
  freeUserCost: number;
  grossMarginPercent: number;
  freeTaskPercent: number;
  loss: number;  // 亏损金额
  // 变化数据
  revenueDodChange?: number;  // 收入环比变化%
  revenueWowChange?: number;  // 收入同比变化%
}

export interface StatusChangeBot {
  slugId: string;
  botName: string;
  previousGrossMarginPercent: number;
  currentGrossMarginPercent: number;
  revenue: number;
  totalCost: number;
  paidUserCost: number;
  freeUserCost: number;
}

export interface ProfitableBot {
  slugId: string;
  botName: string;
  revenue: number;
  totalCost: number;
  paidUserCost: number;
  freeUserCost: number;
  grossMarginPercent: number;
  grossProfit: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getBeijingDate(offsetDays = 0): string {
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset);
  const targetDate = new Date(beijingNow.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().split("T")[0];
}

function getWeekRange(weeksAgo = 0): { start: string; end: string } {
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset);

  // 找到本周一
  const dayOfWeek = beijingNow.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(beijingNow.getTime() - daysToMonday * 24 * 60 * 60 * 1000);

  // 调整到指定周
  const targetMonday = new Date(monday.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
  const targetSunday = new Date(targetMonday.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    start: targetMonday.toISOString().split("T")[0],
    end: targetSunday.toISOString().split("T")[0],
  };
}

/**
 * 计算毛利率百分比：(收入 - 成本) / 收入 * 100
 */
function calculateGrossMarginPercent(revenue: number, cost: number): number {
  if (revenue === 0) return cost > 0 ? -Infinity : 0;
  return ((revenue - cost) / revenue) * 100;
}

/**
 * 计算变化百分比
 */
function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? Infinity : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * 获取指定日期偏移的日期字符串
 */
function getDateWithOffset(baseDate: string, offsetDays: number): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

/**
 * 获取某天的汇总数据（用于对比）
 */
async function getDayStats(targetDate: string): Promise<{
  totalRevenue: number;
  totalCost: number;
  paidUserCost: number;
  freeUserCost: number;
  totalTasks: number;
  dau: number;
  grossMarginPercent: number;
  botStats: Map<string, { revenue: number; cost: number }>;
}> {
  const ENERGY_TO_USD = 0.01;

  const snapshots = await db
    .select()
    .from(botRevenueSnapshots)
    .where(eq(botRevenueSnapshots.snapshotDate, targetDate));

  let totalRevenue = 0;
  let paidUserCost = 0;
  let freeUserCost = 0;
  let totalTasks = 0;
  const botStats = new Map<string, { revenue: number; cost: number }>();

  for (const bot of snapshots) {
    const revenue = Number(bot.revenueProportional) || 0;
    const paidCost = (Number(bot.paidUserEnergy) || 0) * ENERGY_TO_USD;
    const freeCost = (Number(bot.freeUserEnergy) || 0) * ENERGY_TO_USD;

    totalRevenue += revenue;
    paidUserCost += paidCost;
    freeUserCost += freeCost;
    totalTasks += bot.taskCount || 0;

    botStats.set(bot.slugId, {
      revenue,
      cost: paidCost + freeCost,
    });
  }

  // 从 daily_summary_snapshots 获取 DAU（发起生成任务的用户数）
  const dailySummary = await db
    .select()
    .from(dailySummarySnapshots)
    .where(eq(dailySummarySnapshots.snapshotDate, targetDate))
    .limit(1);

  const dau = dailySummary.length > 0 ? dailySummary[0].totalUniqueUsers : 0;

  const totalCost = paidUserCost + freeUserCost;
  const grossMarginPercent = calculateGrossMarginPercent(totalRevenue, totalCost);

  return {
    totalRevenue,
    totalCost,
    paidUserCost,
    freeUserCost,
    totalTasks,
    dau,
    grossMarginPercent: isFinite(grossMarginPercent) ? grossMarginPercent : 0,
    botStats,
  };
}

// ============================================================================
// 每日简报
// ============================================================================

/**
 * 获取每日简报数据
 */
export async function getDailySummary(targetDate?: string): Promise<DailySummary> {
  const date = targetDate || getBeijingDate(-1); // 默认昨天

  console.log(`[daily-summary] Fetching data for ${date}`);

  // 获取对比日期
  const yesterdayDate = getDateWithOffset(date, -1);  // 前一天（环比）
  const lastWeekDate = getDateWithOffset(date, -7);   // 上周同期（同比）

  // 并行获取当天和对比数据
  const [currentStats, yesterdayStats, lastWeekStats] = await Promise.all([
    getDayStats(date),
    getDayStats(yesterdayDate),
    getDayStats(lastWeekDate),
  ]);

  console.log(`[daily-summary] Comparison: ${date} vs ${yesterdayDate} (DoD) vs ${lastWeekDate} (WoW)`);

  // 获取当天的 bot 数据（用于详细分析）
  const currentSnapshots = await db
    .select()
    .from(botRevenueSnapshots)
    .where(eq(botRevenueSnapshots.snapshotDate, date));

  // 计算整体概览
  const ENERGY_TO_USD = 0.01;

  const totalRevenue = currentStats.totalRevenue;
  const paidUserCost = currentStats.paidUserCost;
  const freeUserCost = currentStats.freeUserCost;
  const totalTasks = currentStats.totalTasks;
  const dau = currentStats.dau;

  const totalCost = paidUserCost + freeUserCost;
  const grossProfit = totalRevenue - totalCost;
  const grossMarginPercent = currentStats.grossMarginPercent;

  // 计算变化数据（全部环比+同比）
  const totalRevenueChange: ChangeData = {
    value: totalRevenue,
    dodChange: calculateChangePercent(totalRevenue, yesterdayStats.totalRevenue),
    wowChange: calculateChangePercent(totalRevenue, lastWeekStats.totalRevenue),
  };

  const paidUserCostChange: ChangeData = {
    value: paidUserCost,
    dodChange: calculateChangePercent(paidUserCost, yesterdayStats.paidUserCost),
    wowChange: calculateChangePercent(paidUserCost, lastWeekStats.paidUserCost),
  };

  const freeUserCostChange: ChangeData = {
    value: freeUserCost,
    dodChange: calculateChangePercent(freeUserCost, yesterdayStats.freeUserCost),
    wowChange: calculateChangePercent(freeUserCost, lastWeekStats.freeUserCost),
  };

  const grossMarginPercentChange: ChangeData = {
    value: grossMarginPercent,
    dodChange: grossMarginPercent - yesterdayStats.grossMarginPercent,  // 百分点变化，不是百分比变化
    wowChange: grossMarginPercent - lastWeekStats.grossMarginPercent,
  };

  const dauChange: ChangeData = {
    value: dau,
    dodChange: calculateChangePercent(dau, yesterdayStats.dau),
    wowChange: calculateChangePercent(dau, lastWeekStats.dau),
  };

  const totalTasksChange: ChangeData = {
    value: totalTasks,
    dodChange: calculateChangePercent(totalTasks, yesterdayStats.totalTasks),
    wowChange: calculateChangePercent(totalTasks, lastWeekStats.totalTasks),
  };

  // 计算亏损 bot 和 白嫖严重 bot
  const losingBots: LosingBot[] = [];
  let losingBotsTotalLoss = 0;
  const heavyFreeUseBots: HeavyFreeUseBot[] = [];

  for (const bot of currentSnapshots) {
    const revenue = Number(bot.revenueProportional) || 0;
    const botPaidCost = (Number(bot.paidUserEnergy) || 0) * ENERGY_TO_USD;
    const botFreeCost = (Number(bot.freeUserEnergy) || 0) * ENERGY_TO_USD;
    const botTotalCost = botPaidCost + botFreeCost;

    // 只关注有一定成本的 bot（至少 $10）
    if (botTotalCost < 10) continue;

    const botGrossMargin = calculateGrossMarginPercent(revenue, botTotalCost);

    // 获取该 Bot 的对比数据
    const yesterdayBotStats = yesterdayStats.botStats.get(bot.slugId);
    const lastWeekBotStats = lastWeekStats.botStats.get(bot.slugId);
    const revenueDodChange = yesterdayBotStats
      ? calculateChangePercent(revenue, yesterdayBotStats.revenue)
      : undefined;
    const revenueWowChange = lastWeekBotStats
      ? calculateChangePercent(revenue, lastWeekBotStats.revenue)
      : undefined;

    // 亏损 bot
    if (botGrossMargin < 0) {
      const loss = botTotalCost - revenue;
      losingBotsTotalLoss += loss;
      const totalTaskCount = bot.taskCount || 1;
      const freeTaskPercent = ((bot.freeUserTasks || 0) / totalTaskCount) * 100;

      losingBots.push({
        slugId: bot.slugId,
        botName: bot.botName,
        revenue,
        totalCost: botTotalCost,
        paidUserCost: botPaidCost,
        freeUserCost: botFreeCost,
        grossMarginPercent: isFinite(botGrossMargin) ? botGrossMargin : -100,
        freeTaskPercent,
        loss,
        revenueDodChange,
        revenueWowChange,
      });
    }

    // 白嫖严重：免费成本占比 > 80%
    const freeUserCostPercent = (botFreeCost / botTotalCost) * 100;
    if (freeUserCostPercent > 80) {
      heavyFreeUseBots.push({
        slugId: bot.slugId,
        botName: bot.botName,
        freeUserCost: botFreeCost,
        paidUserCost: botPaidCost,
        totalCost: botTotalCost,
        freeUserCostPercent,
        revenue,
        grossMarginPercent: isFinite(botGrossMargin) ? botGrossMargin : -100,
        revenueDodChange,
        revenueWowChange,
      });
    }
  }

  // 按亏损金额排序
  losingBots.sort((a, b) => b.loss - a.loss);
  // 按免费成本占比排序
  heavyFreeUseBots.sort((a, b) => b.freeUserCostPercent - a.freeUserCostPercent);

  // 计算 Top5 高低毛利率 Bot
  const allBotsWithRevenue: Array<{
    bot: typeof currentSnapshots[0];
    revenue: number;
    cost: number;
    grossMargin: number;
  }> = [];

  for (const bot of currentSnapshots) {
    const revenue = Number(bot.revenueProportional) || 0;
    const botPaidCost = (Number(bot.paidUserEnergy) || 0) * ENERGY_TO_USD;
    const botFreeCost = (Number(bot.freeUserEnergy) || 0) * ENERGY_TO_USD;
    const cost = botPaidCost + botFreeCost;

    if (cost < 10) continue;  // 只关注有一定成本的 bot

    const grossMargin = calculateGrossMarginPercent(revenue, cost);
    allBotsWithRevenue.push({ bot, revenue, cost, grossMargin });
  }

  // 计算收入中位数
  const revenues = allBotsWithRevenue.map((b) => b.revenue).sort((a, b) => a - b);
  const medianRevenue = revenues.length > 0
    ? revenues[Math.floor(revenues.length / 2)]
    : 0;

  // 高毛利率 Top5（只包含毛利率为正的 Bot）
  const profitableBots = allBotsWithRevenue.filter((b) => b.grossMargin > 0);
  const sortedByMargin = [...profitableBots].sort((a, b) => b.grossMargin - a.grossMargin);
  const topHighMarginBots: ProfitableBot[] = sortedByMargin.slice(0, 5).map((b) => ({
    slugId: b.bot.slugId,
    botName: b.bot.botName,
    revenue: b.revenue,
    totalCost: b.cost,
    paidUserCost: (Number(b.bot.paidUserEnergy) || 0) * ENERGY_TO_USD,
    freeUserCost: (Number(b.bot.freeUserEnergy) || 0) * ENERGY_TO_USD,
    grossMarginPercent: isFinite(b.grossMargin) ? b.grossMargin : 0,
    grossProfit: b.revenue - b.cost,
  }));

  // 低毛利率 Top5
  allBotsWithRevenue.sort((a, b) => a.grossMargin - b.grossMargin);
  const topLowMarginBots: LosingBot[] = allBotsWithRevenue.slice(0, 5).map((b) => {
    const totalTaskCount = b.bot.taskCount || 1;
    const freeTaskPercent = ((b.bot.freeUserTasks || 0) / totalTaskCount) * 100;
    return {
      slugId: b.bot.slugId,
      botName: b.bot.botName,
      revenue: b.revenue,
      totalCost: b.cost,
      paidUserCost: (Number(b.bot.paidUserEnergy) || 0) * ENERGY_TO_USD,
      freeUserCost: (Number(b.bot.freeUserEnergy) || 0) * ENERGY_TO_USD,
      grossMarginPercent: isFinite(b.grossMargin) ? b.grossMargin : -100,
      freeTaskPercent,
      loss: Math.max(0, b.cost - b.revenue),
    };
  });

  return {
    date,
    totalRevenue,
    totalRevenueChange,
    paidUserCost,
    paidUserCostChange,
    freeUserCost,
    freeUserCostChange,
    totalCost,
    grossProfit,
    grossMarginPercent: isFinite(grossMarginPercent) ? grossMarginPercent : 0,
    grossMarginPercentChange,
    dau,
    dauChange,
    activeBots: currentSnapshots.length,
    totalTasks,
    totalTasksChange,
    losingBotsCount: losingBots.length,
    losingBotsTotalLoss,
    losingBots,
    heavyFreeUseBots,  // 不再限制数量
    heavyFreeUseBotsTotal: heavyFreeUseBots.length,
    topHighMarginBots,
    topLowMarginBots,
  };
}

// ============================================================================
// 每周盈亏分析
// ============================================================================

/**
 * 获取一周的汇总数据
 */
async function getWeeklyBotStats(startDate: string, endDate: string) {
  // 注意：paidUserEnergy/freeUserEnergy 存的是原始能量值，需要 * 0.01 转美元
  const ENERGY_TO_USD = 0.01;

  const snapshots = await db
    .select()
    .from(botRevenueSnapshots)
    .where(
      and(
        gte(botRevenueSnapshots.snapshotDate, startDate),
        lte(botRevenueSnapshots.snapshotDate, endDate)
      )
    );

  // 按 bot 汇总
  const botStats = new Map<string, {
    slugId: string;
    botName: string;
    revenue: number;
    paidUserCost: number;
    freeUserCost: number;
    taskCount: number;
    paidUserTasks: number;
    freeUserTasks: number;
  }>();

  for (const snapshot of snapshots) {
    const paidCost = (Number(snapshot.paidUserEnergy) || 0) * ENERGY_TO_USD;
    const freeCost = (Number(snapshot.freeUserEnergy) || 0) * ENERGY_TO_USD;

    const existing = botStats.get(snapshot.slugId);
    if (existing) {
      existing.revenue += Number(snapshot.revenueProportional) || 0;
      existing.paidUserCost += paidCost;
      existing.freeUserCost += freeCost;
      existing.taskCount += snapshot.taskCount || 0;
      existing.paidUserTasks += snapshot.paidUserTasks || 0;
      existing.freeUserTasks += snapshot.freeUserTasks || 0;
    } else {
      botStats.set(snapshot.slugId, {
        slugId: snapshot.slugId,
        botName: snapshot.botName,
        revenue: Number(snapshot.revenueProportional) || 0,
        paidUserCost: paidCost,
        freeUserCost: freeCost,
        taskCount: snapshot.taskCount || 0,
        paidUserTasks: snapshot.paidUserTasks || 0,
        freeUserTasks: snapshot.freeUserTasks || 0,
      });
    }
  }

  return botStats;
}

/**
 * 获取每周盈亏分析数据
 */
export async function getWeeklyAnalysis(): Promise<WeeklyAnalysis> {
  // 上周的数据（周一发送时，分析的是上周）
  const lastWeek = getWeekRange(1);
  const prevWeek = getWeekRange(2);

  console.log(`[weekly-analysis] Analyzing ${lastWeek.start} ~ ${lastWeek.end} vs ${prevWeek.start} ~ ${prevWeek.end}`);

  const [lastWeekStats, prevWeekStats] = await Promise.all([
    getWeeklyBotStats(lastWeek.start, lastWeek.end),
    getWeeklyBotStats(prevWeek.start, prevWeek.end),
  ]);

  // 持续亏损（连续2周亏损）
  const continuouslyLosingBots: LosingBot[] = [];
  let continuouslyLosingTotalLoss = 0;

  // 白嫖严重（免费成本占比>80%）
  const heavyFreeUseBots: HeavyFreeUseBot[] = [];

  // 持续盈利（连续2周盈利）
  const continuouslyProfitableBots: ProfitableBot[] = [];

  // 盈亏状态变化
  const turnedLosing: StatusChangeBot[] = [];
  const turnedProfitable: StatusChangeBot[] = [];

  for (const [slugId, currentStats] of lastWeekStats) {
    const currentTotalCost = currentStats.paidUserCost + currentStats.freeUserCost;

    // 只关注有成本的 bot（至少 $10）
    if (currentTotalCost < 10) continue;

    const currentGM = calculateGrossMarginPercent(currentStats.revenue, currentTotalCost);
    const totalTasks = currentStats.taskCount || 1;
    const freeTaskPercent = (currentStats.freeUserTasks / totalTasks) * 100;

    // 计算免费成本占比
    const freeUserCostPercent = (currentStats.freeUserCost / currentTotalCost) * 100;

    // 白嫖严重：免费成本占比 > 80%
    if (freeUserCostPercent > 80) {
      heavyFreeUseBots.push({
        slugId,
        botName: currentStats.botName,
        freeUserCost: currentStats.freeUserCost,
        paidUserCost: currentStats.paidUserCost,
        totalCost: currentTotalCost,
        freeUserCostPercent,
        revenue: currentStats.revenue,
        grossMarginPercent: isFinite(currentGM) ? currentGM : -100,
      });
    }

    // 检查上周数据
    const prevStats = prevWeekStats.get(slugId);
    if (!prevStats) continue;

    const prevTotalCost = prevStats.paidUserCost + prevStats.freeUserCost;
    if (prevTotalCost < 10) continue;

    const prevGM = calculateGrossMarginPercent(prevStats.revenue, prevTotalCost);

    // 持续亏损：连续2周毛利率 < 0
    if (currentGM < 0 && prevGM < 0) {
      const loss = currentTotalCost - currentStats.revenue;
      continuouslyLosingTotalLoss += loss;

      continuouslyLosingBots.push({
        slugId,
        botName: currentStats.botName,
        revenue: currentStats.revenue,
        totalCost: currentTotalCost,
        paidUserCost: currentStats.paidUserCost,
        freeUserCost: currentStats.freeUserCost,
        grossMarginPercent: isFinite(currentGM) ? currentGM : -100,
        freeTaskPercent,
        loss,
      });
    }
    // 持续盈利：连续2周毛利率 >= 0
    else if (currentGM >= 0 && prevGM >= 0) {
      continuouslyProfitableBots.push({
        slugId,
        botName: currentStats.botName,
        revenue: currentStats.revenue,
        totalCost: currentTotalCost,
        paidUserCost: currentStats.paidUserCost,
        freeUserCost: currentStats.freeUserCost,
        grossMarginPercent: isFinite(currentGM) ? currentGM : 0,
        grossProfit: currentStats.revenue - currentTotalCost,
      });
    }
    // 从盈利转亏损：上周毛利率>=0，本周<0
    else if (prevGM >= 0 && currentGM < 0) {
      turnedLosing.push({
        slugId,
        botName: currentStats.botName,
        previousGrossMarginPercent: isFinite(prevGM) ? prevGM : 0,
        currentGrossMarginPercent: isFinite(currentGM) ? currentGM : -100,
        revenue: currentStats.revenue,
        totalCost: currentTotalCost,
        paidUserCost: currentStats.paidUserCost,
        freeUserCost: currentStats.freeUserCost,
      });
    }
    // 从亏损转盈利：上周毛利率<0，本周>=0
    else if (prevGM < 0 && currentGM >= 0) {
      turnedProfitable.push({
        slugId,
        botName: currentStats.botName,
        previousGrossMarginPercent: isFinite(prevGM) ? prevGM : -100,
        currentGrossMarginPercent: isFinite(currentGM) ? currentGM : 0,
        revenue: currentStats.revenue,
        totalCost: currentTotalCost,
        paidUserCost: currentStats.paidUserCost,
        freeUserCost: currentStats.freeUserCost,
      });
    }
  }

  // 排序
  continuouslyLosingBots.sort((a, b) => (b.totalCost - b.revenue) - (a.totalCost - a.revenue));
  heavyFreeUseBots.sort((a, b) => b.freeUserCostPercent - a.freeUserCostPercent);
  continuouslyProfitableBots.sort((a, b) => b.grossProfit - a.grossProfit);
  turnedLosing.sort((a, b) => b.totalCost - a.totalCost);
  turnedProfitable.sort((a, b) => b.totalCost - a.totalCost);

  return {
    weekStart: lastWeek.start,
    weekEnd: lastWeek.end,
    previousWeekStart: prevWeek.start,
    previousWeekEnd: prevWeek.end,
    continuouslyLosingBots: continuouslyLosingBots.slice(0, 20),
    continuouslyLosingTotalLoss,
    heavyFreeUseBots: heavyFreeUseBots.slice(0, 20),
    continuouslyProfitableBots: continuouslyProfitableBots.slice(0, 20),
    turnedLosing: turnedLosing.slice(0, 10),
    turnedProfitable: turnedProfitable.slice(0, 10),
  };
}

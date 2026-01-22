/**
 * ============================================================================
 * Cost Snapshot 同步逻辑
 * ============================================================================
 *
 * 从 art_task 表聚合数据，写入 daaf_cost_daily_snapshots 和 daaf_free_cost_by_bot_snapshots
 *
 * 时间范围：北京时间 00:00-23:59
 * 成本单位：美元 (actual_energy_cost / 100)
 *
 * ============================================================================
 */

import { db, costDailySnapshots, freeCostByBotSnapshots } from "./db/index.js";
import { eq } from "drizzle-orm";
import { executeSQL } from "./mcp/client.js";

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 临时邮箱域名列表
 * 这些域名被认为是一次性邮箱，用户质量较低
 */
const TEMP_EMAIL_DOMAINS = [
  "protectsmail.net",
  "roratu.com",
  "mucate.com",
  "mekuron.com",
  "airsworld.net",
  "arugy.com",
  "forexzig.com",
  "fxzig.com",
  "denipl.com",
  "denipl.net",
  "nctime.com",
  "fftube.com",
  "correostemporales.org",
  "yopmail.com",
  "rosuper.com",
  "ssgperf.com",
  "m3player.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.de",
  "trbvm.com",
  "mailinator.com",
  "10minutemail.com",
  "temp-mail.org",
  "throwaway.email",
  "getnada.com",
  "maildrop.cc",
  "trashmail.com",
  "tempmailaddress.com",
  "fakeinbox.com",
  "mytemp.email",
  "tempmail.com",
  "emailondeck.com",
  "sharklasers.com",
  "discard.email",
  "discardmail.com",
  "mintemail.com",
  "mailnesia.com",
  "mohmal.com",
  "crazymailing.com",
  "mailcatch.com",
  "mailnator.com",
  "tempr.email",
  "tempinbox.com",
  "spamgourmet.com",
  "mailexpire.com",
  "dispostable.com",
  "filzmail.com",
  "getairmail.com",
  "harakirimail.com",
  "anonymbox.com",
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从邮箱提取域名
 */
function getEmailDomain(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * 判断是否为临时邮箱
 */
function isTempEmail(email: string | null): boolean {
  if (!email) return false;
  const domain = getEmailDomain(email);
  return domain ? TEMP_EMAIL_DOMAINS.includes(domain) : false;
}

/**
 * 获取北京时间某天的时间范围 (用于写入数据库)
 * 例如: 2024-12-25 北京时间 → 2024-12-24T16:00:00Z 到 2024-12-25T15:59:59Z
 */
function getBeijingDayRange(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 15, 59, 59, 999));
  return { start, end };
}

/**
 * 获取昨天的日期字符串 (北京时间)
 */
function getYesterdayBeijing(): string {
  const now = new Date();
  // 转换到北京时间
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset);
  // 减去一天
  beijingNow.setDate(beijingNow.getDate() - 1);
  return beijingNow.toISOString().split("T")[0];
}

// ============================================================================
// 数据类型
// ============================================================================

interface UserCostRow {
  user_id: number;
  user_source: string | null;
  user_email: string | null;
  is_privy_missing: number;
  total_cost: number;
  task_count: number;
}

interface BotCostRow {
  slug_id: string;
  bot_name: string;
  free_cost: number;
  free_tasks: number;
  free_users: number;
}

interface DailyStats {
  // 汇总
  totalCost: number;
  paidCost: number;
  freeCost: number;
  totalTasks: number;
  totalUsers: number;

  // 用户类型下钻
  tempEmailCost: number;
  tempEmailUsers: number;
  tempEmailTasks: number;

  regularEmailCost: number;
  regularEmailUsers: number;
  regularEmailTasks: number;

  deletedUserCost: number;
  deletedUserCount: number;
  deletedUserTasks: number;

  visitorCost: number;
  visitorCount: number;
  visitorTasks: number;
}

export interface SyncCostResult {
  success: boolean;
  date: string;
  dailySnapshot?: {
    totalCost: number;
    paidCost: number;
    freeCost: number;
    freeCostPct: number;
  };
  botSnapshotsCount?: number;
  error?: string;
}

// ============================================================================
// 核心逻辑：查询数据
// ============================================================================

/**
 * Step 1: 查询付费用户总成本
 *
 * 使用 DATE() 函数匹配日期，和原脚本保持一致
 */
async function queryPaidCost(dateStr: string): Promise<number> {
  const sql = `
    SELECT SUM(actual_energy_cost) as paid_cost
    FROM my_shell_prod.art_task
    WHERE user_membership_type != 'FREE'
      AND deleted_at IS NULL
      AND status = 'done'
      AND DATE(created_date) = '${dateStr}'
  `;

  const rows = await executeSQL<{ paid_cost: number }>(sql);
  return Number(rows[0]?.paid_cost || 0);
}

/**
 * Step 2: 查询免费用户成本（按用户聚合，包含用户类型信息）
 *
 * 使用 DATE() 函数匹配日期，和原脚本保持一致
 */
async function queryFreeUserCosts(dateStr: string): Promise<UserCostRow[]> {
  const sql = `
    SELECT
      at.user_id,
      u.source as user_source,
      COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) as user_email,
      IF(up.user_id IS NULL, 1, 0) as is_privy_missing,
      SUM(at.actual_energy_cost) as total_cost,
      COUNT(*) as task_count
    FROM my_shell_prod.art_task at
    LEFT JOIN my_shell_prod.user u ON at.user_id = u.id
    LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
    WHERE at.user_membership_type = 'FREE'
      AND at.deleted_at IS NULL
      AND at.status = 'done'
      AND DATE(at.created_date) = '${dateStr}'
    GROUP BY at.user_id, user_source, user_email, is_privy_missing
  `;

  return executeSQL<UserCostRow>(sql);
}

/**
 * Step 3: 查询免费成本按 Bot 聚合 (Top 30)
 *
 * 使用 DATE() 函数匹配日期，和原脚本保持一致
 */
async function queryFreeCostByBot(dateStr: string): Promise<BotCostRow[]> {
  const sql = `
    SELECT
      at.slug_id,
      MAX(at.bot_name) as bot_name,
      SUM(at.actual_energy_cost) as free_cost,
      COUNT(*) as free_tasks,
      COUNT(DISTINCT at.user_id) as free_users
    FROM my_shell_prod.art_task at
    WHERE at.user_membership_type = 'FREE'
      AND at.deleted_at IS NULL
      AND at.status = 'done'
      AND DATE(at.created_date) = '${dateStr}'
    GROUP BY at.slug_id
    ORDER BY free_cost DESC
    LIMIT 30
  `;

  return executeSQL<BotCostRow>(sql);
}

// ============================================================================
// 核心逻辑：聚合计算
// ============================================================================

/**
 * Step 4: 聚合免费用户数据，按用户类型分类
 */
function aggregateFreeUserStats(rows: UserCostRow[]): Omit<DailyStats, "totalCost" | "paidCost" | "totalTasks" | "totalUsers"> & {
  freeCost: number;
  freeUsers: number;
  freeTasks: number;
} {
  const stats = {
    freeCost: 0,
    freeUsers: 0,
    freeTasks: 0,

    tempEmailCost: 0,
    tempEmailUsers: 0,
    tempEmailTasks: 0,

    regularEmailCost: 0,
    regularEmailUsers: 0,
    regularEmailTasks: 0,

    deletedUserCost: 0,
    deletedUserCount: 0,
    deletedUserTasks: 0,

    visitorCost: 0,
    visitorCount: 0,
    visitorTasks: 0,
  };

  for (const row of rows) {
    const cost = Number(row.total_cost) || 0;
    const tasks = Number(row.task_count) || 0;

    stats.freeCost += cost;
    stats.freeTasks += tasks;
    stats.freeUsers += 1;

    // 分类用户类型
    if (row.user_email) {
      // 有邮箱：判断是临时邮箱还是常用邮箱
      if (isTempEmail(row.user_email)) {
        stats.tempEmailCost += cost;
        stats.tempEmailTasks += tasks;
        stats.tempEmailUsers += 1;
      } else {
        stats.regularEmailCost += cost;
        stats.regularEmailTasks += tasks;
        stats.regularEmailUsers += 1;
      }
    } else {
      // 无邮箱：进一步分类
      if (row.is_privy_missing === 1 && row.user_source === "privy") {
        // user 表有记录(source=privy)但 user_privy 无记录 → 已删除用户
        stats.deletedUserCost += cost;
        stats.deletedUserTasks += tasks;
        stats.deletedUserCount += 1;
      } else if (row.user_source === "visitor") {
        // visitor 访客
        stats.visitorCost += cost;
        stats.visitorTasks += tasks;
        stats.visitorCount += 1;
      }
      // 其他无邮箱用户忽略（极少数）
    }
  }

  return stats;
}

// ============================================================================
// 核心逻辑：写入数据库
// ============================================================================

/**
 * Step 5: 写入每日汇总快照
 */
async function upsertDailySnapshot(
  dateStr: string,
  paidCost: number,
  freeStats: ReturnType<typeof aggregateFreeUserStats>
): Promise<void> {
  const { start, end } = getBeijingDayRange(dateStr);

  const totalCost = paidCost + freeStats.freeCost;
  const freeCostPct = totalCost > 0 ? (freeStats.freeCost / totalCost) * 100 : 0;

  // 转换成本单位: energy points → USD (/100)
  const toUsd = (v: number) => (v / 100).toFixed(2);

  // 删除旧记录（如果存在）
  await db.delete(costDailySnapshots).where(eq(costDailySnapshots.snapshotDate, dateStr));

  // 插入新记录
  await db.insert(costDailySnapshots).values({
    snapshotDate: dateStr,
    periodStart: start,
    periodEnd: end,

    totalCost: toUsd(totalCost),
    paidCost: toUsd(paidCost),
    freeCost: toUsd(freeStats.freeCost),
    freeCostPct: freeCostPct.toFixed(2),
    totalTasks: freeStats.freeTasks, // TODO: 加上付费任务数
    totalUsers: freeStats.freeUsers, // TODO: 加上付费用户数

    tempEmailCost: toUsd(freeStats.tempEmailCost),
    tempEmailUsers: freeStats.tempEmailUsers,
    tempEmailTasks: freeStats.tempEmailTasks,

    regularEmailCost: toUsd(freeStats.regularEmailCost),
    regularEmailUsers: freeStats.regularEmailUsers,
    regularEmailTasks: freeStats.regularEmailTasks,

    deletedUserCost: toUsd(freeStats.deletedUserCost),
    deletedUserCount: freeStats.deletedUserCount,
    deletedUserTasks: freeStats.deletedUserTasks,

    visitorCost: toUsd(freeStats.visitorCost),
    visitorCount: freeStats.visitorCount,
    visitorTasks: freeStats.visitorTasks,
  });
}

/**
 * Step 6: 写入 Bot 明细快照
 */
async function upsertBotSnapshots(
  dateStr: string,
  botRows: BotCostRow[],
  totalFreeCost: number
): Promise<number> {
  // 删除旧记录
  await db.delete(freeCostByBotSnapshots).where(eq(freeCostByBotSnapshots.snapshotDate, dateStr));

  // 转换成本单位
  const toUsd = (v: number) => (v / 100).toFixed(2);

  // 批量插入
  const values = botRows.map((row, index) => ({
    snapshotDate: dateStr,
    slugId: row.slug_id,
    botName: row.bot_name,
    freeCost: toUsd(Number(row.free_cost)),
    freeTasks: Number(row.free_tasks),
    freeUsers: Number(row.free_users),
    costPct: totalFreeCost > 0
      ? ((Number(row.free_cost) / totalFreeCost) * 100).toFixed(2)
      : "0",
    rank: index + 1,
  }));

  if (values.length > 0) {
    await db.insert(freeCostByBotSnapshots).values(values);
  }

  return values.length;
}

// ============================================================================
// 主入口
// ============================================================================

/**
 * 生成某天的成本快照
 *
 * @param targetDate - 目标日期 (北京时间)，默认昨天
 */
export async function generateCostSnapshot(targetDate?: string): Promise<SyncCostResult> {
  const dateStr = targetDate || getYesterdayBeijing();

  console.log(`[cost-snapshot] 开始同步 ${dateStr}`);

  try {
    // Step 1: 查询付费成本
    console.log(`[cost-snapshot] Step 1: 查询付费成本...`);
    const paidCost = await queryPaidCost(dateStr);
    console.log(`[cost-snapshot]   付费成本: ${paidCost} 点 ($${(paidCost / 100).toFixed(2)})`);

    // Step 2: 查询免费用户成本
    console.log(`[cost-snapshot] Step 2: 查询免费用户成本...`);
    const freeUserRows = await queryFreeUserCosts(dateStr);
    console.log(`[cost-snapshot]   免费用户记录数: ${freeUserRows.length}`);

    // Step 3: 查询 Bot 维度成本
    console.log(`[cost-snapshot] Step 3: 查询 Bot 维度成本 (Top 30)...`);
    const botRows = await queryFreeCostByBot(dateStr);
    console.log(`[cost-snapshot]   Bot 数量: ${botRows.length}`);

    // Step 4: 聚合免费用户统计
    console.log(`[cost-snapshot] Step 4: 聚合用户类型统计...`);
    const freeStats = aggregateFreeUserStats(freeUserRows);
    console.log(`[cost-snapshot]   免费总成本: ${freeStats.freeCost} 点 ($${(freeStats.freeCost / 100).toFixed(2)})`);
    console.log(`[cost-snapshot]   - 临时邮箱: $${(freeStats.tempEmailCost / 100).toFixed(2)} (${freeStats.tempEmailUsers} 用户)`);
    console.log(`[cost-snapshot]   - 常用邮箱: $${(freeStats.regularEmailCost / 100).toFixed(2)} (${freeStats.regularEmailUsers} 用户)`);
    console.log(`[cost-snapshot]   - 已删除: $${(freeStats.deletedUserCost / 100).toFixed(2)} (${freeStats.deletedUserCount} 用户)`);
    console.log(`[cost-snapshot]   - 访客: $${(freeStats.visitorCost / 100).toFixed(2)} (${freeStats.visitorCount} 用户)`);

    // Step 5: 写入每日汇总
    console.log(`[cost-snapshot] Step 5: 写入每日汇总快照...`);
    await upsertDailySnapshot(dateStr, paidCost, freeStats);

    // Step 6: 写入 Bot 明细
    console.log(`[cost-snapshot] Step 6: 写入 Bot 明细快照...`);
    const botCount = await upsertBotSnapshots(dateStr, botRows, freeStats.freeCost);

    const totalCost = paidCost + freeStats.freeCost;
    const freeCostPct = totalCost > 0 ? (freeStats.freeCost / totalCost) * 100 : 0;

    console.log(`[cost-snapshot] ✅ 完成 ${dateStr}`);
    console.log(`[cost-snapshot]   总成本: $${(totalCost / 100).toFixed(2)}`);
    console.log(`[cost-snapshot]   免费占比: ${freeCostPct.toFixed(2)}%`);

    return {
      success: true,
      date: dateStr,
      dailySnapshot: {
        totalCost: totalCost / 100,
        paidCost: paidCost / 100,
        freeCost: freeStats.freeCost / 100,
        freeCostPct,
      },
      botSnapshotsCount: botCount,
    };
  } catch (error) {
    console.error(`[cost-snapshot] ❌ 失败:`, error);
    return {
      success: false,
      date: dateStr,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


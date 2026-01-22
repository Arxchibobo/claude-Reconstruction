/**
 * Daily Margin Alert Data Fetching
 *
 * 从 PostgreSQL 查询数据并计算 DoD/WoW 变化
 */

import { db } from "./db/index.js";
import { dailyMarginSummary, botDailyMargin, costBreakdownSummary } from "./db/schema.js";
import { eq, and, gte, lte, desc, gt, sql } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface DailyMarginAlertData {
  date: string;

  // ========== 成本分解（Art站 vs 主站）==========
  artCost: number;
  artCostDodChange: number;
  artCostWowChange: number;
  artCostPct: number;

  mainCreatorCost: number;
  mainCreatorCostDodChange: number;
  mainCreatorCostWowChange: number;
  mainCreatorCostPct: number;

  mainNonCreatorCost: number;
  mainNonCreatorCostDodChange: number;
  mainNonCreatorCostWowChange: number;
  mainNonCreatorCostPct: number;

  mainSiteCostPct: number;
  creatorOfMainSitePct: number;

  // ========== 成本分析 ==========
  totalCost: number;
  totalCostDodChange: number;
  totalCostWowChange: number;

  paidCost: number;
  paidCostDodChange: number;
  paidCostWowChange: number;

  freeCostRegularEmail: number;
  freeCostRegularDodChange: number;
  freeCostRegularWowChange: number;

  freeCostTempEmail: number;
  freeCostTempDodChange: number;
  freeCostTempWowChange: number;

  freeCostGmailAlias: number;
  freeCostGmailAliasDodChange: number;
  freeCostGmailAliasWowChange: number;

  freeCostDeleted: number;
  freeCostDeletedDodChange: number;
  freeCostDeletedWowChange: number;

  freeCostVisitor: number;
  freeCostVisitorDodChange: number;
  freeCostVisitorWowChange: number;

  freeCostPct: number;
  freeCostPctDodChange: number;
  freeCostPctWowChange: number;

  // ========== 收入分析 ==========
  totalRevenue: number;
  totalRevenueDodChange: number;
  totalRevenueWowChange: number;

  stripeRevenue: number;
  stripeRevenueDodChange: number;
  stripeRevenueWowChange: number;

  paypalRevenue: number;
  paypalRevenueDodChange: number;
  paypalRevenueWowChange: number;

  iapRevenue: number;
  iapRevenueDodChange: number;
  iapRevenueWowChange: number;

  // ========== 毛利分析 ==========
  grossProfit: number;
  grossProfitDodChange: number;
  grossProfitWowChange: number;

  grossMarginPct: number;
  grossMarginPctDodChange: number;
  grossMarginPctWowChange: number;

  // ========== Bot 归因汇总 ==========
  totalOrderRevenue: number;

  attributedRevenue: number;
  attributedRevenueDodChange: number;
  attributedRevenueWowChange: number;

  unattributedRevenue: number;
  unattributedRevenueDodChange: number;
  unattributedRevenueWowChange: number;

  attributionCoveragePct: number;

  // ========== Top 10 最高/最低毛利润 Bot ==========
  topProfitableBots: BotMarginDetail[];
  topLosingBots: BotMarginDetail[];

  // ========== 昨日无收入 Bot ==========
  noRevenueBots: NoRevenueBotDetail[];
  noRevenueBotsTotalCost: number;
  noRevenueBotsCostPct: number;
}

export interface BotMarginDetail {
  slugId: string;
  botName: string;
  attributedRevenue: number;
  attributedOrderCount: number;
  avgOrderAmount: number;
  paidUserCost: number;
  paidUserTaskCount: number;
  freeUserCost: number;
  freeUserTaskCount: number;
  totalCost: number;
  totalTaskCount: number;
  grossProfit: number;
  grossMarginPct: number;

  // DoD/WoW 变化
  revenueDodChange: number;
  revenueWowChange: number;
  avgOrderAmountDodChange?: number;
  avgOrderAmountWowChange?: number;

  // 最近7天趋势
  last7Days?: Array<{
    date: string;
    grossProfit: number;
    grossMarginPct: number;
  }>;
}

export interface NoRevenueBotDetail {
  slugId: string;
  totalCost: number;
  totalTaskCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 计算百分比变化
 * @returns 百分比变化，如果数据缺失返回 NaN
 *
 * 注意：使用绝对值作为分母，确保负数基准时结果正确
 * 例如：从 -100 变到 +100，应该是 +200%（改善），而不是 -200%
 */
function calculatePercentageChange(
  current: number,
  previous: number | null | undefined
): number {
  // 数据缺失：返回 NaN，格式化时会显示 "N/A"
  if (previous === null || previous === undefined) {
    return NaN;
  }
  // previous 为 0 的情况也返回 NaN（避免除以零）
  if (previous === 0) {
    return current === 0 ? 0 : NaN;
  }
  // 使用绝对值作为分母，确保变化方向正确
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * 计算百分点变化 (用于百分比指标)
 * @returns 百分点变化，如果数据缺失返回 NaN
 */
function calculatePointChange(
  current: number,
  previous: number | null | undefined
): number {
  // 数据缺失：返回 NaN，格式化时会显示 "N/A"
  if (previous === null || previous === undefined) {
    return NaN;
  }
  return current - previous;
}

/**
 * 从 decimal 字段转换为 number（用于实际值）
 */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? parseFloat(value) : value;
}

/**
 * 从 decimal 字段转换为 number（用于对比计算，保持 null）
 */
function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? parseFloat(value) : value;
}

/**
 * 获取日期字符串 (YYYY-MM-DD)，基于北京时间
 */
function getDateString(daysOffset: number, baseDate?: string): string {
  let date: Date;

  if (baseDate) {
    // 基于指定日期计算偏移（使用 UTC 日期）
    date = new Date(baseDate + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + daysOffset);
  } else {
    // 基于当前时间计算偏移（使用北京时间）
    const now = new Date();
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(now.getTime() + beijingOffset);
    beijingNow.setDate(beijingNow.getDate() + daysOffset);
    date = beijingNow;
  }

  return date.toISOString().split("T")[0];
}

// ============================================================================
// Main Function
// ============================================================================

export async function getDailyMarginAlert(
  targetDate?: string
): Promise<DailyMarginAlertData> {
  // 1. 确定日期
  const yesterday = targetDate || getDateString(-1);
  const dayBefore = getDateString(-1, yesterday);
  const lastWeek = getDateString(-7, yesterday);

  console.log(
    `[margin-alert] Fetching data for: ${yesterday} (DoD: ${dayBefore}, WoW: ${lastWeek})`
  );

  // 2. 查询 3 天的汇总数据
  const [todayData] = await db
    .select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, yesterday))
    .limit(1);

  const [yesterdayData] = await db
    .select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, dayBefore))
    .limit(1);

  const [lastWeekData] = await db
    .select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, lastWeek))
    .limit(1);

  if (!todayData) {
    throw new Error(`No margin data found for ${yesterday}`);
  }

  // 2.5 查询成本分解数据
  const [todayCostBreakdown] = await db
    .select()
    .from(costBreakdownSummary)
    .where(eq(costBreakdownSummary.snapshotDate, yesterday))
    .limit(1);

  const [yesterdayCostBreakdown] = await db
    .select()
    .from(costBreakdownSummary)
    .where(eq(costBreakdownSummary.snapshotDate, dayBefore))
    .limit(1);

  const [lastWeekCostBreakdown] = await db
    .select()
    .from(costBreakdownSummary)
    .where(eq(costBreakdownSummary.snapshotDate, lastWeek))
    .limit(1);

  // 3. 计算成本分解的 DoD/WoW 变化
  const artCost = toNumber(todayCostBreakdown?.artCost);
  const artCostDodChange = calculatePercentageChange(
    artCost,
    toNumberOrNull(yesterdayCostBreakdown?.artCost)
  );
  const artCostWowChange = calculatePercentageChange(
    artCost,
    toNumberOrNull(lastWeekCostBreakdown?.artCost)
  );
  const artCostPct = toNumber(todayCostBreakdown?.artCostPct);

  const mainCreatorCost = toNumber(todayCostBreakdown?.mainCreatorCost);
  const mainCreatorCostDodChange = calculatePercentageChange(
    mainCreatorCost,
    toNumberOrNull(yesterdayCostBreakdown?.mainCreatorCost)
  );
  const mainCreatorCostWowChange = calculatePercentageChange(
    mainCreatorCost,
    toNumberOrNull(lastWeekCostBreakdown?.mainCreatorCost)
  );
  const mainCreatorCostPct = toNumber(todayCostBreakdown?.mainCreatorCostPct);

  const mainNonCreatorCost = toNumber(todayCostBreakdown?.mainNonCreatorCost);
  const mainNonCreatorCostDodChange = calculatePercentageChange(
    mainNonCreatorCost,
    toNumberOrNull(yesterdayCostBreakdown?.mainNonCreatorCost)
  );
  const mainNonCreatorCostWowChange = calculatePercentageChange(
    mainNonCreatorCost,
    toNumberOrNull(lastWeekCostBreakdown?.mainNonCreatorCost)
  );
  const mainNonCreatorCostPct = toNumber(todayCostBreakdown?.mainNonCreatorCostPct);

  const mainSiteCostPct = toNumber(todayCostBreakdown?.mainSiteCostPct);
  const creatorOfMainSitePct = toNumber(todayCostBreakdown?.creatorOfMainSitePct);

  // 4. 计算汇总数据的 DoD/WoW 变化
  const totalCost = toNumber(todayData.totalCost);
  const totalCostDodChange = calculatePercentageChange(
    totalCost,
    toNumberOrNull(yesterdayData?.totalCost)
  );
  const totalCostWowChange = calculatePercentageChange(
    totalCost,
    toNumberOrNull(lastWeekData?.totalCost)
  );

  const paidCost = toNumber(todayData.paidCost);
  const paidCostDodChange = calculatePercentageChange(
    paidCost,
    toNumberOrNull(yesterdayData?.paidCost)
  );
  const paidCostWowChange = calculatePercentageChange(
    paidCost,
    toNumberOrNull(lastWeekData?.paidCost)
  );

  const freeCostRegularEmail = toNumber(todayData.freeCostRegularEmail);
  const freeCostRegularDodChange = calculatePercentageChange(
    freeCostRegularEmail,
    toNumberOrNull(yesterdayData?.freeCostRegularEmail)
  );
  const freeCostRegularWowChange = calculatePercentageChange(
    freeCostRegularEmail,
    toNumberOrNull(lastWeekData?.freeCostRegularEmail)
  );

  const freeCostTempEmail = toNumber(todayData.freeCostTempEmail);
  const freeCostTempDodChange = calculatePercentageChange(
    freeCostTempEmail,
    toNumberOrNull(yesterdayData?.freeCostTempEmail)
  );
  const freeCostTempWowChange = calculatePercentageChange(
    freeCostTempEmail,
    toNumberOrNull(lastWeekData?.freeCostTempEmail)
  );

  const freeCostGmailAlias = toNumber(todayData.freeCostGmailAlias);
  const freeCostGmailAliasDodChange = calculatePercentageChange(
    freeCostGmailAlias,
    toNumberOrNull(yesterdayData?.freeCostGmailAlias)
  );
  const freeCostGmailAliasWowChange = calculatePercentageChange(
    freeCostGmailAlias,
    toNumberOrNull(lastWeekData?.freeCostGmailAlias)
  );

  const freeCostDeleted = toNumber(todayData.freeCostDeleted);
  const freeCostDeletedDodChange = calculatePercentageChange(
    freeCostDeleted,
    toNumberOrNull(yesterdayData?.freeCostDeleted)
  );
  const freeCostDeletedWowChange = calculatePercentageChange(
    freeCostDeleted,
    toNumberOrNull(lastWeekData?.freeCostDeleted)
  );

  const freeCostVisitor = toNumber(todayData.freeCostVisitor);
  const freeCostVisitorDodChange = calculatePercentageChange(
    freeCostVisitor,
    toNumberOrNull(yesterdayData?.freeCostVisitor)
  );
  const freeCostVisitorWowChange = calculatePercentageChange(
    freeCostVisitor,
    toNumberOrNull(lastWeekData?.freeCostVisitor)
  );

  const freeCostPct = toNumber(todayData.freeCostPct);
  const freeCostPctDodChange = calculatePointChange(
    freeCostPct,
    toNumberOrNull(yesterdayData?.freeCostPct)
  );
  const freeCostPctWowChange = calculatePointChange(
    freeCostPct,
    toNumberOrNull(lastWeekData?.freeCostPct)
  );

  // 收入
  const totalRevenue = toNumber(todayData.totalRevenue);
  const totalRevenueDodChange = calculatePercentageChange(
    totalRevenue,
    toNumberOrNull(yesterdayData?.totalRevenue)
  );
  const totalRevenueWowChange = calculatePercentageChange(
    totalRevenue,
    toNumberOrNull(lastWeekData?.totalRevenue)
  );

  const stripeRevenue = toNumber(todayData.stripeRevenue);
  const stripeRevenueDodChange = calculatePercentageChange(
    stripeRevenue,
    toNumberOrNull(yesterdayData?.stripeRevenue)
  );
  const stripeRevenueWowChange = calculatePercentageChange(
    stripeRevenue,
    toNumberOrNull(lastWeekData?.stripeRevenue)
  );

  const paypalRevenue = toNumber(todayData.paypalRevenue);
  const paypalRevenueDodChange = calculatePercentageChange(
    paypalRevenue,
    toNumberOrNull(yesterdayData?.paypalRevenue)
  );
  const paypalRevenueWowChange = calculatePercentageChange(
    paypalRevenue,
    toNumberOrNull(lastWeekData?.paypalRevenue)
  );

  const iapRevenue = toNumber(todayData.iapRevenue);
  const iapRevenueDodChange = calculatePercentageChange(
    iapRevenue,
    toNumberOrNull(yesterdayData?.iapRevenue)
  );
  const iapRevenueWowChange = calculatePercentageChange(
    iapRevenue,
    toNumberOrNull(lastWeekData?.iapRevenue)
  );

  // 毛利
  const grossProfit = toNumber(todayData.grossProfit);
  const grossProfitDodChange = calculatePercentageChange(
    grossProfit,
    toNumberOrNull(yesterdayData?.grossProfit)
  );
  const grossProfitWowChange = calculatePercentageChange(
    grossProfit,
    toNumberOrNull(lastWeekData?.grossProfit)
  );

  const grossMarginPct = toNumber(todayData.grossMarginPct);
  const grossMarginPctDodChange = calculatePointChange(
    grossMarginPct,
    toNumberOrNull(yesterdayData?.grossMarginPct)
  );
  const grossMarginPctWowChange = calculatePointChange(
    grossMarginPct,
    toNumberOrNull(lastWeekData?.grossMarginPct)
  );

  // 归因
  const totalOrderRevenue = toNumber(todayData.totalOrderRevenue);

  const attributedRevenue = toNumber(todayData.attributedRevenue);
  const attributedRevenueDodChange = calculatePercentageChange(
    attributedRevenue,
    toNumberOrNull(yesterdayData?.attributedRevenue)
  );
  const attributedRevenueWowChange = calculatePercentageChange(
    attributedRevenue,
    toNumberOrNull(lastWeekData?.attributedRevenue)
  );

  const unattributedRevenue = toNumber(todayData.unattributedRevenue);
  const unattributedRevenueDodChange = calculatePercentageChange(
    unattributedRevenue,
    toNumberOrNull(yesterdayData?.unattributedRevenue)
  );
  const unattributedRevenueWowChange = calculatePercentageChange(
    unattributedRevenue,
    toNumberOrNull(lastWeekData?.unattributedRevenue)
  );

  const attributionCoveragePct = toNumber(todayData.attributionCoveragePct);

  // 4. 查询 Top 10 最高毛利润 Bot
  const topProfitableBots = await db
    .select()
    .from(botDailyMargin)
    .where(eq(botDailyMargin.snapshotDate, yesterday))
    .orderBy(desc(botDailyMargin.grossProfit))
    .limit(10);

  // 5. 查询 Top 10 最低毛利润 Bot
  const topLosingBots = await db
    .select()
    .from(botDailyMargin)
    .where(eq(botDailyMargin.snapshotDate, yesterday))
    .orderBy(botDailyMargin.grossProfit) // ASC
    .limit(10);

  // 6. 为每个 Top Bot 查询历史数据 (DoD/WoW + 7天趋势)
  const enrichedTopProfitable = await enrichBotData(
    topProfitableBots,
    dayBefore,
    lastWeek,
    yesterday
  );
  const enrichedTopLosing = await enrichBotData(
    topLosingBots,
    dayBefore,
    lastWeek,
    yesterday
  );

  // 7. 查询昨日无收入 Bot (Top 30 by cost)
  const noRevenueBots = await db
    .select({
      slugId: botDailyMargin.slugId,
      totalCost: botDailyMargin.totalCost,
      totalTaskCount: botDailyMargin.totalTaskCount,
    })
    .from(botDailyMargin)
    .where(
      and(
        eq(botDailyMargin.snapshotDate, yesterday),
        eq(botDailyMargin.attributedRevenue, "0"),
        gt(botDailyMargin.totalCost, "0")
      )
    )
    .orderBy(desc(botDailyMargin.totalCost))
    .limit(30);

  const noRevenueBotsData: NoRevenueBotDetail[] = noRevenueBots.map((bot) => ({
    slugId: bot.slugId,
    totalCost: toNumber(bot.totalCost),
    totalTaskCount: bot.totalTaskCount,
  }));

  // 8. 计算无收入bot总成本和占比
  const noRevenueBotsTotalCost = noRevenueBotsData.reduce(
    (sum, bot) => sum + bot.totalCost,
    0
  );
  const noRevenueBotsCostPct = totalCost > 0 ? (noRevenueBotsTotalCost / totalCost) * 100 : 0;

  // 9. 返回完整数据
  return {
    date: yesterday,

    // 成本分解（Art站 vs 主站）
    artCost,
    artCostDodChange,
    artCostWowChange,
    artCostPct,
    mainCreatorCost,
    mainCreatorCostDodChange,
    mainCreatorCostWowChange,
    mainCreatorCostPct,
    mainNonCreatorCost,
    mainNonCreatorCostDodChange,
    mainNonCreatorCostWowChange,
    mainNonCreatorCostPct,
    mainSiteCostPct,
    creatorOfMainSitePct,

    // 成本
    totalCost,
    totalCostDodChange,
    totalCostWowChange,
    paidCost,
    paidCostDodChange,
    paidCostWowChange,
    freeCostRegularEmail,
    freeCostRegularDodChange,
    freeCostRegularWowChange,
    freeCostTempEmail,
    freeCostTempDodChange,
    freeCostTempWowChange,
    freeCostGmailAlias,
    freeCostGmailAliasDodChange,
    freeCostGmailAliasWowChange,
    freeCostDeleted,
    freeCostDeletedDodChange,
    freeCostDeletedWowChange,
    freeCostVisitor,
    freeCostVisitorDodChange,
    freeCostVisitorWowChange,
    freeCostPct,
    freeCostPctDodChange,
    freeCostPctWowChange,

    // 收入
    totalRevenue,
    totalRevenueDodChange,
    totalRevenueWowChange,
    stripeRevenue,
    stripeRevenueDodChange,
    stripeRevenueWowChange,
    paypalRevenue,
    paypalRevenueDodChange,
    paypalRevenueWowChange,
    iapRevenue,
    iapRevenueDodChange,
    iapRevenueWowChange,

    // 毛利
    grossProfit,
    grossProfitDodChange,
    grossProfitWowChange,
    grossMarginPct,
    grossMarginPctDodChange,
    grossMarginPctWowChange,

    // 归因
    totalOrderRevenue,
    attributedRevenue,
    attributedRevenueDodChange,
    attributedRevenueWowChange,
    unattributedRevenue,
    unattributedRevenueDodChange,
    unattributedRevenueWowChange,
    attributionCoveragePct,

    // Bot 数据
    topProfitableBots: enrichedTopProfitable,
    topLosingBots: enrichedTopLosing,
    noRevenueBots: noRevenueBotsData,
    noRevenueBotsTotalCost,
    noRevenueBotsCostPct,
  };
}

/**
 * 为 Bot 列表添加 DoD/WoW 变化和 7 天趋势
 */
async function enrichBotData(
  bots: any[],
  dayBefore: string,
  lastWeek: string,
  yesterday: string
): Promise<BotMarginDetail[]> {
  const enrichedBots: BotMarginDetail[] = [];

  for (const bot of bots) {
    const slugId = bot.slugId;

    // 查询前一天数据
    const [yesterdayBot] = await db
      .select()
      .from(botDailyMargin)
      .where(
        and(
          eq(botDailyMargin.slugId, slugId),
          eq(botDailyMargin.snapshotDate, dayBefore)
        )
      )
      .limit(1);

    // 查询上周数据
    const [lastWeekBot] = await db
      .select()
      .from(botDailyMargin)
      .where(
        and(
          eq(botDailyMargin.slugId, slugId),
          eq(botDailyMargin.snapshotDate, lastWeek)
        )
      )
      .limit(1);

    // 查询最近 7 天趋势
    const startDate = getDateString(-6, yesterday); // 7天前
    const last7Days = await db
      .select({
        date: botDailyMargin.snapshotDate,
        grossProfit: botDailyMargin.grossProfit,
        grossMarginPct: botDailyMargin.grossMarginPct,
      })
      .from(botDailyMargin)
      .where(
        and(
          eq(botDailyMargin.slugId, slugId),
          gte(botDailyMargin.snapshotDate, startDate),
          lte(botDailyMargin.snapshotDate, yesterday)
        )
      )
      .orderBy(botDailyMargin.snapshotDate);

    // 计算变化
    const attributedRevenue = toNumber(bot.attributedRevenue);
    const revenueDodChange = calculatePercentageChange(
      attributedRevenue,
      toNumberOrNull(yesterdayBot?.attributedRevenue)
    );
    const revenueWowChange = calculatePercentageChange(
      attributedRevenue,
      toNumberOrNull(lastWeekBot?.attributedRevenue)
    );

    const avgOrderAmount = toNumber(bot.avgOrderAmount);
    const avgOrderAmountDodChange =
      yesterdayBot && toNumberOrNull(yesterdayBot.avgOrderAmount)
        ? calculatePercentageChange(
            avgOrderAmount,
            toNumberOrNull(yesterdayBot.avgOrderAmount)
          )
        : undefined;
    const avgOrderAmountWowChange =
      lastWeekBot && toNumberOrNull(lastWeekBot.avgOrderAmount)
        ? calculatePercentageChange(
            avgOrderAmount,
            toNumberOrNull(lastWeekBot.avgOrderAmount)
          )
        : undefined;

    enrichedBots.push({
      slugId: bot.slugId,
      botName: bot.botName,
      attributedRevenue,
      attributedOrderCount: bot.attributedOrderCount,
      avgOrderAmount,
      paidUserCost: toNumber(bot.paidUserCost),
      paidUserTaskCount: bot.paidUserTaskCount,
      freeUserCost: toNumber(bot.freeUserCost),
      freeUserTaskCount: bot.freeUserTaskCount,
      totalCost: toNumber(bot.totalCost),
      totalTaskCount: bot.totalTaskCount,
      grossProfit: toNumber(bot.grossProfit),
      grossMarginPct: toNumber(bot.grossMarginPct),
      revenueDodChange,
      revenueWowChange,
      avgOrderAmountDodChange,
      avgOrderAmountWowChange,
      last7Days: last7Days.map((day) => ({
        date: day.date,
        grossProfit: toNumber(day.grossProfit),
        grossMarginPct: toNumber(day.grossMarginPct),
      })),
    });
  }

  return enrichedBots;
}

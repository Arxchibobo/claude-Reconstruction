/**
 * ============================================================================
 * Daily Margin 同步逻辑
 * ============================================================================
 *
 * 从 my_shell_prod 原始表查询数据，计算毛利，写入快照表：
 * - daaf_daily_margin_summary：每日汇总（成本、收入、毛利、归因）
 * - daaf_bot_daily_margin：每个 bot 的毛利表现
 *
 * 数据来源：
 * - 成本：cost-trend-chart.md（按用户类型分类）
 * - 收入：gross-margin-analysis.md（Stripe + PayPal + IAP）
 * - Bot归因：bot-margin-analysis.md（Last-touch优化版，±7天窗口）
 *
 * 时间范围：北京时间 00:00-23:59
 * 金额单位：美元
 *
 * ============================================================================
 */

import { db, dailyMarginSummary, botDailyMargin } from "./db/index.js";
import { eq } from "drizzle-orm";
import { executeSQL } from "./mcp/client.js";

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 临时邮箱域名列表（56个）
 * 来源：cost-trend-chart.md
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
// 类型定义
// ============================================================================

export interface SyncDailyMarginResult {
  success: boolean;
  date: string;
  summary: {
    totalCost: number;
    totalRevenue: number;
    grossProfit: number;
    grossMarginPct: number;
    attributedRevenue: number;
    attributionCoveragePct: number;
  };
  botCount: number;
  insertedAt: string;
}

interface CostData {
  paidCost: number;
  freeCostRegularEmail: number;
  freeCostTempEmail: number;
  freeCostGmailAlias: number;
  freeCostDeleted: number;
  freeCostVisitor: number;
  totalCost: number;
  freeCostPct: number;
}

interface RevenueData {
  stripeRevenue: number;
  paypalRevenue: number;
  iapRevenue: number;
  totalRevenue: number;
  totalOrderRevenue: number;
}

interface BotAttributionData {
  slugId: string;
  attributedRevenue: number;
  attributedOrderCount: number;
}

interface BotCostData {
  slugId: string;
  botName: string;
  paidUserCost: number;
  paidUserTaskCount: number;
  freeUserCost: number;
  freeUserTaskCount: number;
  totalCost: number;
  totalTaskCount: number;
}

interface BotMarginData {
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
}

// ============================================================================
// 成本查询（按 cost-trend-chart.md）
// ============================================================================

/**
 * 查询成本数据（分5类用户）
 */
async function queryCostData(date: string): Promise<CostData> {
  console.log(`[daily-margin] 查询成本数据: ${date}`);

  const tempEmailDomainsSQL = TEMP_EMAIL_DOMAINS.map((d) => `'${d}'`).join(", ");

  // 查询1: 付费用户成本
  const paidCostSQL = `
    SELECT
      SUM(actual_energy_cost) / 100 as paid_cost
    FROM my_shell_prod.art_task
    WHERE user_membership_type != 'FREE'
      AND status IN ('done', 'cancel')
      AND DATE(created_date) = '${date}'
  `;

  // 查询2: 免费-临时邮箱
  const tempEmailCostSQL = `
    SELECT
      SUM(at.actual_energy_cost) / 100 as temp_email_cost
    FROM my_shell_prod.art_task at
    LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
    WHERE at.user_membership_type = 'FREE'
      AND at.status IN ('done', 'cancel')
      AND DATE(at.created_date) = '${date}'
      AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
      AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
          IN (${tempEmailDomainsSQL})
  `;

  // 查询3: 免费-Gmail别名（包含已删除用户）
  const gmailAliasCostSQL = `
    WITH free_users_with_email AS (
      SELECT
        at.user_id,
        at.actual_energy_cost / 100 as cost_usd,
        COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) as active_email,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.email')) as deleted_email,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.google_email')) as deleted_google_email,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.apple_email')) as deleted_apple_email,
        CASE WHEN dul.user_id IS NOT NULL THEN 1 ELSE 0 END as is_deleted
      FROM my_shell_prod.art_task at
      LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
      LEFT JOIN my_shell_prod.delete_user_log dul ON at.user_id = dul.user_id AND dul.source = 'user_privy'
      WHERE at.user_membership_type = 'FREE'
        AND at.status IN ('done', 'cancel')
        AND DATE(at.created_date) = '${date}'
    )
    SELECT
      SUM(cost_usd) as gmail_alias_cost
    FROM free_users_with_email
    WHERE (
      (is_deleted = 1
       AND SUBSTRING_INDEX(COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
       AND COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')) LIKE '%+%@%')
      OR
      (is_deleted = 0
       AND SUBSTRING_INDEX(active_email, '@', -1) IN ('gmail.com', 'googlemail.com')
       AND active_email LIKE '%+%@%')
    )
  `;

  // 查询4: 免费-常用邮箱（排除临时邮箱和 Gmail 别名）
  const regularEmailCostSQL = `
    SELECT
      SUM(at.actual_energy_cost) / 100 as regular_email_cost
    FROM my_shell_prod.art_task at
    LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
    WHERE at.user_membership_type = 'FREE'
      AND at.status IN ('done', 'cancel')
      AND DATE(at.created_date) = '${date}'
      AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
      AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
          NOT IN (${tempEmailDomainsSQL})
      AND NOT (
        SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
        AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) LIKE '%+%@%'
      )
  `;

  // 查询5: 免费-已删除（排除 Gmail 别名）
  const deletedCostSQL = `
    WITH deleted_users AS (
      SELECT
        at.user_id,
        at.actual_energy_cost / 100 as cost_usd,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.email')) as deleted_email,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.google_email')) as deleted_google_email,
        JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.apple_email')) as deleted_apple_email
      FROM my_shell_prod.art_task at
      LEFT JOIN my_shell_prod.user u ON at.user_id = u.id
      LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
      LEFT JOIN my_shell_prod.delete_user_log dul ON at.user_id = dul.user_id AND dul.source = 'user_privy'
      WHERE at.user_membership_type = 'FREE'
        AND at.status IN ('done', 'cancel')
        AND DATE(at.created_date) = '${date}'
        AND u.source = 'privy'
        AND up.user_id IS NULL
    )
    SELECT
      SUM(cost_usd) as deleted_user_cost
    FROM deleted_users
    WHERE NOT (
      SUBSTRING_INDEX(COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
      AND COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')) LIKE '%+%@%'
    )
  `;

  // 查询6: 免费-访客
  const visitorCostSQL = `
    SELECT
      SUM(at.actual_energy_cost) / 100 as visitor_cost
    FROM my_shell_prod.art_task at
    LEFT JOIN my_shell_prod.user u ON at.user_id = u.id
    WHERE at.user_membership_type = 'FREE'
      AND at.status IN ('done', 'cancel')
      AND DATE(at.created_date) = '${date}'
      AND u.source = 'visitor'
  `;

  // 执行查询
  const [paidResult, tempResult, gmailAliasResult, regularResult, deletedResult, visitorResult] =
    await Promise.all([
      executeSQL<{ paid_cost: number | null }>(paidCostSQL),
      executeSQL<{ temp_email_cost: number | null }>(tempEmailCostSQL),
      executeSQL<{ gmail_alias_cost: number | null }>(gmailAliasCostSQL),
      executeSQL<{ regular_email_cost: number | null }>(regularEmailCostSQL),
      executeSQL<{ deleted_user_cost: number | null }>(deletedCostSQL),
      executeSQL<{ visitor_cost: number | null }>(visitorCostSQL),
    ]);

  const paidCost = Number(paidResult[0]?.paid_cost) || 0;
  const freeCostTempEmail = Number(tempResult[0]?.temp_email_cost) || 0;
  const freeCostGmailAlias = Number(gmailAliasResult[0]?.gmail_alias_cost) || 0;
  const freeCostRegularEmail = Number(regularResult[0]?.regular_email_cost) || 0;
  const freeCostDeleted = Number(deletedResult[0]?.deleted_user_cost) || 0;
  const freeCostVisitor = Number(visitorResult[0]?.visitor_cost) || 0;

  const totalCost =
    paidCost +
    freeCostTempEmail +
    freeCostGmailAlias +
    freeCostRegularEmail +
    freeCostDeleted +
    freeCostVisitor;
  const freeCost =
    freeCostTempEmail + freeCostGmailAlias + freeCostRegularEmail + freeCostDeleted + freeCostVisitor;
  const freeCostPct = totalCost > 0 ? (freeCost / totalCost) * 100 : 0;

  console.log(`[daily-margin] 成本数据: 总成本 $${totalCost.toFixed(2)}, 免费占比 ${freeCostPct.toFixed(1)}%`);

  return {
    paidCost,
    freeCostRegularEmail,
    freeCostTempEmail,
    freeCostGmailAlias,
    freeCostDeleted,
    freeCostVisitor,
    totalCost,
    freeCostPct,
  };
}

// ============================================================================
// 收入查询（按 gross-margin-analysis.md）
// ============================================================================

/**
 * 查询收入数据（Stripe + PayPal + IAP）
 */
async function queryRevenueData(date: string): Promise<RevenueData> {
  console.log(`[daily-margin] 查询收入数据: ${date}`);

  // 查询1: Stripe 收入
  const stripeSQL = `
    SELECT
      SUM(amount) as stripe_revenue
    FROM my_shell_prod.user_subscription_stripe_orders
    WHERE status = 'ORDER_STATUS_SUCCESS'
      AND amount >= 0
      AND DATE(created_date) = '${date}'
  `;

  // 查询2: PayPal 收入
  const paypalSQL = `
    SELECT
      SUM(
        CASE
          WHEN biz_type = 'ENERGY' AND paypal_price_id = '500' THEN 6.99
          WHEN biz_type = 'ENERGY' AND paypal_price_id = '2000' THEN 20.99
          ELSE amount
        END
      ) as paypal_revenue
    FROM my_shell_prod.user_subscription_paypal_orders
    WHERE status = 'ORDER_STATUS_SUCCESS'
      AND DATE(created_date) = '${date}'
  `;

  // 查询3: Apple IAP 收入
  const iapSQL = `
    SELECT
      SUM(
        CASE product_id
          WHEN 'PLAYER_MONTHLY' THEN 6.99
          WHEN 'PLAYER_YEARLY' THEN 58.99
          WHEN 'DEVELOPER_MONTHLY' THEN 59.99
          WHEN 'DEVELOPER_YEARLY' THEN 499.99
          WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
          WHEN 'energy_500' THEN 6.99
          WHEN 'energy_2000' THEN 20.99
          ELSE 0
        END
      ) as iap_revenue
    FROM my_shell_prod.apple_used_transactions
    WHERE DATE(created_date) = '${date}'
  `;

  const [stripeResult, paypalResult, iapResult] = await Promise.all([
    executeSQL<{ stripe_revenue: number | null }>(stripeSQL),
    executeSQL<{ paypal_revenue: number | null }>(paypalSQL),
    executeSQL<{ iap_revenue: number | null }>(iapSQL),
  ]);

  const stripeRevenue = Number(stripeResult[0]?.stripe_revenue) || 0;
  const paypalRevenue = Number(paypalResult[0]?.paypal_revenue) || 0;
  const iapRevenue = Number(iapResult[0]?.iap_revenue) || 0;
  const totalRevenue = stripeRevenue + paypalRevenue + iapRevenue;

  console.log(`[daily-margin] 收入数据: 总收入 $${totalRevenue.toFixed(2)} (Stripe $${stripeRevenue.toFixed(2)} + PayPal $${paypalRevenue.toFixed(2)} + IAP $${iapRevenue.toFixed(2)})`);

  return {
    stripeRevenue,
    paypalRevenue,
    iapRevenue,
    totalRevenue,
    totalOrderRevenue: totalRevenue, // 总订单收入 = 总收入
  };
}

// ============================================================================
// Bot Margin 归因查询（按 bot-margin-analysis.md Step 1）
// ============================================================================

/**
 * 查询 bot 归因收入（Last-touch 优化版，±7天窗口）
 */
async function queryBotAttribution(
  startDate: string,
  endDate: string
): Promise<BotAttributionData[]> {
  console.log(`[daily-margin] 查询 bot 归因: ${startDate} (±7天窗口)`);

  const attributionSQL = `
-- ====================================================================
-- Bot 毛利率分析 - 收入归因查询（SQL优化版）
-- ====================================================================

-- Step 1: 合并所有订单源（Stripe + PayPal + Apple IAP）
WITH orders AS (
  -- Stripe 订单
  SELECT
    user_id,
    amount,
    created_date,
    'stripe' as source
  FROM my_shell_prod.user_subscription_stripe_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'

  UNION ALL

  -- PayPal 订单
  SELECT
    user_id,
    CASE
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '500' THEN 6.99
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '2000' THEN 20.99
      ELSE amount
    END as amount,
    created_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'

  UNION ALL

  -- Apple IAP 订单
  SELECT
    user_id,
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END as amount,
    created_date,
    'apple' as source
  FROM my_shell_prod.apple_used_transactions
  WHERE created_date >= '${startDate} 00:00:00'
    AND created_date <= '${endDate} 23:59:59'
),

-- Step 2: 获取所有已完成任务（±7天窗口）
tasks AS (
  SELECT
    user_id,
    slug_id,
    created_date
  FROM my_shell_prod.art_task
  WHERE status = 'done'
    AND created_date >= DATE_SUB('${startDate}', INTERVAL 7 DAY)
    AND created_date <= DATE_ADD('${endDate}', INTERVAL 7 DAY)
),

-- Step 3: Last-touch 归因（订单前最后一个任务）
last_touch_before AS (
  SELECT
    user_id,
    amount,
    order_date,
    source,
    attributed_bot,
    attribution_type
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.created_date as order_date,
      o.source,
      t.slug_id as attributed_bot,
      'before' as attribution_type,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.created_date
        ORDER BY t.created_date DESC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date <= o.created_date
  ) ranked
  WHERE rn = 1
),

-- Step 4: First-touch 归因（订单后第一个任务）
first_touch_after AS (
  SELECT
    user_id,
    amount,
    order_date,
    source,
    attributed_bot,
    attribution_type
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.created_date as order_date,
      o.source,
      t.slug_id as attributed_bot,
      'after' as attribution_type,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.created_date
        ORDER BY t.created_date ASC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date > o.created_date
    WHERE NOT EXISTS (
      SELECT 1
      FROM tasks t2
      WHERE t2.user_id = o.user_id
        AND t2.created_date <= o.created_date
    )
  ) ranked
  WHERE rn = 1
),

-- Step 5: 合并两种归因结果
attributed_orders AS (
  SELECT * FROM last_touch_before
  UNION ALL
  SELECT * FROM first_touch_after
)

-- Step 6: 按 bot 汇总归因收入
SELECT
  attributed_bot as slug_id,
  SUM(amount) as attributed_revenue,
  COUNT(*) as attributed_order_count
FROM attributed_orders
GROUP BY attributed_bot
ORDER BY attributed_revenue DESC
  `;

  const results = await executeSQL<{
    slug_id: string;
    attributed_revenue: number;
    attributed_order_count: number;
  }>(attributionSQL);

  console.log(`[daily-margin] 归因结果: ${results.length} 个 bot`);

  return results.map((row) => ({
    slugId: row.slug_id,
    attributedRevenue: Number(row.attributed_revenue) || 0,
    attributedOrderCount: Number(row.attributed_order_count) || 0,
  }));
}

// ============================================================================
// Bot 成本查询（按 bot-margin-analysis.md Step 2）
// ============================================================================

/**
 * 查询每个 bot 的成本
 */
async function queryBotCosts(date: string): Promise<BotCostData[]> {
  console.log(`[daily-margin] 查询 bot 成本: ${date}`);

  const costSQL = `
    SELECT
      slug_id,
      MAX(bot_name) as bot_name,
      SUM(CASE WHEN user_membership_type != 'FREE' THEN actual_energy_cost ELSE 0 END) / 100 as paid_user_cost,
      COUNT(CASE WHEN user_membership_type != 'FREE' THEN 1 END) as paid_user_task_count,
      SUM(CASE WHEN user_membership_type = 'FREE' THEN actual_energy_cost ELSE 0 END) / 100 as free_user_cost,
      COUNT(CASE WHEN user_membership_type = 'FREE' THEN 1 END) as free_user_task_count,
      SUM(actual_energy_cost) / 100 as total_cost,
      COUNT(*) as total_task_count
    FROM my_shell_prod.art_task
    WHERE status IN ('done', 'cancel')
      AND DATE(created_date) = '${date}'
    GROUP BY slug_id
    HAVING total_cost > 0
    ORDER BY total_cost DESC
  `;

  const results = await executeSQL<{
    slug_id: string;
    bot_name: string;
    paid_user_cost: number;
    paid_user_task_count: number;
    free_user_cost: number;
    free_user_task_count: number;
    total_cost: number;
    total_task_count: number;
  }>(costSQL);

  console.log(`[daily-margin] Bot 成本数据: ${results.length} 个 bot`);

  return results.map((row) => ({
    slugId: row.slug_id,
    botName: row.bot_name,
    paidUserCost: Number(row.paid_user_cost) || 0,
    paidUserTaskCount: Number(row.paid_user_task_count) || 0,
    freeUserCost: Number(row.free_user_cost) || 0,
    freeUserTaskCount: Number(row.free_user_task_count) || 0,
    totalCost: Number(row.total_cost) || 0,
    totalTaskCount: Number(row.total_task_count) || 0,
  }));
}

// ============================================================================
// 数据合并和计算
// ============================================================================

/**
 * 合并归因收入和成本，计算毛利
 */
function mergeBotData(
  attributionData: BotAttributionData[],
  costData: BotCostData[]
): BotMarginData[] {
  console.log(`[daily-margin] 合并 bot 数据`);

  // 创建归因收入映射
  const revenueMap = new Map<string, BotAttributionData>();
  for (const row of attributionData) {
    revenueMap.set(row.slugId, row);
  }

  // 创建成本映射
  const costMap = new Map<string, BotCostData>();
  for (const row of costData) {
    costMap.set(row.slugId, row);
  }

  // 获取所有涉及的 bot
  const allBotIds = new Set([
    ...revenueMap.keys(),
    ...costMap.keys(),
  ]);

  // 合并数据并计算毛利
  const botMargins: BotMarginData[] = [];
  for (const slugId of allBotIds) {
    const revenue = revenueMap.get(slugId);
    const cost = costMap.get(slugId);

    const attributedRevenue = revenue?.attributedRevenue || 0;
    const attributedOrderCount = revenue?.attributedOrderCount || 0;
    const avgOrderAmount =
      attributedOrderCount > 0
        ? attributedRevenue / attributedOrderCount
        : 0;

    const botName = cost?.botName || "Unknown";
    const paidUserCost = cost?.paidUserCost || 0;
    const paidUserTaskCount = cost?.paidUserTaskCount || 0;
    const freeUserCost = cost?.freeUserCost || 0;
    const freeUserTaskCount = cost?.freeUserTaskCount || 0;
    const totalCost = cost?.totalCost || 0;
    const totalTaskCount = cost?.totalTaskCount || 0;

    const grossProfit = attributedRevenue - totalCost;
    const grossMarginPct =
      attributedRevenue > 0 ? (grossProfit / attributedRevenue) * 100 : -100;

    botMargins.push({
      slugId,
      botName,
      attributedRevenue,
      attributedOrderCount,
      avgOrderAmount,
      paidUserCost,
      paidUserTaskCount,
      freeUserCost,
      freeUserTaskCount,
      totalCost,
      totalTaskCount,
      grossProfit,
      grossMarginPct,
    });
  }

  console.log(`[daily-margin] 合并完成: ${botMargins.length} 个 bot`);

  return botMargins;
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 生成每日毛利快照
 */
export async function generateDailyMargin(
  date: string
): Promise<SyncDailyMarginResult> {
  console.log(`[daily-margin] ========== 开始同步: ${date} ==========`);

  // 检查是否已存在，如果存在则先删除（覆盖模式）
  const existing = await db
    .select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, date))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[daily-margin] 检测到 ${date} 已存在数据，删除旧数据...`);

    // 删除旧的汇总数据
    await db
      .delete(dailyMarginSummary)
      .where(eq(dailyMarginSummary.snapshotDate, date));

    // 删除旧的 bot 数据
    await db
      .delete(botDailyMargin)
      .where(eq(botDailyMargin.snapshotDate, date));

    console.log(`[daily-margin] 旧数据已删除，开始重新同步`);
  }

  // 1. 查询成本数据
  const costData = await queryCostData(date);

  // 2. 查询收入数据
  const revenueData = await queryRevenueData(date);

  // 3. 计算毛利
  const grossProfit = revenueData.totalRevenue - costData.totalCost;
  const grossMarginPct =
    revenueData.totalRevenue > 0
      ? (grossProfit / revenueData.totalRevenue) * 100
      : 0;

  // 4. 查询 bot 归因（±7天窗口）
  const attributionData = await queryBotAttribution(date, date);

  // 5. 查询 bot 成本
  const botCostData = await queryBotCosts(date);

  // 6. 合并 bot 数据
  const botMargins = mergeBotData(attributionData, botCostData);

  // 7. 计算归因汇总
  const attributedRevenue = attributionData.reduce(
    (sum, b) => sum + b.attributedRevenue,
    0
  );
  const unattributedRevenue = revenueData.totalOrderRevenue - attributedRevenue;
  const attributionCoveragePct =
    revenueData.totalOrderRevenue > 0
      ? (attributedRevenue / revenueData.totalOrderRevenue) * 100
      : 0;

  console.log(`[daily-margin] 归因覆盖率: ${attributionCoveragePct.toFixed(1)}%`);

  // 8. 插入汇总数据
  await db.insert(dailyMarginSummary).values({
    snapshotDate: date,

    // 成本
    paidCost: costData.paidCost.toFixed(2),
    freeCostRegularEmail: costData.freeCostRegularEmail.toFixed(2),
    freeCostTempEmail: costData.freeCostTempEmail.toFixed(2),
    freeCostGmailAlias: costData.freeCostGmailAlias.toFixed(2),
    freeCostDeleted: costData.freeCostDeleted.toFixed(2),
    freeCostVisitor: costData.freeCostVisitor.toFixed(2),
    totalCost: costData.totalCost.toFixed(2),
    freeCostPct: costData.freeCostPct.toFixed(2),

    // 收入
    stripeRevenue: revenueData.stripeRevenue.toFixed(2),
    paypalRevenue: revenueData.paypalRevenue.toFixed(2),
    iapRevenue: revenueData.iapRevenue.toFixed(2),
    totalRevenue: revenueData.totalRevenue.toFixed(2),

    // 毛利
    grossProfit: grossProfit.toFixed(2),
    grossMarginPct: grossMarginPct.toFixed(2),

    // 归因
    totalOrderRevenue: revenueData.totalOrderRevenue.toFixed(2),
    attributedRevenue: attributedRevenue.toFixed(2),
    unattributedRevenue: unattributedRevenue.toFixed(2),
    attributionCoveragePct: attributionCoveragePct.toFixed(2),
  });

  // 9. 插入 bot 数据
  if (botMargins.length > 0) {
    await db.insert(botDailyMargin).values(
      botMargins.map((bot) => ({
        snapshotDate: date,
        slugId: bot.slugId,
        botName: bot.botName,
        attributedRevenue: bot.attributedRevenue.toFixed(2),
        attributedOrderCount: bot.attributedOrderCount,
        avgOrderAmount:
          bot.avgOrderAmount > 0 ? bot.avgOrderAmount.toFixed(2) : null,
        paidUserCost: bot.paidUserCost.toFixed(2),
        paidUserTaskCount: bot.paidUserTaskCount,
        freeUserCost: bot.freeUserCost.toFixed(2),
        freeUserTaskCount: bot.freeUserTaskCount,
        totalCost: bot.totalCost.toFixed(2),
        totalTaskCount: bot.totalTaskCount,
        grossProfit: bot.grossProfit.toFixed(2),
        grossMarginPct:
          bot.attributedRevenue > 0 ? bot.grossMarginPct.toFixed(2) : null,
      }))
    );
  }

  console.log(`[daily-margin] ========== 同步完成: ${date} ==========`);
  console.log(`  - 总成本: $${costData.totalCost.toFixed(2)}`);
  console.log(`  - 总收入: $${revenueData.totalRevenue.toFixed(2)}`);
  console.log(`  - 毛利润: $${grossProfit.toFixed(2)}`);
  console.log(`  - 毛利率: ${grossMarginPct.toFixed(1)}%`);
  console.log(`  - Bot 数量: ${botMargins.length}`);

  return {
    success: true,
    date,
    summary: {
      totalCost: costData.totalCost,
      totalRevenue: revenueData.totalRevenue,
      grossProfit,
      grossMarginPct,
      attributedRevenue,
      attributionCoveragePct,
    },
    botCount: botMargins.length,
    insertedAt: new Date().toISOString(),
  };
}

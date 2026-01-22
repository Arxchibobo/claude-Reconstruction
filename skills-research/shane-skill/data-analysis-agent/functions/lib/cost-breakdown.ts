/**
 * ============================================================================
 * Cost Breakdown 同步逻辑
 * ============================================================================
 *
 * 从 my_shell_prod 原始表查询数据，计算总成本分解，写入快照表：
 * - daaf_cost_breakdown_summary：每日汇总（Art站 vs 主站，主站分 Creator/Non-Creator）
 *
 * 数据来源：total-cost-breakdown.md
 *
 * 核心逻辑：
 * - Art记录：通过精确匹配（user_id + bot_id + energy + 时间窗口±5秒）识别
 * - 主站记录：无法匹配的记录
 * - Creator：user_membership_info 中 genesisPasscard > 0 或 genesisPassCardCount > 0
 *
 * 时间范围：北京时间 00:00-23:59
 * 金额单位：美元
 *
 * ============================================================================
 */

import { db, costBreakdownSummary } from "./db/index.js";
import { eq } from "drizzle-orm";
import { executeSQL } from "./mcp/client.js";

// ============================================================================
// 类型定义
// ============================================================================

export interface CostBreakdownData {
  artCost: number;
  mainCreatorCost: number;
  mainNonCreatorCost: number;
  totalCost: number;
  artCostPct: number;
  mainCreatorCostPct: number;
  mainNonCreatorCostPct: number;
  mainSiteCostPct: number;
  creatorOfMainSitePct: number;
}

export interface SyncCostBreakdownResult {
  success: boolean;
  date: string;
  data: CostBreakdownData;
  insertedAt: string;
}

// ============================================================================
// 成本分解查询（按 total-cost-breakdown.md 精确匹配算法）
// ============================================================================

/**
 * 查询成本分解数据
 *
 * 性能提示：精确匹配算法使用 EXISTS 子查询，建议时间范围控制在单日
 */
export async function queryCostBreakdown(date: string): Promise<CostBreakdownData> {
  console.log(`[cost-breakdown] 查询成本分解: ${date}`);

  // 精确匹配算法 SQL（按 total-cost-breakdown.md）
  const sql = `
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM my_shell_prod.user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
-- Art任务记录（用于精确匹配）
art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date
    FROM my_shell_prod.art_task
    WHERE DATE(created_date) = '${date}'
        AND deleted_at IS NULL
        AND status = 'done'
),
-- Art站总成本
art_total AS (
    SELECT COALESCE(SUM(energy), 0) / 100 as cost_usd FROM art_done
),
-- 精确匹配：识别每条记录是Art还是主站
classified AS (
    SELECT
        u.user_id,
        u.energy,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM art_done a
                WHERE a.user_id = u.user_id
                    AND a.bot_id = u.bot_id
                    AND a.energy = u.energy
                    AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
            ) THEN 'Art'
            ELSE 'Main'
        END as source
    FROM my_shell_prod.user_energy_bot_usage_logs u
    WHERE DATE(u.created_date) = '${date}'
),
-- 主站按用户汇总
main_site_by_user AS (
    SELECT user_id, SUM(energy) as main_energy
    FROM classified
    WHERE source = 'Main'
    GROUP BY user_id
),
-- 主站按Creator/Non-Creator汇总
main_grouped AS (
    SELECT
        COALESCE(SUM(CASE WHEN c.user_id IS NOT NULL THEN m.main_energy ELSE 0 END), 0) / 100 as main_creator_cost,
        COALESCE(SUM(CASE WHEN c.user_id IS NULL THEN m.main_energy ELSE 0 END), 0) / 100 as main_non_creator_cost
    FROM main_site_by_user m
    LEFT JOIN creators c ON m.user_id = c.user_id
)
SELECT
    COALESCE((SELECT cost_usd FROM art_total), 0) as art_cost,
    COALESCE((SELECT main_creator_cost FROM main_grouped), 0) as main_creator_cost,
    COALESCE((SELECT main_non_creator_cost FROM main_grouped), 0) as main_non_creator_cost,
    COALESCE((SELECT cost_usd FROM art_total), 0) +
    COALESCE((SELECT main_creator_cost FROM main_grouped), 0) +
    COALESCE((SELECT main_non_creator_cost FROM main_grouped), 0) as total_cost
  `;

  const results = await executeSQL<{
    art_cost: number | null;
    main_creator_cost: number | null;
    main_non_creator_cost: number | null;
    total_cost: number | null;
  }>(sql);

  const row = results[0] || {};
  const artCost = Number(row.art_cost) || 0;
  const mainCreatorCost = Number(row.main_creator_cost) || 0;
  const mainNonCreatorCost = Number(row.main_non_creator_cost) || 0;
  const totalCost = Number(row.total_cost) || 0;

  // 计算占比
  const artCostPct = totalCost > 0 ? (artCost / totalCost) * 100 : 0;
  const mainCreatorCostPct = totalCost > 0 ? (mainCreatorCost / totalCost) * 100 : 0;
  const mainNonCreatorCostPct = totalCost > 0 ? (mainNonCreatorCost / totalCost) * 100 : 0;

  const mainSiteCost = mainCreatorCost + mainNonCreatorCost;
  const mainSiteCostPct = totalCost > 0 ? (mainSiteCost / totalCost) * 100 : 0;
  const creatorOfMainSitePct = mainSiteCost > 0 ? (mainCreatorCost / mainSiteCost) * 100 : 0;

  console.log(`[cost-breakdown] 成本分解结果:`);
  console.log(`  - Art站: $${artCost.toFixed(2)} (${artCostPct.toFixed(1)}%)`);
  console.log(`  - 主站-Creator: $${mainCreatorCost.toFixed(2)} (${mainCreatorCostPct.toFixed(1)}%)`);
  console.log(`  - 主站-Non-Creator: $${mainNonCreatorCost.toFixed(2)} (${mainNonCreatorCostPct.toFixed(1)}%)`);
  console.log(`  - 总成本: $${totalCost.toFixed(2)}`);

  return {
    artCost,
    mainCreatorCost,
    mainNonCreatorCost,
    totalCost,
    artCostPct,
    mainCreatorCostPct,
    mainNonCreatorCostPct,
    mainSiteCostPct,
    creatorOfMainSitePct,
  };
}

// ============================================================================
// 同步函数
// ============================================================================

/**
 * 生成每日成本分解快照
 */
export async function generateCostBreakdown(
  date: string
): Promise<SyncCostBreakdownResult> {
  console.log(`[cost-breakdown] ========== 开始同步: ${date} ==========`);

  // 检查是否已存在，如果存在则先删除（覆盖模式）
  const existing = await db
    .select()
    .from(costBreakdownSummary)
    .where(eq(costBreakdownSummary.snapshotDate, date))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[cost-breakdown] 检测到 ${date} 已存在数据，删除旧数据...`);
    await db
      .delete(costBreakdownSummary)
      .where(eq(costBreakdownSummary.snapshotDate, date));
    console.log(`[cost-breakdown] 旧数据已删除，开始重新同步`);
  }

  // 查询成本分解数据
  const data = await queryCostBreakdown(date);

  // 插入新数据
  await db.insert(costBreakdownSummary).values({
    snapshotDate: date,
    artCost: data.artCost.toFixed(2),
    mainCreatorCost: data.mainCreatorCost.toFixed(2),
    mainNonCreatorCost: data.mainNonCreatorCost.toFixed(2),
    totalCost: data.totalCost.toFixed(2),
    artCostPct: data.artCostPct.toFixed(2),
    mainCreatorCostPct: data.mainCreatorCostPct.toFixed(2),
    mainNonCreatorCostPct: data.mainNonCreatorCostPct.toFixed(2),
    mainSiteCostPct: data.mainSiteCostPct.toFixed(2),
    creatorOfMainSitePct: data.creatorOfMainSitePct.toFixed(2),
  });

  console.log(`[cost-breakdown] ========== 同步完成: ${date} ==========`);

  return {
    success: true,
    date,
    data,
    insertedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Alert 辅助函数
// ============================================================================

/**
 * 获取前一天的成本分解数据（用于 DoD 对比）
 */
export async function getPreviousDayCostBreakdown(
  date: string
): Promise<CostBreakdownData | null> {
  const prevDate = new Date(date + "T00:00:00Z");
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevDateStr = prevDate.toISOString().split("T")[0];

  const result = await db
    .select()
    .from(costBreakdownSummary)
    .where(eq(costBreakdownSummary.snapshotDate, prevDateStr))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return {
    artCost: Number(row.artCost),
    mainCreatorCost: Number(row.mainCreatorCost),
    mainNonCreatorCost: Number(row.mainNonCreatorCost),
    totalCost: Number(row.totalCost),
    artCostPct: Number(row.artCostPct) || 0,
    mainCreatorCostPct: Number(row.mainCreatorCostPct) || 0,
    mainNonCreatorCostPct: Number(row.mainNonCreatorCostPct) || 0,
    mainSiteCostPct: Number(row.mainSiteCostPct) || 0,
    creatorOfMainSitePct: Number(row.creatorOfMainSitePct) || 0,
  };
}

/**
 * 格式化成本分解 Slack 消息
 */
export function formatCostBreakdownSlackMessage(
  date: string,
  current: CostBreakdownData,
  previous: CostBreakdownData | null
): string {
  const formatChange = (curr: number, prev: number | null): string => {
    if (prev === null || prev === 0) return "";
    const change = ((curr - prev) / Math.abs(prev)) * 100;
    const sign = change >= 0 ? "+" : "";
    const emoji = change > 5 ? "🔺" : change < -5 ? "🔻" : "";
    return ` ${emoji}(${sign}${change.toFixed(1)}%)`;
  };

  let message = `*📊 成本分解报告 - ${date}*\n\n`;

  message += `*总成本*: $${current.totalCost.toFixed(2)}`;
  if (previous) {
    message += formatChange(current.totalCost, previous.totalCost);
  }
  message += "\n\n";

  message += `*成本构成:*\n`;
  message += `• Art站: $${current.artCost.toFixed(2)} (${current.artCostPct.toFixed(1)}%)`;
  if (previous) {
    message += formatChange(current.artCost, previous.artCost);
  }
  message += "\n";

  message += `• 主站-Creator: $${current.mainCreatorCost.toFixed(2)} (${current.mainCreatorCostPct.toFixed(1)}%)`;
  if (previous) {
    message += formatChange(current.mainCreatorCost, previous.mainCreatorCost);
  }
  message += "\n";

  message += `• 主站-Non-Creator: $${current.mainNonCreatorCost.toFixed(2)} (${current.mainNonCreatorCostPct.toFixed(1)}%)`;
  if (previous) {
    message += formatChange(current.mainNonCreatorCost, previous.mainNonCreatorCost);
  }
  message += "\n\n";

  const mainSiteCost = current.mainCreatorCost + current.mainNonCreatorCost;
  message += `*汇总:*\n`;
  message += `• Art站 vs 主站: ${current.artCostPct.toFixed(1)}% vs ${current.mainSiteCostPct.toFixed(1)}%\n`;
  message += `• Creator占主站: ${current.creatorOfMainSitePct.toFixed(1)}%\n`;

  return message;
}

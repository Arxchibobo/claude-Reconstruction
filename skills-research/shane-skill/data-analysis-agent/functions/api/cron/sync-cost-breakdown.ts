/**
 * Sync Cost Breakdown
 *
 * Cron: 每天北京时间 00:10 (UTC 16:10 前一天)
 *
 * 功能:
 * - 同步昨天的成本分解数据到 daaf_cost_breakdown_summary
 * - 按 Art站 vs 主站 分解，主站进一步分 Creator/Non-Creator
 *
 * 数据来源: total-cost-breakdown.md（精确匹配算法）
 * - 精确匹配：user_id + bot_id + energy + 时间窗口±5秒
 * - Creator 定义：user_membership_info 中 genesisPasscard > 0 或 genesisPassCardCount > 0
 *
 * 手动调用:
 * - ?token=xxx                    → 同步昨天
 * - ?token=xxx&date=2024-12-25    → 同步指定日期
 * - ?token=xxx&start=2024-12-20&end=2024-12-25 → 批量同步
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateCostBreakdown } from "../../lib/cost-breakdown.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ============================================================================
  // 1. 鉴权
  // ============================================================================
  const authHeader = req.headers.authorization;
  const isValid =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    req.query.token === process.env.CRON_SECRET;

  if (!isValid && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // ============================================================================
    // 2. 解析参数
    // ============================================================================
    const { date, start, end } = req.query;

    // 单日模式
    if (typeof date === "string") {
      console.log(`[sync-cost-breakdown] 单日同步: ${date}`);
      const result = await generateCostBreakdown(date);
      return res.status(200).json(result);
    }

    // 批量模式
    if (typeof start === "string") {
      const startDate = start;
      const endDate = typeof end === "string" ? end : startDate;

      console.log(`[sync-cost-breakdown] 批量同步: ${startDate} 至 ${endDate}`);

      const results: Array<{
        date: string;
        success: boolean;
        error?: string;
      }> = [];

      // 生成日期范围
      const dates: string[] = [];
      const current = new Date(startDate + "T00:00:00Z");
      const endDateObj = new Date(endDate + "T00:00:00Z");

      while (current <= endDateObj) {
        dates.push(current.toISOString().split("T")[0]);
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // 逐日同步（批量模式不发 alert）
      for (const dateStr of dates) {
        try {
          await generateCostBreakdown(dateStr);
          results.push({
            date: dateStr,
            success: true,
          });
          console.log(`[sync-cost-breakdown] ✓ ${dateStr} 同步成功`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          results.push({
            date: dateStr,
            success: false,
            error: errorMsg,
          });
          console.error(`[sync-cost-breakdown] ✗ ${dateStr} 同步失败:`, errorMsg);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return res.status(200).json({
        success: failedCount === 0,
        startDate,
        endDate,
        totalDays: dates.length,
        successCount,
        failedCount,
        results,
      });
    }

    // 默认模式：同步昨天（北京时间）
    const now = new Date();
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(now.getTime() + beijingOffset);
    beijingNow.setDate(beijingNow.getDate() - 1);
    const yesterdayStr = beijingNow.toISOString().split("T")[0];

    console.log(`[sync-cost-breakdown] 默认同步昨天: ${yesterdayStr}`);
    const result = await generateCostBreakdown(yesterdayStr);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[sync-cost-breakdown] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

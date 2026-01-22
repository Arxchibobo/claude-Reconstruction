/**
 * Sync Daily Margin
 *
 * Cron: 每天北京时间 00:10 (UTC 16:10 前一天)
 *
 * 功能:
 * - 同步昨天的成本、收入、毛利数据到 daaf_daily_margin_summary
 * - 同步每个 bot 的毛利数据到 daaf_bot_daily_margin
 *
 * 数据来源: 全部从 my_shell_prod 原始表查询
 * - 成本: cost-trend-chart.md
 * - 收入: gross-margin-analysis.md (Stripe + PayPal + IAP)
 * - Bot margin: bot-margin-analysis.md (Last-touch 优化版归因，±7天窗口)
 *
 * 手动调用:
 * - ?token=xxx                    → 同步昨天
 * - ?token=xxx&date=2024-12-25    → 同步指定日期
 * - ?token=xxx&start=2024-12-20&end=2024-12-25 → 批量同步
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  generateDailyMargin,
  type SyncDailyMarginResult,
} from "../../lib/daily-margin.js";

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
      console.log(`[sync-daily-margin] 单日同步: ${date}`);
      const result = await generateDailyMargin(date);
      return res.status(200).json(result);
    }

    // 批量模式
    if (typeof start === "string") {
      const startDate = start;
      const endDate = typeof end === "string" ? end : startDate;

      console.log(`[sync-daily-margin] 批量同步: ${startDate} 至 ${endDate}`);

      const results: Array<{
        date: string;
        success: boolean;
        error?: string;
        botCount?: number;
      }> = [];

      // 生成日期范围
      const dates: string[] = [];
      const current = new Date(startDate + "T00:00:00Z");
      const endDateObj = new Date(endDate + "T00:00:00Z");

      while (current <= endDateObj) {
        dates.push(current.toISOString().split("T")[0]);
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // 逐日同步
      for (const dateStr of dates) {
        try {
          const result = await generateDailyMargin(dateStr);
          results.push({
            date: dateStr,
            success: true,
            botCount: result.botCount,
          });
          console.log(`[sync-daily-margin] ✓ ${dateStr} 同步成功`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          results.push({
            date: dateStr,
            success: false,
            error: errorMsg,
          });
          console.error(`[sync-daily-margin] ✗ ${dateStr} 同步失败:`, errorMsg);
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

    console.log(`[sync-daily-margin] 默认同步昨天: ${yesterdayStr}`);
    const result = await generateDailyMargin(yesterdayStr);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[sync-daily-margin] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

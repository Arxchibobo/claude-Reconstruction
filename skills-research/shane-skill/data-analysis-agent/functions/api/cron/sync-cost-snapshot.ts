/**
 * Sync Cost Snapshot
 *
 * Cron: 每天北京时间 00:05 (UTC 16:05 前一天)
 *
 * 功能:
 * - 同步昨天的成本数据到 daaf_cost_daily_snapshots
 * - 同步 Top 30 Bot 成本到 daaf_free_cost_by_bot_snapshots
 *
 * 手动调用:
 * - ?token=xxx                    → 同步昨天
 * - ?token=xxx&date=2024-12-25    → 同步指定日期
 * - ?token=xxx&start=2024-12-20&end=2024-12-25 → 批量同步
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  generateCostSnapshot,
  type SyncCostResult,
} from "../../lib/cost-snapshot.js";

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
      console.log(`[sync-cost-snapshot] 单日同步: ${date}`);
      const result = await generateCostSnapshot(date);
      return res.status(200).json(result);
    }

    // 批量模式
    if (typeof start === "string") {
      const startDate = start;
      const endDate = typeof end === "string" ? end : start;

      console.log(`[sync-cost-snapshot] 批量同步: ${startDate} → ${endDate}`);

      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const results: SyncCostResult[] = [];

      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        console.log(`[sync-cost-snapshot] 处理 ${dateStr}`);
        const result = await generateCostSnapshot(dateStr);
        results.push(result);
      }

      return res.status(200).json({
        success: true,
        total_days: results.length,
        results,
      });
    }

    // ============================================================================
    // 3. 默认模式：同步昨天
    // ============================================================================
    console.log(`[sync-cost-snapshot] 默认同步昨天`);
    const result = await generateCostSnapshot();
    return res.status(200).json(result);
  } catch (error) {
    console.error("[sync-cost-snapshot] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}


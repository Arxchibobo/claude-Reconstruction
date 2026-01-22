/**
 * Sync Art Task Revenue Data
 *
 * Cron: 每天 UTC 0:00 (北京时间 8:00)
 *
 * 手动调用: ?token=xxx&start=2024-12-08&end=2024-12-15
 * 会按天循环生成 8 条记录（每天一条）
 * 无参数默认同步昨天
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateRevenueSnapshot, type SyncResult } from "../../lib/revenue.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const isValid = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                  req.query.token === process.env.CRON_SECRET;

  if (!isValid && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { start, end } = req.query;
    const startDate = typeof start === "string" ? start : undefined;
    const endDate = typeof end === "string" ? end : startDate;

    // 如果没有传参数，直接同步（默认昨天）
    if (!startDate) {
      const result = await generateRevenueSnapshot();
      return res.status(200).json(result);
    }

    // 按天循环生成记录
    const startD = new Date(startDate);
    const endD = new Date(endDate || startDate);
    const results: SyncResult[] = [];

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      console.log(`[sync-art-revenue] Processing ${dateStr}`);
      const result = await generateRevenueSnapshot(dateStr, dateStr);
      results.push(result);
    }

    return res.status(200).json({
      success: true,
      total_days: results.length,
      results,
    });
  } catch (error) {
    console.error("[sync-art-revenue] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

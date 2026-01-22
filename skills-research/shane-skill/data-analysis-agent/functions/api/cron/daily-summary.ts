/**
 * Daily Summary Alert
 *
 * Cron: 每天北京时间 10:00 (UTC 2:00)
 *
 * 内容:
 * 1. 整体概览：总收入、总成本（付费/免费）、毛利
 * 2. 今日亏损 Bot 数量
 * 3. 今日被白嫖严重的 Bot（免费成本占比>80%）
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDailySummary, type DailySummary, type HeavyFreeUseBot, type LosingBot, type ChangeData, type ProfitableBot } from "../../lib/alerts.js";
import {
  sendSlackMessage,
  headerBlock,
  sectionBlock,
  dividerBlock,
  contextBlock,
  formatCurrency,
  formatNumber,
  type SlackBlock,
} from "../../lib/slack.js";

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * 格式化单个变化百分比（同比或环比）
 */
function formatSingleChange(change: number): string {
  const emoji = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
  const text = isFinite(change)
    ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
    : "N/A";
  return `${emoji}${text}`;
}

/**
 * 格式化变化百分比显示（环比+同比）
 */
function formatChangeText(change: ChangeData): string {
  const dodEmoji = change.dodChange > 0 ? "📈" : change.dodChange < 0 ? "📉" : "➡️";
  const wowEmoji = change.wowChange > 0 ? "📈" : change.wowChange < 0 ? "📉" : "➡️";

  const dodText = isFinite(change.dodChange)
    ? `${change.dodChange >= 0 ? "+" : ""}${change.dodChange.toFixed(1)}%`
    : "N/A";
  const wowText = isFinite(change.wowChange)
    ? `${change.wowChange >= 0 ? "+" : ""}${change.wowChange.toFixed(1)}%`
    : "N/A";

  return `环比昨天${dodEmoji}${dodText} 同比上周${wowEmoji}${wowText}`;
}

/**
 * 格式化毛利率变化（百分点变化，不是百分比变化）
 */
function formatMarginChange(change: ChangeData): string {
  const dodEmoji = change.dodChange > 0 ? "📈" : change.dodChange < 0 ? "📉" : "➡️";
  const wowEmoji = change.wowChange > 0 ? "📈" : change.wowChange < 0 ? "📉" : "➡️";

  const dodText = isFinite(change.dodChange)
    ? `${change.dodChange >= 0 ? "+" : ""}${change.dodChange.toFixed(1)}pt`
    : "N/A";
  const wowText = isFinite(change.wowChange)
    ? `${change.wowChange >= 0 ? "+" : ""}${change.wowChange.toFixed(1)}pt`
    : "N/A";

  return `环比昨天${dodEmoji}${dodText} 同比上周${wowEmoji}${wowText}`;
}

/**
 * 格式化单个 Bot 的收入变化
 */
function formatBotRevenueChange(dodChange?: number, wowChange?: number): string {
  const parts: string[] = [];

  if (dodChange !== undefined && isFinite(dodChange)) {
    const emoji = dodChange > 0 ? "📈" : dodChange < 0 ? "📉" : "➡️";
    parts.push(`环比昨天${emoji}${dodChange >= 0 ? "+" : ""}${dodChange.toFixed(0)}%`);
  }
  if (wowChange !== undefined && isFinite(wowChange)) {
    const emoji = wowChange > 0 ? "📈" : wowChange < 0 ? "📉" : "➡️";
    parts.push(`同比上周${emoji}${wowChange >= 0 ? "+" : ""}${wowChange.toFixed(0)}%`);
  }

  return parts.length > 0 ? ` | ${parts.join(" ")}` : "";
}

// ============================================================================
// Message Formatting
// ============================================================================

function buildDailySummaryMessage(data: DailySummary): { text: string; blocks: SlackBlock[] } {
  const blocks: SlackBlock[] = [];

  blocks.push(headerBlock(`📊 ${data.date} 简报`));
  blocks.push(dividerBlock());

  // 整体概览（全部环比+同比）
  const overviewLines = [
    `*总收入:* ${formatCurrency(data.totalRevenue)} | ${formatChangeText(data.totalRevenueChange)}`,
    `*付费用户成本:* ${formatCurrency(data.paidUserCost)} | ${formatChangeText(data.paidUserCostChange)}`,
    `*免费用户成本:* ${formatCurrency(data.freeUserCost)} | ${formatChangeText(data.freeUserCostChange)}`,
    `*毛利率:* ${data.grossMarginPercent.toFixed(1)}% | ${formatMarginChange(data.grossMarginPercentChange)}`,
    `*DAU:* ${formatNumber(data.dau, 0)} _（产生生图任务的独立用户）_ | ${formatChangeText(data.dauChange)}`,
  ];
  blocks.push(sectionBlock(overviewLines.join("\n")));

  blocks.push(dividerBlock());

  // 今日亏损 Bot
  if (data.losingBotsCount > 0) {
    blocks.push(sectionBlock(`*⚠️ 今日亏损 Bot:* ${data.losingBotsCount} 个（总亏 ${formatCurrency(data.losingBotsTotalLoss)}，被盈利 Bot 部分抵消）`));
  } else {
    blocks.push(sectionBlock(`*✅ 今日亏损 Bot:* 无`));
  }

  // 白嫖严重
  if (data.heavyFreeUseBotsTotal > 0) {
    blocks.push(sectionBlock(`*🆓 白嫖严重（免费成本>80%）:* ${data.heavyFreeUseBotsTotal} 个`));
  } else {
    blocks.push(sectionBlock(`*🆓 白嫖严重（免费成本>80%）:* 无`));
  }

  blocks.push(dividerBlock());
  blocks.push(contextBlock(`生成时间: ${new Date().toISOString()}`));

  return {
    text: `${data.date} 简报`,
    blocks,
  };
}

/**
 * 生成亏损 Bot 详情 thread 消息（支持分批）
 */
function buildLosingBotsThreadMessages(data: DailySummary): Array<{ text: string; blocks: SlackBlock[] }> {
  if (data.losingBots.length === 0) return [];

  const messages: Array<{ text: string; blocks: SlackBlock[] }> = [];
  const bots = data.losingBots;

  // 每批最多 10 个
  for (let i = 0; i < bots.length; i += 10) {
    const batch = bots.slice(i, i + 10);
    const blocks: SlackBlock[] = [];

    if (i === 0) {
      blocks.push(sectionBlock(`*⚠️ 今日亏损 Bot 详情（按亏损金额降序，共 ${bots.length} 个）*`));
    } else {
      blocks.push(sectionBlock(`*⚠️ 今日亏损 Bot 详情（续 ${i + 1}-${Math.min(i + 10, bots.length)}）*`));
    }

    const lines = batch.map((bot, idx) => {
      const gmEmoji = "🔴";
      const changeText = formatBotRevenueChange(bot.revenueDodChange, bot.revenueWowChange);
      return `${i + idx + 1}. *${bot.botName}*\n   亏损: ${formatCurrency(bot.loss)} | 毛利率: ${gmEmoji} ${bot.grossMarginPercent.toFixed(1)}%\n   收入: ${formatCurrency(bot.revenue)}${changeText}\n   成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）| 免费任务: ${bot.freeTaskPercent.toFixed(0)}%`;
    });
    blocks.push(sectionBlock(lines.join("\n\n")));

    messages.push({
      text: `亏损 Bot 详情 (${Math.floor(i / 10) + 1})`,
      blocks,
    });
  }

  return messages;
}

/**
 * 生成白嫖严重 Bot 详情 thread 消息（支持分批）
 */
function buildHeavyFreeUseThreadMessages(data: DailySummary): Array<{ text: string; blocks: SlackBlock[] }> {
  if (data.heavyFreeUseBots.length === 0) return [];

  const messages: Array<{ text: string; blocks: SlackBlock[] }> = [];
  const bots = data.heavyFreeUseBots;

  // 每批最多 10 个
  for (let i = 0; i < bots.length; i += 10) {
    const batch = bots.slice(i, i + 10);
    const blocks: SlackBlock[] = [];

    if (i === 0) {
      blocks.push(sectionBlock(`*🆓 白嫖严重 Bot（免费成本占比>80%，按占比降序，共 ${bots.length} 个）*`));
    } else {
      blocks.push(sectionBlock(`*🆓 白嫖严重 Bot（续 ${i + 1}-${Math.min(i + 10, bots.length)}）*`));
    }

    const lines = batch.map((bot, idx) => {
      const gmEmoji = bot.grossMarginPercent >= 0 ? "✅" : "⚠️";
      const changeText = formatBotRevenueChange(bot.revenueDodChange, bot.revenueWowChange);
      return `${i + idx + 1}. *${bot.botName}*\n   免费占比: ${bot.freeUserCostPercent.toFixed(0)}% | 毛利率: ${gmEmoji} ${bot.grossMarginPercent.toFixed(1)}%\n   收入: ${formatCurrency(bot.revenue)}${changeText}\n   成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）`;
    });
    blocks.push(sectionBlock(lines.join("\n\n")));

    messages.push({
      text: `白嫖严重详情 (${Math.floor(i / 10) + 1})`,
      blocks,
    });
  }

  return messages;
}

/**
 * 生成高毛利率 Top5 详情
 */
function buildTopHighMarginMessage(data: DailySummary): { text: string; blocks: SlackBlock[] } | null {
  if (data.topHighMarginBots.length === 0) return null;

  const blocks: SlackBlock[] = [];
  blocks.push(sectionBlock(`*💰 高毛利率 Top5*`));

  const lines = data.topHighMarginBots.map((bot, i) => {
    return `${i + 1}. *${bot.botName}*\n   毛利率: ✅ ${bot.grossMarginPercent.toFixed(1)}% | 毛利: ${formatCurrency(bot.grossProfit)}\n   收入: ${formatCurrency(bot.revenue)} | 成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）`;
  });
  blocks.push(sectionBlock(lines.join("\n\n")));

  return {
    text: "高毛利率 Top5",
    blocks,
  };
}

/**
 * 生成低毛利率 Top5 详情
 */
function buildTopLowMarginMessage(data: DailySummary): { text: string; blocks: SlackBlock[] } | null {
  if (data.topLowMarginBots.length === 0) return null;

  const blocks: SlackBlock[] = [];
  blocks.push(sectionBlock(`*📉 低毛利率 Top5*`));

  const lines = data.topLowMarginBots.map((bot, i) => {
    // 如果收入为0，推荐一个合理的收入目标（成本 * 1.5）
    const recommendedRevenue = bot.revenue === 0 ? bot.totalCost * 1.5 : 0;
    const recommendation = recommendedRevenue > 0
      ? `\n   _建议目标收入: ${formatCurrency(recommendedRevenue)}_`
      : "";

    return `${i + 1}. *${bot.botName}*\n   毛利率: ⚠️ ${bot.grossMarginPercent.toFixed(1)}%\n   收入: ${formatCurrency(bot.revenue)} | 成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）${recommendation}`;
  });
  blocks.push(sectionBlock(lines.join("\n\n")));

  return {
    text: "低毛利率 Top5",
    blocks,
  };
}

// ============================================================================
// Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const isValid =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    req.query.token === process.env.CRON_SECRET;

  if (!isValid && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 支持手动指定日期
    const { date } = req.query;
    const targetDate = typeof date === "string" ? date : undefined;

    console.log(`[daily-summary] Starting${targetDate ? ` for ${targetDate}` : ""}`);

    // 1. 获取数据
    const summaryData = await getDailySummary(targetDate);

    // 2. 发送主消息
    const channelId = process.env.SLACK_CHANNEL_MARGIN_ID;
    const message = buildDailySummaryMessage(summaryData);
    const threadTs = await sendSlackMessage(message, undefined, channelId);

    // 3. 发送详情到 thread
    if (threadTs) {
      // 3.1 发送高毛利率 Top5
      const topHighMarginMessage = buildTopHighMarginMessage(summaryData);
      if (topHighMarginMessage) {
        await sendSlackMessage(topHighMarginMessage, threadTs, channelId);
      }

      // 3.2 发送低毛利率 Top5
      const topLowMarginMessage = buildTopLowMarginMessage(summaryData);
      if (topLowMarginMessage) {
        await sendSlackMessage(topLowMarginMessage, threadTs, channelId);
      }
    }

    console.log(`[daily-summary] Sent successfully for ${summaryData.date}`);

    return res.status(200).json({
      success: true,
      date: summaryData.date,
      summary: {
        totalRevenue: summaryData.totalRevenue,
        totalRevenueChange: summaryData.totalRevenueChange,
        paidUserCost: summaryData.paidUserCost,
        paidUserCostChange: summaryData.paidUserCostChange,
        freeUserCost: summaryData.freeUserCost,
        freeUserCostChange: summaryData.freeUserCostChange,
        totalCost: summaryData.totalCost,
        grossProfit: summaryData.grossProfit,
        grossMarginPercent: summaryData.grossMarginPercent,
        grossMarginPercentChange: summaryData.grossMarginPercentChange,
        dau: summaryData.dau,
        dauChange: summaryData.dauChange,
        activeBots: summaryData.activeBots,
        totalTasks: summaryData.totalTasks,
        totalTasksChange: summaryData.totalTasksChange,
        losingBotsCount: summaryData.losingBotsCount,
        losingBotsTotalLoss: summaryData.losingBotsTotalLoss,
        heavyFreeUseBotsTotal: summaryData.heavyFreeUseBotsTotal,
        topHighMarginBotsCount: summaryData.topHighMarginBots.length,
        topLowMarginBotsCount: summaryData.topLowMarginBots.length,
      },
    });
  } catch (error) {
    console.error("[daily-summary] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

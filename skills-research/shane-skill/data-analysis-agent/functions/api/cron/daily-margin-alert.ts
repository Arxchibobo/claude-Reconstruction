/**
 * Daily Margin Alert
 *
 * Cron: 每天北京时间 10:00 (UTC 2:00)
 *
 * 内容:
 * 1. 主消息：成本、收入、毛利、归因汇总（含 DoD/WoW 变化）
 * 2. Thread 1：Top 10 最高毛利润 Bot（含最近7天趋势）
 * 3. Thread 2：Top 10 最低毛利润 Bot（含最近7天趋势）
 * 4. Thread 3：昨日无收入 Bot（Top 30 by cost）
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDailyMarginAlert,
  type DailyMarginAlertData,
} from "../../lib/margin-alert.js";
import {
  sendSlackMessage,
  headerBlock,
  sectionBlock,
  dividerBlock,
  contextBlock,
  formatCurrency,
  type SlackBlock,
} from "../../lib/slack.js";

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * 格式化变化百分比（DoD + WoW）
 */
function formatChange(dodChange: number, wowChange: number): string {
  const dodEmoji = dodChange > 0 ? "📈" : dodChange < 0 ? "📉" : "➡️";
  const wowEmoji = wowChange > 0 ? "📈" : wowChange < 0 ? "📉" : "➡️";

  const dodText = isFinite(dodChange)
    ? `${dodChange >= 0 ? "+" : ""}${dodChange.toFixed(1)}%`
    : "N/A";
  const wowText = isFinite(wowChange)
    ? `${wowChange >= 0 ? "+" : ""}${wowChange.toFixed(1)}%`
    : "N/A";

  return `环比昨天${dodEmoji}${dodText} 同比上周${wowEmoji}${wowText}`;
}

/**
 * 计算主站整体变化（基于 Creator 和 Non-Creator 的加权变化）
 */
function calculateMainSiteChange(
  creatorChange: number,
  nonCreatorChange: number,
  creatorCost: number,
  nonCreatorCost: number
): number {
  const total = creatorCost + nonCreatorCost;
  if (total === 0) return NaN;
  if (!isFinite(creatorChange) && !isFinite(nonCreatorChange)) return NaN;

  const creatorWeight = creatorCost / total;
  const nonCreatorWeight = nonCreatorCost / total;

  const weightedCreator = isFinite(creatorChange) ? creatorChange * creatorWeight : 0;
  const weightedNonCreator = isFinite(nonCreatorChange) ? nonCreatorChange * nonCreatorWeight : 0;

  return weightedCreator + weightedNonCreator;
}

/**
 * 格式化百分点变化
 */
function formatPointChange(dodChange: number, wowChange: number): string {
  const dodEmoji = dodChange > 0 ? "📈" : dodChange < 0 ? "📉" : "➡️";
  const wowEmoji = wowChange > 0 ? "📈" : wowChange < 0 ? "📉" : "➡️";

  const dodText = isFinite(dodChange)
    ? `${dodChange >= 0 ? "+" : ""}${dodChange.toFixed(1)}%`
    : "N/A";
  const wowText = isFinite(wowChange)
    ? `${wowChange >= 0 ? "+" : ""}${wowChange.toFixed(1)}%`
    : "N/A";

  return `环比昨天${dodEmoji}${dodText} 同比上周${wowEmoji}${wowText}`;
}

/**
 * 格式化最近7天趋势（带对齐）
 */
function format7DaysTrend(
  last7Days: Array<{ date: string; grossProfit: number; grossMarginPct: number }>
): string {
  if (!last7Days || last7Days.length === 0) return "";

  const lines: string[] = [];

  last7Days.forEach((day) => {
    const dateStr = day.date.slice(5); // "2025-12-25" → "12-25"
    const profitStr = formatCurrency(day.grossProfit).padStart(10); // 右对齐金额
    // 毛利率为 0 但毛利为负数，说明是无收入的情况
    const marginStr = (day.grossMarginPct === 0 && day.grossProfit < 0)
      ? "无收入".padStart(5)
      : `${day.grossMarginPct.toFixed(1)}%`.padStart(7);
    lines.push(`   ${dateStr}  ${profitStr} ${marginStr}`);
  });

  return `\n\n   最近7天趋势（日期 毛利 毛利率）\n` + lines.join("\n");
}

// ============================================================================
// Message Formatting
// ============================================================================

function buildMainMessage(data: DailyMarginAlertData): {
  text: string;
  blocks: SlackBlock[];
} {
  const blocks: SlackBlock[] = [];

  blocks.push(headerBlock(`📊 ${data.date} 毛利报告`));
  blocks.push(dividerBlock());

  // ========== 成本分解（Art站 vs 主站）==========
  const mainSiteCost = data.mainCreatorCost + data.mainNonCreatorCost;
  const costBreakdownLines = [
    `*Art站:* ${formatCurrency(data.artCost)} (${data.artCostPct.toFixed(1)}%) | ${formatChange(data.artCostDodChange, data.artCostWowChange)}`,
    `*主站:* ${formatCurrency(mainSiteCost)} (${data.mainSiteCostPct.toFixed(1)}%) | ${formatChange(
      calculateMainSiteChange(data.mainCreatorCostDodChange, data.mainNonCreatorCostDodChange, data.mainCreatorCost, data.mainNonCreatorCost),
      calculateMainSiteChange(data.mainCreatorCostWowChange, data.mainNonCreatorCostWowChange, data.mainCreatorCost, data.mainNonCreatorCost)
    )}`,
    `  - Creator: ${formatCurrency(data.mainCreatorCost)} (${data.mainCreatorCostPct.toFixed(1)}%) | ${formatChange(data.mainCreatorCostDodChange, data.mainCreatorCostWowChange)}`,
    `  - Non-Creator: ${formatCurrency(data.mainNonCreatorCost)} (${data.mainNonCreatorCostPct.toFixed(1)}%) | ${formatChange(data.mainNonCreatorCostDodChange, data.mainNonCreatorCostWowChange)}`,
    `*Creator占主站:* ${data.creatorOfMainSitePct.toFixed(1)}%`,
    `📊 <https://cost-insights-2440d9f7.base44.app/|查看详情>`,
  ];
  blocks.push(sectionBlock(`*========== 成本分解（Art站 vs 主站）==========*\n${costBreakdownLines.join("\n")}`));

  blocks.push(dividerBlock());

  // ========== 毛利分析 ==========
  const grossMarginDisplay = data.totalRevenue === 0
    ? `_无收入_`
    : `${data.grossMarginPct.toFixed(1)}% | ${formatPointChange(data.grossMarginPctDodChange, data.grossMarginPctWowChange)}`;
  const marginLines = [
    `*毛利润:* ${formatCurrency(data.grossProfit)} | ${formatChange(data.grossProfitDodChange, data.grossProfitWowChange)}`,
    `*毛利率:* ${grossMarginDisplay}`,
    `📊 <https://profit-flow-analytics-b8a87f86.base44.app/|查看详情>`,
  ];
  blocks.push(sectionBlock(`*========== 毛利分析 ==========*\n${marginLines.join("\n")}`));

  blocks.push(dividerBlock());

  // ========== 收入分析 ==========
  const revenueLines = [
    `*总收入:* ${formatCurrency(data.totalRevenue)} | ${formatChange(data.totalRevenueDodChange, data.totalRevenueWowChange)}`,
    `  - Stripe: ${formatCurrency(data.stripeRevenue)} | ${formatChange(data.stripeRevenueDodChange, data.stripeRevenueWowChange)}`,
    `  - PayPal: ${formatCurrency(data.paypalRevenue)} | ${formatChange(data.paypalRevenueDodChange, data.paypalRevenueWowChange)}`,
    `  - IAP（原价）: ${formatCurrency(data.iapRevenue)} | ${formatChange(data.iapRevenueDodChange, data.iapRevenueWowChange)}`,
    `📊 <https://profit-flow-analytics-b8a87f86.base44.app/|查看详情>`,
  ];
  blocks.push(sectionBlock(`*========== 收入分析 ==========*\n${revenueLines.join("\n")}`));

  blocks.push(dividerBlock());

  // ========== 成本分析 ==========
  const costLines = [
    `*总成本:* ${formatCurrency(data.totalCost)} | ${formatChange(data.totalCostDodChange, data.totalCostWowChange)}`,
    `  - 付费用户: ${formatCurrency(data.paidCost)} | ${formatChange(data.paidCostDodChange, data.paidCostWowChange)}`,
    `  - 免费-常用邮箱(不含别名): ${formatCurrency(data.freeCostRegularEmail)} | ${formatChange(data.freeCostRegularDodChange, data.freeCostRegularWowChange)}`,
    `  - 免费-Gmail别名⚠️: ${formatCurrency(data.freeCostGmailAlias)} | ${formatChange(data.freeCostGmailAliasDodChange, data.freeCostGmailAliasWowChange)}`,
    `  - 免费-临时邮箱: ${formatCurrency(data.freeCostTempEmail)} | ${formatChange(data.freeCostTempDodChange, data.freeCostTempWowChange)}`,
    `  - 免费-已删除(不含别名): ${formatCurrency(data.freeCostDeleted)} | ${formatChange(data.freeCostDeletedDodChange, data.freeCostDeletedWowChange)}`,
    `  - 免费-访客: ${formatCurrency(data.freeCostVisitor)} | ${formatChange(data.freeCostVisitorDodChange, data.freeCostVisitorWowChange)}`,
    `*免费成本占比:* ${data.freeCostPct.toFixed(1)}% | ${formatPointChange(data.freeCostPctDodChange, data.freeCostPctWowChange)}`,
    `*无收入Bot成本:* ${formatCurrency(data.noRevenueBotsTotalCost)} (占比${data.noRevenueBotsCostPct.toFixed(1)}%)`,
    `📊 <https://app-d281d193.base44.app/|查看详情>`,
  ];
  blocks.push(sectionBlock(`*========== 成本分析 ==========*\n${costLines.join("\n")}`));

  blocks.push(dividerBlock());

  // ========== Bot 归因分析 ==========
  const attributionLines = [
    `*总订单收入:* ${formatCurrency(data.totalOrderRevenue)}`,
    `  - 已归因: ${formatCurrency(data.attributedRevenue)} (${data.attributionCoveragePct.toFixed(1)}%) | ${formatChange(data.attributedRevenueDodChange, data.attributedRevenueWowChange)}`,
    `  - 未归因: ${formatCurrency(data.unattributedRevenue)} (${(100 - data.attributionCoveragePct).toFixed(1)}%) | ${formatChange(data.unattributedRevenueDodChange, data.unattributedRevenueWowChange)}`,
    `📊 <https://bot-profitability-analyzer-3c46a267.base44.app/|查看详情>`,
    `📈 <https://bot-performance-dashboard-e66b00ca.base44.app/|Bot收入成本趋势>`,
  ];
  blocks.push(sectionBlock(`*========== Bot 归因分析 ==========*\n${attributionLines.join("\n")}`));

  blocks.push(dividerBlock());
  blocks.push(contextBlock(`生成时间: ${new Date().toISOString()}`));

  return {
    text: `${data.date} 毛利报告`,
    blocks,
  };
}

/**
 * Thread 1: Top 10 最高毛利润 Bot
 */
function buildTopProfitableMessage(data: DailyMarginAlertData): {
  text: string;
  blocks: SlackBlock[];
} | null {
  // 只显示正的毛利润
  const positiveProfitBots = data.topProfitableBots.filter(bot => bot.grossProfit > 0);

  if (positiveProfitBots.length === 0) return null;

  const blocks: SlackBlock[] = [];
  blocks.push(sectionBlock(`*💰 毛利润最高 Top 10*`));

  // 每个 bot 使用独立的 block，避免超过 3000 字符限制
  positiveProfitBots.forEach((bot, i) => {
    const changeText = `${formatChange(bot.revenueDodChange, bot.revenueWowChange)}`;
    const orderChangeText =
      bot.avgOrderAmountDodChange !== undefined && bot.avgOrderAmountWowChange !== undefined
        ? ` | ${formatChange(bot.avgOrderAmountDodChange, bot.avgOrderAmountWowChange)}`
        : "";

    // 计算免费成本占比和任务平均成本
    const freeCostPct = bot.totalCost > 0 ? (bot.freeUserCost / bot.totalCost * 100) : 0;
    const avgCostPerTask = bot.totalTaskCount > 0 ? bot.totalCost / bot.totalTaskCount : 0;

    let text = `${i + 1}. *${bot.slugId}*\n`;
    text += `   毛利润: ${formatCurrency(bot.grossProfit)} | 毛利率: ${bot.grossMarginPct.toFixed(1)}%\n`;
    text += `   收入: ${formatCurrency(bot.attributedRevenue)} | ${changeText}\n`;
    text += `   成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}/免费占比${freeCostPct.toFixed(1)}%）\n`;
    text += `   任务数: ${bot.totalTaskCount} | 任务均价: ${formatCurrency(avgCostPerTask)}\n`;
    text += `   订单数: ${bot.attributedOrderCount} | 订单均价: ${formatCurrency(bot.avgOrderAmount)}${orderChangeText}`;

    // 最近7天趋势
    text += format7DaysTrend(bot.last7Days || []);

    blocks.push(sectionBlock(text));
  });

  return {
    text: "毛利润最高 Top 10",
    blocks,
  };
}

/**
 * Thread 2: Top 10 最低毛利润 Bot
 */
function buildTopLosingMessage(data: DailyMarginAlertData): {
  text: string;
  blocks: SlackBlock[];
} | null {
  if (data.topLosingBots.length === 0) return null;

  const blocks: SlackBlock[] = [];
  blocks.push(sectionBlock(`*📉 毛利润最低 Top 10*`));

  // 每个 bot 使用独立的 block，避免超过 3000 字符限制
  data.topLosingBots.forEach((bot, i) => {
    const changeText = `${formatChange(bot.revenueDodChange, bot.revenueWowChange)}`;
    const avgCostPerTask = bot.totalTaskCount > 0 ? bot.totalCost / bot.totalTaskCount : 0;

    let text = `${i + 1}. *${bot.slugId}*\n`;
    text += `   毛利润: ${formatCurrency(bot.grossProfit)} | 毛利率: ${bot.grossMarginPct.toFixed(1)}%\n`;
    text += `   收入: ${formatCurrency(bot.attributedRevenue)} | ${changeText}\n`;
    text += `   成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）\n`;
    text += `   任务数: ${bot.totalTaskCount} | 任务均价: ${formatCurrency(avgCostPerTask)}`;

    if (bot.attributedRevenue === 0) {
      text += `\n   _建议: 考虑限制免费使用或下线_`;
    }

    // 最近7天趋势
    text += format7DaysTrend(bot.last7Days || []);

    blocks.push(sectionBlock(text));
  });

  return {
    text: "毛利润最低 Top 10",
    blocks,
  };
}

/**
 * Thread 3: 昨日无收入 Bot（Top 30 by cost）
 */
function buildNoRevenueMessage(data: DailyMarginAlertData): {
  text: string;
  blocks: SlackBlock[];
} | null {
  if (data.noRevenueBots.length === 0) return null;

  // 计算总任务数和按任务平均成本
  const totalTaskCount = data.noRevenueBots.reduce((sum, bot) => sum + bot.totalTaskCount, 0);
  const avgCostPerTask = totalTaskCount > 0
    ? data.noRevenueBotsTotalCost / totalTaskCount
    : 0;

  const blocks: SlackBlock[] = [];
  blocks.push(sectionBlock(
    `*🚫 昨日无收入 Bot (Top 30 by cost)*\n总成本: ${formatCurrency(data.noRevenueBotsTotalCost)} | 任务数: ${totalTaskCount} | 任务平均成本: ${formatCurrency(avgCostPerTask)}`
  ));

  // 分批显示，每个 block 最多10个 bot
  const batchSize = 10;
  for (let i = 0; i < data.noRevenueBots.length; i += batchSize) {
    const batch = data.noRevenueBots.slice(i, i + batchSize);
    const lines = batch.map((bot, idx) => {
      const botAvgCost = bot.totalTaskCount > 0 ? bot.totalCost / bot.totalTaskCount : 0;
      return `${i + idx + 1}. *${bot.slugId}*\n   成本: ${formatCurrency(bot.totalCost)} | 任务数: ${bot.totalTaskCount} | 任务均价: ${formatCurrency(botAvgCost)}`;
    });
    blocks.push(sectionBlock(lines.join("\n\n")));
  }

  return {
    text: `昨日无收入 Bot (共 ${data.noRevenueBots.length} 个)`,
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

    console.log(`[daily-margin-alert] Starting${targetDate ? ` for ${targetDate}` : ""}`);

    // 1. 获取数据
    const alertData = await getDailyMarginAlert(targetDate);

    // 2. 发送主消息
    const channelId = process.env.SLACK_CHANNEL_MARGIN_ID;
    const mainMessage = buildMainMessage(alertData);
    const threadTs = await sendSlackMessage(mainMessage, undefined, channelId);

    // 3. 发送详情到 thread
    if (threadTs) {
      // 3.1 Top 10 最高毛利润
      const topProfitableMessage = buildTopProfitableMessage(alertData);
      if (topProfitableMessage) {
        await sendSlackMessage(topProfitableMessage, threadTs, channelId);
      }

      // 3.2 Top 10 最低毛利润
      const topLosingMessage = buildTopLosingMessage(alertData);
      if (topLosingMessage) {
        await sendSlackMessage(topLosingMessage, threadTs, channelId);
      }

      // 3.3 昨日无收入 Bot
      const noRevenueMessage = buildNoRevenueMessage(alertData);
      if (noRevenueMessage) {
        await sendSlackMessage(noRevenueMessage, threadTs, channelId);
      }
    }

    console.log(`[daily-margin-alert] Sent successfully for ${alertData.date}`);

    return res.status(200).json({
      success: true,
      date: alertData.date,
      summary: {
        totalCost: alertData.totalCost,
        totalRevenue: alertData.totalRevenue,
        grossProfit: alertData.grossProfit,
        grossMarginPct: alertData.grossMarginPct,
        topProfitableCount: alertData.topProfitableBots.length,
        topLosingCount: alertData.topLosingBots.length,
        noRevenueCount: alertData.noRevenueBots.length,
      },
    });
  } catch (error) {
    console.error("[daily-margin-alert] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

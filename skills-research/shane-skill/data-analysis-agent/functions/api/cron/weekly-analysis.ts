/**
 * Weekly Profit/Loss Analysis Alert
 *
 * Cron: 每周一北京时间 10:00 (UTC 2:00)
 *
 * 内容:
 * 1. 持续亏损 Bot（连续2周亏损）
 * 2. 白嫖严重 Bot（免费成本占比>80%）
 * 3. 持续盈利 Bot（连续2周盈利）
 * 4. 盈亏状态变化（转为亏损/转为盈利）
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWeeklyAnalysis, type WeeklyAnalysis, type LosingBot, type StatusChangeBot, type HeavyFreeUseBot, type ProfitableBot } from "../../lib/alerts.js";
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
// Message Formatting
// ============================================================================

function formatLosingBot(bot: LosingBot, index: number): string {
  return `${index + 1}. *${bot.botName}* | 毛利率: ${bot.grossMarginPercent.toFixed(1)}% | 收入: ${formatCurrency(bot.revenue)} | 成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）| 免费任务: ${bot.freeTaskPercent.toFixed(0)}%`;
}

function formatHeavyFreeUseBot(bot: HeavyFreeUseBot, index: number): string {
  const gmEmoji = bot.grossMarginPercent >= 0 ? "✅" : "⚠️";
  return `${index + 1}. *${bot.botName}* | 免费占比: ${bot.freeUserCostPercent.toFixed(0)}% | 毛利率: ${gmEmoji} ${bot.grossMarginPercent.toFixed(1)}% | 成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）`;
}

function formatProfitableBot(bot: ProfitableBot, index: number): string {
  return `${index + 1}. *${bot.botName}* | 毛利率: ${bot.grossMarginPercent.toFixed(1)}% | 毛利: ${formatCurrency(bot.grossProfit)} | 收入: ${formatCurrency(bot.revenue)} | 成本: ${formatCurrency(bot.totalCost)}`;
}

function formatStatusChangeBot(bot: StatusChangeBot, index: number): string {
  return `${index + 1}. *${bot.botName}* | ${bot.previousGrossMarginPercent.toFixed(1)}% → ${bot.currentGrossMarginPercent.toFixed(1)}% | 成本: ${formatCurrency(bot.totalCost)}（付费${formatCurrency(bot.paidUserCost)}/免费${formatCurrency(bot.freeUserCost)}）`;
}

function buildWeeklyAnalysisMessage(data: WeeklyAnalysis): { text: string; blocks: SlackBlock[] } {
  const blocks: SlackBlock[] = [];

  blocks.push(headerBlock(`📊 每周盈亏报告 ${data.weekStart} ~ ${data.weekEnd}`));
  blocks.push(contextBlock(`对比上周 ${data.previousWeekStart} ~ ${data.previousWeekEnd}`));
  blocks.push(dividerBlock());

  // 持续亏损 bot（连续2周）
  if (data.continuouslyLosingBots.length > 0) {
    blocks.push(sectionBlock(`*⚠️ 持续亏损 Bot（连续2周，${data.continuouslyLosingBots.length} 个，总亏损 ${formatCurrency(data.continuouslyLosingTotalLoss)}）*`));
    const firstBatch = data.continuouslyLosingBots.slice(0, 5);
    blocks.push(sectionBlock(firstBatch.map((b, i) => formatLosingBot(b, i)).join("\n")));

    if (data.continuouslyLosingBots.length > 5) {
      blocks.push(contextBlock(`_还有 ${data.continuouslyLosingBots.length - 5} 个，详见回复_`));
    }
  } else {
    blocks.push(sectionBlock("*✅ 持续亏损 Bot:* 无"));
  }

  blocks.push(dividerBlock());

  // 白嫖严重
  if (data.heavyFreeUseBots.length > 0) {
    blocks.push(sectionBlock(`*🆓 白嫖严重 Bot（免费成本>80%，${data.heavyFreeUseBots.length} 个，按占比降序）*`));
    const firstBatch = data.heavyFreeUseBots.slice(0, 5);
    blocks.push(sectionBlock(firstBatch.map((b, i) => formatHeavyFreeUseBot(b, i)).join("\n")));

    if (data.heavyFreeUseBots.length > 5) {
      blocks.push(contextBlock(`_还有 ${data.heavyFreeUseBots.length - 5} 个，详见回复_`));
    }
  } else {
    blocks.push(sectionBlock("*🆓 白嫖严重 Bot:* 无"));
  }

  blocks.push(dividerBlock());

  // 持续盈利
  if (data.continuouslyProfitableBots.length > 0) {
    blocks.push(sectionBlock(`*💰 持续盈利 Bot（连续2周，${data.continuouslyProfitableBots.length} 个）*`));
    const firstBatch = data.continuouslyProfitableBots.slice(0, 5);
    blocks.push(sectionBlock(firstBatch.map((b, i) => formatProfitableBot(b, i)).join("\n")));

    if (data.continuouslyProfitableBots.length > 5) {
      blocks.push(contextBlock(`_还有 ${data.continuouslyProfitableBots.length - 5} 个，详见回复_`));
    }
  } else {
    blocks.push(sectionBlock("*💰 持续盈利 Bot:* 无"));
  }

  blocks.push(dividerBlock());

  // 盈亏状态变化
  if (data.turnedLosing.length > 0) {
    blocks.push(sectionBlock(`*🔴 本周转为亏损（${data.turnedLosing.length} 个）*`));
    const losingLines = data.turnedLosing.slice(0, 5).map((b, i) => formatStatusChangeBot(b, i));
    blocks.push(sectionBlock(losingLines.join("\n")));
  } else {
    blocks.push(sectionBlock("*🔴 本周转为亏损:* 无"));
  }

  if (data.turnedProfitable.length > 0) {
    blocks.push(sectionBlock(`*🟢 本周转为盈利（${data.turnedProfitable.length} 个）*`));
    const profitableLines = data.turnedProfitable.slice(0, 5).map((b, i) => formatStatusChangeBot(b, i));
    blocks.push(sectionBlock(profitableLines.join("\n")));
  } else {
    blocks.push(sectionBlock("*🟢 本周转为盈利:* 无"));
  }

  blocks.push(dividerBlock());
  blocks.push(contextBlock(`生成时间: ${new Date().toISOString()}`));

  return {
    text: `每周盈亏报告 ${data.weekStart} ~ ${data.weekEnd}`,
    blocks,
  };
}

function buildThreadMessages(data: WeeklyAnalysis): Array<{ text: string; blocks: SlackBlock[] }> {
  const messages: Array<{ text: string; blocks: SlackBlock[] }> = [];

  // 持续亏损 bot 完整列表
  if (data.continuouslyLosingBots.length > 5) {
    const allLines = data.continuouslyLosingBots.map((b, i) => formatLosingBot(b, i));
    for (let i = 0; i < allLines.length; i += 10) {
      const batch = allLines.slice(i, i + 10);
      messages.push({
        text: `持续亏损 Bot 列表 (${Math.floor(i / 10) + 1})`,
        blocks: [
          sectionBlock(`*⚠️ 持续亏损 Bot 完整列表 (${i + 1}-${Math.min(i + 10, allLines.length)})*`),
          sectionBlock(batch.join("\n")),
        ],
      });
    }
  }

  // 白嫖严重 bot 完整列表
  if (data.heavyFreeUseBots.length > 5) {
    const allLines = data.heavyFreeUseBots.map((b, i) => formatHeavyFreeUseBot(b, i));
    for (let i = 0; i < allLines.length; i += 10) {
      const batch = allLines.slice(i, i + 10);
      messages.push({
        text: `白嫖严重 Bot 列表 (${Math.floor(i / 10) + 1})`,
        blocks: [
          sectionBlock(`*🆓 白嫖严重 Bot 完整列表 (${i + 1}-${Math.min(i + 10, allLines.length)})*`),
          sectionBlock(batch.join("\n")),
        ],
      });
    }
  }

  // 持续盈利 bot 完整列表
  if (data.continuouslyProfitableBots.length > 5) {
    const allLines = data.continuouslyProfitableBots.map((b, i) => formatProfitableBot(b, i));
    for (let i = 0; i < allLines.length; i += 10) {
      const batch = allLines.slice(i, i + 10);
      messages.push({
        text: `持续盈利 Bot 列表 (${Math.floor(i / 10) + 1})`,
        blocks: [
          sectionBlock(`*💰 持续盈利 Bot 完整列表 (${i + 1}-${Math.min(i + 10, allLines.length)})*`),
          sectionBlock(batch.join("\n")),
        ],
      });
    }
  }

  return messages;
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
    console.log(`[weekly-analysis] Starting`);

    // 1. 获取数据
    const analysisData = await getWeeklyAnalysis();

    // 2. 发送主消息
    const channelId = process.env.SLACK_CHANNEL_MARGIN_ID;
    const mainMessage = buildWeeklyAnalysisMessage(analysisData);
    const threadTs = await sendSlackMessage(mainMessage, undefined, channelId);

    // 3. 发送详细内容到 thread
    if (threadTs) {
      const threadMessages = buildThreadMessages(analysisData);
      for (const msg of threadMessages) {
        await sendSlackMessage(msg, threadTs, channelId);
      }
    }

    console.log(`[weekly-analysis] Sent successfully for ${analysisData.weekStart} ~ ${analysisData.weekEnd}`);

    return res.status(200).json({
      success: true,
      weekStart: analysisData.weekStart,
      weekEnd: analysisData.weekEnd,
      summary: {
        continuouslyLosingBots: analysisData.continuouslyLosingBots.length,
        continuouslyLosingTotalLoss: analysisData.continuouslyLosingTotalLoss,
        heavyFreeUseBots: analysisData.heavyFreeUseBots.length,
        continuouslyProfitableBots: analysisData.continuouslyProfitableBots.length,
        turnedLosing: analysisData.turnedLosing.length,
        turnedProfitable: analysisData.turnedProfitable.length,
      },
    });
  } catch (error) {
    console.error("[weekly-analysis] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

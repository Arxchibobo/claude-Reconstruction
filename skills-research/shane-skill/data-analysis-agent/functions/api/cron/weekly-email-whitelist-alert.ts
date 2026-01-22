/**
 * Weekly Email Whitelist Alert
 *
 * Cron: 每周五北京时间 10:05 (UTC 2:05)
 *
 * 内容:
 * - 显示最近一周活跃但尚未在白名单/黑名单中的邮箱域名
 * - @ Lucas 和 Yunhai 审核
 * - 生成 prompt 供 Claude Code 分析，识别临时邮箱和正常邮箱
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getActiveEmailDomains } from "../../lib/active-email-domains.js";
import {
  sendSlackMessage,
  headerBlock,
  sectionBlock,
  dividerBlock,
  contextBlock,
  type SlackBlock,
} from "../../lib/slack.js";

// ============================================================================
// Message Formatting
// ============================================================================

function buildAnalysisPrompt(
  domains: Array<{ domain: string; activeUsers: number }>
): string {
  const domainList = domains.map((d) => d.domain).join(",");

  return `分析以下邮箱域名，识别临时邮箱/可疑域名/仿冒域名/正常域名，给出黑名单和白名单建议：

${domainList}`;
}

function buildAlertMessage(
  suggestedDomains: Array<{ domain: string; activeUsers: number }>,
  whitelistCount: number,
  days: number,
  mentionUserIds: string[]
): {
  text: string;
  blocks: SlackBlock[];
} {
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push(headerBlock(`📧 新活跃邮箱域名待分析`));
  blocks.push(dividerBlock());

  // @ 用户
  if (mentionUserIds.length > 0) {
    const mentions = mentionUserIds.map((id) => `<@${id}>`).join(" ");
    blocks.push(
      sectionBlock(
        `${mentions} 发现新的活跃邮箱域名，请使用 Claude Code 分析`
      )
    );
  }

  // 统计信息
  blocks.push(
    sectionBlock(
      `*统计信息*\n` +
        `• 查询范围: 最近 ${days} 天活跃用户\n` +
        `• 当前白名单域名数: ${whitelistCount}\n` +
        `• 待分析域名数: ${suggestedDomains.length}\n` +
        `📊 <https://domain-auditor-5eac423d.base44.app/|域名审计工具>`
    )
  );

  blocks.push(dividerBlock());

  if (suggestedDomains.length === 0) {
    blocks.push(sectionBlock(`✅ 没有新的域名需要分析`));
  } else {
    // 生成分析 prompt
    const prompt = buildAnalysisPrompt(suggestedDomains);

    blocks.push(
      sectionBlock(
        `*使用方法:* 复制下方文本，粘贴到 Claude Code 进行智能分析 👇`
      )
    );

    // 将 prompt 放入代码块，方便复制
    // Slack 代码块最大约 3000 字符，需要分段
    const maxLen = 2900;
    if (prompt.length <= maxLen) {
      blocks.push(sectionBlock("```\n" + prompt + "\n```"));
    } else {
      // 分段显示
      blocks.push(sectionBlock("```\n" + prompt.slice(0, maxLen) + "\n```"));
      blocks.push(sectionBlock("```\n" + prompt.slice(maxLen) + "\n```"));
    }
  }

  blocks.push(dividerBlock());
  blocks.push(
    contextBlock(
      `生成时间: ${new Date().toISOString()} | 筛选条件: 活跃用户 ≥ 3`
    )
  );

  return {
    text: `新活跃邮箱域名待分析 - ${suggestedDomains.length} 个域名`,
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
    console.log(`[weekly-email-whitelist-alert] Starting`);

    // 1. 获取数据
    const data = await getActiveEmailDomains(7, 3);

    // 2. 构建要 @ 的用户列表
    const mentionUserIds: string[] = [];
    if (process.env.SLACK_USER_LUCAS_ID) {
      mentionUserIds.push(process.env.SLACK_USER_LUCAS_ID);
    }
    if (process.env.SLACK_USER_YUNHAI_ID) {
      mentionUserIds.push(process.env.SLACK_USER_YUNHAI_ID);
    }

    // 3. 发送消息
    const channelId = process.env.SLACK_CHANNEL_MARGIN_ID;
    const message = buildAlertMessage(
      data.suggestedDomains,
      data.whitelistCount,
      data.days,
      mentionUserIds
    );

    await sendSlackMessage(message, undefined, channelId);

    console.log(
      `[weekly-email-whitelist-alert] Sent successfully, ${data.suggestedDomains.length} domains suggested`
    );

    return res.status(200).json({
      success: true,
      suggestedCount: data.suggestedDomains.length,
      whitelistCount: data.whitelistCount,
      domains: data.suggestedDomains.slice(0, 10), // 只返回前10个预览
    });
  } catch (error) {
    console.error("[weekly-email-whitelist-alert] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

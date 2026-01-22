/**
 * Slack API Utility
 *
 * 发送消息到 Slack channel
 * 使用 @slack/web-api SDK
 *
 * 环境变量:
 * - SLACK_BOT_TOKEN: Bot User OAuth Token (xoxb-...)
 * - SLACK_CHANNEL_MARGIN_ID: 毛利率/业务报告频道
 * - SLACK_CHANNEL_IOS_ID: iOS/登录报告频道
 */

import { WebClient, type Block, type KnownBlock } from "@slack/web-api";

// Lazy init client (for serverless)
let client: WebClient | null = null;

function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;

  if (!client) {
    client = new WebClient(token);
  }
  return client;
}

export type SlackBlock = Block | KnownBlock;

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
}

/**
 * 发送消息到 Slack
 * @param message - 消息内容
 * @param threadTs - 可选的 thread 时间戳，用于回复
 * @param channelId - 必需的 channel ID（如 SLACK_CHANNEL_MARGIN_ID 或 SLACK_CHANNEL_IOS_ID）
 * @returns message timestamp (ts)，可用于 thread 回复
 */
export async function sendSlackMessage(
  message: SlackMessage,
  threadTs?: string,
  channelId?: string
): Promise<string | undefined> {
  const slackClient = getClient();

  if (!slackClient) {
    console.warn("[slack] SLACK_BOT_TOKEN not configured, skipping notification");
    return undefined;
  }

  if (!channelId) {
    console.warn("[slack] channelId not provided, skipping notification");
    return undefined;
  }

  const result = await slackClient.chat.postMessage({
    channel: channelId,
    text: message.text ?? "",
    ...(message.blocks && { blocks: message.blocks }),
    ...(threadTs && { thread_ts: threadTs }),
    unfurl_links: false,
    unfurl_media: false,
  });

  if (!result.ok) {
    throw new Error(`Slack API failed: ${result.error}`);
  }

  console.log(`[slack] Message sent to ${channelId}, ts: ${result.ts}`);
  return result.ts;
}

/**
 * 创建标题 block
 */
export function headerBlock(text: string): KnownBlock {
  return {
    type: "header",
    text: {
      type: "plain_text",
      text,
      emoji: true,
    },
  };
}

/**
 * 创建 section block
 */
export function sectionBlock(text: string): KnownBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
}

/**
 * 创建分隔线
 */
export function dividerBlock(): KnownBlock {
  return { type: "divider" };
}

/**
 * 创建 context block (小字注释)
 */
export function contextBlock(text: string): KnownBlock {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text,
      },
    ],
  };
}

/**
 * 格式化数字 (添加千分位分隔符)
 */
export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化百分比变化
 */
export function formatChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+∞%" : "0%";
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? "+" : "";
  const emoji = change > 0 ? "📈" : change < 0 ? "📉" : "➡️";
  return `${emoji} ${sign}${change.toFixed(1)}%`;
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number): string {
  return `$${formatNumber(amount)}`;
}

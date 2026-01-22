/**
 * Auth Success Rate Alert
 *
 * Cron: 每天北京时间 10:00 (UTC 2:00)
 *
 * 内容:
 * 1. 统计最近 24 小时的登录成功率
 * 2. auth_success_art 代表登录成功
 * 3. error_message 包含特定条件的也算成功
 * 4. auth_error_art 算失败
 * 5. 列出错误原因和占比
 */

import "../../lib/suppress-warnings.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  sendSlackMessage,
  headerBlock,
  sectionBlock,
  dividerBlock,
  contextBlock,
  formatNumber,
  type SlackBlock,
} from "../../lib/slack.js";

// ============================================================================
// Types
// ============================================================================

interface AuthMetrics {
  totalAttempts: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  specialSuccessCount: number; // 特殊成功计数
  errorReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  specialSuccessReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  successQueryUrl?: string; // Honeycomb 成功查询链接
  errorQueryUrl?: string; // Honeycomb 失败查询链接
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * 特殊的 error_message 列表：这些错误也视为成功
 *
 * 原因：
 * - invalid_credentials: 用户输入错误凭证，说明认证流程正常工作
 * - attempted_submit_otp_before_sending: 用户尝试提前提交 OTP，说明 UI 正常
 * - too_many_requests: 说明系统保护机制正常工作
 * - Verification code must have 6 digits: 输入验证正常工作
 * - login_with_oauth_was_cancelled_by_user: 用户主动取消 OAuth 登录，系统正常
 * - Unexpected auth flow. This may be a phishing attempt.: 安全检测机制正常工作
 */
const SPECIAL_SUCCESS_ERROR_MESSAGES = [
  "invalid_credentials",
  "attempted_submit_otp_before_sending",
  "too_many_requests",
  "Verification code must have 6 digits",
  "login_with_oauth_was_cancelled_by_user",
  "Unexpected auth flow. This may be a phishing attempt.",
];

/**
 * 检查 error_message 是否应该视为成功
 */
function isSpecialSuccessError(errorMessage: string): boolean {
  return SPECIAL_SUCCESS_ERROR_MESSAGES.some(msg =>
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
}

/**
 * 使用 MCP Honeycomb 工具查询登录数据
 */
async function getAuthMetrics(): Promise<AuthMetrics> {
  const { callMCPTool } = await import("../../lib/mcp/client.js");

  // 计算北京时间昨天的时间范围
  const beijingOffset = 8 * 60 * 60 * 1000; // UTC+8
  const now = new Date();
  const beijingNow = new Date(now.getTime() + beijingOffset);

  // 昨天 00:00:00（北京时间）
  const yesterdayStart = new Date(beijingNow);
  yesterdayStart.setUTCHours(0 - 8, 0, 0, 0); // 北京时间 00:00 = UTC 16:00（前一天）
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

  // 今天 00:00:00（北京时间） = 昨天 23:59:59 的结束
  const yesterdayEnd = new Date(beijingNow);
  yesterdayEnd.setUTCHours(0 - 8, 0, 0, 0);

  // Honeycomb 需要 Unix 时间戳（秒）
  const startTime = Math.floor(yesterdayStart.getTime() / 1000);
  const endTime = Math.floor(yesterdayEnd.getTime() / 1000);

  console.log(`[auth-success-alert] Query time range (Beijing Yesterday): ${yesterdayStart.toISOString()} ~ ${yesterdayEnd.toISOString()}`);
  console.log(`[auth-success-alert] Unix timestamps: ${startTime} ~ ${endTime}`);

  // 1. 查询成功的登录（auth_success_art）
  const successQuerySpec = {
    start_time: startTime,
    end_time: endTime,
    filters: [
      {
        column: "name",
        op: "=",
        value: "auth_success_art"
      }
    ],
    calculations: [
      { op: "COUNT" as const }
    ]
  };

  // 2. 查询失败的登录（auth_error_art），按 error_message 分组
  const errorQuerySpec = {
    start_time: startTime,
    end_time: endTime,
    filters: [
      {
        column: "name",
        op: "=",
        value: "auth_error_art"
      }
    ],
    breakdowns: ["error_message"],
    calculations: [
      { op: "COUNT" as const }
    ]
  };

  try {
    // 执行查询
    const [successResponse, errorResponse] = await Promise.all([
      callMCPTool("honeycomb-run_query", {
        environment_slug: "dev",
        dataset_slug: "test-servicename",
        query_spec: successQuerySpec,
      }) as Promise<string>,
      callMCPTool("honeycomb-run_query", {
        environment_slug: "dev",
        dataset_slug: "test-servicename",
        query_spec: errorQuerySpec,
      }) as Promise<string>,
    ]);

    // 解析响应
    const successData = parseHoneycombResponse(successResponse);
    const errorData = parseHoneycombResponse(errorResponse);

    // 输出 Honeycomb 查询链接
    if (successData.query_url) {
      console.log(`[auth-success-alert] Success query URL: ${successData.query_url}`);
    }
    if (errorData.query_url) {
      console.log(`[auth-success-alert] Error query URL: ${errorData.query_url}`);
    }

    let successCount = successData.results.length > 0
      ? (successData.results[0].COUNT as number) || 0
      : 0;

    let errorCount = 0;
    let specialSuccessCount = 0; // 特殊的成功计数
    const errorReasons: Array<{ reason: string; count: number; percentage: number }> = [];
    const specialSuccessReasons: Array<{ reason: string; count: number; percentage: number }> = [];

    // 处理错误详情
    for (const row of errorData.results) {
      const count = (row.COUNT as number) || 0;
      const errorMessage = (row.error_message as string) || "Unknown";

      // 跳过 Honeycomb 的汇总行
      if (errorMessage.toUpperCase() === "TOTAL" || errorMessage === "" || !errorMessage) {
        continue;
      }

      // 检查是否是特殊的成功情况
      if (isSpecialSuccessError(errorMessage)) {
        specialSuccessCount += count;
        // 放到特殊成功列表中
        specialSuccessReasons.push({
          reason: errorMessage,
          count,
          percentage: 0, // 稍后计算
        });
      } else {
        errorCount += count;
        errorReasons.push({
          reason: errorMessage,
          count,
          percentage: 0, // 稍后计算
        });
      }
    }

    // 将特殊情况计入成功
    successCount += specialSuccessCount;

    // 计算真实失败的百分比
    for (const error of errorReasons) {
      error.percentage = errorCount > 0 ? (error.count / errorCount) * 100 : 0;
    }

    // 计算特殊成功的百分比（基于总错误事件数）
    const totalErrorEvents = errorCount + specialSuccessCount;
    for (const specialSuccess of specialSuccessReasons) {
      specialSuccess.percentage = totalErrorEvents > 0 ? (specialSuccess.count / totalErrorEvents) * 100 : 0;
    }

    // 按出现次数排序
    errorReasons.sort((a, b) => b.count - a.count);
    specialSuccessReasons.sort((a, b) => b.count - a.count);

    const totalAttempts = successCount + errorCount;
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    console.log(`[auth-success-alert] Stats: total=${totalAttempts}, success=${successCount} (special=${specialSuccessCount}), error=${errorCount}`);

    return {
      totalAttempts,
      successCount,
      errorCount,
      successRate,
      specialSuccessCount,
      errorReasons,
      specialSuccessReasons,
      successQueryUrl: successData.query_url,
      errorQueryUrl: errorData.query_url,
    };
  } catch (error) {
    console.error("[auth-success-alert] Error fetching data from Honeycomb:", error);
    throw error;
  }
}

/**
 * 解析 Honeycomb 响应（支持 ASCII 和 JSON 格式）
 */
function parseHoneycombResponse(responseText: string): {
  results: Array<Record<string, unknown>>;
  query_url?: string;
  query_pk?: string;
} {
  // 尝试解析 ASCII 表格格式
  if (responseText.trim().startsWith("#")) {
    return parseAsciiResponse(responseText);
  }

  // 尝试 JSON 格式
  try {
    const jsonParsed = JSON.parse(responseText);
    return {
      results: jsonParsed.results || [],
      query_url: jsonParsed.query_url,
      query_pk: jsonParsed.query_pk,
    };
  } catch (error) {
    console.error("[auth-success-alert] Failed to parse Honeycomb response");
    console.error("[auth-success-alert] Response preview (first 500 chars):", responseText.substring(0, 500));
    throw new Error(`Failed to parse Honeycomb response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 解析 ASCII 表格格式的 Honeycomb 响应
 */
function parseAsciiResponse(asciiText: string): {
  results: Array<Record<string, unknown>>;
  query_url?: string;
  query_pk?: string;
} {
  const lines = asciiText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: Array<Record<string, unknown>> = [];
  let headers: string[] = [];
  let inResultsSection = false;
  let query_url: string | undefined;
  let query_pk: string | undefined;

  for (const line of lines) {
    if (line === "# Results") {
      inResultsSection = true;
      continue;
    }

    if (line.startsWith("#") && line !== "# Results") {
      inResultsSection = false;
      continue;
    }

    if (line.includes("query_url:")) {
      const match = line.match(/query_url:\s*"([^"]+)"/);
      if (match) query_url = match[1];
      continue;
    }

    if (line.includes("query_run_pk:")) {
      const match = line.match(/query_run_pk:\s*(\S+)/);
      if (match) query_pk = match[1];
      continue;
    }

    if (inResultsSection && line.startsWith("|")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.length > 0 && cells[0].includes("---")) {
        continue;
      }

      if (headers.length === 0) {
        headers = cells;
        continue;
      }

      if (cells.length > 0) {
        const row: Record<string, unknown> = {};

        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const value = cells[j];

          if (value && !isNaN(Number(value))) {
            row[header] = Number(value);
          } else {
            row[header] = value || null;
          }
        }

        results.push(row);
      }
    }
  }

  return { results, query_url, query_pk };
}

// ============================================================================
// Message Formatting
// ============================================================================

function buildAuthAlertMessage(data: AuthMetrics): { text: string; blocks: SlackBlock[] } {
  const blocks: SlackBlock[] = [];

  // 标题 - 显示昨天的日期（北京时间）
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset);

  // 昨天日期（北京时间）
  const yesterdayBeijing = new Date(beijingNow);
  yesterdayBeijing.setUTCDate(yesterdayBeijing.getUTCDate() - 1);
  const dateStr = yesterdayBeijing.toISOString().split("T")[0];

  blocks.push(headerBlock(`🔐 ${dateStr} 登录成功率报告`));
  blocks.push(dividerBlock());

  // 整体概览
  const successEmoji = data.successRate >= 95 ? "✅" : data.successRate >= 90 ? "⚠️" : "🚨";
  const successNote = data.specialSuccessCount > 0
    ? ` (含特殊成功 ${formatNumber(data.specialSuccessCount, 0)} 次)`
    : "";
  const overviewLines = [
    `*总登录尝试次数:* ${formatNumber(data.totalAttempts, 0)}`,
    `*成功次数:* ${formatNumber(data.successCount, 0)}${successNote}`,
    `*失败次数:* ${formatNumber(data.errorCount, 0)}`,
    `*成功率:* ${successEmoji} ${data.successRate.toFixed(2)}%`,
  ];
  blocks.push(sectionBlock(overviewLines.join("\n")));

  // 特殊成功情况（小字提示）
  if (data.specialSuccessCount > 0) {
    blocks.push(dividerBlock());

    // 只显示简单提示，不列出详细 reason
    const tip = `_✅ 已将 ${formatNumber(data.specialSuccessCount, 0)} 个预期的用户错误计入成功（包括 invalid_credentials、too_many_requests 等系统正常工作的情况）_`;
    blocks.push(contextBlock(tip));
  }

  blocks.push(dividerBlock());

  // 时间范围和查询链接
  const contextLines: string[] = [
    `生成时间: ${now.toISOString()} | 数据时间范围: 北京时间 ${dateStr} 00:00 ~ 23:59`
  ];

  if (data.successQueryUrl || data.errorQueryUrl) {
    contextLines.push(""); // 空行分隔
    if (data.successQueryUrl) {
      contextLines.push(`📊 <${data.successQueryUrl}|成功登录查询>`);
    }
    if (data.errorQueryUrl) {
      contextLines.push(`📊 <${data.errorQueryUrl}|失败登录查询>`);
    }
  }

  blocks.push(contextBlock(contextLines.join("\n")));

  // 调试：检查每个 block 的长度
  blocks.forEach((block, idx) => {
    const blockStr = JSON.stringify(block);
    if (blockStr.length > 2000) {
      console.log(`[auth-success-alert] Block ${idx} is too long: ${blockStr.length} characters`);
      if (block.type === "section" && block.text) {
        console.log(`[auth-success-alert] Block ${idx} text preview: ${block.text.text.substring(0, 200)}...`);
      }
      if (block.type === "context" && block.elements) {
        console.log(`[auth-success-alert] Block ${idx} context preview: ${JSON.stringify(block.elements).substring(0, 200)}...`);
      }
    }
  });

  return {
    text: `${dateStr} 登录成功率报告`,
    blocks,
  };
}

/**
 * 构建失败原因详情消息（Thread）
 */
function buildErrorReasonsMessage(data: AuthMetrics): { text: string; blocks: SlackBlock[] } | null {
  if (data.errorReasons.length === 0) {
    return null;
  }

  const blocks: SlackBlock[] = [];

  blocks.push(headerBlock(`❌ 失败原因统计（Top 10）`));
  blocks.push(dividerBlock());

  const errorLines = data.errorReasons.slice(0, 10).map((error, idx) => {
    // 截断过长的错误信息（避免超过 Slack 3000 字符限制）
    const maxReasonLength = 200;
    const reason = error.reason || "Unknown";
    const truncatedReason = reason.length > maxReasonLength
      ? reason.substring(0, maxReasonLength) + "..."
      : reason;

    return `${idx + 1}. *${truncatedReason}*\n   出现次数: ${formatNumber(error.count, 0)} | 占比: ${error.percentage.toFixed(2)}%`;
  });

  blocks.push(sectionBlock(errorLines.join("\n\n")));

  return {
    text: "失败原因统计",
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
    console.log("[auth-success-alert] Starting");

    // 1. 获取登录数据
    const authMetrics = await getAuthMetrics();

    // 2. 发送主消息
    const channelId = process.env.SLACK_CHANNEL_IOS_ID;
    const mainMessage = buildAuthAlertMessage(authMetrics);
    const threadTs = await sendSlackMessage(mainMessage, undefined, channelId);

    // 3. 发送失败原因详情到 thread
    if (threadTs) {
      const errorReasonsMessage = buildErrorReasonsMessage(authMetrics);
      if (errorReasonsMessage) {
        await sendSlackMessage(errorReasonsMessage, threadTs, channelId);
      }
    }

    console.log("[auth-success-alert] Sent successfully");

    return res.status(200).json({
      success: true,
      metrics: authMetrics,
    });
  } catch (error) {
    console.error("[auth-success-alert] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

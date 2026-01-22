/**
 * MCP Client - 基于 @modelcontextprotocol/sdk
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL!;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN!;

let mcpClient: Client | null = null;

/**
 * 获取 MCP Client (单例)
 */
async function getMCPClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${MCP_AUTH_TOKEN}`,
      },
    },
  });

  const client = new Client(
    { name: "functions-mcp-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("[MCP] Connected to server");

  mcpClient = client;
  return client;
}

/**
 * 关闭 MCP 连接
 */
export async function closeMCPClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    console.log("[MCP] Connection closed");
  }
}

/**
 * 调用 MCP Tool
 */
export async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = await getMCPClient();

  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });

  const content = result.content as Array<{ type: string; text: string }>;
  if (!content || content.length === 0 || content[0].type !== "text") {
    throw new Error("Invalid response from MCP tool");
  }

  return content[0].text;
}

/**
 * 执行 SQL 查询 (通过 Bytebase MCP)
 */
export async function executeSQL<T = unknown>(sql: string): Promise<T[]> {
  const responseText = (await callMCPTool("bytebase-execute_sql", {
    sql,
  })) as string;

  const response = JSON.parse(responseText);
  if (!response.success) {
    throw new Error(`SQL query failed: ${JSON.stringify(response)}`);
  }

  return response.data.rows as T[];
}

/**
 * 查询 Honeycomb (通过 MCP)
 */
export async function queryHoneycomb(
  querySpec: Record<string, unknown>
): Promise<{
  results: Array<Record<string, unknown>>;
  query_url?: string;
  query_pk?: string;
}> {
  const responseText = (await callMCPTool("honeycomb-run_query", {
    environment_slug: "dev",
    dataset_slug: "myshell-art-web",
    query_spec: querySpec,
  })) as string;

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
  } catch {
    throw new Error(`Failed to parse Honeycomb response`);
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

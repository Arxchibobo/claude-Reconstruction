filename:base44_prompt_mcphub.md

激活 base44 Backend Functions
通过 mcp 方式连接数据源

```js
// import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Client } from 'npm:@modelcontextprotocol/sdk@1.24.3/client/index.js';
import { StreamableHTTPClientTransport } from 'npm:@modelcontextprotocol/sdk@1.24.3/client/streamableHttp.js';
// 执行 SQL 查询
async function executeSQL(client, sql) {
  console.log(`🔍 Executing SQL query: ${sql.substring(0, 100)}...`);

  try {
    const result = await client.callTool({
      name: "bytebase-execute_sql",
      arguments: {
        sql: sql.trim()
      }
    });

    console.log('📦 Received result from MCP');

    const content = result.content;
    if (!content || content.length === 0) {
      throw new Error("Empty response from SQL query");
    }

    if (content[0].type !== "text") {
      throw new Error(`Unexpected content type: ${content[0].type}`);
    }

    const response = JSON.parse(content[0].text);
    if (!response.success) {
      throw new Error(`SQL query failed: ${JSON.stringify(response)}`);
    }

    console.log(`✅ Query returned ${response.data?.rows?.length || 0} rows`);
    return response.data.rows || [];
  } catch (error) {
    console.error("❌ SQL execution error:", error.message);
    throw error;
  }
}


Deno.serve(async (req) => {
  try {
    console.log('📊 Starting bot revenue analysis...');

    // 解析 URL 参数获取时间范围
    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date') || '2025-12-01';
    const endDate = url.searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    console.log(`📅 Time range: ${startDate} to ${endDate}`);
    console.log('📊 Connecting to MCP Hub...');

    // 创建 MCP 客户端 - 添加更完整的配置
    const transport = new StreamableHTTPClientTransport(
      new URL("http://52.12.230.109:3000/mcp"),
      {
              requestInit: {
                headers: {
                  "Authorization": "Bearer <secret>"
                }
              }
            }
    );

    const mcpClient = new Client(
      {
        name: "bot-revenue-client",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {},
          sampling: {}
        }
      }
    );

    await mcpClient.connect(transport);
    console.log('✅ Connected to MCP server');

    // todo 补充逻辑
});

```

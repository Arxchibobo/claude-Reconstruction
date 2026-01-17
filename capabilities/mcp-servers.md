# MCP Servers 完整指南

> **MCP (Model Context Protocol)**: 让 Claude 访问外部数据和服务

---

## 概览

MCP Servers 是 Claude Code 访问外部数据的主要方式。每个 MCP Server 提供特定领域的功能。

### 核心 MCP Servers

| MCP Server | 用途 | 典型场景 |
|-----------|------|---------|
| **database** | 数据库查询 | SQL 查询、数据分析 |
| **observability** | 可观测性 | Traces、监控、性能分析 |
| **chart** | 图表生成 | 数据可视化 |
| **playwright** | 浏览器自动化 | E2E 测试、截图 |
| **stripe** | 支付集成 | 支付流程、订阅管理 |
| **supabase** | 后端服务 | 数据库、边缘函数 |
| **context7** | 文档搜索 | 最新技术文档 |
| **firebase** | Firebase 服务 | 项目管理、部署 |

---

## Database MCP（数据库）

### 功能列表

| 函数 | 用途 |
|-----|------|
| `execute_sql` | 执行 SQL 查询 |
| `search_objects` | 搜索数据库对象（表、列、索引等）|

### 使用示例

```javascript
// 执行 SQL 查询
database_execute_sql({
  sql: `
    WITH recent_orders AS (
      SELECT user_id, SUM(total) as total_spent
      FROM orders
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY user_id
    )
    SELECT u.name, ro.total_spent
    FROM users u
    JOIN recent_orders ro ON u.id = ro.user_id
    ORDER BY ro.total_spent DESC
    LIMIT 10
  `
});

// 搜索数据库对象
database_search_objects({
  object_type: 'table',
  pattern: 'user%',
  detail_level: 'summary'
});
```

### 最佳实践

1. **使用 CTE 预过滤** - 避免全表扫描
2. **限制返回行数** - 总是加 LIMIT
3. **避免 SELECT *** - 只选需要的列

---

## Observability MCP（可观测性）

### 功能列表

| 函数 | 用途 |
|-----|------|
| `run_query` | 执行监控查询 |
| `get_trace` | 获取分布式 trace |
| `get_dataset` | 获取数据集信息 |
| `get_dataset_columns` | 获取字段列表 |
| `find_queries` | 搜索历史查询 |
| `get_workspace_context` | 获取工作区上下文 |

### 使用示例

```javascript
// 查询 API 延迟 P95
observability_run_query({
  environment_slug: 'production',
  dataset_slug: 'api-logs',
  query_spec: {
    calculations: [
      { op: 'P95', column: 'duration_ms' }
    ],
    filters: [
      { column: 'service.name', op: '=', value: 'api-server' }
    ],
    breakdowns: ['http.route'],
    time_range: 3600,
    limit: 10
  }
});

// 获取特定 trace
observability_get_trace({
  environment_slug: 'production',
  trace_id: 'abc123def456'
});
```

### 常用查询模式

```javascript
// 错误率统计
{
  calculations: [
    { op: 'COUNT' },
    { op: 'COUNT', column: 'error' }
  ],
  time_range: 3600
}

// 按服务分组的延迟
{
  calculations: [{ op: 'P95', column: 'duration_ms' }],
  breakdowns: ['service.name'],
  time_range: 7200
}
```

---

## Chart MCP（图表生成）

### 功能列表

| 函数 | 用途 |
|-----|------|
| `generate_line_chart` | 趋势图、时间序列 |
| `generate_bar_chart` | 对比图、分类数据 |
| `generate_pie_chart` | 占比图、份额分析 |
| `generate_funnel_chart` | 漏斗图、转化分析 |
| `generate_waterfall_chart` | 瀑布图、增减分析 |

### 使用示例

```javascript
// 折线图：收入趋势
chart_generate_line_chart({
  data: [
    { time: '2026-01', value: 10000 },
    { time: '2026-02', value: 12000 },
    { time: '2026-03', value: 15000 }
  ],
  title: '月度收入趋势',
  axisXTitle: '月份',
  axisYTitle: '收入 (USD)',
  width: 800,
  height: 400
});

// 柱状图：分类对比
chart_generate_bar_chart({
  data: [
    { category: '产品A', value: 100 },
    { category: '产品B', value: 150 },
    { category: '产品C', value: 80 }
  ],
  title: '产品销量对比',
  axisXTitle: '产品',
  axisYTitle: '销量'
});

// 饼图：市场份额
chart_generate_pie_chart({
  data: [
    { category: '市场A', value: 45 },
    { category: '市场B', value: 30 },
    { category: '市场C', value: 25 }
  ],
  title: '市场份额分布',
  innerRadius: 0.6  // 环形图
});

// 漏斗图：转化率
chart_generate_funnel_chart({
  data: [
    { category: '访问', value: 10000 },
    { category: '注册', value: 3000 },
    { category: '付费', value: 500 }
  ],
  title: '用户转化漏斗'
});
```

### 配置选项

```javascript
{
  // 尺寸
  width: 800,    // 默认 600
  height: 400,   // 默认 400

  // 标题
  title: '图表标题',
  axisXTitle: 'X轴标题',
  axisYTitle: 'Y轴标题',

  // 主题
  theme: 'default',  // default, academy, dark

  // 样式
  style: {
    backgroundColor: '#fff',
    palette: ['#1890ff', '#52c41a', '#faad14'],
    texture: 'default'  // default, rough (手绘风格)
  }
}
```

---

## Playwright MCP（浏览器自动化）

### 功能列表

| 函数 | 用途 |
|-----|------|
| `browser_navigate` | 导航到 URL |
| `browser_snapshot` | 获取页面快照（可访问性树）|
| `browser_click` | 点击元素 |
| `browser_type` | 输入文本 |
| `browser_take_screenshot` | 截图 |
| `browser_console_messages` | 获取控制台日志 |
| `browser_network_requests` | 获取网络请求 |

### 使用示例

```javascript
// 导航到页面
playwright_browser_navigate({
  url: 'https://example.com'
});

// 获取页面快照（用于了解页面结构）
playwright_browser_snapshot({});

// 点击按钮
playwright_browser_click({
  element: 'Login button',
  ref: 'button[type="submit"]'
});

// 输入文本
playwright_browser_type({
  element: 'Email input',
  ref: 'input[name="email"]',
  text: 'user@example.com'
});

// 截图
playwright_browser_take_screenshot({
  filename: 'homepage.png',
  fullPage: true
});
```

---

## Supabase MCP（后端服务）

### 功能列表

| 函数 | 用途 |
|-----|------|
| `list_projects` | 列出所有项目 |
| `execute_sql` | 执行 SQL |
| `apply_migration` | 应用数据库迁移 |
| `deploy_edge_function` | 部署边缘函数 |
| `list_edge_functions` | 列出边缘函数 |

### 使用示例

```javascript
// 列出项目
supabase_list_projects({});

// 执行 SQL
supabase_execute_sql({
  project_id: 'your-project-id',
  query: 'SELECT * FROM users LIMIT 10'
});

// 部署边缘函数
supabase_deploy_edge_function({
  project_id: 'your-project-id',
  name: 'hello-world',
  entrypoint_path: 'index.ts',
  verify_jwt: true,
  files: [
    {
      name: 'index.ts',
      content: `
        import "jsr:@supabase/functions-js/edge-runtime.d.ts";

        Deno.serve(async (req: Request) => {
          return new Response(JSON.stringify({ message: "Hello!" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      `
    }
  ]
});
```

---

## 典型工作流

### 数据分析工作流

```
database 查询原始数据
    ↓
本地数据处理（聚合、计算、过滤）
    ↓
chart MCP 生成可视化
    ↓
content-writer 生成分析报告（可选）
```

### 调试优化工作流

```
observability 查询 traces/metrics
    ↓
定位性能瓶颈
    ↓
database 查询相关数据
    ↓
分析根因 → 修复问题
```

### E2E 测试工作流

```
playwright 导航到页面
    ↓
browser_snapshot 了解页面结构
    ↓
browser_click / browser_type 交互
    ↓
browser_take_screenshot 验证结果
```

---

## 配置说明

MCP Servers 通过 `~/.claude/settings.json` 配置：

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["path/to/database-mcp"],
      "env": {
        "DATABASE_URL": "your-database-url"
      }
    },
    "observability": {
      "command": "node",
      "args": ["path/to/observability-mcp"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## 故障排除

| 问题 | 解决方案 |
|-----|---------|
| MCP 连接失败 | 检查配置和环境变量 |
| 权限不足 | 确认 API Key 权限 |
| 超时 | 增加超时设置或优化查询 |
| 数据格式错误 | 检查参数格式和类型 |

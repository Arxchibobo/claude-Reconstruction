# Claude Code 能力决策树

> **用途**: 1 秒定位正确工具，50+ 场景速查

---

## 1 秒速查（超快版）

```
需要查询外部数据？ → MCP
需要自动化任务？   → Skills (/command)
需要架构建议？     → Plugins（自动激活，直接描述需求）
```

---

## 50+ 场景速查库

### 数据分析场景（15 个）

| # | 任务描述 | 最佳工具 | 示例命令/调用 |
|---|---------|---------|--------------|
| 1 | 查询用户成本数据 | bytebase MCP | `execute_sql("SELECT * FROM users WHERE ...")` |
| 2 | 生成收入趋势图 | bytebase → chart MCP | 查询 → `generate_line_chart(data)` |
| 3 | 查看慢请求 traces | honeycomb MCP | `run_query(query_spec)` |
| 4 | 数据归因分析 | bytebase (CTE) | 窗口查询 |
| 5 | A/B 测试结果查询 | statsig MCP | `Get_Experiment_Pulse_Results(experiment)` |
| 6 | 生成成本对比柱状图 | chart MCP | `generate_bar_chart(data, categories)` |
| 7 | 查询数据库表结构 | bytebase MCP | `search_objects(object_type="table")` |
| 8 | 生成用户占比饼图 | chart MCP | `generate_pie_chart(data)` |
| 9 | 分析用户转化漏斗 | chart MCP | `generate_funnel_chart(stages)` |
| 10 | 查询 traces | honeycomb MCP | `get_trace(trace_id)` |
| 11 | 生成收入瀑布图 | chart MCP | `generate_waterfall_chart(changes)` |
| 12 | 查看数据集 | honeycomb MCP | `get_dataset(dataset_slug)` |
| 13 | 特性开关查询 | statsig MCP | `Get_Feature_Gate(gate_name)` |
| 14 | 成本趋势分析 | bytebase → chart | 查询 → `generate_line_chart(time_series)` |
| 15 | 查询所有可用字段 | honeycomb MCP | `get_dataset_columns(dataset_slug)` |

### 全栈开发场景（12 个）

| # | 任务描述 | 最佳工具 | 示例命令/调用 |
|---|---------|---------|--------------|
| 16 | Git 提交代码 | `/commit` skill | 自动生成 message + 提交 |
| 17 | 创建 PR | `/create-pr` skill | 分析变更 + 生成描述 + 创建 |
| 18 | 代码审查 | `/code-review` skill | 并行代理审查 |
| 19 | 生成单元测试 | `/write-tests` skill | 自动生成测试用例 |
| 20 | 设计 UI 界面 | ui-ux-pro-max skill | 样式 + 配色 + 字体 + 代码 |
| 21 | 查询最新技术文档 | context7 MCP | `query-docs("Next.js 15", "App Router")` |
| 22 | 后端架构设计 | backend-development plugin | 描述需求，自动激活 |
| 23 | 前端组件开发 | frontend-development plugin | 描述需求，自动激活 |
| 24 | 代码重构建议 | `/refactor` skill | 分析代码 + 重构方案 |
| 25 | 添加代码注释 | `/add-comments` skill | 自动生成语义化注释 |
| 26 | 性能优化建议 | `/optimize-performance` skill | 识别瓶颈 + 优化方案 |
| 27 | 一键提交+推送+PR | commit-push-pr skill | 自动化完整 Git 工作流 |

### 浏览器自动化场景（8 个）

| # | 任务描述 | 最佳工具 | 示例命令/调用 |
|---|---------|---------|--------------|
| 28 | 网页数据抓取 | browser-use skill | Agent(task="抓取 HN 前 10 新闻") |
| 29 | E2E 测试 | browser-use skill | 测试登录流程 + 表单提交 |
| 30 | 表单自动填写 | browser-use skill | Agent + 自定义 tools |
| 31 | UI 截图验证 | playwright MCP | `browser_take_screenshot()` |
| 32 | 浏览器交互 | playwright MCP | `browser_click()`, `browser_type()` |
| 33 | 页面快照 | playwright MCP | `browser_snapshot()` |
| 34 | 查看控制台日志 | playwright MCP | `browser_console_messages()` |
| 35 | 网络请求分析 | playwright MCP | `browser_network_requests()` |

### 支付与服务集成场景（10 个）

| # | 任务描述 | 最佳工具 | 示例命令/调用 |
|---|---------|---------|--------------|
| 36 | 创建 Stripe 客户 | stripe MCP | `create_customer(name, email)` |
| 37 | 列出 Stripe 产品 | stripe MCP | `list_products(limit)` |
| 38 | 创建支付价格 | stripe MCP | `create_price(product, unit_amount, currency)` |
| 39 | 查询支付意图 | stripe MCP | `list_payment_intents(customer)` |
| 40 | 创建退款 | stripe MCP | `create_refund(payment_intent, amount)` |
| 41 | 创建 Firebase 项目 | firebase MCP | `firebase_create_project(project_id)` |
| 42 | 部署 Edge Function | firebase MCP | `firebase_deploy_edge_function(files)` |
| 43 | 执行 Firebase SQL | firebase MCP | `firebase_execute_sql(query)` |
| 44 | 创建 Supabase 项目 | supabase MCP | `supabase_create_project(name, region)` |
| 45 | 部署 Supabase 函数 | supabase MCP | `supabase_deploy_edge_function(slug, files)` |

### 调试与优化场景（8 个）

| # | 任务描述 | 最佳工具 | 示例命令/调用 |
|---|---------|---------|--------------|
| 46 | 生产故障排查 | honeycomb → bytebase | traces → 数据库慢查询 |
| 47 | SQL 性能优化 | database-optimizer plugin | 分析瓶颈 + CTE 优化 |
| 48 | 错误日志分析 | error-diagnostics plugin | 识别根因 + 修复方案 |
| 49 | 调试代码问题 | `/debug` skill | 错误排查 + 解决方案 |
| 50 | 解释错误根因 | `/explain-issue` skill | 分析日志 + 解释原因 |
| 51 | 修复 Bug | `/fix-bug` skill | 定位问题 + 修复代码 |
| 52 | 代码库搜索 | greptile MCP | `search_custom_context(query)` |
| 53 | 性能监控查询 | honeycomb MCP | 查询 P95 延迟、错误率 |

---

## 交互式决策树

### 决策树 1: 数据操作类任务

```
数据相关任务 → 数据来源?
├─ MySQL 业务数据 → bytebase MCP
├─ Honeycomb 监控 → honeycomb MCP
├─ Statsig 实验 → statsig MCP
└─ 需要可视化 → chart MCP
    ↓
操作类型?
├─ 查询 → execute_sql / run_query
├─ 分析 → 本地处理 + chart
└─ 报告 → content-writer skill
```

### 决策树 2: 开发类任务

```
开发任务 → 任务类别?
├─ Git 操作 → Skills (/commit, /create-pr, /code-review)
├─ UI 设计 → ui-ux-pro-max (搜索样式 → 生成代码)
├─ 架构设计 → Plugins 自动激活 (描述需求即可)
└─ 查文档 → context7 MCP (query-docs)
    ↓
实现完成 → /write-tests → /code-review → /commit
```

### 决策树 3: 调试类任务

```
调试问题 → 问题类型?
├─ 性能问题 → honeycomb MCP (查询 traces)
├─ 数据问题 → bytebase MCP (查询数据)
├─ 代码错误 → debugging-toolkit plugin (分析日志)
└─ 安全问题 → security-scanning plugin (漏洞扫描)
    ↓
定位瓶颈 → /fix-bug 或 plugin 自动建议
```

---

## 工具选择逻辑

### 优先级系统（3 层）

#### Layer 1: 外部数据访问（最高优先级）

**判断标准**：
- ✅ 需要查询数据库
- ✅ 需要实时监控数据
- ✅ 需要操作外部服务
- ✅ 需要生成图表

**工具选择**：
```
数据库 → bytebase MCP
监控 → honeycomb MCP
实验 → statsig MCP
图表 → chart MCP
文档 → context7 MCP
支付 → stripe MCP
服务 → firebase/supabase MCP
代码 → greptile MCP
浏览器 → playwright MCP
```

#### Layer 2: 自动化任务（次优先级）

**判断标准**：
- ✅ 重复性任务
- ✅ 需要工作流自动化
- ✅ 需要专业工具集成

**工具选择**：
```
Git 操作 → /commit, /create-pr, commit-push-pr
代码质量 → /code-review, /write-tests, /refactor
UI 设计 → ui-ux-pro-max
浏览器 → browser-use, webapp-testing
内容 → content-research-writer
图像 → nano-banana-pro, image-editor
专业 → mcp-builder, skill-creator
```

#### Layer 3: 架构建议（自动触发）

**判断标准**：
- ✅ 需要架构设计
- ✅ 需要代码分析
- ✅ 需要领域专业知识

**工作方式**：
```
直接描述需求 → Plugins 自动激活
例如：
  "设计高可用架构" → backend-development
  "优化 Python 代码" → python-development
  "K8s 部署方案" → kubernetes-operations
```

---

## 常见工作流模式

### 模式 1: 数据分析工作流

```
bytebase 查询原始数据
    ↓
本地数据处理（聚合、计算、过滤）
    ↓
chart MCP 生成可视化
    ↓
content-writer 生成分析报告（可选）
```

### 模式 2: 全栈开发工作流

```
context7 查询最新文档
    ↓
实现功能代码（Plugins 自动建议）
    ↓
/write-tests 生成测试
    ↓
/code-review 审查代码
    ↓
/commit 提交代码
    ↓
/create-pr 创建 PR
```

### 模式 3: 浏览器自动化工作流

```
browser-use skill 配置 Agent
    ↓
自动执行任务（抓取、测试、填表）
    ↓
生成结果/报告
    ↓
playwright MCP 截图验证（可选）
```

### 模式 4: 调试优化工作流

```
honeycomb 查询 traces/metrics
    ↓
定位性能瓶颈
    ↓
bytebase 查询相关数据
    ↓
debugging-toolkit 分析根因
    ↓
/fix-bug 修复问题
    ↓
验证效果
```

---

## 任务类型快速匹配表

| 任务关键词 | 推荐工具 |
|-----------|---------|
| **查询**、**数据库**、**SQL** | bytebase MCP |
| **图表**、**可视化**、**趋势** | chart MCP |
| **性能**、**traces**、**监控** | honeycomb MCP |
| **提交**、**commit**、**Git** | /commit skill |
| **PR**、**Pull Request** | /create-pr skill |
| **审查**、**review**、**代码质量** | /code-review skill |
| **测试**、**test**、**单元测试** | /write-tests skill |
| **UI**、**设计**、**界面** | ui-ux-pro-max skill |
| **文档**、**最新**、**库** | context7 MCP |
| **架构**、**设计**、**系统** | backend-development plugin |
| **前端**、**React**、**Vue** | frontend-development plugin |
| **重构**、**优化**、**改进** | /refactor skill |
| **浏览器**、**抓取**、**E2E** | browser-use skill |
| **截图**、**快照**、**验证** | playwright MCP |
| **支付**、**Stripe**、**订单** | stripe MCP |
| **Firebase**、**Supabase** | firebase/supabase MCP |
| **调试**、**Bug**、**错误** | debugging-toolkit plugin |
| **K8s**、**容器**、**部署** | kubernetes-operations plugin |

---

## 使用建议

### 新手入门

1. **先看 1 秒速查** - 快速定位工具类型
2. **查 50+ 场景库** - 找到类似任务
3. **看交互式决策树** - 理解决策逻辑
4. **实践验证** - 在项目中使用

### 进阶用法

1. **组合使用** - MCP + Skills + Plugins
2. **并行工作流** - 多个 MCP 并行查询
3. **链式操作** - MCP → 处理 → chart → 报告
4. **自定义优化** - 根据项目调整工具链

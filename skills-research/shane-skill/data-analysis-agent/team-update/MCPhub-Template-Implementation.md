# MCPhub 模板功能实现文档

## 概述

本文档记录了为 Claude Code ChatUI 添加 MCPhub HTTP MCP 模板功能的所有代码修改。这是第一个 HTTP 类型的 MCP 模板，与现有的 stdio 类型模板（如 Context7、Playwright、n8n）共存。

**实现日期**: 2025-11-21
**功能描述**: 添加 MCPhub 预配置模板，支持从模板一键添加 HTTP MCP 服务器

---

## 修改的文件列表

1. `src/ui-v2/getBodyContent.ts` - UI 下拉菜单
2. `src/ui-v2/ui-script.ts` - 模板配置和逻辑处理
3. `src/utils/mcpPrompts.ts` - 系统提示词
4. `src/utils/utils.ts` - CLAUDE.md 动态插入

---

## 详细修改说明

### 1. src/ui-v2/getBodyContent.ts

**位置**: 第 335 行
**修改内容**: 在模板下拉菜单中添加 MCPhub 选项

```typescript
<select id="mcpTemplateSelector" onchange="addMcpFromTemplate()" style="...">
    <option value="">Add from template...</option>
    <option value="sequential-thinking">Sequential Thinking</option>
    <option value="context7">Context7</option>
    <option value="basic-memory">Basic Memory</option>
    <option value="playwright">Playwright</option>
    <option value="n8n">n8n</option>
    <option value="shadcn">shadcn/ui</option>
    <option value="mcphub">MCPhub</option>  // ← 新增此行
</select>
```

**说明**: 在最后一个选项后添加 MCPhub 选项

---

### 2. src/ui-v2/ui-script.ts

#### 修改 A: 添加 mcphub 模板配置

**位置**: 第 3958-3963 行
**修改内容**: 在 `templates` 对象中添加 mcphub 配置

```typescript
'shadcn': {
    name: 'shadcn',
    command: 'npx',
    args: ['shadcn@latest', 'mcp'],
    env: {}
},
'mcphub': {                                      // ← 新增开始
    name: 'mcphub',
    type: 'http',                                 // 关键：HTTP 类型
    url: 'http://52.12.230.109:3000/mcp',
    headers: {}                                   // 空 headers，用户自己填写
}                                                 // ← 新增结束
```

**说明**:
- `type: 'http'` 标记这是 HTTP 类型模板
- `url` 预填了服务器地址
- `headers` 留空，等待用户添加认证信息

#### 修改 B: 支持 HTTP 类型模板

**位置**: 第 3970-3977 行
**修改内容**: 修改 `addMcpFromTemplate()` 函数，根据类型调用不同的添加函数

```typescript
const template = templates[templateValue];
if (template) {
    console.log('Adding MCP server with template:', template);

    // ← 新增开始：根据类型调用不同的添加函数
    if (template.type === 'http' || template.type === 'sse') {
        // HTTP/SSE 类型，调用 addHttpMcpServer 并预填数据
        addHttpMcpServer(template);
    } else {
        // stdio 类型，使用原有逻辑
        addMcpServer(template);
    }
    // ← 新增结束

    // Reset selector
    templateSelector.value = '';
    // ... 其余代码保持不变
}
```

**说明**:
- 检测 `template.type` 属性
- HTTP/SSE 类型调用 `addHttpMcpServer(template)`
- stdio 类型调用原有的 `addMcpServer(template)`
- `addHttpMcpServer()` 函数已经支持接收 `serverConfig` 参数进行预填

---

### 3. src/utils/mcpPrompts.ts

**位置**: 第 59-65 行
**修改内容**: 添加 mcphub 系统提示词

```typescript
'shadcn': `
## shadcn/ui MCP
...（shadcn 的提示词）
**Note**: Run 'npx shadcn@latest init' first if components.json doesn't exist`,

'mcphub': `                                       // ← 新增开始
## MCPhub
**Purpose**: Multi-service integration - Database, Analytics & Observability
**Core services**: Bytebase (SQL), Statsig (A/B tests), Honeycomb (logs/metrics)
**Key tools**: execute_sql, Get_Experiment_Results, run_query, find_queries
**Authentication**: May require Authorization or X-Session-ID header (see CLAUDE.md)
**Best practices**: Verify parameters before execution, use time ranges for queries`
                                                  // ← 新增结束
};
```

**说明**:
- 提示词格式与其他模板保持一致
- 简洁明了，约 60 词
- 突出三大服务：Bytebase、Statsig、Honeycomb
- 提示可能需要认证
- 提供最佳实践建议

---

### 4. src/utils/utils.ts

#### 修改 A: 添加 mcphubSection 常量

**位置**: 第 216-235 行
**修改内容**: 在 `updateClaudeMdWithWindowsInfo()` 函数中添加 mcphubSection

```typescript
// Playwright MCP
const playwrightSection = `## Playwright MCP Guide
...（Playwright 的说明）
`;

// MCPhub MCP                                    // ← 新增开始
const mcphubSection = `## MCPhub MCP Guide

**Services**:
- Bytebase: Execute SQL queries
- Statsig: A/B test experiment analytics
- Honeycomb: Application logs and metrics

**Setup**:
1. Select "MCPhub" from template dropdown
2. If authentication required, add header:
   - \`Authorization: Bearer YOUR_TOKEN\` or
   - \`X-Session-ID: YOUR_SESSION_ID\`

**Usage**:
- Database: "Execute SQL to find active users"
- Experiments: "Show results for experiment-123"
- Logs: "Find errors in the last hour"

**Important**: Verify query parameters before execution, use appropriate time ranges`;
                                                  // ← 新增结束

// n8n MCP
const n8nSection = `## n8n MCP Guide 🔧
...（n8n 的说明）
`;
```

**说明**:
- 提供三大服务的简介
- 包含设置步骤（从模板添加 + 认证配置）
- 提供使用示例
- 总长度约 15 行，与 Playwright 类似

#### 修改 B: 添加检测逻辑

**位置**: 第 365、376 行
**修改内容**: 添加 `hasMcphubInfo` 变量和检测逻辑

```typescript
let content = '';
let hasWindowsInfo = false;
let hasPlaywrightInfo = false;
let hasMcphubInfo = false;              // ← 新增此行
let hasN8nInfo = false;

// Check if CLAUDE.md exists
if (fs.existsSync(claudeMdPath)) {
    content = fs.readFileSync(claudeMdPath, 'utf8');
    // Check if it already has Windows environment info
    hasWindowsInfo = content.includes('Development Environment') && content.includes('Windows');
    // Check if it already has Playwright MCP info
    hasPlaywrightInfo = content.includes('Playwright MCP');
    // Check if it already has MCPhub MCP info
    hasMcphubInfo = content.includes('MCPhub MCP');  // ← 新增此行
    // Check if it already has n8n MCP info
    hasN8nInfo = content.includes('n8n MCP');
}
```

#### 修改 C: 添加条件写入逻辑

**位置**: 第 407-416 行
**修改内容**: 添加 mcphub 的条件写入逻辑

```typescript
// Add Playwright MCP information (if not present)
if (!hasPlaywrightInfo) {
    if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
    }
    content += '\n' + playwrightSection + '\n';
    needsUpdate = true;
    updatedSections.push('Playwright MCP guide');
}

// Add MCPhub MCP information (if enabled and not present)  // ← 新增开始
const hasMcphubMcp = mcpServers?.some(server => server.name === 'mcphub');
if (hasMcphubMcp && !hasMcphubInfo) {
    if (content.length > 0 && !content.endsWith('\n')) {
        content += '\n';
    }
    content += '\n' + mcphubSection + '\n';
    needsUpdate = true;
    updatedSections.push('MCPhub MCP guide');
}                                                             // ← 新增结束

// Add n8n MCP information (if enabled and not present)
const hasN8nMcp = mcpServers?.some(server => server.name === 'n8n');
if (hasN8nMcp && !hasN8nInfo) {
    // ... n8n 的逻辑
}
```

**说明**:
- 只有当用户配置了 mcphub 服务器时才添加
- 检查是否已存在，避免重复添加
- 遵循与 n8n 相同的模式

---

## 功能特点

### 1. 智能类型识别
- 自动识别模板类型（stdio 或 http）
- 根据类型调用对应的添加函数
- HTTP 模板和 stdio 模板完全兼容

### 2. 预填配置
用户选择 MCPhub 模板后自动预填：
- **服务器名称**: `mcphub`
- **传输类型**: `http`
- **服务器 URL**: `http://52.12.230.109:3000/mcp`
- **Headers**: 空（等待用户添加认证信息）

### 3. 系统提示词集成
- Claude 自动获得 MCPhub 的使用指导
- 了解三大服务（Bytebase、Statsig、Honeycomb）
- 知道可能需要认证
- 掌握最佳实践

### 4. 动态文档插入
- 用户添加 mcphub 后，自动在项目的 CLAUDE.md 中添加说明
- 与 Playwright 和 n8n 的机制一致
- 检测重复，不会多次添加

---

## 用户使用流程

### 步骤 1: 启用 MCP
```
VS Code 设置 → Claude Code ChatUI → Enable MCP
```

### 步骤 2: 从模板添加
```
MCP 设置面板 → "Add from template..." 下拉菜单 → 选择 "MCPhub"
```

### 步骤 3: 配置认证（可选）
```
展开 mcphub 配置 → [+ Add Header]
添加认证头：
- Authorization: Bearer YOUR_TOKEN
或
- X-Session-ID: YOUR_SESSION_ID
→ 保存
```

### 步骤 4: 使用工具
```
在对话中直接使用 12 个工具：
- 1 个 Bytebase 工具（SQL）
- 3 个 Statsig 工具（实验分析）
- 8 个 Honeycomb 工具（日志和指标）
```

---

## 测试验证

### 验证点 1: 模板添加
- [ ] 下拉菜单中显示 MCPhub 选项
- [ ] 选择后自动创建服务器配置
- [ ] 名称、类型、URL 正确预填

### 验证点 2: 系统提示词
查看日志应该包含：
```
[getMcpSystemPrompts] Found prompt for mcphub, length: 412
```

### 验证点 3: CLAUDE.md 动态插入
- [ ] 添加 mcphub 后，项目的 CLAUDE.md 自动添加说明
- [ ] 重新添加不会重复插入
- [ ] 删除服务器不会删除已添加的说明

### 验证点 4: 工具可用性
Claude 应该能看到：
```
mcp__mcphub__bytebase-execute_sql
mcp__mcphub__statsig-Get_Experiment_Details_by_ID
mcp__mcphub__statsig-Get_Experiment_Results
mcp__mcphub__statsig-Get_List_of_Experiments
mcp__mcphub__honeycomb-find_columns
mcp__mcphub__honeycomb-find_queries
mcp__mcphub__honeycomb-get_dataset
mcp__mcphub__honeycomb-get_dataset_columns
mcp__mcphub__honeycomb-get_environment
mcp__mcphub__honeycomb-get_query_results
mcp__mcphub__honeycomb-get_workspace_context
mcp__mcphub__honeycomb-run_query
```

---

## 恢复修改步骤

如果需要在新版本中恢复这些修改：

### 方法 1: 使用 patch 文件
```bash
# 应用 patch
git apply mcphub-template-changes.diff
```

### 方法 2: 手动恢复
1. 阅读本文档的"详细修改说明"部分
2. 按照每个文件的修改说明逐一修改
3. 编译测试：`npm run compile`
4. 功能测试：按照"测试验证"部分验证

### 方法 3: 使用 Claude Code
```
让 Claude Code 阅读本文档，然后说：
"请根据这个文档恢复 MCPhub 模板功能的所有修改"
```

---

## 注意事项

### 1. 服务器地址
当前硬编码的服务器地址：`http://52.12.230.109:3000/mcp`

如果服务器地址更改，需要修改：
- `src/ui-v2/ui-script.ts` 第 3961 行

### 2. 认证方式
当前支持两种认证方式：
- `Authorization: Bearer TOKEN`
- `X-Session-ID: SESSION_ID`

如果需要支持其他认证方式，修改：
- `src/utils/utils.ts` 第 227-228 行（CLAUDE.md 说明）
- `src/utils/mcpPrompts.ts` 第 64 行（系统提示词）

### 3. 版本兼容性
- 要求 `addHttpMcpServer()` 函数支持 `serverConfig` 参数
- 该功能在当前版本已实现（`src/ui-v2/ui-script.ts` 第 3461 行）
- 如果升级代码后该函数签名改变，需要相应调整

### 4. 与其他模板的关系
- MCPhub 是第一个 HTTP 类型的模板
- 不影响现有 stdio 模板（Context7、Playwright、n8n、shadcn）
- 如果以后添加更多 HTTP 模板，可以参考 MCPhub 的实现

---

## 相关文档

- **PRD**: `docs/PRD-HTTP-MCP-Support.md`
- **实施计划**: `specs/HTTP-MCP-PLAN.md`
- **Bug 修复记录**: `docs/HTTP-MCP-BugFix.md`
- **实现总结**: `docs/HTTP-MCP-Implementation-Summary.md`
- **Diff 文件**: `mcphub-template-changes.diff`

---

## 更新日志

| 日期 | 修改内容 | 修改人 |
|------|---------|--------|
| 2025-11-21 | 初始实现 | Claude Code |

---

## 结语

这个功能实现了第一个 HTTP 类型的 MCP 模板，为后续添加更多 HTTP MCP 服务器铺平了道路。所有修改都遵循现有代码的风格和模式，与 stdio 模板完全兼容。

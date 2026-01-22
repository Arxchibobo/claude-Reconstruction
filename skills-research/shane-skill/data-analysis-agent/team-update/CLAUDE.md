# CLAUDE.md

> **Version**: 3.2 | **Updated**: 2026-01-19 | **核心原则：计划 → 确认 → 执行到底 → 验收**

---

## 🎯 核心原则

### 工作模式

```
1️⃣ 收到任务 → TodoList 规划 → 2️⃣ 展示计划 → 用户确认 → 3️⃣ 执行到底（不问问题）→ 4️⃣ 总结验收
```

### 4 种致命阻塞（唯一允许提问）

1. ❗ **缺少关键凭证** - 数据库密码、API key
2. ❗ **多个对立方案** - 无法从代码库判断
3. ❗ **需求本质矛盾** - 用户要求冲突
4. ❗ **不可逆高风险** - 删除生产数据、强制推送

### 禁止提问（自行决策）

文件命名/代码风格/依赖版本/测试策略/UI细节 → 遵循现有规范或最佳实践

---

## ⚠️ Top 5 错误模式（编码前必查）

### E001: 异步未并行 | 🔴 严重 | 高频

```javascript
// ❌ 错误：顺序执行 (13次 × 2秒 = 26秒)
for (const term of searchTerms) {
  const results = await api.search(term);
  allResults.push(...results);
}

// ✅ 正确：并行执行 (max 2秒)
const searchPromises = searchTerms.map(term =>
  api.search(term)
    .then(results => ({ term, results, success: true }))
    .catch(error => ({ term, results: [], success: false, error: error.message }))
);
const searchResults = await Promise.all(searchPromises);
```

**自检**: 多个独立异步操作是否用 `Promise.all()`？

---

### E002: 轮询无超时 | 🔴 严重 | 高频

```javascript
// ❌ 错误：无限轮询
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') clearInterval(scanPollInterval);
}, 2000);

// ✅ 正确：带超时
function pollStatus(scanId, maxAttempts = 30) {
  let attempts = 0;
  scanPollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(scanPollInterval);
      showError('轮询超时');
      return;
    }
    try {
      const data = await fetchStatus(scanId);
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(scanPollInterval);
        updateUI(data);
      }
    } catch (error) {
      clearInterval(scanPollInterval);
      showError(error.message);
    }
  }, 2000);
}
```

**自检**: 轮询是否设置 `maxAttempts`？失败/超时是否 `clearInterval`？

---

### E003: 错误未重新抛出 | 🔴 严重 | 中频

```javascript
// ❌ 错误：错误被吞掉
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('获取失败:', error);
    // 没有 throw，调用者无法感知
  }
}

// ✅ 正确：重新抛出
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('获取失败:', error);
    throw new Error(`无法获取用户 ${id}: ${error.message}`);
  }
}
```

**自检**: `catch` 块是否 `throw error`？

---

### E004: SQL 未用 CTE 预过滤 | 🟡 中等 | 中频

```sql
-- ❌ 错误：JOIN 后再过滤，全表扫描
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2026-01-01';

-- ✅ 正确：CTE 预过滤
WITH recent_orders AS (
  SELECT user_id, total
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT u.name, ro.total
FROM users u
JOIN recent_orders ro ON u.id = ro.user_id;
```

**自检**: 是否用 CTE 预过滤大表？避免 JOIN 后过滤？

---

### E007: 忘记资源清理 | 🔴 严重 | 低频

```javascript
// ❌ 错误：只在成功时清理
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') {
    clearInterval(scanPollInterval); // 只有这里清理
    updateUI(data);
  }
  // 失败时泄漏！
}, 2000);

// ✅ 正确：所有退出路径都清理
scanPollInterval = setInterval(async () => {
  try {
    const data = await fetchStatus(scanId);
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(scanPollInterval);
      updateUI(data);
    }
  } catch (error) {
    clearInterval(scanPollInterval); // 错误时也清理
    showError(error.message);
  }
}, 2000);
```

**自检**: 所有退出路径（成功/失败/超时）都清理资源？

---

## 🧠 核心方法论

### 三文件模式（长任务必用）

```
task_plan.md     - 任务规划和进度追踪（重要决策点重新读取！）
notes.md         - 研究笔记和发现记录
[deliverable].md - 最终产出物
```

**关键机制**: 每个重要决策点前 **重新读取 task_plan.md**，刷新注意力窗口，防止目标漂移。

### 失败追踪（避免重复错误）

```markdown
## Errors Encountered
### [时间] 错误类型
**Error**: 具体错误信息
**Root Cause**: 根本原因
**Solution**: 解决方案
**Learning**: 经验教训
```

### 阶段门控（关键决策点等待确认）

```
Phase 1: 需求理解 → [用户确认 "ready"] → Phase 2: 设计方案 → [确认] → Phase 3: 实现代码
```

**原则**: 永远不进入下一阶段，直到用户明确确认。

---

## 🔧 能力速查

### MCP Servers（外部数据访问）

| 任务 | MCP | 调用示例 |
|-----|-----|---------|
| SQL查询 | `bytebase` | `mcp__mcphub__bytebase-execute_sql` |
| 图表生成 | `chart` | `mcp__mcphub__mcp-server-chart-*` |
| 监控日志 | `honeycomb` | `mcp__mcphub__honeycomb-*` |
| 支付集成 | `stripe` | 通过 stripe MCP |
| 文档搜索 | `context7` | 最新技术文档 |
| 浏览器 | `playwright` | E2E测试、截图 |
| Supabase | `supabase` | `mcp__plugin_supabase_supabase__*` |

### Skills（自动化任务）

| 任务 | 命令 |
|-----|------|
| Git 提交 | `/commit` |
| 创建 PR | `/create-pr` |
| 代码审查 | `/code-review` |
| 生成测试 | `/write-tests` |
| UI 设计 | `ui-ux-pro-max`（自动激活）|
| 浏览器自动化 | `browser-use`（自动激活）|
| 创意编程 | `processing-creative`（自动激活）|

### Plugins（自动激活，无需显式调用）

直接描述需求，相关 plugins 自动参与：
- 架构设计 → backend-development, cloud-infra
- 代码审查 → code-review-ai, security-scanning
- 数据分析 → data-engineering, database-design

### 快速决策树

```
需要外部数据？ → MCP (bytebase/honeycomb/stripe/context7)
需要自动化？   → Skills (/commit, /write-tests, browser-use)
需要建议？     → Plugins（自动激活，直接描述需求）
需要营销研究？ → Vibe Marketing (Firecrawl/Perplexity/n8n)
```

---

## 🎨 Vibe Marketing 工具包

### 核心概念

**Vibe Marketing** = AI驱动的营销自动化系统，将2周研究压缩到1小时：
- Research → Strategy → Content → Revenue

### 推荐 MCP (营销专用)

| MCP | 用途 | 使用场景 |
|-----|------|----------|
| **Firecrawl** | 网站爬虫 | 网站审计、竞品分析、内容提取 |
| **Perplexity** | 搜索研究 | 市场研究、竞争情报、趋势分析 |
| **Apify** | 数据抓取 | 社交媒体、Google Maps、潜客生成 |

### 营销工作流

```
Site Audit (Firecrawl) → Market Research (Perplexity) → Content Strategy (Claude) → Automation (n8n)
```

### 输出模板

| 模板 | 用途 |
|------|------|
| `Site-Exec-Summary.md` | 网站定位、ICP、UVP、品牌声音 |
| `Market-Gap-Analysis.md` | 竞争差距、蓝海机会 |
| `Content-Gap-Analysis.md` | 主题/格式/定位差距 |
| `Revenue-Projection.md` | 流量→转化→收入模型 |
| `Influencer-Patterns.md` | 创作者模式分析 |

### n8n 自动化

| 集成 | 用途 |
|------|------|
| Google Sheets + n8n | 数据收集、内容日历 |
| Slack + n8n | 团队通知、工作流触发 |
| Reddit + n8n | 社交监控、关键词追踪 |
| Apify + n8n | 网页抓取管道 |

### 详细文档

- [Vibe Marketing 完整指南](docs/vibe-marketing/VIBE_MARKETING_GUIDE.md)
- [MCP 设置指南](docs/vibe-marketing/MCP_SETUP_GUIDE.md)
- [n8n 工作流指南](docs/vibe-marketing/N8N_WORKFLOWS.md)

---

## 📊 数据分析 Skills（6 个核心 Skills）

### Skills 总览

| # | Skill | 文件 | 核心功能 | 使用频率 |
|---|-------|------|---------|---------|
| 1 | Bot毛利率分析 | `bot-margin-analysis.md` | 每个 bot 的盈利能力 | 每月 |
| 2 | Bot收入成本趋势 | `bot-revenue-cost-trend.md` | 特定 bot 时间序列 | 每周/按需 |
| 3 | 成本趋势分析 | `cost-trend-by-user-type.md` | 按用户类型成本分布 | 每周 |
| 4 | 整体毛利率分析 | `gross-margin-analysis.md` | 整体业务盈利能力 | 每日 |
| 5 | 失活邮箱域名 | `inactive-email-domains.md` | 白名单管理 | 每月 |
| 6 | 活跃邮箱域名 | `active-email-domains.md` | 活跃域名审核 | 按需 |
| 7 | 收入与订阅分析 | `revenue-subscription-analysis.md` | 全面业务分析 | 每月 |
| 8 | 主站电量分析 | `main-site-energy-analysis.md` | 主站 vs Art 消耗 | 按需 |

### 快速选择指南

| 你想了解... | 使用哪个 Skill |
|------------|---------------|
| 哪些 bot 盈利/亏损 | Bot毛利率分析 |
| 特定 bot 的趋势变化 | Bot收入成本趋势 |
| 免费用户成本占比 | 成本趋势分析 |
| 整体业务是否健康 | 整体毛利率分析 |
| 白名单需要更新哪些域名 | 失活/活跃邮箱域名分析 |
| 全面的业务表现 | 收入与订阅分析 |
| 主站 vs Art 消耗对比 | 主站电量分析 |

### 分析流程建议

```
月初: 收入与订阅分析 → 了解整体表现
  ├─ 收入下降 → Bot毛利率分析 + 整体毛利率分析
  ├─ 成本过高 → 成本趋势分析 + 主站电量分析
  └─ 特定bot异常 → Bot收入成本趋势
定期维护: 每月运行失活邮箱域名分析 → 优化白名单
```

---

## 📊 当前项目

**名称**: 数据分析和自动化（DAA）
**技术栈**: TypeScript + PostgreSQL (Vercel) + MySQL (my_shell_prod) + MCP
**目录**: `E:\Bobo's Coding cache`
**Skills目录**: `bo-skill-research/shane-skill/data-analysis-agent/skills/`

### 常用命令

```bash
cd functions && npm test    # 测试
vercel dev                  # 本地开发
vercel --prod               # 部署
```

### 核心数据表

- `daaf_bot_revenue_snapshots` - Bot收入归因
- `daaf_daily_summary_snapshots` - 每日汇总
- `daaf_cost_daily_snapshots` - 每日成本
- `user_energy_bot_usage_logs` - 电量消耗（主站+Art）
- `art_task` - Art任务表

### 用户分类（6 种）

1. **付费用户** - `user_membership_type != 'FREE'`
2. **免费-临时邮箱** - 56个临时邮箱域名
3. **免费-白名单邮箱** - 153个白名单域名
4. **免费-其他邮箱** - 未分类邮箱
5. **免费-已删除** - 已删除用户
6. **免费-访客** - `user.source = 'visitor'`

### 归因模型（Last-Touch 优化版）

```
订单窗口: start_date 到 end_date
任务窗口: start_date - 7天 到 end_date + 7天
- 订单前归因: 最后使用的 bot
- 订单后归因: 首次使用的 bot（如果订单前无使用）
预期覆盖率: 70-80% 订单
```

### 典型工作流

```
数据分析: bytebase 查询 → chart 生成图表 → content-writer 写报告
调试: honeycomb traces → bytebase 慢查询 → 根因分析
支付: context7 文档 → stripe MCP → /write-tests
Bot分析: @bot-margin-analysis.md 查询最近30天
成本监控: @cost-trend-by-user-type.md 显示最近7天
```

### base44 部署链接

| 分析模板 | base44 应用 |
|---------|------------|
| 毛利率分析 | [profit-flow-analytics](https://profit-flow-analytics-b8a87f86.base44.app/) |
| 每日成本趋势 | [app-d281d193](https://app-d281d193.base44.app/) |
| Bot毛利率分析 | [bot-profitability-analyzer](https://bot-profitability-analyzer-3c46a267.base44.app/) |

---

## 🔧 开发环境

- **OS**: Windows 10.0.26200 | **Shell**: Git Bash
- **路径格式**: Windows (Git Bash 中用正斜杠)
- **换行**: CRLF (配置 Git autocrlf)

### Playwright 配置

- **截图**: `./CCimages/screenshots/`
- **PDF**: `./CCimages/pdfs/`
- **版本问题修复**: `cd ~/AppData/Local/ms-playwright && cmd //c "mklink /J chromium-1179 chromium-1181"`

---

## 📚 深度参考（按需读取）

| 文档 | 用途 | 路径 |
|-----|------|-----|
| 错误详情 | 完整错误案例 | `errors/ERROR_CATALOG.md` |
| 方法论图书馆 | AI工作流洞察 | `learning/AI_WORKFLOW_INSIGHTS.md` |
| 决策树 | 详细能力决策 | `DECISION_TREE.md` |
| MCP 详解 | 所有 MCP 用法 | `docs/capabilities/mcp-servers.md` |
| Skills 清单 | 81个 Skills | `docs/capabilities/skills-guide.md` |
| Vibe Marketing | 完整营销指南 | `docs/vibe-marketing/VIBE_MARKETING_GUIDE.md` |
| MCP 营销设置 | Firecrawl/Perplexity | `docs/vibe-marketing/MCP_SETUP_GUIDE.md` |
| n8n 工作流 | 营销自动化 | `docs/vibe-marketing/N8N_WORKFLOWS.md` |

### 外部资源链接

| 资源 | 链接 |
|------|------|
| Vibe Marketing Kit (Notion) | [链接](https://recondite-bookcase-f3e.notion.site/The-Ultimate-Vibe-Marketing-Kit-28cebd240d10809393d1ebac001d623e) |
| GitHub 工具仓库 | [链接](https://github.com/the-vibe-marketers/vibemarketingkit) |
| Vibe Marketers 社区 | [链接](https://www.skool.com/the-vibe-marketers) |

---

**准备接收任务** 🚀

# CLAUDE.md

> **Version**: 4.2 | **Updated**: 2026-01-28 | **核心原则：计划 → 确认 → 执行到底 → 验收**

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

> 📚 **完整错误库**: [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md) - E001-E015 详细案例

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

### 其他高频错误（快速参考）

| 错误 | 严重程度 | 核心问题 | 快速解决 |
|------|---------|---------|---------|
| **E004: SQL未用CTE** | 🟡 中等 | JOIN后过滤 → 全表扫描 | 用CTE预过滤大表 |
| **E007: 资源泄漏** | 🔴 严重 | 只在成功时清理 | 所有退出路径都清理 |
| **E008: ID类型未验证** | 🔴 严重 | 直接当作ID，未验证来源 | 先确认ID含义（bot_id/user_id） |
| **E011: Git Bash npm** | 🟡 中等 | npm命令卡住 | 在PowerShell/CMD运行 |
| **E012: Hook权限** | 🟡 中等 | Hook未执行 | `chmod +x .husky/pre-commit` |
| **E013: 知识库加载** | 🔴 严重 | 每次请求加载文件 | 启动时预加载到内存 |
| **E014: 路径未统一** | 🟡 中等 | 跨平台路径错误 | 统一路径转换层 |
| **E015: Hook未验证** | 🔴 严重 | 只设置环境变量 | 验证完整链路 |

📖 **详细说明**: 每个错误的完整案例、测试用例、修复方案见 [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)

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

> 📚 **详细文档**: [DECISION_TREE.md](DECISION_TREE.md) - 完整能力决策树

### MCP Servers（外部数据访问）

| 任务 | MCP | 文档 |
|-----|-----|------|
| SQL查询 | bytebase | [mcp-servers.md](../capabilities/mcp-servers.md) |
| 图表生成 | chart | 同上 |
| 监控日志 | honeycomb | 同上 |
| 浏览器自动化 | playwright ⭐ | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) |
| 其他MCP | stripe, context7, supabase | [mcp-servers.md](../capabilities/mcp-servers.md) |

### CLI 工具（高性能补充）

| 任务 | CLI | 优势场景 | 文档 |
|-----|-----|---------|------|
| 浏览器自动化 | agent-browser 🚀 | 批量操作、脚本化、AI Agent | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) |

### Skills（自动化任务）

| 类别 | Skills | 文档 |
|------|--------|------|
| **Git工作流** | /commit, /create-pr, /code-review | [skills-guide.md](../capabilities/skills-guide.md) |
| **测试生成** | /write-tests | 同上 |
| **UI设计** | ui-ux-pro-max, web-design-guidelines | [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) |
| **浏览器** | browser-use, agent-browser | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) |
| **创意编程** | processing-creative | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) |
| **营销技能** | 24个专业Skills | [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md) |

### Plugins（自动激活）

直接描述需求，相关 plugins 自动参与：
- 架构设计 → backend-development, cloud-infra
- 代码审查 → code-review-ai, security-scanning
- 数据分析 → data-engineering, database-design

📖 **详细清单**: [skills-guide.md](../capabilities/skills-guide.md) - 81个Skills完整列表

---

## 🎨 专题能力（快速链接）

### 营销和内容

| 能力 | 文档 | 核心价值 |
|------|------|---------|
| **Vibe Marketing** | [VIBE_MARKETING_GUIDE.md](../vibe-marketing/VIBE_MARKETING_GUIDE.md) | 2周研究压缩到1小时 |
| **营销技能 (24个)** | [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md) | CRO/文案/SEO/定价全栈 |

### 视觉和设计

| 能力 | 文档 | 核心价值 |
|------|------|---------|
| **Processing 创意编程** | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) | 6种视觉模式，16种配色 |
| **PPT 制作** | [PPT_WORKFLOW.md](../capabilities/PPT_WORKFLOW.md) | 三格式输出（.pptx + HTML + 图片） |
| **Remotion 视频** | [REMOTION_VIDEO_CREATION_GUIDE.md](../rules/remotion-auto-production.md) | 自动匹配风格，生成代码 |
| **设计风格库** | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) | 30种设计风格 |
| **设计哲学** | [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) | 完整设计标准 |

### 浏览器自动化

| 场景 | 工具选择 | 文档 |
|------|---------|------|
| 对话中实时操作 | **Playwright MCP** ⭐ | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) |
| 批量操作（>50次） | **agent-browser CLI** 🚀 | 同上 |
| 脚本化/定时任务 | **agent-browser CLI** 🚀 | 同上 |
| 网络拦截/录制 | **Playwright MCP** ⭐ | 同上 |

### 数据和分析

| 能力 | 文档 | 核心价值 |
|------|------|---------|
| **数据分析 Skills (8个)** | `bo-skill-research/shane-skill/data-analysis-agent/skills/` | Bot毛利率、成本趋势、收入分析 |
| **AI Agent 知识库** | [本文档](#-ai-agent-知识库系统) | 启动时加载，响应时<1ms |

---

## 🤖 GPT 专家委托系统

> 📚 **完整文档**: [delegator规则](../rules/delegator/)

### 可用专家

| 专家 | 专长 | 使用时机 |
|------|------|---------|
| **Architect** | 系统设计、技术决策 | 架构决策 / 2+失败尝试 |
| **Plan Reviewer** | 计划验证 | "review this plan" |
| **Scope Analyst** | 需求分析 | 模糊需求 / "analyze scope" |
| **Code Reviewer** | 代码质量 | 完成功能后 / "review code" |
| **Security Analyst** | 安全审计 | 安全问题 / "security review" |

### 触发方式

1. **显式触发**: "ask GPT", "consult GPT"
2. **语义触发**: 架构决策、计划验证、需求分析、代码审查、安全问题

📖 **详细规则**:
- [delegation-format.md](../rules/delegator/delegation-format.md) - 7部分模板
- [triggers.md](../rules/delegator/triggers.md) - 触发规则
- [orchestration.md](../rules/delegator/orchestration.md) - 编排流程

---

## 🤖 AI Agent 知识库系统

### 核心能力

**知识库集成**（12 个核心文档，116 KB）：
- 在服务启动时加载到内存（~100ms）
- 每次请求从内存读取（~1ms）
- 支持分类加载和热重载

### 性能对比

| 方案 | 加载时间 | 请求响应时间 | 内存占用 |
|------|---------|------------|---------|
| 每次请求加载 | 0ms | ~150ms | 低 |
| **启动时加载** ✅ | ~100ms | ~1ms | ~120KB |

**推荐**: 启动时加载（启动慢一点，响应快很多）

📖 **参考实现**: `E:\Bobo's Coding cache\bo-work\craft-agents-oss`

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

## 📚 快速导航

### 新手入门

1. [QUICK_START.md](QUICK_START.md) - 3分钟了解项目
2. [INDEX.md](INDEX.md) - 完整文档索引
3. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 一页速查表

### 核心文档

| 文档 | 用途 |
|------|------|
| [DECISION_TREE.md](DECISION_TREE.md) | 详细能力决策树 |
| [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md) | E001-E015 完整错误案例 |
| [KNOWLEDGE_MAP.md](KNOWLEDGE_MAP.md) | 知识图谱（12个Mermaid图） |

### 专题深度

| 领域 | 入口文档 |
|------|---------|
| **浏览器自动化** | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) |
| **营销** | [VIBE_MARKETING_GUIDE.md](../vibe-marketing/VIBE_MARKETING_GUIDE.md) + [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md) |
| **视觉设计** | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) + [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) |
| **视频制作** | [REMOTION_VIDEO_CREATION_GUIDE.md](../rules/remotion-auto-production.md) |
| **GPT专家** | [delegator/](../rules/delegator/) |

---

## 📊 项目特定配置

> ⚠️ **注意**: 以下内容是项目特定的，不同项目需要更新

### 当前项目

**名称**: 数据分析和自动化（DAA）
**技术栈**: TypeScript + PostgreSQL (Vercel) + MySQL (my_shell_prod) + MCP
**目录**: `E:\Bobo's Coding cache`

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

---

**准备接收任务** 🚀

---

**文档版本**: v4.2 (Refactored)
**最后更新**: 2026-01-28
**精简程度**: 从 47KB → ~20KB（缩减 57%）
**改进内容**:
- ✅ 保留核心原则和高频错误模式
- ✅ 专题内容改为简表 + 链接
- ✅ 新增快速导航章节
- ✅ 分离项目特定配置

**升级自**: v4.1 (2026-01-23)

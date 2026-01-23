# CLAUDE.md

> **Version**: 4.1 | **Updated**: 2026-01-23 | **核心原则：计划 → 确认 → 执行到底 → 验收**

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

### E008: 数据查询前未验证ID类型 | 🔴 严重 | 高频

```sql
-- ❌ 错误：看到数字直接当作ID，没有验证来源
-- 用户给了 1769012250，我误认为是 Unix 时间戳
SELECT * FROM user WHERE id = 1769012250;  -- 查不到数据！

-- 正确流程：先确认数字的含义
-- 1. 询问用户："这些是什么ID？bot_id、user_id、还是order_id？"
-- 2. 或者根据上下文推断（用户说"art_task"→ 应该是 bot_id）
-- 3. 查询正确的表：
SELECT * FROM art_task WHERE bot_id = 1769012250 AND created_date >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

**关键上下文记忆**：
- **bot_id 范围**: 1747227835 - 1769012250（10位数字）
- **user.id 范围**: 1 - 48607088（最多8位数字）
- **表结构**:
  - `art_task` 表有 `bot_id` 字段（Art 任务）
  - `user_energy_bot_usage_logs` 表有 `bot_id` 字段（主站电量）
  - `user` 表只有 `id` 字段（用户ID）

**自检清单**（收到数字ID时必做）:
1. ✅ 这是什么ID？（bot_id / user_id / order_id / task_id）
2. ✅ 用户提到了哪个表？（art_task / user / order / bot）
3. ✅ 数字的位数和范围合理吗？（10位通常是 bot_id，8位通常是 user_id）
4. ✅ 如果不确定，**立即询问用户**，不要猜测

**案例回顾**（2026-01-23）:
- 用户给了 7 个 10 位数字：1769012250, 1769002640, 1750651225...
- 我错误地用 `FROM_UNIXTIME()` 转换为日期
- 用户明确说："这些都是 bot id, bytebase art_task 查看下"
- **正确做法**: 第一时间应该问"这些是什么ID"，或者看到10位数字直接联想到 bot_id

---

### E011: Git Bash npm install 失败 | 🟡 中等 | 高频

```bash
# ❌ 错误：在 Git Bash 中运行 npm install
$ npm install
# 命令卡住，没有输出

# ✅ 正确：在 PowerShell/CMD 中运行
# 打开 PowerShell 或 CMD
cd "E:\Bobo's Coding cache\bo-work\project"
npm install
```

**自检**: 是否在 PowerShell/CMD 而非 Git Bash 中运行 npm 命令？

**原因**: Git Bash 的输出重定向问题，Windows 原生命令可能无法正确显示进度

---

### E012: Pre-commit Hook 权限问题 | 🟡 中等 | 中频

```bash
# ❌ 错误：Hook 文件没有可执行权限
$ git commit -m "test"
# 直接提交，没有运行检查

# ✅ 正确：添加可执行权限
chmod +x .husky/pre-commit

# 验证
ls -la .husky/pre-commit
# 应该看到: -rwxr-xr-x (包含 x)
```

**自检**: 创建 pre-commit hook 后是否设置了可执行权限？

---

### E013: 知识库每次请求加载 | 🔴 严重 | 中频

```typescript
// ❌ 错误：每次请求都加载文件
async chat(message: string) {
  const docs = await loadAllDocs(); // 慢！~150ms
  return process(message, docs);
}

// ✅ 正确：启动时加载到内存
class KnowledgeBaseService {
  private loadedDocs: Map<string, string> = new Map();

  async init() {
    const docs = await this.loadAllDocs();
    this.loadedDocs = new Map(docs);
    console.log(`[KnowledgeBase] 加载完成: ${this.loadedDocs.size} 文件`);
  }

  getSystemPrompt(): string {
    return Array.from(this.loadedDocs.values()).join('\n\n'); // 快！~1ms
  }
}

// 在服务启动时初始化
const kb = new KnowledgeBaseService();
await kb.init();
```

**自检**: 大文件或频繁访问的资源是否在启动时预加载？

**权衡**: 启动慢一点（+100ms），响应快很多（-149ms），内存占用可接受（~120KB）

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
| 浏览器自动化 | `playwright` ⭐ | E2E测试、截图、网络拦截 |
| Supabase | `supabase` | `mcp__plugin_supabase_supabase__*` |

### CLI 工具（高性能补充）

| 任务 | CLI | 调用方式 | 优势场景 |
|-----|-----|---------|---------|
| 浏览器自动化 | `agent-browser` 🚀 | Bash 工具调用 | 批量操作、脚本化、AI Agent |

### Skills（自动化任务）

| 任务 | 命令 | 说明 |
|-----|------|------|
| Git 提交 | `/commit` | 自动化提交 |
| 创建 PR | `/create-pr` | 自动创建PR |
| 代码审查 | `/code-review` | 代码质量审查 |
| 生成测试 | `/write-tests` | 自动生成测试 |
| UI 设计 | `ui-ux-pro-max`（自动激活）| 组件设计 |
| **UI 代码规范审查** | `web-design-guidelines`（自动激活）⭐ 新增 | 60+规则审查 |
| 浏览器自动化 | `browser-use`（自动激活）| 通用浏览器操作 |
| **浏览器文档库** | `agent-browser`（知识库）⭐ 新增 | CLI参考文档 |
| 创意编程 | `processing-creative`（自动激活）| 动画和可视化 |

### Plugins（自动激活，无需显式调用）

直接描述需求，相关 plugins 自动参与：
- 架构设计 → backend-development, cloud-infra
- 代码审查 → code-review-ai, security-scanning
- 数据分析 → data-engineering, database-design

### 快速决策树

```
需要外部数据？     → MCP (bytebase/honeycomb/stripe/context7)
需要自动化？       → Skills (/commit, /write-tests, browser-use)
需要建议？         → Plugins（自动激活，直接描述需求）
需要营销研究？     → Vibe Marketing (Firecrawl/Perplexity/n8n)
需要营销优化？     → Marketing Skills (转化/文案/SEO/定价)
需要动画/视觉设计？ → Processing（粒子/流场/渐变/数据图表）
需要 UI 组件？     → ui-ux-pro-max（自动激活）
需要 UI 代码审查？ → web-design-guidelines（无障碍/性能/体验）⭐ 新增
需要浏览器自动化？ → 智能决策（见下方）⭐ 新增
```

### 浏览器自动化决策树 ⭐ 新增

```
收到浏览器操作请求
  ├─ 对话中实时操作？ → Playwright MCP ⭐ 主力工具
  │   ✓ 无缝集成，结果自动返回
  │   ✓ 探索式任务、调试、演示
  │   ✓ 示例：browser_navigate, browser_snapshot
  │
  ├─ 需要网络拦截/录制？ → Playwright MCP ⭐ 唯一选择
  │   ✓ Route请求、Mock响应、Codegen
  │   ✓ 完整测试框架、Trace追踪
  │
  ├─ 批量操作（>50次）？ → agent-browser CLI 🚀 高性能
  │   ✓ Rust核心，启动<1秒
  │   ✓ 性能提升1.85-2.9x
  │   ✓ 示例：agent-browser open URL
  │
  ├─ 脚本化/定时任务？ → agent-browser CLI 🚀 轻量级
  │   ✓ CLI命令，适合cron/CI
  │   ✓ Unix风格管道组合
  │
  ├─ AI Agent系统？ → agent-browser CLI 🚀 AI专属
  │   ✓ Accessibility Tree + Refs (@e1, @e2)
  │   ✓ 语义定位器（find role/text/label）
  │
  └─ 不确定/首次使用？ → Playwright MCP ⭐ 默认选择
      ✓ 功能最全面，学习成本最低
```

**详细决策树**: `~/.claude/capabilities/browser-automation-decision-tree.md`

**设计场景主动触发**：
- 落地页背景/Hero 动画 → Processing 粒子系统或流场
- 数据可视化动画 → Processing 图表（比静态图更吸引人）
- PPT/演示素材 → Processing 导出 PNG/GIF
- 交互式背景 → Processing + React/Vue 组件

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

- [Vibe Marketing 完整指南](../vibe-marketing/VIBE_MARKETING_GUIDE.md)
- [MCP 设置指南](../vibe-marketing/MCP_SETUP_GUIDE.md)
- [n8n 工作流指南](../vibe-marketing/N8N_WORKFLOWS.md)

---

## 🎯 营销技能 Skills（24 个专业 Skills）

### 核心概念

**Marketing Skills** = 由 Corey Haines 创建的专业营销技能包，涵盖转化优化、文案撰写、SEO、付费广告、定价策略等全栈营销能力。

### Skills 总览（按类别）

#### 📈 转化率优化（CRO）- 6 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 1 | `page-cro` | "CRO", "优化页面", "转化率" | 任何营销页面的转化优化 |
| 2 | `signup-flow-cro` | "注册优化", "注册流程" | 注册和登录流程优化 |
| 3 | `onboarding-cro` | "用户引导", "激活率" | 新用户激活和引导优化 |
| 4 | `form-cro` | "表单优化", "潜客表单" | 潜客捕获和联系表单 |
| 5 | `popup-cro` | "弹窗", "模态框", "退出意图" | 弹窗和模态框转化 |
| 6 | `paywall-upgrade-cro` | "付费墙", "升级屏幕" | 应用内付费墙和升级提示 |

#### ✍️ 内容与文案 - 4 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 7 | `copywriting` | "写文案", "改写页面", "标题" | 营销页面文案撰写 |
| 8 | `copy-editing` | "编辑文案", "润色文案" | 编辑和优化现有文案 |
| 9 | `email-sequence` | "邮件序列", "滴灌营销" | 自动化邮件流程 |
| 10 | `social-content` | "社交媒体", "LinkedIn", "Twitter" | 社交媒体内容创作 |

#### 🔍 SEO 与发现 - 4 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 11 | `seo-audit` | "SEO审计", "技术SEO" | 技术和页面SEO审计 |
| 12 | `programmatic-seo` | "程序化SEO", "规模化页面" | 大规模模板化页面生成 |
| 13 | `competitor-alternatives` | "vs页面", "替代页面" | 竞品对比和替代页面 |
| 14 | `schema-markup` | "schema", "结构化数据" | 结构化数据和富摘要 |

#### 💰 付费广告与分发 - 1 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 15 | `paid-ads` | "PPC", "Google Ads", "Meta广告" | Google、Meta、LinkedIn 广告 |

#### 📊 测量与测试 - 2 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 16 | `analytics-tracking` | "追踪", "GA4", "GTM" | 事件追踪和分析设置 |
| 17 | `ab-test-setup` | "A/B测试", "实验", "分流测试" | A/B测试设计和实施 |

#### 🚀 增长工程 - 2 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 18 | `free-tool-strategy` | "免费工具", "计算器" | 营销工具和计算器 |
| 19 | `referral-program` | "推荐计划", "联盟营销" | 推荐和联盟计划 |

#### 💡 策略与货币化 - 5 个
| # | Skill | 触发关键词 | 用途 |
|---|-------|----------|------|
| 20 | `marketing-ideas` | "营销创意", "增长点子" | 140个SaaS营销创意库 |
| 21 | `marketing-psychology` | "心理学", "认知偏差" | 70+营销心理学模型 |
| 22 | `launch-strategy` | "发布", "Product Hunt" | 产品发布和功能公告 |
| 23 | `pricing-strategy` | "定价", "层级", "意愿支付" | 定价、打包和货币化 |

### 快速选择指南

| 你想... | 使用哪个 Skill |
|---------|---------------|
| 提高落地页转化率 | `page-cro` |
| 写首页/落地页文案 | `copywriting` |
| 优化注册流程 | `signup-flow-cro` |
| 设置GA4追踪 | `analytics-tracking` |
| 创建邮件序列 | `email-sequence` |
| SEO审计网站 | `seo-audit` |
| 设计A/B测试 | `ab-test-setup` |
| 创建竞品对比页 | `competitor-alternatives` |
| 设计定价策略 | `pricing-strategy` |
| 找营销灵感 | `marketing-ideas` (140个创意) |
| 应用营销心理学 | `marketing-psychology` (70+模型) |
| 规划产品发布 | `launch-strategy` |

### 使用方式

**方式 1：自然对话（推荐）**
```
"帮我优化这个落地页的转化率"
→ 自动激活 page-cro skill

"写一个SaaS首页的文案"
→ 自动激活 copywriting skill

"设置GA4事件追踪"
→ 自动激活 analytics-tracking skill
```

**方式 2：直接调用**
```
/page-cro
/copywriting
/seo-audit
```

### 典型工作流

```
营销页面优化:
  1. seo-audit → 技术审计
  2. copywriting → 重写文案
  3. page-cro → 转化优化
  4. ab-test-setup → 测试方案

产品发布:
  1. launch-strategy → 发布计划
  2. copywriting → 发布文案
  3. email-sequence → 发布邮件
  4. social-content → 社交内容

增长实验:
  1. marketing-ideas → 寻找灵感
  2. free-tool-strategy → 工具策划
  3. ab-test-setup → 实验设计
  4. analytics-tracking → 追踪设置
```

### 详细文档

- [Marketing Skills GitHub 仓库](https://github.com/coreyhaines31/marketingskills)
- [完整 Skills 清单](bo-skill-research/marketingskills/README.md)
- [Corey Haines 官网](https://corey.co)

---

## 🎨 Processing 创意编程

### 触发关键词（主动识别）

当用户提到以下内容时，**自动建议使用 Processing**：
- 动态背景、动画背景、Hero 动画
- 粒子效果、流场、波浪动画
- 数据可视化动画、实时图表
- 生成艺术、创意编码、generative art
- 交互式视觉、鼠标跟随效果
- PPT 素材、演示动画、GIF 导出

### 6 种视觉模式

| 模式 | 描述 | 最佳场景 |
|------|------|----------|
| **Particles** | 粒子系统（引力/排斥/连线） | 科技感背景、网络可视化 |
| **Flow Field** | 流场（Perlin噪声驱动） | 有机动态背景、数据流 |
| **Geometric** | 几何网格（旋转/缩放） | 抽象艺术、品牌视觉 |
| **Waves** | 波浪动画（正弦/余弦） | 音频可视化、水面效果 |
| **Gradients** | 动态渐变（流动色彩） | 氛围背景、情感表达 |
| **Data Viz** | 数据可视化（动态图表） | 实时数据、商业报告 |

### 16 种配色主题

| 类别 | 主题 |
|------|------|
| **霓虹** | `neon-cyber`, `neon-sunset`, `neon-mint` |
| **合成波** | `synthwave-classic`, `synthwave-vapor`, `synthwave-retro` |
| **柔和** | `pastel-dream`, `pastel-spring`, `pastel-ocean` |
| **科技** | `tech-matrix`, `tech-terminal`, `tech-hologram` |
| **自然** | `nature-forest`, `nature-ocean`, `nature-sunset`, `nature-aurora` |

### 输出格式

| 格式 | 用途 | 文件类型 |
|------|------|----------|
| **p5.js HTML** | 网页嵌入 | `.html` |
| **Processing Java** | 桌面应用 | `.pde` |
| **React 组件** | React 项目 | `.tsx` |
| **Vue 组件** | Vue 项目 | `.vue` |
| **静态导出** | 截图/素材 | `.png`, `.gif` |

### 使用示例

```
用户: "给落地页做一个科技感的动态背景"
Claude: 建议使用 Processing 粒子系统 + tech-matrix 配色
        → 生成 React 组件 + 预览截图

用户: "做一个数据增长的动画图表"
Claude: 建议使用 Processing Data Viz 模式
        → 生成动态柱状图/折线图

用户: "需要PPT里用的流动背景素材"
Claude: 建议使用 Processing Flow Field + 渐变模式
        → 导出 GIF 或 PNG 序列
```

### 详细文档

- [Processing Skill 完整指南](../capabilities/PROCESSING_SKILL.md)
- [GitHub 仓库](https://github.com/Arxchibobo/Processing-skill-for-vibe)

---

## 📊 PPT 制作优化工作流

### 核心原则（持久化规则）

当收到 PPT 制作需求时，**必须按以下优先级执行**：

```
1️⃣ Nano Banana Pro → 生成页面图片设计
2️⃣ Python-pptx → 组装 PPT（插入图片）
3️⃣ Processing + p5.js → 创建 HTML 演示（显示图片 + 页面转换动画）
4️⃣ 三格式输出 → .pptx 文件 + 每页图片文件 + .html 交互演示
```

**重要原则** ⭐:
- **Processing 动画 = 页面转换效果**（0.5-1秒），不是整页背景
- HTML 展示 PPT 图片内容，动画只在**页面切换时**出现
- PPT 中的静态图片无法展示动态效果，因此 **HTML 文件是必需的交付物**

### 工作流程

| 步骤 | 工具 | 用途 | 输出 |
|------|------|------|------|
| 1. 需求分析 | - | 确定页数、风格、配色 | PPT大纲 |
| 2. 页面设计 | **Nano Banana Pro** | 生成每页的完整设计图 | 高质量PNG图片 |
| 3. PPT组装 | Python-pptx | 将图片组装成PPT | .pptx文件 |
| 4. HTML演示 | **p5.js + Processing** | 创建幻灯片HTML（图片 + 页面转换动画） | .html文件（含转换效果） |
| 5. 图片导出 | LibreOffice/pdftoppm | 导出每页为独立图片 | 图片文件夹 |

### 快速命令模板

**生成页面设计**（Nano Banana Pro）:
```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Professional PPT slide: [主题], [风格], 16:9, [配色]" \
  --filename "YYYY-MM-DD-HH-MM-SS-slide-[N]-[描述].png" \
  --resolution 4K
```

**生成 HTML 演示**（Processing + p5.js - 自动激活）:
```
"Create an HTML slideshow that displays PPT images (slide-01.png to slide-12.png)
with p5.js transition animations between pages. Use [动画类型] effect for
transitions. Keep animations subtle (under 1 second)."

动画类型选择：
- particle connections（粒子连线）- 科技感
- light wave sweep（光波扫过）- 数据主题
- block flip（方块翻转）- 几何风格
- gradient flow（渐变流动）- 柔和过渡
```

**组装PPT**:
```python
from pptx import Presentation
from pptx.util import Inches

prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(5.625)

for img_path in image_paths:
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.shapes.add_picture(img_path, 0, 0,
                             Inches(10), Inches(5.625))

prs.save("output.pptx")
```

### 必须输出（三格式交付）

✅ **PPT文件**: `output.pptx` - 静态演示版本（适合投影仪）
✅ **HTML文件**: `output-interactive.html` - 🌟 **交互演示版本（PPT图片 + 页面转换动画）**
✅ **图片文件夹**: `output_slides/` - 包含每一页的PNG图片

**HTML 文件关键特征**：
- 每页展示对应的 PPT 图片（slide-01.png, slide-02.png...）
- Processing 动画仅在**页面切换时**出现（0.5-1秒）
- 动画结束后完整显示新页面内容
- 支持键盘（← →）和按钮导航

**错误示例** ❌：整页动态背景遮挡 PPT 内容
**正确示例** ✅：显示 PPT 图片 → 切换时播放动画 → 显示新图片

### 配色主题库

| 主题 | 主色 | 辅助色 | 背景 | 用途 |
|------|------|--------|------|------|
| Tech Innovation | #0066ff | #00ffff | #1e1e1e | 科技感/技术文档 |
| Business Pro | #1C2833 | #F39C12 | #F4F6F6 | 商务风/报告 |
| Creative Vibrant | #E76F51 | #2A9D8F | #264653 | 创意/设计 |

### 完整设计风格库（30种）

📚 **[UI/UX 设计风格完整参考手册](../design/UI_DESIGN_STYLES_REFERENCE.md)** - 包含：
- 6 种主流风格（极简/玻璃态/新拟物化/粗野主义/扁平/拟物化）
- 5 种现代趋势（粘土态/极光UI/液态玻璃/新粗野/便当盒网格）
- 5 种复古风格（复古未来/千禧年/蒸汽波/孟菲斯/像素艺术）
- 4 种科技美学（赛博朋克/HUD科幻/深色模式/AI原生）
- 3 种自然风格（有机亲生物/仿生/电子墨水）
- 4 种动效驱动（动效驱动/微交互/动态排版/视差）
- 3 种特殊风格（空间UI/Z世代混乱/维度分层）

**每种风格包含**：Nano Banana Pro 提示词模板、配色建议、适用场景

### 详细文档

- [PPT 制作完整工作流](../capabilities/PPT_WORKFLOW.md)
- [UI/UX 设计风格参考库](../design/UI_DESIGN_STYLES_REFERENCE.md) ⭐
- [设计大师人格指南](../design/DESIGN_MASTER_PERSONA.md) 🎯 **新增**
- [Nano Banana Pro Skill](.claude/skills/nano-banana-pro/SKILL.md)
- [Processing Skill](bo-work/processing-creative-skill/skill/processing-creative.md)
- [Python-pptx 文档](.claude/skills/document-skills/pptx/SKILL.md)

**设计标准**: 所有 UI/UX 设计任务必须遵循[设计大师人格](../design/DESIGN_MASTER_PERSONA.md)的标准：
- **适用范围**: PPT设计、网页设计、前端页面、移动应用界面、产品设计、品牌视觉
- 深度挖掘用户真实需求（不只是表面需求）
- 提供多层次方案（安全/激进/理想）
- 遵循8px网格、60fps动画、WCAG可访问性标准
- 输出完整可运行代码（不接受半成品）
- 30种设计风格可供选择（参考UI_DESIGN_STYLES_REFERENCE.md）

---

## 🎬 Remotion 视频创作（自动化生产）

### 核心理念

**用代码创作电影级别的程序化视频** - 用户只需简单描述需求，系统自动匹配设计风格、生成完整代码。

### 触发关键词（自动识别）

当用户提到以下内容时，**自动启动 Remotion 视频创作流程**：
- "视频"、"动画"、"演示视频"、"产品介绍视频"
- "Instagram"、"YouTube"、"TikTok"、"社交媒体视频"
- "数据可视化动画"、"图表动画"
- "品牌视频"、"宣传片"、"教程视频"

### 自动化工作流程

```
用户简单描述 → 自动分析场景类型 → 自动匹配设计风格 → 自动选择技术栈 → 直接生成代码
```

**用户不需要做**：
- ❌ 填写复杂模板
- ❌ 选择设计风格（除非特别指定）
- ❌ 决定技术栈
- ❌ 计算时长分配
- ❌ 写配色方案
- ❌ 选择动画类型

**用户只需要做**：
- ✅ 描述视频的**目的**（产品演示/教育/社交媒体/数据报告）
- ✅ 描述视频的**内容**（展示什么/讲什么故事）
- ✅ 可选：时长（默认30秒）、平台（默认 YouTube）

### 自动匹配规则

| 需求关键词 | 自动选择的风格 | 自动配色 | 技术栈 |
|-----------|---------------|---------|--------|
| "产品演示"、"SaaS"、"科技" | Glassmorphism + Tech | #0066ff + #00ffff + #1e1e1e | Tailwind + Spring + 粒子 |
| "社交媒体"、"Reels"、"短视频" | Synthwave / Cyberpunk | #ff006e + #8338ec + #3a86ff | Lottie + 快节奏 |
| "教程"、"教学"、"如何" | Clean Modern + Minimalist | #1C2833 + #F39C12 + #F4F6F6 | 字幕 + 图示 |
| "数据"、"报告"、"分析" | Business Pro + Charts | #2C3E50 + #E74C3C + #ECF0F1 | 图表动画 + 数字递增 |
| "品牌"、"故事"、"宣传" | Creative Vibrant | #E76F51 + #2A9D8F + #264653 | 图片叠加 + 过渡 |
| "游戏"、"酷炫"、"电竞" | Cyberpunk + Neon | #00FFFF + #FF00FF + #0A0E27 | 3D + 故障效果 |

### 快速示例

**用户说**：
```
做一个30秒的产品介绍视频，我们的产品是 AI 写作工具
```

**系统自动处理**：
```typescript
// 自动分析
场景类型：产品演示
设计风格：Glassmorphism + Tech Innovation
配色方案：科技蓝 (#0066ff) + 霓虹青 (#00ffff)
时长：30秒 | 分辨率：1920x1080 | 帧率：60fps

// 自动生成场景
Scene 1 (0-5s): Logo 弹性入场 + 粒子特效
Scene 2 (5-15s): 3个核心功能卡片滑入（毛玻璃）
Scene 3 (15-25s): 数据图表从0递增到目标值
Scene 4 (25-30s): CTA 按钮脉冲 + 联系方式

// 自动生成素材指令
Nano Banana Pro: 生成3张功能截图（4K，Glassmorphism风格）
Processing: 科技感粒子背景（particle connections）

// 输出完整的 Remotion 项目代码
```

### 三大核心能力组合

| 能力 | 用途 | 自动触发条件 |
|------|------|------------|
| **Remotion** | React 代码化视频 | 所有视频需求 |
| **Nano Banana Pro** | 生成高质量静态素材 | 需要产品截图/场景图片 |
| **Processing Creative** | 生成动画背景/特效 | 需要粒子/流场/3D背景 |

### Remotion 核心技术（29个最佳实践）

| 技术类别 | 核心文件 | 用途 |
|---------|---------|------|
| **动画与时间** | animations.md, timing.md | Spring弹性、缓动曲线 |
| **场景序列** | sequencing.md, transitions.md | 场景切换、过渡效果 |
| **文字动画** | text-animations.md, fonts.md | 打字机、字幕、逐词显示 |
| **图表数据** | charts.md | 柱状图、折线图、数字递增 |
| **3D 内容** | 3d.md | Three.js + React Three Fiber |
| **音频同步** | audio.md, audio-visualization | 音频驱动动画 |
| **素材导入** | images.md, videos.md, lottie.md | 图片/视频/Lottie 动画 |

### 完整文档

- **主指南**: `E:\Bobo's Coding cache\bo-skill-research\REMOTION_VIDEO_CREATION_GUIDE.md` ⭐
- **自动化规则**: `C:\Users\Administrator\.claude\rules\remotion-auto-production.md` 🎯
- **Skills 目录**: `~/.claude/skills/remotion-dev/skills/remotion/` (29个规则)
- **设计风格库**: `~/.claude/design/UI_DESIGN_STYLES_REFERENCE.md` (30种风格)

### 输出格式

每次处理视频需求后，自动输出：

1. **分析总结**（场景类型、设计风格、配色、技术规格）
2. **完整 Remotion 项目代码**（Root.tsx + 所有 Scene 组件 + 配置）
3. **素材生成指令**（Nano Banana Pro + Processing）
4. **渲染命令**（预览 + 高质量渲染）

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

## ♿ 无障碍性自动化系统

### 核心能力

**多层次自动化检查**（WCAG 2.0-2.2 AA 标准）：
- 开发时：ESLint 实时检查（13 个 jsx-a11y 规则）
- 提交前：Pre-commit Hook 自动验证
- 推送后：GitHub Actions CI/CD 检查
- 定期：每周 Component Audit 自动审计

### 配置文件（10 个）

| 文件 | 功能 | 状态 |
|------|------|------|
| `.eslintrc.json` | 13 个 jsx-a11y 规则 | ✅ |
| `.eslintignore` | 排除构建目录 | ✅ |
| `.github/workflows/accessibility-check.yml` | PR/Push 自动检查 | ✅ |
| `.github/workflows/component-audit.yml` | 每周自动审计 | ✅ |
| `.husky/pre-commit` | 提交前检查（可执行） | ✅ |
| `playwright.config.ts` | Playwright 配置 | ✅ |
| `tests/accessibility.spec.ts` | 11 个自动化测试 | ✅ |
| `package.json` | 脚本和依赖 | ✅ |

### Playwright 测试用例（11 个）

1. 键盘导航测试
2. 屏幕阅读器支持测试
3. 焦点管理测试
4. ARIA 属性测试
5. 色彩对比度测试
6. 表单标签和验证测试
7. 链接和按钮可访问性测试
8. 图片 alt 文本测试
9. 标题层级结构测试
10. 交互元素可点击区域测试
11. 语义化 HTML 测试

### 常用命令

```bash
# ESLint 检查（立即可用）
npm run lint

# Playwright 测试（需要先安装依赖）
npm run test:accessibility

# Pre-commit Hook 测试
echo "// test" > test.tsx
git add test.tsx
git commit -m "test"
git reset HEAD~1 && rm test.tsx
```

### 关键依赖

```json
{
  "@axe-core/playwright": "^4.10.0",
  "@playwright/test": "^1.48.0",
  "eslint-plugin-jsx-a11y": "^6.10.2"
}
```

### 环境要求 ⚠️

**重要**: npm 命令需要在 **PowerShell** 或 **CMD** 中运行，Git Bash 存在输出重定向问题。

```bash
# ❌ 不要在 Git Bash 中运行
npm install  # 会卡住

# ✅ 在 PowerShell/CMD 中运行
cd "项目路径"
npm install
npx playwright install chromium
```

### 文档体系

| 文档 | 用途 | 优先级 |
|------|------|--------|
| `README_ACCESSIBILITY.md` | 主使用指南 | ⭐⭐⭐ |
| `QUICK_START.md` | 3 步快速启动 | ⭐⭐ |
| `SCREEN_READER_TESTING_GUIDE.md` | 手动测试（600+ 行） | 测试 |
| `ACCESSIBILITY_SETUP_COMPLETE.md` | 完整技术文档 | 深度 |

### 最佳实践

1. **分层自动化**：不同阶段不同检查，减少人工审查负担
2. **立即可用功能**：ESLint 和 Pre-commit Hook 无需安装额外依赖
3. **渐进式披露文档**：从快速开始到深度技术，满足不同需求
4. **环境兼容性声明**：明确说明 Git Bash 限制，提供替代方案

### 项目路径

- 示例项目：`E:\Bobo's Coding cache\bo-work\big_dashboard`
- 文档目录：项目根目录
- 测试目录：`tests/accessibility.spec.ts`

---

## 🤖 AI Agent 知识库系统

### 核心能力

**知识库集成**（12 个核心文档，116 KB）：
- 在服务启动时加载到内存（~100ms）
- 每次请求从内存读取（~1ms）
- 支持分类加载和热重载

### 知识库文档（12 个）

**核心规则**（3 个）:
- `core/CLAUDE.md` - 核心工作流程和原则
- `core/DECISION_TREE.md` - 能力决策树
- `core/QUICK_START.md` - 快速开始指南

**能力指南**（6 个）:
- `capabilities/mcp-servers.md` - MCP 服务器指南
- `capabilities/skills-guide.md` - Skills 使用指南
- `capabilities/plugins-auto.md` - 自动激活插件
- `capabilities/MARKETING_SKILLS_GUIDE.md` - 营销技能
- `capabilities/PPT_WORKFLOW.md` - PPT 制作流程
- `capabilities/PROCESSING_SKILL.md` - Processing 创意编程

**设计规范**（2 个）:
- `design/DESIGN_MASTER_PERSONA.md` - 设计大师人格
- `design/UI_DESIGN_STYLES_REFERENCE.md` - 30 种设计风格

**错误处理**（1 个）:
- `errors/ERROR_CATALOG.md` - 错误知识库

### 实现模式

```typescript
// ✅ 正确：启动时加载到内存
export class KnowledgeBaseService {
  private loadedDocs: Map<string, string> = new Map();
  private isInitialized = false;

  async init() {
    console.log('[KnowledgeBase] 加载中...');
    const docs = await this.loadAllDocs();
    this.loadedDocs = new Map(docs.map(doc => [doc.path, doc.content]));
    console.log(`[KnowledgeBase] 加载完成: ${this.loadedDocs.size} 文件, ${totalSize / 1024} KB`);
    this.isInitialized = true;
  }

  getSystemPrompt(category?: string): string {
    // 从内存读取，而不是文件系统
    return Array.from(this.loadedDocs.values()).join('\n\n');
  }
}

// server.ts
const knowledgeBase = new KnowledgeBaseService();
await knowledgeBase.init();
```

### 性能对比

| 方案 | 加载时间 | 请求响应时间 | 内存占用 |
|------|---------|------------|---------|
| **每次请求加载** | 0ms | ~150ms | 低 |
| **启动时加载** ✅ | ~100ms | ~1ms | ~120KB |

**推荐**: 启动时加载
- 启动慢一点（+100ms），响应快很多（-149ms）
- 内存占用可接受（~120KB）
- 确保知识库一致性

### 项目路径

- 示例项目：`E:\Bobo's Coding cache\bo-work\craft-agents-oss`
- 后端服务：`apps/server/src/services/KnowledgeBaseService.ts`
- 知识库路径：`~/.claude/` (12 个文档)

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
| 错误详情 | 完整错误案例 | [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md) |
| 方法论图书馆 | AI工作流洞察 | [AI_WORKFLOW_INSIGHTS.md](../learning/AI_WORKFLOW_INSIGHTS.md) |
| 决策树 | 详细能力决策 | [DECISION_TREE.md](DECISION_TREE.md) |
| **浏览器自动化决策树** | **Playwright vs agent-browser** | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) ⭐ 新增 |
| MCP 详解 | 所有 MCP 用法 | [mcp-servers.md](../capabilities/mcp-servers.md) |
| Skills 清单 | 81个 Skills | [skills-guide.md](../capabilities/skills-guide.md) |
| Vibe Marketing | 完整营销指南 | [VIBE_MARKETING_GUIDE.md](../vibe-marketing/VIBE_MARKETING_GUIDE.md) |
| MCP 营销设置 | Firecrawl/Perplexity | [MCP_SETUP_GUIDE.md](../vibe-marketing/MCP_SETUP_GUIDE.md) |
| n8n 工作流 | 营销自动化 | [N8N_WORKFLOWS.md](../vibe-marketing/N8N_WORKFLOWS.md) |
| Processing Skill | 创意编程指南 | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) |
| **Web Design Guidelines** | **UI代码规范审查（60+规则）** | [web-design-guidelines.md](../capabilities/web-design-guidelines.md) ⭐ 新增 |
| 设计风格库 | 30种UI/UX风格 | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) |
| 设计人格指南 | 完整设计哲学 | [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) 🎯 |

### 外部资源链接

| 资源 | 链接 |
|------|------|
| Vibe Marketing Kit (Notion) | [链接](https://recondite-bookcase-f3e.notion.site/The-Ultimate-Vibe-Marketing-Kit-28cebd240d10809393d1ebac001d623e) |
| GitHub 工具仓库 | [链接](https://github.com/the-vibe-marketers/vibemarketingkit) |
| Vibe Marketers 社区 | [链接](https://www.skool.com/the-vibe-marketers) |
| Processing Skill 仓库 | [链接](https://github.com/Arxchibobo/Processing-skill-for-vibe) |

---

**准备接收任务** 🚀

## Development Environment
- OS: Windows 10.0.26200
- Shell: Git Bash
- Path format: Windows (use forward slashes in Git Bash)
- File system: Case-insensitive
- Line endings: CRLF (configure Git autocrlf)

## Playwright MCP Guide

File paths:
- Screenshots: `./CCimages/screenshots/`
- PDFs: `./CCimages/pdfs/`

Browser version fix:
- Error: "Executable doesn't exist at chromium-1179" → Version mismatch
- Quick fix: `cd ~/AppData/Local/ms-playwright && cmd //c "mklink /J chromium-1179 chromium-1181"`
- Or install: `npx playwright@1.40.0 install chromium`

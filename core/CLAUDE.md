# CLAUDE.md

> **Version**: 4.0 | **Updated**: 2026-01-22 | **核心原则：计划 → 确认 → 执行到底 → 验收**

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
需要外部数据？     → MCP (bytebase/honeycomb/stripe/context7)
需要自动化？       → Skills (/commit, /write-tests, browser-use)
需要建议？         → Plugins（自动激活，直接描述需求）
需要营销研究？     → Vibe Marketing (Firecrawl/Perplexity/n8n)
需要营销优化？     → Marketing Skills (转化/文案/SEO/定价)
需要动画/视觉设计？ → Processing（粒子/流场/渐变/数据图表）
需要 UI 组件？     → ui-ux-pro-max（自动激活）
```

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
| 错误详情 | 完整错误案例 | [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md) |
| 方法论图书馆 | AI工作流洞察 | [AI_WORKFLOW_INSIGHTS.md](../learning/AI_WORKFLOW_INSIGHTS.md) |
| 决策树 | 详细能力决策 | [DECISION_TREE.md](DECISION_TREE.md) |
| MCP 详解 | 所有 MCP 用法 | [mcp-servers.md](../capabilities/mcp-servers.md) |
| Skills 清单 | 81个 Skills | [skills-guide.md](../capabilities/skills-guide.md) |
| Vibe Marketing | 完整营销指南 | [VIBE_MARKETING_GUIDE.md](../vibe-marketing/VIBE_MARKETING_GUIDE.md) |
| MCP 营销设置 | Firecrawl/Perplexity | [MCP_SETUP_GUIDE.md](../vibe-marketing/MCP_SETUP_GUIDE.md) |
| n8n 工作流 | 营销自动化 | [N8N_WORKFLOWS.md](../vibe-marketing/N8N_WORKFLOWS.md) |
| Processing Skill | 创意编程指南 | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) |
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

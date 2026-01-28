# Claude Code 工程化速查表

> ⚡ 一页纸快速参考 | 🎯 常见任务 | ❌ 错误速查 | 🔧 工具选择

---

## 🚀 常见任务

| 任务 | 命令/文档 | 时间 |
|-----|----------|------|
| **提交代码** | `/commit` | 30秒 |
| **创建 PR** | `/create-pr` | 1分钟 |
| **代码审查** | `/code-review` | 2分钟 |
| **生成测试** | `/write-tests` | 3分钟 |
| **做 PPT** | [PPT_WORKFLOW](../capabilities/PPT_WORKFLOW.md) | 10分钟 |
| **做视频** | [Remotion Guide](../rules/remotion-auto-production.md) | 20分钟 |
| **数据分析** | [Bot Analysis](../skills-research/shane-skill/data-analysis-agent/) | 3分钟 |
| **营销研究** | [Vibe Marketing](../vibe-marketing/VIBE_MARKETING_GUIDE.md) | 1小时 |

---

## ❌ 错误速查

| 错误现象 | 案例 | 解决方案 | 严重程度 |
|---------|------|---------|---------|
| **异步操作慢** | E001 | `Promise.all()` 并行 | 🔴 严重 |
| **轮询卡死** | E002 | 添加 `maxAttempts` 超时 | 🔴 严重 |
| **错误消失** | E003 | `catch` 后重新 `throw` | 🔴 严重 |
| **SQL 慢查询** | E004 | 用 CTE 预过滤 | 🟡 中等 |
| **资源泄漏** | E007 | 所有退出路径清理 | 🔴 严重 |
| **查询错误** | E008 | 验证 ID 类型（bot_id vs user_id） | 🔴 严重 |
| **npm 卡住** | E011 | PowerShell 代替 Git Bash | 🟡 中等 |
| **hook 不执行** | E012 | `chmod +x .husky/pre-commit` | 🟡 中等 |
| **加载慢** | E013 | 启动时预加载到内存 | 🔴 严重 |
| **路径错误** | E014 | 统一路径转换层 | 🟡 中等 |
| **Hook 失败** | E015 | 验证完整链路 | 🔴 严重 |

**完整错误库**: [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)

---

## 🎯 场景快速导航

### 📹 视频制作
```
需求 → remotion-auto-production.md → 自动匹配风格 → 生成 React 代码
素材 → Nano Banana Pro (4K图片) + Processing (动画背景)
输出 → 完整 Remotion 项目 + 渲染命令
```

### 📊 PPT 制作
```
需求 → PPT_WORKFLOW.md
Step 1: Nano Banana Pro 生成页面设计
Step 2: Python-pptx 组装 PPT
Step 3: Processing 创建 HTML 演示
输出 → .pptx + .html + 图片文件夹
```

### 📈 数据分析
```
需求 → data-analysis-agent/
选择 → Bot分析 / 成本分析 / 收入分析
执行 → bytebase MCP 自动查询
输出 → chart MCP 可视化报告
```

### 🎨 UI 设计
```
需求 → DESIGN_MASTER_PERSONA.md（设计哲学）
风格 → UI_DESIGN_STYLES_REFERENCE.md（30种风格）
审查 → web-design-guidelines.md（60+规则）
自动 → ui-ux-pro-max Skill
```

### 🌐 浏览器自动化
```
决策树 → browser-automation-decision-tree.md
对话式 → Playwright MCP（主力）
批量操作（>50次）→ agent-browser CLI
脚本化 → agent-browser CLI
```

---

## 🔧 工具选择决策

### MCP vs Skill vs Plugin

| 类型 | 何时使用 | 示例 |
|------|---------|------|
| **MCP Server** | 外部数据/服务 | bytebase, honeycomb, playwright |
| **Skill** | 自动化任务 | /commit, /code-review, ui-ux-pro-max |
| **Plugin** | 能力增强（自动激活） | backend-development, security-scanning |

### 浏览器自动化选择

| 场景 | 工具 | 原因 |
|-----|------|------|
| 对话中实时操作 | **Playwright MCP** ⭐ | 无缝集成，结果自动返回 |
| 批量操作（>50次）| **agent-browser CLI** 🚀 | 性能 1.85-2.9x |
| 脚本化/定时任务 | **agent-browser CLI** | CLI命令，适合cron/CI |
| AI Agent 系统 | **agent-browser CLI** | Accessibility Tree + Refs |
| 网络拦截/录制 | **Playwright MCP** | Route请求，Mock响应 |

---

## 📚 核心文档路径

```
核心规则:
  - CLAUDE.md              核心工作流程
  - DECISION_TREE.md       能力决策树
  - QUICK_START.md         3分钟入门

能力文档 (capabilities/):
  - mcp-servers.md         MCP服务器指南
  - skills-guide.md        Skills使用指南
  - MARKETING_SKILLS_GUIDE.md  24个营销Skills
  - PPT_WORKFLOW.md        PPT三格式输出
  - PROCESSING_SKILL.md    创意编程
  - browser-automation-decision-tree.md  浏览器决策
  - web-design-guidelines.md  60+设计规则

设计规范 (design/):
  - DESIGN_MASTER_PERSONA.md     设计哲学
  - UI_DESIGN_STYLES_REFERENCE.md  30种风格

错误案例 (errors/):
  - ERROR_CATALOG.md       E001-E015完整案例

规则文件 (rules/):
  - remotion-auto-production.md  Remotion自动化

委托系统 (delegator/):
  - delegation-format.md   7部分模板
  - triggers.md            触发规则
```

---

## 🤖 GPT 专家快速调用

| 专家 | 触发场景 | 模式 |
|-----|---------|------|
| **Architect** | 架构决策 / 2+失败尝试 | Advisory / Implementation |
| **Plan Reviewer** | "review this plan" | Advisory (APPROVE/REJECT) |
| **Scope Analyst** | 模糊需求 / "analyze scope" | Advisory |
| **Code Reviewer** | 完成功能后 / "review code" | Advisory / Implementation |
| **Security Analyst** | 安全问题 / "security review" | Advisory / Implementation |

---

## 🎨 设计风格速选

### 主流风格（6种）
- **极简主义** - 简洁高端
- **玻璃态** - 现代科技
- **新拟物化** - 柔和立体
- **粗野主义** - 大胆冲突
- **扁平化** - 清爽直观
- **拟物化** - 真实质感

### 科技美学（4种）
- **赛博朋克** - 霓虹未来
- **HUD科幻** - 全息界面
- **深色模式** - 专业极简
- **AI原生** - 智能辅助

### 复古风格（5种）
- **复古未来** - 80年代科幻
- **千禧年** - Y2K金属
- **蒸汽波** - 粉紫美学
- **孟菲斯** - 几何色彩
- **像素艺术** - 8/16-bit

**完整风格库**: [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md)

---

## 📊 数据分析 Skills

| Skill | 用途 | 频率 |
|-------|------|------|
| **bot-margin-analysis** | 每个bot的盈利能力 | 每月 |
| **bot-revenue-cost-trend** | 特定bot时间序列 | 每周/按需 |
| **cost-trend-by-user-type** | 按用户类型成本分布 | 每周 |
| **gross-margin-analysis** | 整体业务盈利能力 | 每日 |
| **revenue-subscription-analysis** | 全面业务分析 | 每月 |
| **main-site-energy-analysis** | 主站 vs Art 消耗对比 | 按需 |

---

## 🏷️ 营销 Skills（24个）

### 转化率优化（CRO）- 6个
- `page-cro` - 任何营销页面
- `signup-flow-cro` - 注册流程
- `onboarding-cro` - 用户激活
- `form-cro` - 潜客捕获
- `popup-cro` - 弹窗转化
- `paywall-upgrade-cro` - 付费墙

### 内容文案 - 4个
- `copywriting` - 营销文案
- `copy-editing` - 编辑润色
- `email-sequence` - 邮件序列
- `social-content` - 社交媒体

### SEO - 4个
- `seo-audit` - 技术SEO审计
- `programmatic-seo` - 规模化页面
- `competitor-alternatives` - vs页面
- `schema-markup` - 结构化数据

### 其他
- `paid-ads` - Google/Meta/LinkedIn广告
- `analytics-tracking` - GA4/GTM追踪
- `ab-test-setup` - A/B测试
- `pricing-strategy` - 定价策略
- `launch-strategy` - 产品发布

**完整清单**: [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md)

---

## 🔄 工作流速查

### TDD 流程
```
1. 红 → 写失败测试
2. 绿 → 最小实现通过
3. 重构 → 优化代码
4. 循环
```

### Git 提交流程
```
1. git status（查看变更）
2. git diff（查看差异）
3. git log（查看历史）
4. /commit（自动生成提交消息）
5. git status（验证）
```

### 代码审查流程
```
1. 完成功能
2. 自我审查
3. /code-review（自动触发）
4. GPT Code Reviewer（深度分析）
5. 修复问题或合并
```

---

## 🎯 快速命令

### Nano Banana Pro
```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "描述" \
  --filename "文件名.png" \
  --resolution 4K
```

### Processing (自动激活)
```
"Create a particle system background with tech style"
→ 自动生成 p5.js/React/Vue 代码
```

### agent-browser CLI
```bash
agent-browser open URL
agent-browser find role="button"
agent-browser click @e1
agent-browser type @e2 "text"
```

### Playwright MCP
```
browser_navigate(url)
browser_snapshot()
browser_click(ref, element)
browser_type(ref, text)
```

---

## 📖 学习路径

### 新手（3分钟）
1. [QUICK_START.md](QUICK_START.md)
2. 尝试简单任务（/commit, /code-review）
3. 查看错误案例（E001-E005）

### 进阶（2小时）
1. [CLAUDE.md](CLAUDE.md) 完整规则
2. [DECISION_TREE.md](DECISION_TREE.md) 决策逻辑
3. 专题学习（PPT/视频/数据）

### 专家（深度）
1. [learning/](../learning/) 学习笔记
2. [references/](../references/) 深度参考
3. 自定义扩展

---

## 💡 Pro Tips

1. **多工具联动**:
   - PPT = Nano Banana + Python-pptx + Processing
   - 视频 = Remotion + Nano Banana + Processing
   - 数据 = bytebase + chart MCP

2. **自动激活**:
   - 说"优化落地页" → 自动触发 page-cro
   - 说"做PPT" → 自动加载 PPT_WORKFLOW
   - 说"浏览器操作" → 自动决策 Playwright vs agent-browser

3. **错误预防**:
   - 异步 → 用 `Promise.all()`
   - 轮询 → 加 `maxAttempts`
   - catch → 重新 `throw`

4. **性能优化**:
   - 知识库 → 启动时预加载
   - SQL → CTE 预过滤
   - 跨平台 → 统一路径转换

---

## 🔗 快速链接

- **完整索引**: [INDEX.md](INDEX.md)
- **知识图谱**: [KNOWLEDGE_MAP.md](KNOWLEDGE_MAP.md)
- **错误案例**: [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)
- **GitHub 仓库**: https://github.com/Arxchibobo/claude-Reconstruction

---

**速查表版本**: v1.0
**最后更新**: 2026-01-28
**打印友好**: 适合单页打印

💡 **建议**: 打印此页并贴在显示器旁，快速查找常见任务和错误解决方案。

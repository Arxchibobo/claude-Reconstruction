# Changelog

所有重要的更改都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [4.1.0] - 2026-01-23

### ✨ 新增

#### 无障碍性自动化系统
- 新增 WCAG 2.0-2.2 AA 标准完整实现
- 新增 ESLint + Playwright + GitHub Actions 多层次自动化检查
- 新增 11 个自动化测试用例（键盘导航、屏幕阅读器、ARIA、色彩对比度等）
- 新增 Pre-commit Hook 自动验证
- 新增完整文档体系（README_ACCESSIBILITY.md + QUICK_START.md + 600+ 行测试指南）

#### AI Agent 知识库系统
- 新增知识库集成模式（12 个核心文档，116 KB）
- 新增启动时加载到内存机制（响应时间从 150ms 降至 1ms）
- 新增 Craft Agents 三栏布局实现
- 新增 Markdown 渲染支持（GitHub Flavored Markdown）
- 新增文件上传功能（图片/文档/数据多格式支持）
- 新增增强输入工具栏（提示词选择 + 模型选择）

#### Remotion 视频创作能力
- 新增 Remotion 视频创作完整指南（REMOTION_VIDEO_CREATION_GUIDE.md）
- 新增自动化视频生产规则（remotion-auto-production.md）
- 整合 Remotion + Nano Banana Pro + Processing 三大能力
- 新增场景类型自动识别和风格自动匹配
- 新增 30 种设计风格库参考

### 🔧 改进

#### CLAUDE.md
- 添加 E011: Git Bash npm install 失败（环境兼容性）
- 添加 E012: Pre-commit Hook 权限问题（配置问题）
- 添加 E013: 知识库每次请求加载（性能问题）
- 新增无障碍性自动化系统章节（完整配置和使用指南）
- 新增 AI Agent 知识库系统章节（实现模式和性能对比）
- 更新版本号至 4.1

#### DECISION_TREE.md
- 全栈开发场景从 12 个增至 15 个
- 新增场景 #28: 无障碍性检查
- 新增场景 #29: 知识库集成
- 新增场景 #30: Pre-commit Hook 设置

#### ERROR_CATALOG.md
- 更新版本号至 2.1
- 高频错误从 Top 10 增至 Top 13
- 新增 E011: Git Bash npm install 失败（高频，中等严重度）
- 新增 E012: Pre-commit Hook 权限（中频，中等严重度）
- 新增 E013: 知识库每次请求加载（中频，严重）
- 更新最后更新日期至 2026-01-23

### 📝 文档

#### 新增文档
- `analysis/TODAY_SUMMARY_2026-01-23.md` - 今日工作总结（5000+ 行）
  - 3 个主要项目完成记录
  - 核心成果和技术亮点
  - 最佳实践总结
  - 核心洞察和下一步计划

- `errors/TODAY_ERRORS_2026-01-23.md` - 今日错误和解决方案
  - E011: Git Bash npm install 失败（详细分析 + 解决方案）
  - E012: Pre-commit Hook 权限问题（详细分析 + 解决方案）
  - E013: 知识库性能优化（详细分析 + 解决方案）
  - 预防措施和自检清单
  - 核心洞察总结

### 💡 最佳实践

#### 多层次自动化
- 第一层：开发时实时反馈（ESLint）
- 第二层：提交前验证（Pre-commit Hook）
- 第三层：推送后检查（GitHub Actions）
- 第四层：定期审计（Weekly Audit）

#### 知识库即时可用性
- 启动时加载完成（+100ms）
- 请求时从内存读取（-149ms）
- 内存占用可接受（~120KB）

#### 用户体验三层次
1. 自动化 - 用户不需要做任何事情
2. 简化 - 用户只需要提供最少的输入
3. 引导 - 清晰的文档和错误提示

#### 文档渐进式披露
- 快速开始（3-5 分钟）→ 立即使用
- 用户指南（10-15 分钟）→ 日常参考
- 完整文档（30+ 分钟）→ 深入学习
- 技术文档（60+ 分钟）→ 架构理解

### 📊 统计

#### 文件统计
- 创建/修改配置文件: 10+
- 编写文档: 10+ (共约 5000+ 行)
- 新增组件: 5+
- 实现测试用例: 11
- 集成知识库文档: 12

#### 技术栈新增
- 无障碍性: @axe-core/playwright, eslint-plugin-jsx-a11y
- Markdown: react-markdown, remark-gfm
- 视频创作: Remotion + Nano Banana Pro + Processing

#### 错误模式
- 新增错误模式: 3 个（E011, E012, E013）
- 错误总数: 从 10 个增至 13 个
- 严重度分布: 🔴 5 个, 🟡 6 个, 🟢 2 个

---

## [4.0.0] - 2026-01-22

### ✨ 新增

#### 设计系统
- 添加 `design/` 目录
- 新增 `DESIGN_MASTER_PERSONA.md` - 设计大师人格和完整设计哲学
- 新增 `UI_DESIGN_STYLES_REFERENCE.md` - 30 种 UI/UX 设计风格参考库
- 新增 `PPT_WORKFLOW.md` - 完整 PPT 制作工作流
- 新增 `PROCESSING_SKILL.md` - Processing 创意编程指南

#### Vibe Marketing
- 添加 `vibe-marketing/` 目录
- 新增 `VIBE_MARKETING_GUIDE.md` - 完整 Vibe Marketing 指南
- 新增 `MCP_SETUP_GUIDE.md` - Firecrawl/Perplexity MCP 设置
- 新增 `N8N_WORKFLOWS.md` - n8n 自动化工作流指南
- 新增 `MARKETING_SKILLS_GUIDE.md` - 24 个营销 Skills 详细指南

#### Skills 研究
- 添加 `skills-research/` 目录
- 整合 9 个专业 Skills 项目
  - `marketingskills/` - 24 个营销 Skills
  - `ui-ux-pro-max-skill/` - UI/UX Pro Max
  - `browser-use/` - 浏览器自动化
  - `shane-skill/` - 6 个数据分析 Skills
  - `deep-research-skill/` - 深度研究系统
  - `NanoBanana-PPT-Skills/` - Nano Banana PPT 制作
  - `Skill_Seekers/` - Skill 创建工具
- 新增 `skills-research/README.md` - Skills 总览和快速选择指南

#### 学习资源
- 新增 `CLAUDE_SKILLS_RESOURCES.md` - Claude Skills 资源库
- 新增 `SESSION_INSIGHTS.md` - 会话洞察记录
- 新增 `SKILL_EVOLUTION.md` - Skill 演进历史
- 新增 `OPTIMIZATION_QUEUE.md` - 优化队列

#### 参考资料
- 新增 `capability-matrix.md` - 能力矩阵
- 新增 `commands-cheatsheet.md` - 命令速查表
- 新增 `faq.md` - 常见问题

#### 工作流
- 新增 `full-stack-dev.md` - 全栈开发流程
- 新增 `debugging-ops.md` - 调试运维流程
- 新增 `browser-automation.md` - 浏览器自动化流程

#### 能力文档
- 新增 `agents-delegation.md` - Agents 委托系统指南

#### 分析报告
- 添加 `analysis/` 目录
- 新增 `token-efficiency-analysis.md` - Token 效率分析

#### 项目文档
- 新增 `RESTRUCTURE_PLAN.md` - 详细的重构计划文档
- 新增 `CHANGELOG.md` - 本文件

### 🔄 更改

#### 目录结构
- 重组整个目录结构，从 8 个主要目录扩展到 14 个
- 核心配置从根目录移到 `core/` 目录
- 所有文档路径更新为相对路径引用

#### 核心配置
- 更新 `core/CLAUDE.md` 到 v3.2
  - 添加设计系统章节
  - 添加 Vibe Marketing 章节
  - 添加营销 Skills 章节（24个）
  - 添加 PPT 制作工作流
  - 添加 Processing 创意编程
  - 更新所有文档引用路径
- 更新 `core/DECISION_TREE.md`
  - 同步最新的能力决策树

#### 错误知识库
- 更新 `errors/ERROR_CATALOG.md`
  - 同步最新的错误模式
  - 添加项目级错误目录
- 更新所有 `system-errors/*.md` 文件

#### README
- 大幅更新 `README.md`
  - 更新目录结构展示
  - 添加新功能介绍（设计、营销、Skills 研究）
  - 更新核心功能章节
  - 添加快速导航链接

### 📊 统计

- **总文件数**: 100+ 个文件
- **文档数**: 50+ 个 Markdown 文档
- **Skills 数**: 81 个 Skills + 24 个营销 Skills
- **错误模式数**: 10 个系统级错误
- **设计风格数**: 30 种 UI/UX 设计风格
- **工作流数**: 7 个标准工作流

### 🔗 集成

- MCP Servers: bytebase, honeycomb, chart, stripe, supabase, playwright
- Skills: 营销、UI/UX、数据分析、研究、PPT制作、浏览器自动化
- Plugins: 自动激活的专业建议系统
- Delegator: GPT 专家委托系统

---

## [3.2.0] - 2026-01-19

### 更改
- 基础配置系统
- 错误知识库初始版本
- 能力文档初始版本

---

## 版本号说明

**主版本号 (Major)**: 重大架构变更或不兼容的 API 更改
**次版本号 (Minor)**: 新功能添加，向后兼容
**修订号 (Patch)**: Bug 修复和小改进

---

**最新稳定版本**: v4.0.0

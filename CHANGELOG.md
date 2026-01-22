# Changelog

所有重要的更改都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

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

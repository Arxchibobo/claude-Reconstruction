# Claude Code 工程化完整索引

> 🗺️ 快速导航 | 📚 文档总数: 46+ | 最后更新: 2026-01-28

---

## 🚀 快速开始

| 文档 | 用途 | 时间 |
|-----|------|------|
| [QUICK_START.md](QUICK_START.md) | 3 分钟入门 | 3 分钟 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 一页纸速查 | 1 分钟 |
| [KNOWLEDGE_MAP.md](KNOWLEDGE_MAP.md) | 知识图谱 | 可视化 |

---

## 📚 核心文档

### 必读文档
| 文档 | 内容 | 大小 | 优先级 |
|-----|------|------|--------|
| [CLAUDE.md](CLAUDE.md) | 核心工作流程、Top 5 错误、方法论 | 30KB | ⭐⭐⭐ |
| [DECISION_TREE.md](DECISION_TREE.md) | 能力决策树、工具选择逻辑 | 28KB | ⭐⭐⭐ |

### 参考文档
| 文档 | 内容 | 场景 |
|-----|------|------|
| [OPTIMIZATION_PLAN.md](../OPTIMIZATION_PLAN.md) | 优化计划 | 了解项目改进方向 |
| [ANALYSIS_REPORT.md](../ANALYSIS_REPORT.md) | 深度分析报告 | 了解优缺点和创新点 |
| [UPDATE_LOG.md](../UPDATE_LOG.md) | 更新日志 | 查看最新变更 |

---

## 🎯 按场景查找

### 📹 视频制作
| 任务 | 文档 | 工具链 |
|-----|------|--------|
| 自动化视频 | [remotion-auto-production.md](../rules/remotion-auto-production.md) | Remotion |
| 设计风格选择 | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) | 30 种风格 |
| 动画背景 | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) | Processing |
| 视觉素材 | [NanoBanana-PPT-Skills](../skills-research/NanoBanana-PPT-Skills/) | Nano Banana Pro |

**完整流程**: Remotion + Nano Banana Pro + Processing

---

### 📊 PPT 制作
| 任务 | 文档 | 工具链 |
|-----|------|--------|
| 完整流程 | [PPT_WORKFLOW.md](../capabilities/PPT_WORKFLOW.md) | 主工作流 |
| 页面设计 | [NanoBanana-PPT-Skills](../skills-research/NanoBanana-PPT-Skills/) | Nano Banana Pro |
| 页面动画 | [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) | Processing |
| 设计规范 | [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) | 设计标准 |
| 风格库 | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) | 30 种风格 |

**输出**: .pptx + .html + 图片文件夹

---

### 📈 数据分析
| 任务 | 文档 | 工具 |
|-----|------|------|
| Bot 毛利率 | [bot-margin-analysis.md](../skills-research/shane-skill/data-analysis-agent/skills/bot-margin-analysis.md) | bytebase MCP |
| Bot 收入趋势 | [bot-revenue-cost-trend.md](../skills-research/shane-skill/data-analysis-agent/skills/bot-revenue-cost-trend.md) | bytebase + chart |
| 成本趋势 | [cost-trend-by-user-type.md](../skills-research/shane-skill/data-analysis-agent/skills/cost-trend-by-user-type.md) | bytebase |
| 整体毛利率 | [gross-margin-analysis.md](../skills-research/shane-skill/data-analysis-agent/skills/gross-margin-analysis.md) | bytebase |
| 收入订阅全面分析 | [revenue-subscription-analysis.md](../skills-research/shane-skill/data-analysis-agent/skills/revenue-subscription-analysis.md) | bytebase |

**完整清单**: [data-analysis-agent/](../skills-research/shane-skill/data-analysis-agent/) (8 个 Skills)

---

### 🎨 UI/UX 设计
| 任务 | 文档 | 标准 |
|-----|------|------|
| 设计人格 | [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) | 完整设计哲学 |
| 风格库 | [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) | 30 种风格 |
| 代码审查 | [web-design-guidelines.md](../capabilities/web-design-guidelines.md) | 60+ 规则 |

**自动触发**: ui-ux-pro-max Skill

---

### 🌐 浏览器自动化
| 任务 | 文档 | 工具选择 |
|-----|------|---------|
| 决策树 | [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) | Playwright vs agent-browser |
| 对话式操作 | Playwright MCP | 主力工具 |
| 批量操作 | agent-browser CLI | 高性能 |

**决策逻辑**: 对话式 → Playwright / 批量 → agent-browser

---

### 📝 营销与内容
| 任务 | 文档 | Skills |
|-----|------|--------|
| 营销技能全览 | [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md) | 24 个 Skills |
| 转化率优化 | page-cro, signup-flow-cro | CRO |
| 内容文案 | copywriting, email-sequence | 文案 |
| SEO | seo-audit, programmatic-seo | SEO |
| 营销工具包 | [vibe-marketing/](../vibe-marketing/) | Firecrawl + Perplexity |

---

### 🤖 GPT 专家委托
| 任务 | 文档 | 专家 |
|-----|------|------|
| 委托系统 | [delegator/README.md](../delegator/README.md) | 概览 |
| 提示模板 | [delegation-format.md](../delegator/delegation-format.md) | 7 部分模板 |
| 专家选择 | [model-selection.md](../delegator/model-selection.md) | 5 种专家 |
| 编排流程 | [orchestration.md](../delegator/orchestration.md) | 调用逻辑 |
| 触发规则 | [triggers.md](../delegator/triggers.md) | 自动触发 |

**5 种专家**: Architect, Plan Reviewer, Scope Analyst, Code Reviewer, Security Analyst

---

## 📂 按目录浏览

### capabilities/ - 能力文档 (9 个)
| 文档 | 内容 | 标签 |
|-----|------|------|
| [agents-delegation.md](../capabilities/agents-delegation.md) | Agent 委托 | 自动化 |
| [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md) | 浏览器自动化 | 工具选择 |
| [MARKETING_SKILLS_GUIDE.md](../capabilities/MARKETING_SKILLS_GUIDE.md) | 营销技能 | 24 个 Skills |
| [mcp-servers.md](../capabilities/mcp-servers.md) | MCP 服务器 | 外部集成 |
| [plugins-auto.md](../capabilities/plugins-auto.md) | 自动激活插件 | 30+ Plugins |
| [PPT_WORKFLOW.md](../capabilities/PPT_WORKFLOW.md) | PPT 工作流 | 三格式输出 |
| [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md) | Processing 创意 | 动画背景 |
| [skills-guide.md](../capabilities/skills-guide.md) | Skills 指南 | 81+ Skills |
| [web-design-guidelines.md](../capabilities/web-design-guidelines.md) | Web 设计规范 | 60+ 规则 |

---

### errors/ - 错误案例 (14 个)
| 案例 | 问题 | 严重程度 |
|-----|------|---------|
| E001 | 异步未并行 | 🔴 严重 |
| E002 | 轮询无超时 | 🔴 严重 |
| E003 | 错误未重新抛出 | 🔴 严重 |
| E004 | SQL 未用 CTE 预过滤 | 🟡 中等 |
| E007 | 忘记资源清理 | 🔴 严重 |
| E008 | 数据查询前未验证ID类型 | 🔴 严重 |
| E011 | Git Bash npm install 失败 | 🟡 中等 |
| E012 | Pre-commit Hook 权限问题 | 🟡 中等 |
| E013 | 知识库每次请求加载 | 🔴 严重 |
| E014 | 跨平台路径处理未统一 | 🟡 中等 |
| E015 | Hook 系统未验证完整链路 | 🔴 严重 |

**完整错误库**: [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)

---

### design/ - 设计规范 (2 个)
| 文档 | 内容 |
|-----|------|
| [DESIGN_MASTER_PERSONA.md](../design/DESIGN_MASTER_PERSONA.md) | 设计大师人格（完整设计哲学） |
| [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md) | 30 种 UI/UX 设计风格库 |

---

### rules/ - 规则文件 (5 个)
| 文档 | 内容 |
|-----|------|
| [remotion-auto-production.md](../rules/remotion-auto-production.md) | Remotion 视频自动化规则 |
| [delegator/*](../delegator/) | GPT 专家委托规则（4 个文件） |

---

### learning/ - 学习笔记 (6 个)
| 文档 | 内容 |
|-----|------|
| [AI_WORKFLOW_INSIGHTS.md](../learning/AI_WORKFLOW_INSIGHTS.md) | AI 工作流洞察 |
| [cross-platform-best-practices.md](../learning/cross-platform-best-practices.md) | 跨平台最佳实践 |
| [OPTIMIZATION_QUEUE.md](../learning/OPTIMIZATION_QUEUE.md) | 优化队列 |
| [SESSION_INSIGHTS.md](../learning/SESSION_INSIGHTS.md) | 会话洞察 |
| [SKILL_EVOLUTION.md](../learning/SKILL_EVOLUTION.md) | 技能演进 |

---

### workflows/ - 工作流 (5 个)
| 文档 | 内容 |
|-----|------|
| TDD 工作流 | 测试驱动开发 |
| Git 提交流程 | 自动化提交 |
| 代码审查流程 | 审查触发 |
| ... | （其他工作流） |

---

### vibe-marketing/ - 营销工具 (3 个)
| 文档 | 内容 |
|-----|------|
| [VIBE_MARKETING_GUIDE.md](../vibe-marketing/VIBE_MARKETING_GUIDE.md) | 完整营销指南 |
| [MCP_SETUP_GUIDE.md](../vibe-marketing/MCP_SETUP_GUIDE.md) | MCP 设置（Firecrawl/Perplexity） |
| [N8N_WORKFLOWS.md](../vibe-marketing/N8N_WORKFLOWS.md) | n8n 自动化工作流 |

---

## 🏷️ 按标签查找

### 标签: #自动化
- remotion-auto-production.md
- PPT_WORKFLOW.md
- agents-delegation.md
- N8N_WORKFLOWS.md

### 标签: #设计
- DESIGN_MASTER_PERSONA.md
- UI_DESIGN_STYLES_REFERENCE.md
- web-design-guidelines.md
- PROCESSING_SKILL.md

### 标签: #数据分析
- bot-margin-analysis.md
- cost-trend-by-user-type.md
- gross-margin-analysis.md
- revenue-subscription-analysis.md

### 标签: #营销
- MARKETING_SKILLS_GUIDE.md
- VIBE_MARKETING_GUIDE.md
- MCP_SETUP_GUIDE.md

### 标签: #错误案例
- ERROR_CATALOG.md (E001-E015)

### 标签: #工具选择
- browser-automation-decision-tree.md
- DECISION_TREE.md
- mcp-servers.md

---

## 🔍 按关键词搜索

### 关键词: "视频"
- [remotion-auto-production.md](../rules/remotion-auto-production.md)
- [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md)
- [UI_DESIGN_STYLES_REFERENCE.md](../design/UI_DESIGN_STYLES_REFERENCE.md)

### 关键词: "PPT"
- [PPT_WORKFLOW.md](../capabilities/PPT_WORKFLOW.md)
- [NanoBanana-PPT-Skills](../skills-research/NanoBanana-PPT-Skills/)
- [PROCESSING_SKILL.md](../capabilities/PROCESSING_SKILL.md)

### 关键词: "性能"
- E001: 异步未并行
- E013: 知识库加载优化
- [browser-automation-decision-tree.md](../capabilities/browser-automation-decision-tree.md)

### 关键词: "安全"
- Security Analyst (GPT 专家)
- E003: 错误未重新抛出
- [web-design-guidelines.md](../capabilities/web-design-guidelines.md)

---

## 📊 文档统计

```
总文档数: 46+ 个核心文档
总大小: ~620KB
核心文档: 2 个 (CLAUDE.md, DECISION_TREE.md)
能力文档: 9 个
错误案例: 15 个
设计规范: 2 个
规则文件: 5 个
学习笔记: 6 个
工作流: 5 个
营销工具: 3 个
```

---

## 🆕 最新更新

查看 [UPDATE_LOG.md](../UPDATE_LOG.md) 了解最新变更。

**最近更新** (2026-01-28):
- ✨ 新增浏览器自动化决策树
- ✨ 新增 Web 设计审查系统（60+ 规则）
- ✨ 新增 GPT 专家委托系统
- ✨ 新增 Remotion 视频自动化规则
- 📝 更新 CLAUDE.md（E014, E015 错误案例）

---

## 🔗 外部资源

### GitHub 仓库
- [claude-Reconstruction](https://github.com/Arxchibobo/claude-Reconstruction) - 主仓库
- [Processing-skill-for-vibe](https://github.com/Arxchibobo/Processing-skill-for-vibe) - Processing Skill
- [marketingskills](https://github.com/coreyhaines31/marketingskills) - Marketing Skills

### 社区资源
- [Vibe Marketing Kit (Notion)](https://recondite-bookcase-f3e.notion.site/The-Ultimate-Vibe-Marketing-Kit)
- [Vibe Marketers 社区](https://www.skool.com/the-vibe-marketers)

---

## 💬 反馈与贡献

- **Issue**: [报告问题或建议](https://github.com/Arxchibobo/claude-Reconstruction/issues)
- **PR**: [提交贡献](https://github.com/Arxchibobo/claude-Reconstruction/pulls)
- **讨论**: [GitHub Discussions](https://github.com/Arxchibobo/claude-Reconstruction/discussions)

查看 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解贡献指南。

---

**索引版本**: v1.0
**最后更新**: 2026-01-28
**维护者**: Arxchibobo

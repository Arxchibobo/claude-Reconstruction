# Claude Reconstruction

> **Claude Code 工程化配置系统** - 让每次会话都高效、稳定、可复现

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/Arxchibobo/claude-Reconstruction)

[English](README.en.md) | 简体中文

---

## 这是什么？

Claude Reconstruction 是一套经过实践验证的 **Claude Code 工程化配置系统**，包含：

- **错误知识库** - 10+ 常见错误模式及预防措施
- **决策树** - 50+ 场景的工具选择指南
- **工作流程** - 标准化的任务执行流程
- **能力文档** - MCP/Skills/Plugins 完整参考
- **最佳实践** - 编码规范和方法论

## 为什么需要它？

| 问题 | 解决方案 |
|-----|---------|
| 同样的错误反复出现 | 错误知识库 + 自检清单 |
| 不知道用哪个工具 | 决策树快速定位 |
| 任务执行效率低 | 标准工作流程 |
| 会话间知识丢失 | 持久化配置系统 |

---

## 系统要求

| 要求 | 版本/说明 |
|-----|---------|
| **Claude Code** | >= 1.0.0 |
| **操作系统** | macOS / Linux / Windows |
| **Shell** | Bash (Unix/Linux/macOS) / PowerShell (Windows) |
| **Node.js** | >= 14.0.0 (可选，用于 npm 安装) |

---

## 快速开始

### 安装（两步搞定）

**步骤 1: 克隆仓库**

```bash
git clone https://github.com/Arxchibobo/claude-Reconstruction.git
cd claude-Reconstruction
```

**步骤 2: 让 Claude Code 自动安装**

在 Claude Code 中说：

```
按照 INSTALL.md 安装这个配置系统
```

Claude Code 会自动：
- 读取 `INSTALL.md` 配置清单
- 备份现有配置（如果存在）
- 复制所有文件到 `~/.claude/`
- 验证安装结果

就这么简单！✨

### 验证安装

安装完成后，重启 Claude Code，你应该看到：
- ✅ 高频错误提醒
- ✅ 快速决策树
- ✅ 工作模式确认

或手动检查：

```bash
ls ~/.claude/CLAUDE.md
ls ~/.claude/errors/ERROR_CATALOG.md
ls ~/.claude/capabilities/mcp-servers.md
```

---

## 目录结构

```
claude-reconstruction/
├── README.md                          # 本文件
├── RESTRUCTURE_PLAN.md                # 重构计划文档
├── core/                              # 🎯 核心配置
│   ├── CLAUDE.md                     # 主配置文件（v3.2）
│   ├── DECISION_TREE.md              # 能力决策树
│   ├── QUICK_START.md                # 快速启动清单
│   └── WORK_MODES.md                 # 工作模式详解
├── errors/                            # 🔴 错误知识库
│   ├── ERROR_CATALOG.md              # 错误目录（Top 5 + 完整列表）
│   ├── system-errors/                # 系统级错误（6个）
│   └── project-errors/               # 项目级错误（用户添加）
├── capabilities/                      # 🔧 能力文档
│   ├── mcp-servers.md                # MCP Servers 完整指南
│   ├── skills-guide.md               # Skills 使用指南（81个）
│   ├── plugins-auto.md               # Plugins 自动激活
│   ├── agents-delegation.md          # Agents 委托系统
│   ├── MARKETING_SKILLS_GUIDE.md     # 营销技能（24个）
│   ├── PPT_WORKFLOW.md               # PPT 制作工作流
│   └── PROCESSING_SKILL.md           # Processing 创意编程
├── design/                            # 🎨 设计资源
│   ├── DESIGN_MASTER_PERSONA.md      # 设计大师人格
│   └── UI_DESIGN_STYLES_REFERENCE.md # 30种 UI/UX 设计风格
├── vibe-marketing/                    # 📢 Vibe Marketing 工具包
│   ├── VIBE_MARKETING_GUIDE.md       # 完整营销指南
│   ├── MCP_SETUP_GUIDE.md            # MCP 设置
│   └── N8N_WORKFLOWS.md              # n8n 自动化工作流
├── skills-research/                   # 🔬 Skills 研究项目
│   ├── README.md                     # Skills 索引
│   ├── marketingskills/              # 营销 Skills（24个）
│   ├── ui-ux-pro-max-skill/          # UI/UX Pro Max
│   ├── browser-use/                  # 浏览器使用
│   ├── shane-skill/                  # 数据分析 Skills（6个）
│   ├── deep-research-skill/          # 深度研究系统
│   ├── NanoBanana-PPT-Skills/        # Nano Banana PPT
│   └── Skill_Seekers/                # Skill 创建工具
├── workflows/                         # 🔄 标准工作流程
│   ├── auto-execution.md             # 自动执行模式
│   ├── data-analysis.md              # 数据分析流程
│   ├── full-stack-dev.md             # 全栈开发流程
│   ├── debugging-ops.md              # 调试运维流程
│   └── browser-automation.md         # 浏览器自动化
├── learning/                          # 📚 学习资源
│   ├── AI_WORKFLOW_INSIGHTS.md       # AI 工作流洞察
│   ├── CLAUDE_SKILLS_RESOURCES.md    # Claude Skills 资源
│   ├── SESSION_INSIGHTS.md           # 会话洞察
│   ├── SKILL_EVOLUTION.md            # Skill 演进
│   └── OPTIMIZATION_QUEUE.md         # 优化队列
├── references/                        # 📖 参考资料
│   ├── BEST_PRACTICES.md             # 最佳实践
│   ├── capability-matrix.md          # 能力矩阵
│   ├── commands-cheatsheet.md        # 命令速查表
│   └── faq.md                        # 常见问题
├── automation/                        # ⚙️ 自动化配置
│   └── hooks.md                      # Hooks 配置指南
├── delegator/                         # 🤝 委托系统（GPT 专家）
│   └── README.md                     # 委托系统说明
├── examples/                          # 📝 使用示例
│   ├── README.md                     # 示例索引
│   └── nodejs-api/                   # Node.js API 示例
├── scripts/                           # 🛠️ 安装脚本
│   ├── install.sh                    # Unix/Linux/macOS 安装
│   └── install.ps1                   # Windows PowerShell 安装
└── analysis/                          # 📊 分析报告
    └── token-efficiency-analysis.md  # Token 效率分析
```

---

## 核心功能

### 1. 错误知识库

10 个高频错误及预防措施：

| ID | 错误 | 自检问题 |
|----|------|---------|
| E001 | 异步未并行 | 使用 Promise.all()? |
| E002 | 轮询无超时 | 设置 maxAttempts? |
| E003 | 错误未重抛 | catch 中 throw? |
| E004 | SQL 未用 CTE | 预过滤数据? |
| ... | ... | ... |

👉 [完整错误目录](errors/ERROR_CATALOG.md)

### 2. 决策树

```
需要外部数据？ → MCP (bytebase/honeycomb/chart)
需要自动化？   → Skills (/commit, /write-tests)
需要建议？     → Plugins（自动激活）
```

👉 [完整决策树](core/DECISION_TREE.md)

### 3. 工作模式

```
计划 → 确认 → 执行到底 → 验收
```

**4 种致命阻塞（唯一允许提问）**：
1. 缺少关键凭证
2. 多个对立方案
3. 需求本质矛盾
4. 不可逆高风险

👉 [核心配置](core/CLAUDE.md)

### 4. 能力层次

| 层次 | 工具 | 用途 | 文档 |
|-----|------|-----|------|
| **Layer 1** | MCP Servers | 外部数据访问 | [MCP 指南](capabilities/mcp-servers.md) |
| **Layer 2** | Skills | 自动化任务 | [Skills 指南](capabilities/skills-guide.md) |
| **Layer 3** | Plugins | 专业建议（自动激活）| [Plugins 指南](capabilities/plugins-auto.md) |

### 5. 🎨 设计系统

- **30 种 UI/UX 设计风格** - 从极简到赛博朋克
- **设计大师人格** - 完整设计哲学和标准
- **PPT 制作工作流** - Nano Banana Pro + Processing + Python-pptx

👉 [设计资源](design/)

### 6. 📢 Vibe Marketing

- **AI 驱动的营销自动化** - 2周研究压缩到1小时
- **24 个营销 Skills** - CRO、文案、SEO、付费广告、定价策略
- **MCP 工具包** - Firecrawl 爬虫、Perplexity 研究、n8n 自动化

👉 [Vibe Marketing 指南](vibe-marketing/VIBE_MARKETING_GUIDE.md)

### 7. 🔬 Skills 研究项目

- **9 个专业 Skills 项目** - 营销、UI/UX、数据分析、研究、PPT制作
- **数据分析 Skills** - 6 个核心业务分析工具
- **深度研究系统** - Graph of Thoughts 多代理研究

👉 [Skills 研究索引](skills-research/README.md)

---

## 使用示例

### 数据分析

```
用户: 分析上月用户增长

Claude:
1. bytebase 查询用户数据
2. 本地数据处理
3. chart 生成趋势图
4. 输出分析报告
```

### 功能开发

```
用户: 添加用户注册功能

Claude:
1. 创建 TodoList 规划
2. 展示计划等待确认
3. 执行到底（不问问题）
4. 生成验收报告
```

### Git 操作

```
用户: /commit

Claude:
1. git status 查看变更
2. 分析变更内容
3. 生成 commit message
4. 等待确认后提交
```

---

## 自定义配置

### 添加项目特定错误

在 `errors/project-errors/` 创建新文件：

```markdown
# my-project-errors.md

## E101: 项目特定错误

**描述**: 错误描述
**自检**: 自检问题
**解决方案**: 代码示例
```

### 添加自定义 Skill

在 `~/.claude/commands/` 创建：

```markdown
# my-skill.md

> 描述 skill 用途

## 执行步骤
1. 步骤一
2. 步骤二
```

### 配置 Hooks

在 `~/.claude/settings.json` 添加：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "cat ~/.claude/startup.md" }
        ]
      }
    ]
  }
}
```

---

## 贡献

欢迎贡献！请：

1. Fork 本仓库
2. 创建特性分支
3. 提交变更
4. 创建 Pull Request

### 贡献方向

- 新的错误模式
- 工作流程优化
- 文档改进
- Bug 修复

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 致谢

感谢所有为 Claude Code 生态贡献的开发者。

---

**Happy Coding with Claude!** 🚀

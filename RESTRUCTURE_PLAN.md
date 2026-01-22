# Claude Reconstruction 重构计划

> **日期**: 2026-01-22
> **目标**: 整合和重组知识库系统，统一到 bo-work/claude-reconstruction

---

## 一、当前状况分析

### 1.1 现有内容分布

| 位置 | 内容 | 状态 |
|------|------|------|
| 根目录 `CLAUDE.md` | 主配置文件（v3.2） | ✅ 最新 |
| 根目录 `DECISION_TREE.md` | 能力决策树 | ✅ 最新 |
| `docs/` | 能力、设计、学习、参考、营销、工作流 | ✅ 完整 |
| `errors/` | 错误知识库 | ✅ 最新 |
| `bo-skill-research/` | Skills 研究项目 | ✅ 大量内容 |
| `.claude/skills/` | 自定义 Skills | ✅ 活跃使用 |
| `~/.claude/rules/delegator/` | 委托系统配置 | ✅ 全局配置 |
| `bo-work/claude-reconstruction/` | 重构目标目录 | ⚠️ 需更新 |

### 1.2 重构目录现有结构

```
claude-reconstruction/
├── core/                    # 核心配置
│   ├── CLAUDE.md           # 需更新
│   ├── DECISION_TREE.md    # 需更新
│   └── QUICK_START.md      # 现有
├── errors/                  # 错误知识库（需更新）
├── capabilities/            # 能力文档（需更新）
├── workflows/               # 工作流程（需补充）
├── learning/                # 学习资源（需更新）
├── references/              # 参考资料（需更新）
├── automation/              # 自动化配置
├── delegator/               # 委托系统
└── scripts/                 # 安装脚本
```

---

## 二、新的目录结构设计

### 2.1 完整目录树

```
claude-reconstruction/
├── README.md                          # 主索引文档
├── README.en.md                       # 英文文档
├── INSTALL.md                         # 安装指南
├── CONTRIBUTING.md                    # 贡献指南
├── LICENSE                            # MIT 许可证
│
├── core/                              # 🎯 核心配置
│   ├── CLAUDE.md                     # 主配置文件（v3.2）
│   ├── DECISION_TREE.md              # 能力决策树
│   ├── QUICK_START.md                # 快速启动清单
│   └── WORK_MODES.md                 # 工作模式详解
│
├── errors/                            # 🔴 错误知识库
│   ├── ERROR_CATALOG.md              # 错误目录（Top 5 + 完整列表）
│   ├── system-errors/                # 系统级错误
│   │   ├── async-parallel.md        # E001: 异步未并行
│   │   ├── timeout-polling.md       # E002: 轮询无超时
│   │   ├── error-handling.md        # E003: 错误未重抛
│   │   ├── sql-optimization.md      # E004: SQL 未用 CTE
│   │   ├── state-management.md      # E007: 忘记资源清理
│   │   └── api-integration.md       # 其他系统错误
│   └── project-errors/               # 项目级错误（空目录，供用户添加）
│
├── capabilities/                      # 🔧 能力文档
│   ├── mcp-servers.md                # MCP Servers 完整指南
│   ├── skills-guide.md               # Skills 使用指南（81个）
│   ├── plugins-auto.md               # Plugins 自动激活
│   ├── agents-delegation.md          # Agents 委托系统
│   ├── MARKETING_SKILLS_GUIDE.md     # 营销技能（24个）
│   ├── PPT_WORKFLOW.md               # PPT 制作工作流
│   └── PROCESSING_SKILL.md           # Processing 创意编程
│
├── design/                            # 🎨 设计资源
│   ├── DESIGN_MASTER_PERSONA.md      # 设计大师人格
│   └── UI_DESIGN_STYLES_REFERENCE.md # 30种 UI/UX 设计风格
│
├── vibe-marketing/                    # 📢 Vibe Marketing 工具包
│   ├── VIBE_MARKETING_GUIDE.md       # 完整营销指南
│   ├── MCP_SETUP_GUIDE.md            # MCP 设置（Firecrawl/Perplexity）
│   └── N8N_WORKFLOWS.md              # n8n 自动化工作流
│
├── workflows/                         # 🔄 标准工作流程
│   ├── auto-execution.md             # 自动执行模式
│   ├── data-analysis.md              # 数据分析流程
│   ├── full-stack-dev.md             # 全栈开发流程
│   ├── debugging-ops.md              # 调试运维流程
│   └── browser-automation.md         # 浏览器自动化
│
├── learning/                          # 📚 学习资源
│   ├── AI_WORKFLOW_INSIGHTS.md       # AI 工作流洞察
│   ├── CLAUDE_SKILLS_RESOURCES.md    # Claude Skills 资源
│   ├── SESSION_INSIGHTS.md           # 会话洞察
│   ├── SKILL_EVOLUTION.md            # Skill 演进
│   └── OPTIMIZATION_QUEUE.md         # 优化队列
│
├── references/                        # 📖 参考资料
│   ├── BEST_PRACTICES.md             # 最佳实践
│   ├── capability-matrix.md          # 能力矩阵
│   ├── commands-cheatsheet.md        # 命令速查表
│   └── faq.md                        # 常见问题
│
├── automation/                        # ⚙️ 自动化配置
│   └── hooks.md                      # Hooks 配置指南
│
├── delegator/                         # 🤝 委托系统（GPT 专家）
│   ├── README.md                     # 委托系统说明
│   ├── delegation-format.md          # 委托格式模板
│   ├── model-selection.md            # 模型选择指南
│   ├── orchestration.md              # 编排流程
│   └── triggers.md                   # 触发器配置
│
├── skills-research/                   # 🔬 Skills 研究项目
│   ├── README.md                     # 研究索引
│   ├── marketingskills/              # 营销 Skills
│   ├── ui-ux-pro-max-skill/          # UI/UX Pro Max
│   ├── browser-use/                  # 浏览器使用
│   ├── processing-creative-skill/    # Processing 创意
│   ├── NanoBanana-PPT-Skills/        # Nano Banana PPT
│   ├── shane-skill/                  # 数据分析 Skills
│   └── ...                           # 其他 Skills
│
├── examples/                          # 📝 使用示例
│   ├── README.md                     # 示例索引
│   └── nodejs-api/                   # Node.js API 示例
│       ├── README.md
│       ├── workflow.md
│       └── project-errors.md
│
├── scripts/                           # 🛠️ 安装脚本
│   ├── install.sh                    # Unix/Linux/macOS 安装
│   ├── install.ps1                   # Windows PowerShell 安装
│   └── sync-to-home.sh               # 同步到 ~/.claude/
│
└── analysis/                          # 📊 分析报告
    └── token-efficiency-analysis.md  # Token 效率分析
```

### 2.2 文件映射关系

| 源文件 | 目标文件 | 操作 |
|--------|---------|------|
| **核心配置** |
| `CLAUDE.md` | `core/CLAUDE.md` | 复制 + 更新 |
| `DECISION_TREE.md` | `core/DECISION_TREE.md` | 复制 + 更新 |
| **错误知识库** |
| `errors/ERROR_CATALOG.md` | `errors/ERROR_CATALOG.md` | 复制 + 更新 |
| `errors/system-errors/*` | `errors/system-errors/*` | 复制全部 |
| `errors/project-errors/*` | `errors/project-errors/*` | 复制全部 |
| **能力文档** |
| `docs/capabilities/*` | `capabilities/*` | 复制全部 |
| **设计资源** |
| `docs/design/*` | `design/*` | 复制全部 |
| **营销工具** |
| `docs/vibe-marketing/*` | `vibe-marketing/*` | 复制全部 |
| **工作流程** |
| `docs/workflows/*` | `workflows/*` | 复制 + 补充 |
| **学习资源** |
| `docs/learning/*` | `learning/*` | 复制 + 整理 |
| **参考资料** |
| `docs/references/*` | `references/*` | 复制 + 整理 |
| **Skills 研究** |
| `bo-skill-research/*` | `skills-research/*` | 整理 + 复制 |
| **委托系统**（全局配置，不复制） |
| `~/.claude/rules/delegator/*` | `delegator/` | 创建软链接/文档引用 |

---

## 三、执行步骤

### 3.1 备份现有内容
```bash
cd bo-work/claude-reconstruction
git add -A
git commit -m "backup: Before restructure (2026-01-22)"
```

### 3.2 创建新目录结构
```bash
mkdir -p design vibe-marketing skills-research analysis
```

### 3.3 复制和更新文件
按照文件映射关系执行复制操作。

### 3.4 更新交叉引用
更新所有文档内的路径引用。

### 3.5 创建索引文档
- 更新 `README.md`
- 创建各子目录的 `README.md`

### 3.6 提交到 Git
```bash
git add -A
git commit -m "refactor: Restructure knowledge base system (v4.0)"
git push origin main
```

---

## 四、路径引用规则

### 4.1 文档内引用格式

| 引用类型 | 格式 | 示例 |
|---------|------|------|
| 相对路径 | `../category/file.md` | `../errors/ERROR_CATALOG.md` |
| 根路径 | `/category/file.md` | `/capabilities/mcp-servers.md` |
| 章节锚点 | `file.md#section` | `CLAUDE.md#核心原则` |

### 4.2 需要更新的引用

**CLAUDE.md 中的引用**：
```markdown
- [错误详情](errors/ERROR_CATALOG.md)
- [MCP 详解](capabilities/mcp-servers.md)
- [Skills 清单](capabilities/skills-guide.md)
- [设计风格库](design/UI_DESIGN_STYLES_REFERENCE.md)
```

**README.md 中的引用**：
```markdown
- [核心配置](core/CLAUDE.md)
- [错误知识库](errors/ERROR_CATALOG.md)
- [能力文档](capabilities/)
```

---

## 五、验证清单

### 5.1 结构验证
- [ ] 所有目录已创建
- [ ] 所有文件已复制
- [ ] 没有重复文件

### 5.2 内容验证
- [ ] CLAUDE.md 是最新版本（v3.2）
- [ ] DECISION_TREE.md 是最新版本
- [ ] 错误目录包含所有错误
- [ ] 能力文档完整

### 5.3 引用验证
- [ ] 所有内部链接有效
- [ ] 路径引用正确
- [ ] 锚点链接有效

### 5.4 Git 验证
- [ ] 所有文件已暂存
- [ ] Commit 信息清晰
- [ ] 推送到远程仓库

---

## 六、后续维护

### 6.1 同步机制

创建同步脚本 `scripts/sync-to-home.sh`：
```bash
#!/bin/bash
# 将重构目录同步到 ~/.claude/

cp -r core/* ~/.claude/
cp -r errors/* ~/.claude/errors/
cp -r capabilities/* ~/.claude/capabilities/
# ...
```

### 6.2 版本管理

在 `CLAUDE.md` 头部维护版本信息：
```markdown
> **Version**: 4.0 | **Updated**: 2026-01-22 | **Status**: Stable
```

### 6.3 更新频率

| 内容类型 | 更新频率 | 触发条件 |
|---------|---------|---------|
| 核心配置 | 每周 | 工作模式变更 |
| 错误目录 | 实时 | 发现新错误模式 |
| 能力文档 | 每月 | 新 MCP/Skill 发布 |
| 学习资源 | 每周 | 会话洞察积累 |

---

## 七、预期效果

### 7.1 知识统一
- ✅ 所有知识集中管理
- ✅ 避免内容重复和冲突
- ✅ 便于版本控制

### 7.2 查找高效
- ✅ 清晰的目录结构
- ✅ 完整的索引文档
- ✅ 有效的交叉引用

### 7.3 维护简便
- ✅ 统一的更新入口
- ✅ 自动化同步脚本
- ✅ Git 版本管理

### 7.4 可复现
- ✅ 标准化安装流程
- ✅ 完整的配置文档
- ✅ 跨平台支持

---

**准备开始执行重构** 🚀

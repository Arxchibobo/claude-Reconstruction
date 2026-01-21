# Claude Reconstruction 安装清单

> **给 Claude Code 的安装指令** - 按此清单自动安装配置系统

---

## 安装目标

将本仓库的配置文件复制到 Claude Code 的配置目录：`~/.claude/`

---

## 安装步骤

### 1. 备份现有配置（如果存在）

```bash
# 如果 ~/.claude/CLAUDE.md 存在，备份它
if [ -f ~/.claude/CLAUDE.md ]; then
    cp ~/.claude/CLAUDE.md ~/.claude/CLAUDE.md.backup.$(date +%Y%m%d_%H%M%S)
fi
```

### 2. 创建目录结构

```bash
mkdir -p ~/.claude/errors/system-errors
mkdir -p ~/.claude/errors/project-errors
mkdir -p ~/.claude/errors/templates
mkdir -p ~/.claude/capabilities
mkdir -p ~/.claude/workflows
mkdir -p ~/.claude/learning
mkdir -p ~/.claude/references
mkdir -p ~/.claude/automation
mkdir -p ~/.claude/delegator
mkdir -p ~/.claude/logs
```

### 3. 复制文件

| 源文件/目录 | 目标位置 | 说明 |
|------------|---------|------|
| `core/CLAUDE.md` | `~/.claude/CLAUDE.md` | 主配置文件 |
| `core/QUICK_START.md` | `~/.claude/QUICK_START.md` | 快速启动清单 |
| `core/DECISION_TREE.md` | `~/.claude/DECISION_TREE.md` | 能力决策树 |
| `errors/` 下所有文件 | `~/.claude/errors/` | 错误知识库 |
| `capabilities/` 下所有文件 | `~/.claude/capabilities/` | 能力文档 |
| `workflows/` 下所有文件 | `~/.claude/workflows/` | 工作流程 |
| `learning/` 下所有文件 | `~/.claude/learning/` | 学习资源 |
| `references/` 下所有文件 | `~/.claude/references/` | 参考资料 |
| `automation/` 下所有文件 | `~/.claude/automation/` | 自动化配置 |
| `delegator/` 下所有文件 | `~/.claude/delegator/` | 委托系统 |

### 4. 验证安装

检查以下文件是否存在：

```bash
~/.claude/CLAUDE.md
~/.claude/QUICK_START.md
~/.claude/DECISION_TREE.md
~/.claude/errors/ERROR_CATALOG.md
~/.claude/capabilities/mcp-servers.md
```

---

## Claude Code 执行命令

当用户说 "按照 INSTALL.md 安装" 时，执行：

```bash
# 假设当前在仓库根目录
cp core/CLAUDE.md ~/.claude/CLAUDE.md
cp core/QUICK_START.md ~/.claude/QUICK_START.md
cp core/DECISION_TREE.md ~/.claude/DECISION_TREE.md

cp -r errors/* ~/.claude/errors/
cp -r capabilities/* ~/.claude/capabilities/
cp -r workflows/* ~/.claude/workflows/
cp -r learning/* ~/.claude/learning/
cp -r references/* ~/.claude/references/
cp -r automation/* ~/.claude/automation/
cp -r delegator/* ~/.claude/delegator/
```

---

## 安装完成标志

当看到以下输出时，表示安装成功：

```
✅ 已安装核心配置 (3 个文件)
✅ 已安装错误知识库
✅ 已安装能力文档
✅ 已安装工作流程
✅ 已安装学习资源

下次启动 Claude Code，配置将自动加载。
```

---

## 卸载（可选）

如需移除配置：

```bash
rm -rf ~/.claude/errors
rm -rf ~/.claude/capabilities
rm -rf ~/.claude/workflows
rm -rf ~/.claude/learning
rm -rf ~/.claude/references
rm -rf ~/.claude/automation
rm -rf ~/.claude/delegator
rm ~/.claude/CLAUDE.md
rm ~/.claude/QUICK_START.md
rm ~/.claude/DECISION_TREE.md
```

恢复备份：

```bash
# 找到最新的备份
ls -lt ~/.claude/CLAUDE.md.backup.*
# 恢复
cp ~/.claude/CLAUDE.md.backup.XXXXXX ~/.claude/CLAUDE.md
```

# 安装和同步脚本

本目录包含安装和同步 Claude Reconstruction 配置的脚本。

---

## 📜 脚本列表

| 脚本 | 平台 | 用途 |
|------|------|------|
| `sync-to-home.sh` | Unix/Linux/macOS | 同步到 ~/.claude/ |
| `sync-to-home.ps1` | Windows PowerShell | 同步到 %USERPROFILE%\.claude\ |
| `install.sh` | Unix/Linux/macOS | 安装到 ~/.claude/ |
| `install.ps1` | Windows PowerShell | 安装到 %USERPROFILE%\.claude\ |

---

## 🔄 同步脚本使用方法

### Unix/Linux/macOS

**基本使用**:
```bash
# 执行同步
./scripts/sync-to-home.sh

# Dry-run 模式（仅显示将要执行的操作）
./scripts/sync-to-home.sh --dry-run
```

**同步内容**:
- 核心配置文件（CLAUDE.md, DECISION_TREE.md, QUICK_START.md）
- 错误知识库（errors/）
- 能力文档（capabilities/）
- 设计资源（design/）
- Vibe Marketing（vibe-marketing/）
- 工作流（workflows/）
- 学习资源（learning/）
- 参考资料（references/）
- 自动化配置（automation/）
- 委托系统（delegator/）

### Windows PowerShell

**基本使用**:
```powershell
# 执行同步
.\scripts\sync-to-home.ps1

# Dry-run 模式
.\scripts\sync-to-home.ps1 -DryRun
```

---

## 🛠️ 安装脚本使用方法

### Unix/Linux/macOS

```bash
# 首次安装
./scripts/install.sh

# 强制覆盖现有配置
./scripts/install.sh --force
```

### Windows PowerShell

```powershell
# 首次安装
.\scripts\install.ps1

# 强制覆盖现有配置
.\scripts\install.ps1 -Force
```

---

## ⚠️ 注意事项

### 备份

同步脚本会自动备份现有文件：
- Unix: `~/.claude/CLAUDE.md.backup.20260122-143000`
- Windows: `%USERPROFILE%\.claude\CLAUDE.md.backup.20260122-143000`

### 权限

Unix/Linux/macOS 脚本需要执行权限：
```bash
chmod +x scripts/*.sh
```

### 重启 Claude Code

同步完成后，重启 Claude Code 以使更改生效。

---

## 🔍 Dry-run 模式

建议首次使用时先执行 dry-run 模式，查看将要执行的操作：

**Unix/Linux/macOS**:
```bash
./scripts/sync-to-home.sh --dry-run
```

**Windows**:
```powershell
.\scripts\sync-to-home.ps1 -DryRun
```

输出示例：
```
🔍 Dry-run 模式：仅显示将要执行的操作

ℹ  源目录: E:\Bobo's Coding cache\bo-work\claude-reconstruction
ℹ  目标目录: C:\Users\Administrator\.claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  开始同步 Claude Reconstruction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ  📋 同步核心配置文件...
ℹ  复制 CLAUDE.md...
  [DRY-RUN] Copy-Item -Path ...\core\CLAUDE.md -Destination ...\.claude\CLAUDE.md -Force
...
```

---

## 📝 同步频率建议

| 更新类型 | 频率 | 说明 |
|---------|------|------|
| 核心配置 | 每周 | 工作模式变更时 |
| 错误目录 | 实时 | 发现新错误模式时 |
| 能力文档 | 每月 | 新 MCP/Skill 发布时 |
| 学习资源 | 每周 | 会话洞察积累时 |

---

## 🆘 故障排除

### 问题 1: 权限被拒绝

**Unix/Linux/macOS**:
```bash
chmod +x scripts/sync-to-home.sh
```

**Windows**:
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题 2: 目标目录不存在

确保 Claude Code 已安装并至少运行过一次：
- Unix/Linux/macOS: `~/.claude` 应该存在
- Windows: `%USERPROFILE%\.claude` 应该存在

### 问题 3: 文件被占用

关闭 Claude Code 后再执行同步脚本。

---

## 🔗 相关文档

- [安装指南](../INSTALL.md)
- [主 README](../README.md)
- [重构计划](../RESTRUCTURE_PLAN.md)
- [完成报告](../RESTRUCTURE_COMPLETE.md)

---

**Happy syncing!** 🚀

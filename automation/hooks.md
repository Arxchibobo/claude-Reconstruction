# Claude Code Hooks 配置

> **Hooks**: 在特定事件触发时自动执行的脚本

---

## 概述

Hooks 允许你在 Claude Code 的特定事件点执行自定义脚本，实现自动化工作流。

### 可用 Hook 类型

| Hook | 触发时机 | 用途 |
|------|---------|------|
| `PreToolUse` | 工具调用前 | 验证、日志、权限检查 |
| `PostToolUse` | 工具调用后 | 结果处理、通知 |
| `SessionStart` | 会话开始时 | 初始化、加载配置 |
| `SessionEnd` | 会话结束时 | 清理、保存状态 |
| `PrePromptSubmit` | 提交前 | 输入验证、预处理 |

---

## 配置方式

### 在 settings.json 中配置

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "cat ~/.claude/session-init.md"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Executing: $TOOL_INPUT'"
          }
        ]
      }
    ]
  }
}
```

### Hook 配置结构

```json
{
  "matcher": "工具名或正则表达式",
  "hooks": [
    {
      "type": "command",
      "command": "要执行的命令",
      "timeout": 30000
    }
  ]
}
```

---

## 常用 Hook 示例

### 1. 会话初始化 Hook

在每次会话开始时加载配置和提醒：

```json
{
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "cat ~/.claude/startup-checklist.md"
        }
      ]
    }
  ]
}
```

**startup-checklist.md 示例**:

```markdown
## 会话启动检查

### 高频错误提醒
- E001: 异步未并行 - 使用 Promise.all()
- E002: 轮询无超时 - 设置 maxAttempts
- E003: 错误未重抛 - catch 中 throw error

### 快速决策
- 查询数据 → MCP
- Git 操作 → /commit
- 架构设计 → Plugins

准备接收任务
```

### 2. Bash 执行日志 Hook

记录所有 Bash 命令：

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "echo \"[$(date '+%Y-%m-%d %H:%M:%S')] Bash: $TOOL_INPUT\" >> ~/.claude/logs/bash.log"
        }
      ]
    }
  ]
}
```

### 3. 文件变更通知 Hook

在文件修改后发送通知：

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "command",
          "command": "echo \"文件已修改: $TOOL_INPUT\" | notify-send 'Claude Code'"
        }
      ]
    }
  ]
}
```

### 4. 危险命令警告 Hook

在执行潜在危险命令前警告：

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "echo \"$TOOL_INPUT\" | grep -E '(rm -rf|DROP|DELETE|force push)' && echo '⚠️ 警告: 检测到潜在危险命令'"
        }
      ]
    }
  ]
}
```

---

## 高级配置

### 条件执行

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "if [[ \"$TOOL_INPUT\" == *\"git push\"* ]]; then echo '确认要推送吗？'; fi"
        }
      ]
    }
  ]
}
```

### 环境变量

Hook 中可用的环境变量：

| 变量 | 说明 |
|-----|------|
| `$TOOL_NAME` | 当前工具名称 |
| `$TOOL_INPUT` | 工具输入参数 |
| `$TOOL_OUTPUT` | 工具输出结果（PostToolUse）|
| `$SESSION_ID` | 当前会话 ID |
| `$CWD` | 当前工作目录 |

### 超时设置

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "slow-script.sh",
      "timeout": 60000
    }
  ]
}
```

---

## 错误处理

### Hook 失败处理

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "my-hook.sh || echo 'Hook 失败，继续执行'",
      "continueOnError": true
    }
  ]
}
```

### 调试 Hook

启用详细日志：

```bash
# 在 .bashrc 或 .zshrc 中
export CLAUDE_HOOK_DEBUG=1
```

---

## 最佳实践

### 1. 保持轻量

Hook 应该快速执行，避免阻塞主流程：

```json
// ✅ 好
{ "command": "echo \"$TOOL_INPUT\" >> log.txt" }

// ❌ 避免
{ "command": "curl https://slow-api.com/log" }
```

### 2. 错误容忍

Hook 失败不应影响主流程：

```json
{ "command": "my-hook.sh || true" }
```

### 3. 日志记录

记录足够的信息便于调试：

```json
{
  "command": "echo \"[$(date)] [$TOOL_NAME] $TOOL_INPUT\" >> ~/.claude/hooks.log"
}
```

### 4. 安全考虑

- 不要在 Hook 中暴露敏感信息
- 验证外部输入
- 限制 Hook 权限

---

## 常见问题

### Hook 不执行

1. 检查 matcher 是否正确
2. 检查命令是否存在
3. 查看 Hook 日志

### Hook 执行太慢

1. 优化脚本
2. 使用后台执行
3. 增加超时时间

### Hook 输出干扰

1. 将输出重定向到日志文件
2. 使用静默模式

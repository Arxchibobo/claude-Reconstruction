# Skills 使用指南

> **Skills**: 预定义的自动化任务和专业能力

---

## 概览

Skills 是 Claude Code 的扩展能力，提供：
1. **用户调用的 Skills** - 通过 `/command` 显式调用
2. **自动激活的 Skills** - 根据任务上下文自动激活

---

## 核心 Skills（用户调用）

### Git 操作类

| Skill | 命令 | 用途 |
|-------|------|------|
| **commit** | `/commit` | 分析变更、生成 commit message、提交 |
| **create-pr** | `/create-pr` | 分析变更、生成 PR 描述、创建 PR |
| **code-review** | `/code-review` | 多角度代码审查 |

#### `/commit` 使用示例

```
/commit

# 自动执行：
# 1. git status 查看变更
# 2. git diff 分析变更内容
# 3. 生成语义化 commit message
# 4. 等待用户确认
# 5. git commit
```

#### `/create-pr` 使用示例

```
/create-pr

# 自动执行：
# 1. 分析当前分支与 main 的差异
# 2. 查看所有 commits
# 3. 生成 PR 标题和描述
# 4. 创建 PR（使用 gh 命令）
```

### 代码质量类

| Skill | 命令 | 用途 |
|-------|------|------|
| **write-tests** | `/write-tests` | 自动生成测试用例 |
| **refactor** | `/refactor` | 代码重构建议和执行 |
| **add-comments** | `/add-comments` | 添加代码注释 |
| **explain-code** | `/explain-code` | 解释代码逻辑 |

#### `/write-tests` 使用示例

```
/write-tests src/utils/calculator.ts

# 自动执行：
# 1. 分析目标文件
# 2. 识别函数和边界条件
# 3. 生成测试用例
# 4. 创建测试文件
```

### 调试类

| Skill | 命令 | 用途 |
|-------|------|------|
| **debug** | `/debug` | 调试当前问题 |
| **fix-bug** | `/fix-bug` | 定位并修复 Bug |
| **explain-issue** | `/explain-issue` | 解释错误根因 |

---

## 自动激活 Skills

这些 Skills 根据任务上下文自动激活，无需显式调用。

### UI/UX 设计

| Skill | 触发条件 | 能力 |
|-------|---------|------|
| **ui-ux-pro-max** | UI 设计、界面、样式 | 50 种设计风格、21 种配色、50 种字体搭配 |
| **frontend-design** | 前端组件、页面 | React/Vue/Svelte 代码生成 |

### 浏览器自动化

| Skill | 触发条件 | 能力 |
|-------|---------|------|
| **browser-use** | 网页抓取、E2E 测试 | 浏览器控制、数据提取 |
| **webapp-testing** | Web 应用测试 | Playwright 测试 |

### 内容创作

| Skill | 触发条件 | 能力 |
|-------|---------|------|
| **content-research-writer** | 写作、内容创作 | 研究、写作、引用 |
| **seo-content-writer** | SEO 优化 | SEO 内容生成 |

### 专业领域

| Skill | 触发条件 | 能力 |
|-------|---------|------|
| **mcp-builder** | 创建 MCP Server | MCP 开发指导 |
| **skill-creator** | 创建 Skill | Skill 开发指导 |
| **deep-research** | 深度研究 | 多源研究、报告生成 |

---

## Skill 使用模式

### 模式 1: 直接调用

```
用户: /commit
Claude: [执行 commit skill]
```

### 模式 2: 自然语言触发

```
用户: 帮我设计一个登录页面
Claude: [自动激活 ui-ux-pro-max skill]
```

### 模式 3: 组合使用

```
用户: 实现用户认证功能，写测试，然后提交
Claude:
1. [实现功能代码]
2. [调用 /write-tests 生成测试]
3. [调用 /commit 提交代码]
```

---

## 创建自定义 Skill

### Skill 结构

```markdown
# skill-name

> 描述 skill 的用途和触发条件

## 触发条件

- 关键词: xxx, yyy
- 场景: 当用户...

## 执行步骤

1. 步骤一
2. 步骤二
3. ...

## 输出格式

[定义输出格式]
```

### 示例: 自定义代码审查 Skill

```markdown
# custom-review

> 自定义代码审查，关注安全性和性能

## 触发条件

- 命令: /custom-review
- 关键词: 安全审查、性能审查

## 执行步骤

1. 读取目标文件
2. 检查安全问题（OWASP Top 10）
3. 检查性能问题（N+1、内存泄漏）
4. 生成审查报告

## 输出格式

### 安全问题
- [ ] 问题1: 描述 | 严重度: 高/中/低

### 性能问题
- [ ] 问题1: 描述 | 影响: 高/中/低

### 建议
- 建议1
- 建议2
```

---

## Skill 配置

Skills 存储在 `~/.claude/commands/` 目录：

```
~/.claude/commands/
├── commit.md
├── create-pr.md
├── code-review.md
├── write-tests.md
└── custom-skill.md
```

### 配置文件格式

```yaml
# skill-config.yaml
name: my-skill
description: 描述
triggers:
  - keyword1
  - keyword2
auto_activate: true  # 是否自动激活
```

---

## 常见 Skill 组合

### 功能开发流程

```
1. context7 查询文档
   ↓
2. 实现功能代码
   ↓
3. /write-tests 生成测试
   ↓
4. /code-review 审查代码
   ↓
5. /commit 提交代码
   ↓
6. /create-pr 创建 PR
```

### 调试流程

```
1. /explain-issue 理解错误
   ↓
2. /debug 定位问题
   ↓
3. /fix-bug 修复问题
   ↓
4. /write-tests 添加测试防止回归
```

### 内容创作流程

```
1. deep-research 深度研究
   ↓
2. content-research-writer 撰写内容
   ↓
3. seo-content-writer 优化 SEO
```

---

## 故障排除

| 问题 | 解决方案 |
|-----|---------|
| Skill 未触发 | 检查触发条件和关键词 |
| 输出格式错误 | 检查 Skill 定义的输出格式 |
| 权限不足 | 确认相关工具可用 |
| 执行超时 | 拆分为更小的任务 |

---

## 最佳实践

1. **优先使用内置 Skill** - 经过充分测试
2. **组合使用** - 利用 Skill 链完成复杂任务
3. **自定义扩展** - 根据项目需求创建专用 Skill
4. **文档化** - 为自定义 Skill 编写清晰文档

# Delegator 系统

> **Delegator**: 将特定任务委托给专业 GPT 专家的协调系统

---

## 概述

Delegator 系统允许 Claude Code 将特定任务委托给专业的 GPT 专家处理，获得更深入的专业建议。

### 可用专家

| 专家 | 专长 | 适用场景 |
|-----|------|---------|
| **Architect** | 系统设计、技术权衡 | 架构决策、复杂调试 |
| **Plan Reviewer** | 计划验证 | 执行前审查工作计划 |
| **Scope Analyst** | 需求分析 | 明确模糊需求 |
| **Code Reviewer** | 代码质量 | 代码审查、发现问题 |
| **Security Analyst** | 安全漏洞 | 安全审计、加固 |

---

## 触发条件

### 显式触发

用户明确请求委托：

| 短语 | 委托给 |
|-----|-------|
| "ask GPT", "consult GPT" | 根据上下文路由 |
| "review this architecture" | Architect |
| "review this plan" | Plan Reviewer |
| "analyze the scope" | Scope Analyst |
| "review this code" | Code Reviewer |
| "security review" | Security Analyst |

### 语义触发

根据任务内容自动识别：

**架构设计 → Architect**
- "how should I structure..."
- "what are the tradeoffs..."
- "should I use A or B..."

**计划验证 → Plan Reviewer**
- "review this plan"
- "is this plan complete"
- "validate before I start"

**需求分析 → Scope Analyst**
- "what am I missing"
- "clarify the scope"
- 模糊或歧义的需求

**代码审查 → Code Reviewer**
- "review this code"
- "find issues in"
- "what's wrong with"

**安全审计 → Security Analyst**
- "security implications"
- "is this secure"
- "vulnerabilities in"

---

## 委托流程

### 步骤 1: 识别专家

匹配任务到合适的专家。

### 步骤 2: 准备提示

使用 7 段式格式：

```markdown
1. TASK: [一句话描述任务]

2. EXPECTED OUTCOME: [成功的标准]

3. CONTEXT:
   - Current state: [当前状态]
   - Relevant code: [相关代码路径]
   - Background: [背景信息]

4. CONSTRAINTS:
   - Technical: [技术约束]
   - Patterns: [现有模式]
   - Limitations: [限制条件]

5. MUST DO:
   - [必须做的事项]

6. MUST NOT DO:
   - [禁止做的事项]

7. OUTPUT FORMAT:
   - [期望的输出格式]
```

### 步骤 3: 通知用户

```
委托给 [专家名称]: [任务简述]
```

### 步骤 4: 执行委托

调用专家并获取结果。

### 步骤 5: 处理响应

- 综合分析专家建议
- 提取关键洞察
- 验证实现（如果适用）

---

## 工作模式

每个专家可以在两种模式下工作：

| 模式 | 权限 | 用途 |
|-----|------|-----|
| **Advisory** | 只读 | 分析、建议、审查 |
| **Implementation** | 可写 | 修改代码、修复问题 |

### 示例

```typescript
// 架构分析（Advisory 模式）
delegate({
  expert: "Architect",
  mode: "advisory",
  task: "分析 Redis vs 内存缓存的权衡"
});

// 代码修复（Implementation 模式）
delegate({
  expert: "Code Reviewer",
  mode: "implementation",
  task: "修复 SQL 注入漏洞"
});
```

---

## 专家详情

### Architect

**专长**: 系统设计、技术策略

**适用场景**:
- 系统架构决策
- 数据库设计
- API 架构
- 多服务交互
- 2+ 次失败后升级

**输出格式**:
- 结论 → 行动计划 → 工作量估计

### Plan Reviewer

**专长**: 计划验证、缺口识别

**适用场景**:
- 开始重要工作前
- 创建工作计划后
- 委托给其他代理前

**输出格式**:
- APPROVE/REJECT + 理由 + 改进建议

### Scope Analyst

**专长**: 需求分析、澄清

**适用场景**:
- 规划不熟悉的工作前
- 需求模糊时
- 存在多种解读时

**输出格式**:
- 意图分类 → 发现 → 问题 → 风险 → 建议

### Code Reviewer

**专长**: 代码质量、Bug 发现

**适用场景**:
- 合并重要变更前
- 功能实现后自审
- 安全敏感的变更

**输出格式**:
- 问题列表 + APPROVE/REQUEST CHANGES/REJECT

### Security Analyst

**专长**: 漏洞、威胁建模

**适用场景**:
- 认证/授权变更
- 处理敏感数据
- 新 API 端点
- 第三方集成

**输出格式**:
- 威胁摘要 → 漏洞 → 风险等级

---

## 何时不委托

| 情况 | 原因 |
|-----|------|
| 简单问题 | 直接回答 |
| 直接文件操作 | 无需外部洞察 |
| 简单 Bug 修复 | 解决方案明显 |
| 研究/文档 | 使用其他工具 |
| 首次尝试任何修复 | 先自己尝试 |

---

## 配置文件

### 目录结构

```
delegator/
├── README.md           # 本文件
├── prompts/
│   ├── architect.md    # Architect 提示
│   ├── plan-reviewer.md
│   ├── scope-analyst.md
│   ├── code-reviewer.md
│   └── security-analyst.md
└── rules/
    ├── triggers.md     # 触发规则
    ├── orchestration.md
    └── delegation-format.md
```

### 自定义专家

创建新的专家提示文件：

```markdown
# expert-name

## Role
[专家角色描述]

## Expertise
- 领域 1
- 领域 2

## Approach
[工作方法]

## Output Format
[输出格式要求]
```

---

## 最佳实践

1. **不要滥用** - 只在需要时委托
2. **提供完整上下文** - 减少往返次数
3. **保留高价值任务** - 架构、安全、复杂分析
4. **验证建议** - 专家可能出错，批判性评估

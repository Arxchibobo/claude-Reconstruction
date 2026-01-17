# Plugins 自动激活指南

> **Plugins**: 根据任务上下文自动激活的专业代理

---

## 概览

Plugins 是预配置的专业代理（Agents），根据任务描述自动激活，无需显式调用。

### 核心特点

1. **自动激活** - 描述需求即可，无需记住命令
2. **专业领域** - 每个 Plugin 专注特定领域
3. **协同工作** - 多个 Plugins 可以同时激活

---

## 开发类 Plugins

### 后端开发

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **backend-development** | API 设计、微服务架构 | 后端、API、架构 |
| **python-development** | Python 开发 | Python、Django、FastAPI |
| **javascript-typescript** | JS/TS 开发 | JavaScript、TypeScript、Node |
| **systems-programming** | 系统编程 | Rust、Go、C++ |
| **jvm-languages** | JVM 语言 | Java、Kotlin、Scala |

### 前端开发

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **frontend-mobile-development** | 前端/移动开发 | React、Vue、Flutter |
| **multi-platform-apps** | 跨平台应用 | 跨平台、iOS、Android |

### 数据库

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **database-design** | 数据库设计 | 数据库设计、Schema |
| **database-migrations** | 数据库迁移 | 迁移、Migration |
| **data-engineering** | 数据工程 | 数据管道、ETL |

---

## 运维类 Plugins

### 云基础设施

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **cloud-infrastructure** | 云架构 | AWS、Azure、GCP |
| **kubernetes-operations** | K8s 运维 | K8s、Kubernetes、容器 |
| **cicd-automation** | CI/CD | 部署、Pipeline、GitHub Actions |

### 监控与调试

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **observability-monitoring** | 可观测性 | 监控、Metrics、Traces |
| **debugging-toolkit** | 调试工具 | 调试、Debug、错误 |
| **incident-response** | 故障响应 | 故障、Incident、告警 |

---

## 质量类 Plugins

### 代码质量

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **code-review-ai** | AI 代码审查 | 审查、Review |
| **comprehensive-review** | 全面审查 | 全面审查、深度审查 |
| **code-refactoring** | 代码重构 | 重构、Refactor |

### 测试

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **unit-testing** | 单元测试 | 单元测试、Unit Test |
| **tdd-workflows** | TDD 工作流 | TDD、测试驱动 |
| **performance-testing-review** | 性能测试 | 性能测试、负载测试 |

### 安全

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **security-scanning** | 安全扫描 | 安全、Security |
| **backend-api-security** | API 安全 | API 安全、认证 |

---

## 文档类 Plugins

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **code-documentation** | 代码文档 | 文档、Documentation |
| **documentation-generation** | 文档生成 | 生成文档、API 文档 |

---

## AI/ML 类 Plugins

| Plugin | 专长 | 自动激活关键词 |
|--------|------|--------------|
| **llm-application-dev** | LLM 应用开发 | LLM、AI 应用、RAG |
| **machine-learning-ops** | MLOps | ML、机器学习 |
| **agent-orchestration** | Agent 编排 | Agent、多代理 |

---

## 使用示例

### 示例 1: 后端架构设计

```
用户: 设计一个高可用的用户认证服务

Claude: [自动激活 backend-development plugin]
- 分析需求
- 提供架构建议（JWT vs Session）
- 设计 API 接口
- 考虑扩展性和安全性
```

### 示例 2: 性能优化

```
用户: 优化这个 SQL 查询，执行太慢了

Claude: [自动激活 database-design plugin]
- 分析查询计划
- 识别性能瓶颈
- 建议索引策略
- 提供优化后的查询
```

### 示例 3: 安全审查

```
用户: 检查这个 API 是否有安全漏洞

Claude: [自动激活 security-scanning plugin]
- OWASP Top 10 检查
- 输入验证审查
- 认证/授权审查
- 提供修复建议
```

---

## Plugin 协同

多个 Plugins 可以协同工作：

```
用户: 创建一个新的微服务，包含数据库设计和 CI/CD 配置

自动激活:
├─ backend-development (服务架构)
├─ database-design (数据库设计)
└─ cicd-automation (CI/CD 配置)

执行流程:
1. 设计服务架构
2. 设计数据库 Schema
3. 生成 Dockerfile
4. 配置 CI/CD Pipeline
```

---

## Plugin 优先级

当多个 Plugins 可能适用时，按以下优先级激活：

1. **安全类** - 涉及安全的任务优先
2. **专业领域** - 匹配度最高的领域 Plugin
3. **通用类** - 无特定领域时使用

---

## 配置 Plugins

Plugins 通过配置文件定义：

```yaml
# plugin-config.yaml
name: my-custom-plugin
description: 自定义插件描述
triggers:
  keywords:
    - 关键词1
    - 关键词2
  patterns:
    - "正则模式"

agents:
  - name: agent-1
    role: 主要代理
    tools:
      - tool1
      - tool2
```

---

## 创建自定义 Plugin

### 基本结构

```
my-plugin/
├── plugin.yaml       # 配置文件
├── agents/
│   ├── agent-1.md   # 代理提示
│   └── agent-2.md
└── skills/
    └── skill-1.md   # 关联的 skills
```

### 配置示例

```yaml
# plugin.yaml
name: custom-security-plugin
version: 1.0.0
description: 自定义安全审查插件

activation:
  keywords:
    - 安全审查
    - 漏洞扫描
  auto: true

agents:
  - id: security-auditor
    prompt: agents/security-auditor.md
    tools:
      - Grep
      - Read
      - Glob

workflows:
  - name: full-audit
    steps:
      - agent: security-auditor
        action: scan
      - agent: security-auditor
        action: report
```

---

## 最佳实践

1. **让系统选择** - 描述需求，让 Plugin 自动激活
2. **明确意图** - 清晰描述任务目标
3. **迭代优化** - 根据结果调整描述
4. **组合使用** - 复杂任务利用多 Plugin 协同

---

## 故障排除

| 问题 | 解决方案 |
|-----|---------|
| Plugin 未激活 | 检查关键词是否匹配 |
| 错误的 Plugin | 更明确地描述任务 |
| 执行不完整 | 拆分为更小的任务 |
| 性能问题 | 限制激活的 Plugin 数量 |

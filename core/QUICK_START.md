# QUICK START - 会话启动清单

> **用途**: 每次会话开始时必读，Context 占用 ~2,000 tokens

---

## 高频错误提醒（Top 10）

> 每次编码前必查！

| ID | 错误类型 | 频率 | 严重度 | 自检问题 |
|----|---------|------|--------|---------|
| E001 | 异步未并行处理 | 高 | 🔴 | 是否使用 `Promise.all()`? |
| E002 | 轮询无超时限制 | 高 | 🔴 | 是否设置 `maxAttempts`? |
| E003 | 错误未重新抛出 | 中 | 🔴 | `catch` 是否 `throw error`? |
| E004 | SQL 未使用 CTE | 中 | 🟡 | 是否预过滤数据? |
| E005 | 状态 ID 重复生成 | 中 | 🟡 | ID 是否只生成一次? |
| E006 | API 参数顺序错误 | 中 | 🟡 | 是否核对文档? |
| E007 | 忘记资源清理 | 低 | 🔴 | 超时/失败是否清理? |
| E008 | Chart 配置不完整 | 低 | 🟢 | 是否包含 tooltip? |
| E009 | 依赖未安装就使用 | 低 | 🟡 | 是否 `npm install`? |
| E010 | 硬编码魔法值 | 低 | 🟢 | 是否使用常量? |

**详细说明**: [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)

---

## 快速决策（5 秒定位工具）

```
收到任务 → 任务类型?
├─ 查询数据 → MCP (bytebase)
├─ 生成图表 → MCP (chart)
├─ Git 操作 → Skill (/commit)
├─ 代码审查 → Skill (/code-review)
├─ 浏览器测试 → Skill (browser-use)
├─ UI 设计 → Skill (ui-ux-pro-max)
└─ 架构设计 → Plugins（自动激活）
```

**详细决策树**: [DECISION_TREE.md](./DECISION_TREE.md)

---

## 工作模式确认

**核心原则**: **计划 → 确认 → 执行到底 → 验收**

### 标准工作流

```
1️⃣ 收到任务 → 分析需求 + 创建 TodoList
                ↓
2️⃣ 展示计划 → 等待用户确认
                ↓
3️⃣ 用户确认 OK → 执行到底（不问问题，除非致命阻塞）
                ↓
4️⃣ 全部完成 → 总结 + 请求用户验收
```

### 4 种致命阻塞（唯一允许提问）

1. **缺少关键凭证** - 数据库密码、API key、敏感信息
2. **多个对立方案** - 完全不同的技术方案且无法从代码库判断
3. **需求本质矛盾** - 用户要求互相冲突（"既要A又要非A"）
4. **不可逆高风险** - 删除生产数据、强制推送到 main 等

### 禁止提问的情况（自行决策）

- ✅ 文件命名、目录结构（遵循现有规范）
- ✅ 代码实现细节（选择最佳实践）
- ✅ 依赖版本选择（使用最新稳定版）
- ✅ 测试策略（全面覆盖）
- ✅ 代码风格（遵循 eslint/prettier）
- ✅ UI 布局细节（遵循设计系统）
- ✅ 变量/函数命名（语义化命名）

---

## 可用工具速览

### MCP Servers
- **bytebase** - 数据库查询
- **honeycomb** - 监控日志
- **chart** - 图表生成
- **context7** - 文档搜索
- **playwright** - 浏览器自动化
- **stripe** - 支付集成

### 高频 Skills
- `/commit` - Git 提交
- `/code-review` - 代码审查
- `/write-tests` - 生成测试
- `browser-use` - 浏览器自动化
- `ui-ux-pro-max` - UI/UX 设计

### Plugins（自动激活）
- backend/frontend-development - 架构设计
- debugging-toolkit - 错误诊断
- code-review-ai - 代码质量
- data-engineering - 数据管道

---

## 快速导航

### 核心文档
- [主配置文档 CLAUDE.md](./CLAUDE.md)
- [决策树 DECISION_TREE.md](./DECISION_TREE.md)
- [错误知识库 errors/](../errors/)

### 详细指南
- [MCP Servers 详解](../capabilities/mcp-servers.md)
- [Skills 使用指南](../capabilities/skills-guide.md)
- [Plugins 自动激活](../capabilities/plugins-auto.md)

### 工作流程
- [自动执行模式](../workflows/auto-execution.md)
- [数据分析流程](../workflows/data-analysis.md)
- [全栈开发流程](../workflows/full-stack-dev.md)

---

## 启动检查完成

```
⚠️ 高频错误: 10 个需要注意
🔧 可用工具: MCP + Skills + Plugins
📖 文档加载: 核心文档（~2K tokens）

准备接收任务 🚀
```

---

**提示**:
- 遇到问题先查 [ERROR_CATALOG.md](../errors/ERROR_CATALOG.md)
- 不确定用什么工具查 [DECISION_TREE.md](./DECISION_TREE.md)
- 想了解能力详情查 [capabilities/](../capabilities/) 目录

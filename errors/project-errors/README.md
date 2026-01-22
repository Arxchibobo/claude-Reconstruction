# 项目级错误

> **最后更新**: 2026-01-14
> **用途**: 记录特定项目场景下的错误案例

---

## 📂 项目错误分类

项目级错误是针对特定项目的技术栈、业务场景和实施细节的错误案例。与系统级错误（影响思维逻辑和代码质量）不同，项目级错误更多关注项目实施过程中的具体问题。

---

## 🗂️ 项目列表

| 项目 | 文件 | 错误数量 | 最后更新 | 技术栈 |
|------|------|---------|---------|--------|
| [Claude Plugin Manager](#claude-plugin-manager) | [claude-plugin-manager.md](./claude-plugin-manager.md) | 8 | 2026-01-09 | TypeScript, React, MCP |
| [Data Analysis Automation](#data-analysis-automation) | [data-analysis.md](./data-analysis.md) | 5 | 2026-01-09 | TypeScript, PostgreSQL, Vercel |
| [Firebase MCP Integration](#firebase-mcp-integration) | [firebase-mcp.md](./firebase-mcp.md) | 3 | 2026-01-08 | TypeScript, Firebase, MCP |

**总计**: 3 个项目，16 个错误案例

---

## 📋 错误分类

### 按技术栈

| 技术栈 | 相关项目 | 错误数量 |
|--------|---------|---------|
| **TypeScript** | 所有项目 | 16 |
| **React** | Claude Plugin Manager | 8 |
| **PostgreSQL** | Data Analysis Automation | 5 |
| **Firebase** | Firebase MCP Integration | 3 |
| **Vercel** | Data Analysis Automation | 5 |
| **MCP** | Claude Plugin Manager, Firebase MCP | 11 |

### 按错误类型

| 错误类型 | 相关项目 | 错误数量 |
|---------|---------|---------|
| **依赖管理** | Claude Plugin Manager, Data Analysis | 4 |
| **配置错误** | Claude Plugin Manager, Firebase MCP | 5 |
| **性能优化** | Data Analysis Automation | 3 |
| **集成问题** | Firebase MCP Integration | 3 |
| **测试覆盖** | 所有项目 | 1 |

---

## 📖 使用指南

### 如何使用项目级错误文档

1. **项目开始前**:
   - 阅读相关项目的错误案例
   - 了解常见陷阱和最佳实践
   - 配置项目避免已知问题

2. **开发过程中**:
   - 遇到问题时查找相似错误
   - 参考解决方案和正确做法
   - 记录新发现的错误模式

3. **代码审查时**:
   - 检查是否存在已知错误模式
   - 验证是否遵循最佳实践
   - 更新错误文档（如有新发现）

### 如何添加新的项目错误

1. **创建新文件**: `project-errors/your-project-name.md`

2. **使用标准格式**:
   ```markdown
   # [项目名称] 错误案例

   > **项目**: [项目名称]
   > **技术栈**: [主要技术栈]
   > **最后更新**: [日期]

   ---

   ## 错误 1: [错误标题]

   ### 📋 错误描述
   [描述错误]

   ### ❌ 错误示例
   [代码示例]

   ### ✅ 正确做法
   [正确代码示例]

   ### 🔍 关键改进
   [列出改进点]

   ---
   ```

3. **更新 README.md**: 在项目列表中添加新项目

4. **更新 ERROR_CATALOG.md**: 在主错误目录中添加引用

---

## 🔄 与系统级错误的关系

| 维度 | 系统级错误 | 项目级错误 |
|------|-----------|-----------|
| **影响范围** | 所有项目，影响思维模式 | 特定项目，影响实施细节 |
| **重要性** | 高优先级，必须掌握 | 中优先级，按需参考 |
| **通用性** | 通用编码原则 | 项目特定场景 |
| **示例** | 异步并行、错误处理 | 依赖配置、集成问题 |

**推荐学习路径**:
1. 先学习系统级错误（6 个分类，17 个模式）
2. 再学习相关项目的项目级错误
3. 在实施中参考项目级错误避免重复错误

---

## 📌 相关文档

- **返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md) - 错误知识库总览
- **系统级错误**: [system-errors/README.md](../system-errors/README.md) - 系统级错误索引
- **学习资源**:
  - [BEST_PRACTICES.md](../../references/BEST_PRACTICES.md) - 最佳实践
  - [SESSION_INSIGHTS.md](../../learning/SESSION_INSIGHTS.md) - 会话洞察

---

**📌 提示**:
- 项目级错误是实践中总结的宝贵经验
- 每个项目都应记录特定的错误案例
- 定期审查和更新项目级错误文档

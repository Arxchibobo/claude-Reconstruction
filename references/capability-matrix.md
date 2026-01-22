# 能力矩阵

## 概述

能力矩阵展示 Claude Code 在不同任务场景下的最佳工具选择，帮助快速决策。

## 核心能力对比

| 任务类型 | 最佳工具 | 次选 | 不推荐 | 说明 |
|---------|---------|------|--------|------|
| **数据查询** |
| 数据库查询 | bytebase MCP ⭐⭐⭐ | - | 手写 SQL ❌ | 直接连接生产数据库 |
| 性能监控 | honeycomb MCP ⭐⭐⭐ | Plugins ⭐⭐ | 猜测 ❌ | traces/metrics/logs |
| 实验数据 | statsig MCP ⭐⭐⭐ | - | - | A/B 测试结果 |
| **数据可视化** |
| 图表生成 | chart MCP ⭐⭐⭐ | - | 手动绘制 ❌ | 柱状/折线/饼图等 |
| 数据分析 | bytebase + chart ⭐⭐⭐ | - | 纯文本 ❌ | 查询+可视化 |
| **代码操作** |
| Git 提交 | /commit Skill ⭐⭐⭐ | - | 手动写 ❌ | 自动生成提交信息 |
| 代码审查 | /code-review Skill ⭐⭐⭐ | Plugins ⭐⭐ | 手动检查 ❌ | 全面质量检查 |
| 测试生成 | /write-tests Skill ⭐⭐⭐ | - | 手写 ❌ | 自动生成测试 |
| 代码重构 | /refactor Skill ⭐⭐⭐ | Plugins ⭐⭐ | 手动改 ❌ | 安全重构建议 |
| **架构设计** |
| 后端架构 | Plugins ⭐⭐⭐ | - | 凭空想 ❌ | 自动激活 |
| 前端架构 | Plugins ⭐⭐⭐ | - | 猜测 ❌ | 自动激活 |
| 数据库设计 | Plugins ⭐⭐⭐ | - | 直接写 ❌ | 自动激活 |
| 微服务架构 | Plugins ⭐⭐⭐ | - | 自己设计 ❌ | 自动激活 |
| **浏览器自动化** |
| 网页抓取 | browser-use Skill ⭐⭐⭐ | playwright MCP ⭐⭐ | 手动复制 ❌ | AI 驱动 |
| 表单填写 | browser-use Skill ⭐⭐⭐ | playwright MCP ⭐⭐ | 手动操作 ❌ | 自动化流程 |
| E2E 测试 | browser-use Skill ⭐⭐⭐ | playwright MCP ⭐⭐ | 手动测试 ❌ | 完整测试流程 |
| UI 截图 | playwright MCP ⭐⭐⭐ | browser-use ⭐⭐ | 手动截图 ❌ | 快速截图 |
| **UI/UX 设计** |
| UI 设计 | ui-ux-pro-max Skill ⭐⭐⭐ | - | 纯文本描述 ❌ | 57 种样式 |
| 样式推荐 | ui-ux-pro-max Skill ⭐⭐⭐ | - | 凭感觉 ❌ | 数据驱动 |
| 字体配对 | ui-ux-pro-max Skill ⭐⭐⭐ | - | 随便选 ❌ | 56 种组合 |
| 配色方案 | ui-ux-pro-max Skill ⭐⭐⭐ | - | 自己配 ❌ | 95 种调色板 |
| **文档操作** |
| 文档搜索 | context7 MCP ⭐⭐⭐ | Google ⭐ | 训练数据 ❌ | 最新文档 |
| 技术文档 | context7 MCP ⭐⭐⭐ | - | 猜测 ❌ | 官方文档 |
| API 参考 | context7 MCP ⭐⭐⭐ | - | 记忆 ❌ | 最新版本 |
| **项目管理** |
| 任务管理 | asana MCP ⭐⭐⭐ | - | 手动记 ❌ | 团队协作 |
| 项目跟踪 | asana MCP ⭐⭐⭐ | - | Excel ❌ | 任务看板 |
| **支付集成** |
| 支付处理 | stripe MCP ⭐⭐⭐ | Plugins ⭐⭐ | API 文档 ⭐ | 完整集成 |
| 订单管理 | stripe MCP ⭐⭐⭐ | - | 手动查 ❌ | 实时查询 |
| 退款操作 | stripe MCP ⭐⭐⭐ | - | 手动处理 ❌ | 自动化 |
| **开发工具** |
| Firebase | firebase MCP ⭐⭐⭐ | - | 手动配置 ❌ | 项目管理 |
| Supabase | supabase MCP ⭐⭐⭐ | - | 手动操作 ❌ | 后端即服务 |
| 代码分析 | greptile MCP ⭐⭐⭐ | - | 手动搜索 ❌ | 代码理解 |

## 场景化能力矩阵

### 数据分析场景

| 任务 | 工具链 | 预期时间 |
|------|-------|---------|
| 查询成本趋势 | bytebase → 数据处理 → chart | 2-5 分钟 |
| Bot 归因分析 | bytebase → 归因计算 → chart | 5-10 分钟 |
| 性能分析 | honeycomb → 分析 → 报告 | 3-8 分钟 |
| 实验效果 | statsig → 对比分析 → 建议 | 3-5 分钟 |

### 全栈开发场景

| 任务 | 工具链 | 预期时间 |
|------|-------|---------|
| 新功能开发 | Plugins → EnterPlanMode → 实现 → /write-tests | 30-60 分钟 |
| Bug 修复 | 诊断 → 修复 → /write-tests → /commit | 15-30 分钟 |
| 代码审查 | /code-review → 改进 → 再次审查 | 10-20 分钟 |
| UI 设计 | ui-ux-pro-max → 实现 → playwright 验证 | 20-40 分钟 |

### DevOps 场景

| 任务 | 工具链 | 预期时间 |
|------|-------|---------|
| CI/CD 配置 | Plugins → 生成工作流 → 测试 | 20-40 分钟 |
| 监控配置 | honeycomb → 告警规则 → 验证 | 15-30 分钟 |
| 故障排查 | honeycomb → 分析 → 修复 → 验证 | 20-60 分钟 |

### 测试场景

| 任务 | 工具链 | 预期时间 |
|------|-------|---------|
| 单元测试 | /write-tests → 运行 → 修复 | 10-20 分钟 |
| E2E 测试 | browser-use → 测试脚本 → 执行 | 20-40 分钟 |
| UI 测试 | playwright → 截图 → 对比 | 5-15 分钟 |

## 技术栈能力矩阵

### 前端技术栈

| 技术 | 主要工具 | 辅助工具 | 能力等级 |
|------|---------|---------|---------|
| React | frontend-development Plugin ⭐⭐⭐ | ui-ux-pro-max ⭐⭐ | 高级 |
| Next.js | frontend-development Plugin ⭐⭐⭐ | context7 ⭐⭐ | 高级 |
| Vue | frontend-development Plugin ⭐⭐⭐ | - | 高级 |
| Tailwind CSS | ui-ux-pro-max ⭐⭐⭐ | - | 高级 |

### 后端技术栈

| 技术 | 主要工具 | 辅助工具 | 能力等级 |
|------|---------|---------|---------|
| Node.js | backend-development Plugin ⭐⭐⭐ | context7 ⭐⭐ | 高级 |
| Python | python-development Plugin ⭐⭐⭐ | context7 ⭐⭐ | 高级 |
| FastAPI | python-development Plugin ⭐⭐⭐ | context7 ⭐⭐ | 高级 |
| Django | python-development Plugin ⭐⭐⭐ | context7 ⭐⭐ | 高级 |

### 数据库技术

| 技术 | 主要工具 | 辅助工具 | 能力等级 |
|------|---------|---------|---------|
| PostgreSQL | bytebase MCP ⭐⭐⭐ | database-design Plugin ⭐⭐ | 高级 |
| MySQL | bytebase MCP ⭐⭐⭐ | database-design Plugin ⭐⭐ | 高级 |
| Firebase | firebase MCP ⭐⭐⭐ | - | 中级 |
| Supabase | supabase MCP ⭐⭐⭐ | - | 中级 |

### DevOps 技术

| 技术 | 主要工具 | 辅助工具 | 能力等级 |
|------|---------|---------|---------|
| GitHub Actions | cicd-automation Plugin ⭐⭐⭐ | - | 高级 |
| Kubernetes | kubernetes-operations Plugin ⭐⭐⭐ | - | 中级 |
| Terraform | cloud-infrastructure Plugin ⭐⭐⭐ | - | 中级 |
| Docker | Plugins ⭐⭐⭐ | - | 高级 |

## 性能能力矩阵

### 响应时间

| 操作类型 | 预期时间 | 工具 |
|---------|---------|------|
| 简单查询 | 2-5 秒 | bytebase/honeycomb |
| 复杂分析 | 10-30 秒 | bytebase + 处理 |
| 代码生成 | 5-15 秒 | Plugins |
| 测试生成 | 10-30 秒 | /write-tests |
| 图表生成 | 3-8 秒 | chart MCP |

### Token 效率

| 任务类型 | Token 使用 | 输出价值 | 效率评级 |
|---------|-----------|---------|---------|
| 数据查询 | 低 (1-2K) | 高 | ⭐⭐⭐ |
| 代码生成 | 中 (3-5K) | 高 | ⭐⭐⭐ |
| 架构设计 | 高 (5-10K) | 极高 | ⭐⭐⭐ |
| 文档编写 | 中 (3-6K) | 中 | ⭐⭐ |

## 学习曲线矩阵

### 工具学习难度

| 工具类型 | 学习曲线 | 上手时间 | 精通时间 |
|---------|---------|---------|---------|
| MCP 工具 | 平缓 ⭐ | 10 分钟 | 1 小时 |
| Skills 工具 | 平缓 ⭐ | 5 分钟 | 30 分钟 |
| Plugins | 自动 - | 0 分钟 | 无需学习 |
| 自动化脚本 | 中等 ⭐⭐ | 30 分钟 | 2-3 小时 |

## 能力提升路径

### 初级阶段（0-1 周）
- ✅ 掌握 DECISION_TREE.md
- ✅ 熟悉常用 MCP（bytebase, chart）
- ✅ 使用基础 Skills（/commit, /code-review）
- ✅ 理解自动执行模式

### 中级阶段（1-4 周）
- ✅ 熟练使用所有 MCP
- ✅ 掌握高级 Skills（browser-use, ui-ux-pro-max）
- ✅ 理解 Plugins 自动激活
- ✅ 编写自动化脚本

### 高级阶段（1-3 月）
- ✅ 优化工具组合
- ✅ 创建自定义 Skills
- ✅ 建立最佳实践
- ✅ 指导团队使用

## 总结

能力矩阵帮助我们：

1. ✅ 快速选择合适的工具
2. ✅ 理解工具的优势和局限
3. ✅ 优化工作流程
4. ✅ 提升整体效率

**核心原则**:
- 需要数据 → MCP
- 需要自动化 → Skills
- 需要建议 → Plugins
- 有疑问 → DECISION_TREE.md

---

**选对工具，事半功倍** 🎯

通过能力矩阵，我们可以在任何场景下快速找到最优解决方案，避免工具选择的困扰。

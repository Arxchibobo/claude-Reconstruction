# 💻 全栈开发工作流

> **最后更新**: 2026-01-13

---

## 📋 总览

全栈开发涉及前端、后端、数据库、部署的完整生命周期。

**核心能力**:
- MCP Servers: context7, stripe, firebase/supabase
- Skills: /commit, /code-review, /write-tests, ui-ux-pro-max
- Plugins: backend/frontend-development, cloud-infrastructure

---

## 🔄 完整开发流程



---

## 1️⃣ 需求分析和技术选型

### 技术栈选择决策树

**前端**: Next.js (SSR) vs React (SPA)
**后端**: Node.js / Edge Functions
**数据库**: PostgreSQL / MongoDB / Firestore

---

## 2️⃣ 架构设计

### backend-development Plugin

触发方式：描述架构需求



### context7 MCP - 最新文档



---

## 3️⃣ 数据库设计

### Schema 设计原则

- 合理规范化
- 添加必要索引
- 设置 RLS 策略（Supabase）

---

## 4️⃣ 后端开发

### API 路由实现

TypeScript + Next.js + Zod 验证

### /write-tests Skill

自动生成测试用例

---

## 5️⃣ 前端开发

### ui-ux-pro-max Skill

搜索设计风格、字体、配色、UI 样式

### React 组件实现

使用 shadcn/ui + Tailwind CSS

---

## 6️⃣ 代码审查和提交

### /code-review Skill

5 个并行审查代理

### /commit Skill

自动生成 commit message

---

## 7️⃣ 部署上线

### cloud-infrastructure Plugin

部署到 Vercel/AWS/GCP

### 监控和告警

honeycomb MCP 设置监控

---

## 💡 最佳实践

### 安全性
- 认证：NextAuth, Supabase Auth
- 授权：RBAC/ABAC, RLS
- 输入验证：Zod/Yup
- SQL 注入：ORM/参数化查询

### 性能优化
- 缓存：Redis, CDN
- 数据库：索引，避免 N+1
- 前端：Code splitting, lazy loading

### 测试策略
- 单元测试：80%+
- 集成测试：关键路径 100%
- E2E 测试：核心流程 100%

---

## 🔗 相关文档

- [mcp-servers.md](../capabilities/mcp-servers.md)
- [skills-guide.md](../capabilities/skills-guide.md)
- [ERROR_CATALOG.md](../../errors/ERROR_CATALOG.md)

---

**📌 提示**: 全栈开发的关键是**前后端协同和测试驱动**。

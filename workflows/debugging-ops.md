# 🐛 调试和运维工作流

> **最后更新**: 2026-01-13

---

## 📋 总览

调试和运维：问题诊断、性能分析、日志追踪、故障恢复。

**核心能力**:
- MCP Servers: honeycomb, bytebase
- Plugins: debugging-toolkit, incident-response
- Skills: browser-use, webapp-testing

---

## 🔄 故障排查流程



---

## 1️⃣ 性能问题排查

### honeycomb MCP - 分析慢请求



**分析步骤**:
1. 识别慢端点
2. 分析 trace 详情
3. 定位瓶颈（数据库/外部 API/计算）
4. 实施修复

---

## 2️⃣ 错误日志分析

### honeycomb MCP - 查询错误



### error-diagnostics Plugin

描述错误场景 → 自动识别类型 → 定位位置 → 提供修复建议

---

## 3️⃣ 数据库问题排查

### bytebase MCP - 分析慢查询

查询慢查询日志

### database-optimizer Plugin

提供慢查询 → 性能分析 → 优化建议 → 性能提升

---

## 4️⃣ UI 问题调试

### browser-use Skill

自动重现问题：
1. 访问页面
2. 执行操作
3. 截图验证
4. 输出录屏 GIF 和 console 错误

### playwright MCP

简单交互测试、截图、查看 console/network

---

## 5️⃣ 运维自动化

### 健康检查脚本

检查数据库、Redis、S3 健康状态

### 自动化告警

定时检查 + Slack 通知

---

## 💡 最佳实践

### 监控指标
- 可用性：API 成功率 > 99.5%
- 性能：P99 < 1000ms
- 错误率：5xx < 1%

### 日志级别
- ERROR：错误和异常
- WARN：警告和潜在问题
- INFO：关键业务事件
- DEBUG：调试信息

### RCA 报告

包含：时间线、根因分析、修复措施、经验教训

---

## 🔗 相关文档

- [mcp-servers.md](../capabilities/mcp-servers.md)
- [ERROR_CATALOG.md](../../errors/ERROR_CATALOG.md)

---

**📌 提示**: 调试和运维的核心是**快速定位和持续改进**。

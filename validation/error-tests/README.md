# 错误案例测试

> 🧪 可执行的测试用例 | ✅ 验证问题和解决方案 | 📊 100% 覆盖 E001-E015

---

## 概述

本目录包含 E001-E015 每个错误模式的可运行测试用例。每个测试验证：

1. ❌ **错误代码确实会出错**
2. ✅ **正确代码确实有效**
3. 📋 **自检清单可执行**

---

## 测试框架

- **JavaScript/TypeScript**: Jest
- **SQL**: 直接执行（需要数据库连接）
- **Shell**: Bash脚本

---

## 运行测试

### 全部测试

```bash
cd validation/error-tests
npm install  # 首次运行
npm test
```

### 单个测试

```bash
npm test E001-async-parallel.test.js
```

### 监视模式

```bash
npm test -- --watch
```

---

## 测试清单

| 错误 | 严重程度 | 频率 | 测试文件 | 状态 |
|------|---------|------|---------|------|
| E001: 异步未并行 | 🔴 严重 | 高频 | E001-async-parallel.test.js | ✅ |
| E002: 轮询无超时 | 🔴 严重 | 高频 | E002-polling-timeout.test.js | ✅ |
| E003: 错误未重新抛出 | 🔴 严重 | 中频 | E003-error-swallowing.test.js | ✅ |
| E004: SQL未用CTE | 🟡 中等 | 中频 | E004-sql-cte.test.sql | ✅ |
| E007: 忘记资源清理 | 🔴 严重 | 低频 | E007-resource-leak.test.js | ✅ |
| E008: ID类型未验证 | 🔴 严重 | 高频 | E008-id-type-validation.test.js | ✅ |
| E011: Git Bash npm失败 | 🟡 中等 | 高频 | E011-npm-bash.test.sh | ✅ |
| E012: Hook权限问题 | 🟡 中等 | 中频 | E012-hook-permissions.test.sh | ✅ |
| E013: 知识库加载 | 🔴 严重 | 中频 | E013-knowledge-base-loading.test.js | ✅ |
| E014: 路径处理未统一 | 🟡 中等 | 中频 | E014-path-handling.test.js | ✅ |
| E015: Hook系统未验证 | 🔴 严重 | 低频 | E015-hook-validation.test.js | ✅ |

---

## 测试结构

### JavaScript 测试结构

```javascript
describe('E0XX: 错误描述', () => {
  describe('错误代码', () => {
    test('应该展示预期的问题', async () => {
      // 运行错误代码
      // 验证问题确实发生
    });
  });

  describe('正确代码', () => {
    test('应该正确工作', async () => {
      // 运行正确代码
      // 验证问题已解决
    });
  });

  describe('自检清单', () => {
    test('检查点1', () => { /* ... */ });
    test('检查点2', () => { /* ... */ });
  });
});
```

### SQL 测试结构

```sql
-- E0XX: 错误描述
-- 测试文件: E0XX-description.test.sql

-- ❌ 错误代码
-- 预期：慢查询、全表扫描
SELECT ...

-- ✅ 正确代码
-- 预期：快速查询、使用索引
WITH ... SELECT ...

-- 📋 自检清单
-- 1. 是否使用了 CTE？
-- 2. 是否预过滤了大表？
```

---

## 性能基准

某些测试包含性能基准，验证优化效果：

```javascript
test('E001: 并行 vs 顺序性能对比', async () => {
  const sequentialTime = await measureSequential();
  const parallelTime = await measureParallel();

  // 并行应该显著更快（至少 10x）
  expect(parallelTime).toBeLessThan(sequentialTime / 10);
});
```

---

## 添加新测试

### Step 1: 创建测试文件

```bash
touch E0XX-new-error.test.js
```

### Step 2: 编写测试

```javascript
describe('E0XX: 新错误描述', () => {
  // 参考现有测试结构
});
```

### Step 3: 运行测试

```bash
npm test E0XX-new-error.test.js
```

### Step 4: 更新清单

在本 README 的测试清单表格中添加新行。

---

## 持续集成

测试在以下时机自动运行：

- **Pre-commit**: 运行快速测试（< 1分钟）
- **PR**: 运行所有测试
- **每周**: 完整测试套件 + 性能基准

---

## 故障排查

### 测试失败

1. 查看测试输出中的错误信息
2. 检查是否安装了所有依赖（`npm install`）
3. 确认环境变量已设置（如数据库连接）
4. 查看具体测试文件中的注释

### SQL 测试失败

- 确认数据库连接配置正确
- 确认测试数据已初始化
- 检查数据库版本兼容性

---

## 相关文档

- [验证系统主文档](../README.md)
- [错误案例库](../../errors/ERROR_CATALOG.md)
- [贡献指南](../../CONTRIBUTING.md)

---

**测试套件版本**: v1.0
**最后更新**: 2026-01-28

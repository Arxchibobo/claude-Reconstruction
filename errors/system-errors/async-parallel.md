# 异步并行处理错误

> **错误 ID**: E001
> **频率**: 高
> **严重度**: 🔴 严重

---

## 📋 错误描述

**常见表现**:
- 多个独立 API 调用顺序执行
- 加载时间 = 单次时间 × 调用次数
- 性能极差（10-13x 慢）

**根本原因**:
- 使用 `for...of` + `await` 顺序执行
- 忽略了多个请求之间没有依赖关系
- 没有利用 JavaScript 的并发能力

---

## ❌ 错误示例

```javascript
// ❌ 错误：顺序执行 13 次搜索
for (const term of searchTerms) {
  const results = await githubProxy.searchRepositories(term);
  allResults.push(...results);
}
// 总耗时：13 × 2秒 = 26秒+
```

---

## ✅ 正确做法

```javascript
// ✅ 正确：并行执行所有搜索
const searchPromises = searchTerms.map(term =>
  githubProxy.searchRepositories(term)
    .then(results => ({ term, results, success: true }))
    .catch(error => {
      console.error(`Search failed for "${term}":`, error.message);
      return { term, results: [], success: false, error: error.message };
    })
);

const searchResults = await Promise.all(searchPromises);
// 总耗时：max(2秒) = 2秒
```

---

## 🔍 关键改进

1. ✅ 使用 `.map()` 创建 Promise 数组
2. ✅ 使用 `Promise.all()` 并行执行
3. ✅ 单个失败不影响其他（每个 Promise 内部处理错误）
4. ✅ 性能提升 10-13 倍

---

## 📌 自检清单

- [ ] 是否有多个独立的异步操作？
- [ ] 是否使用 `Promise.all()` 并行执行？
- [ ] 是否每个 Promise 内部处理错误？
- [ ] 是否避免使用 `for...of` + `await`？

---

## 🎯 适用场景

✅ **应该并行**:
- 多个独立 API 调用
- 批量数据库查询（无依赖关系）
- 多个文件读取操作
- 并行 MCP 工具调用

❌ **不应该并行**:
- 后续操作依赖前面结果（需要顺序执行）
- 需要限制并发数量（应使用 p-limit 等库）
- 数据库事务操作（需要保证顺序）

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

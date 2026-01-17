# 异步并行处理错误

> **错误 ID**: E001 | **频率**: 高 | **严重度**: 🔴 严重

---

## 错误描述

多个独立的异步操作顺序执行，而非并行执行，导致性能严重下降。

## 自检问题

- [ ] 多个独立异步操作是否使用 `Promise.all()`？
- [ ] 是否有不必要的 `await` 阻塞？
- [ ] 批量操作是否并行化？

---

## 错误案例

### 案例 1: 循环中的顺序 await

```javascript
// ❌ 错误：顺序执行 (13次 × 2秒 = 26秒)
async function searchAll(searchTerms) {
  const allResults = [];
  for (const term of searchTerms) {
    const results = await api.search(term);  // 每次等待完成
    allResults.push(...results);
  }
  return allResults;
}

// ✅ 正确：并行执行 (max 2秒)
async function searchAll(searchTerms) {
  const searchPromises = searchTerms.map(term =>
    api.search(term)
      .then(results => ({ term, results, success: true }))
      .catch(error => ({ term, results: [], success: false, error: error.message }))
  );
  const searchResults = await Promise.all(searchPromises);
  return searchResults.filter(r => r.success).flatMap(r => r.results);
}
```

### 案例 2: 独立数据获取顺序执行

```javascript
// ❌ 错误：顺序获取（总时间 = 各请求时间之和）
async function loadDashboard(userId) {
  const user = await fetchUser(userId);
  const orders = await fetchOrders(userId);
  const notifications = await fetchNotifications(userId);
  return { user, orders, notifications };
}

// ✅ 正确：并行获取（总时间 = 最慢请求时间）
async function loadDashboard(userId) {
  const [user, orders, notifications] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId)
  ]);
  return { user, orders, notifications };
}
```

### 案例 3: 批量数据处理

```javascript
// ❌ 错误：逐个处理
async function processItems(items) {
  for (const item of items) {
    await processItem(item);
  }
}

// ✅ 正确：批量并行（带并发控制）
async function processItems(items, concurrency = 5) {
  const chunks = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(item => processItem(item)));
  }
}
```

---

## 根因分析

1. **习惯性思维**: 按顺序写代码的习惯
2. **对 async/await 理解不足**: 不清楚 await 会阻塞执行
3. **错误处理担忧**: 担心并行执行时错误难以追踪

## 预防措施

1. **代码审查检查点**: 看到循环中的 await，立即考虑是否可以并行
2. **性能测试**: 对批量操作进行性能测试
3. **使用 Promise.allSettled**: 当需要所有结果（包括失败的）时

```javascript
// 使用 Promise.allSettled 处理部分失败
const results = await Promise.allSettled(promises);
const successful = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);
const failed = results
  .filter(r => r.status === 'rejected')
  .map(r => r.reason);
```

---

## 相关错误

- [E002 轮询无超时](./timeout-polling.md)
- [E003 错误未重新抛出](./error-handling.md)

---

## 检测工具

可以使用 ESLint 规则 `no-await-in-loop` 来检测循环中的 await：

```json
{
  "rules": {
    "no-await-in-loop": "warn"
  }
}
```

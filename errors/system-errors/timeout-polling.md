# 超时与轮询错误

> **错误 ID**: E002
> **频率**: 高
> **严重度**: 🔴 严重

---

## 📋 错误描述

**常见表现**:
- 轮询永不停止
- UI 永远显示 loading
- 用户只能刷新页面

**根本原因**:
- 未设置最大尝试次数
- 没有超时限制
- 缺少取消机制

---

## ❌ 错误示例

```javascript
// ❌ 错误：无限轮询
function pollScanStatus(scanId) {
  scanPollInterval = setInterval(async () => {
    const response = await fetch(`/api/security/scan/${scanId}/status`);
    const data = await response.json();

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(scanPollInterval);
      updateUI(data);
    }
  }, 2000); // 每 2 秒轮询一次，但永不超时
}
```

---

## ✅ 正确做法

```javascript
// ✅ 正确：带超时的轮询
function pollScanStatus(scanId, maxAttempts = 30) {
  let attempts = 0;

  scanPollInterval = setInterval(async () => {
    attempts++;

    // 超时检查
    if (attempts > maxAttempts) {
      clearInterval(scanPollInterval);
      showError('扫描超时，请稍后重试');
      return;
    }

    try {
      const response = await fetch(`/api/security/scan/${scanId}/status`);
      const data = await response.json();

      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(scanPollInterval);
        updateUI(data);
      }
    } catch (error) {
      clearInterval(scanPollInterval);
      showError('查询失败: ' + error.message);
    }
  }, 2000);
}
```

---

## 🔍 关键改进

1. ✅ 设置 `maxAttempts` 限制
2. ✅ 添加 `try-catch` 处理网络错误
3. ✅ 超时后清理 interval
4. ✅ 提供友好的错误提示

---

## 📌 自检清单

- [ ] 轮询是否设置 `maxAttempts`？
- [ ] 是否有超时检查？
- [ ] 失败/超时后是否 `clearInterval`？
- [ ] 是否有错误处理和用户提示？

---

## 🎯 最佳实践

```javascript
// 推荐：使用 Promise 封装轮询逻辑
async function pollWithTimeout(pollFn, {
  interval = 2000,
  maxAttempts = 30,
  timeout = 60000
}) {
  const startTime = Date.now();

  for (let i = 0; i < maxAttempts; i++) {
    // 检查总超时时间
    if (Date.now() - startTime > timeout) {
      throw new Error('轮询超时');
    }

    const result = await pollFn();
    if (result.isDone) {
      return result.data;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('达到最大尝试次数');
}
```

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

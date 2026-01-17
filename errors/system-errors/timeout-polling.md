# 超时与轮询错误

> **错误 ID**: E002 | **频率**: 高 | **严重度**: 🔴 严重

---

## 错误描述

轮询操作没有设置超时限制，可能导致无限循环、资源泄漏或界面卡死。

## 自检问题

- [ ] 轮询是否设置 `maxAttempts` 限制？
- [ ] 是否有取消机制 (`clearInterval` / `clearTimeout`)？
- [ ] 超时后是否有用户反馈？

---

## 错误案例

### 案例 1: 无限轮询

```javascript
// ❌ 错误：无限轮询，永不停止
let pollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') {
    clearInterval(pollInterval);
    updateUI(data);
  }
  // 如果状态永远不是 completed，将永远轮询
}, 2000);

// ✅ 正确：带超时的轮询
function pollWithTimeout(scanId, maxAttempts = 30, interval = 2000) {
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    attempts++;

    // 超时检查
    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      showError('操作超时，请稍后重试');
      return;
    }

    try {
      const data = await fetchStatus(scanId);

      // 终止条件：成功或失败
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollInterval);
        updateUI(data);
      }
    } catch (error) {
      clearInterval(pollInterval);
      showError(`获取状态失败: ${error.message}`);
    }
  }, interval);

  // 返回取消函数
  return () => clearInterval(pollInterval);
}
```

### 案例 2: Promise 形式的轮询

```javascript
// ✅ 推荐：Promise 形式的轮询（更容易组合）
async function pollUntilComplete(scanId, options = {}) {
  const {
    maxAttempts = 30,
    interval = 2000,
    onProgress = () => {}
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await fetchStatus(scanId);
      onProgress({ attempt, maxAttempts, status: data.status });

      if (data.status === 'completed') {
        return { success: true, data };
      }

      if (data.status === 'failed') {
        return { success: false, error: data.error };
      }

      // 等待下一次轮询
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: '轮询超时' };
}

// 使用示例
const result = await pollUntilComplete(scanId, {
  maxAttempts: 30,
  interval: 2000,
  onProgress: ({ attempt, maxAttempts }) => {
    updateProgressBar(attempt / maxAttempts * 100);
  }
});
```

### 案例 3: 可取消的轮询（AbortController）

```javascript
// ✅ 高级：使用 AbortController 实现可取消轮询
function createCancellablePoll(scanId, options = {}) {
  const controller = new AbortController();
  const { maxAttempts = 30, interval = 2000 } = options;

  const promise = (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (controller.signal.aborted) {
        throw new Error('轮询已取消');
      }

      const data = await fetchStatus(scanId);

      if (data.status === 'completed' || data.status === 'failed') {
        return data;
      }

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, interval);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('轮询已取消'));
        });
      });
    }

    throw new Error('轮询超时');
  })();

  return {
    promise,
    cancel: () => controller.abort()
  };
}

// 使用示例
const { promise, cancel } = createCancellablePoll(scanId);

// 用户点击取消按钮
cancelButton.onclick = () => cancel();

try {
  const result = await promise;
  handleSuccess(result);
} catch (error) {
  if (error.message === '轮询已取消') {
    showMessage('操作已取消');
  } else {
    showError(error.message);
  }
}
```

---

## 根因分析

1. **乐观假设**: 假设操作总会在合理时间内完成
2. **缺少边界条件思考**: 没有考虑网络问题、服务端错误等情况
3. **用户体验忽视**: 没有考虑用户等待时的焦虑

## 预防措施

1. **强制超时**: 所有轮询必须有 maxAttempts
2. **进度反馈**: 显示当前尝试次数或预估剩余时间
3. **取消机制**: 提供用户主动取消的能力
4. **优雅降级**: 超时后提供重试或备选方案

---

## 超时时间参考

| 操作类型 | 建议超时 | 轮询间隔 |
|---------|---------|---------|
| 简单状态检查 | 30秒 | 2秒 |
| 文件处理 | 2分钟 | 5秒 |
| 报告生成 | 5分钟 | 10秒 |
| 大数据分析 | 10分钟 | 30秒 |

---

## 相关错误

- [E001 异步未并行](./async-parallel.md)
- [E007 忘记资源清理](./error-handling.md)

# 错误处理错误

> **错误 ID**: E003, E007
> **频率**: 中-高
> **严重度**: 🔴 严重

---

## 📋 错误 E003: 错误未重新抛出

**常见表现**:
- `catch` 捕获错误后静默失败
- 调用者无法感知错误
- 导致后续逻辑基于错误状态执行

**根本原因**:
- `catch` 块只记录日志，未重新抛出
- 错误被"吞掉"，外层无法处理

### ❌ 错误示例

```javascript
// ❌ 错误：错误被吞掉
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  } catch (error) {
    console.error('获取用户数据失败:', error);
    // ❌ 没有重新抛出错误
  }
}

// 调用者无法感知错误
const userData = await fetchUserData(123);
console.log(userData.name); // ❌ undefined.name - 运行时错误
```

### ✅ 正确做法

```javascript
// ✅ 正确：重新抛出错误
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  } catch (error) {
    console.error('获取用户数据失败:', error);
    throw new Error(`无法获取用户 ${userId} 的数据: ${error.message}`);
  }
}

// 调用者可以处理错误
try {
  const userData = await fetchUserData(123);
  console.log(userData.name);
} catch (error) {
  showError(error.message);
}
```

---

## 📋 错误 E007: 忘记资源清理

**常见表现**:
- 超时/失败后轮询继续运行
- 内存泄漏
- 资源耗尽

**根本原因**:
- 只在成功路径清理资源
- 错误路径未清理 interval/timeout/listeners

### ❌ 错误示例

```javascript
// ❌ 错误：只在成功时清理
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);

  if (data.status === 'completed') {
    clearInterval(scanPollInterval); // ✅ 成功时清理
    updateUI(data);
  }
  // ❌ 失败时未清理
}, 2000);
```

### ✅ 正确做法

```javascript
// ✅ 正确：所有退出路径都清理
scanPollInterval = setInterval(async () => {
  try {
    const data = await fetchStatus(scanId);

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(scanPollInterval); // ✅ 清理
      updateUI(data);
    }
  } catch (error) {
    clearInterval(scanPollInterval); // ✅ 错误时也清理
    showError(error.message);
  }
}, 2000);
```

---

## 📌 自检清单

### 错误处理（E003）
- [ ] `catch` 块是否重新抛出错误？
- [ ] 错误信息是否友好且详细？
- [ ] 是否记录日志供调试？

### 资源清理（E007）
- [ ] 所有退出路径都清理资源？
- [ ] 是否清理 interval/timeout？
- [ ] 是否移除事件监听器？
- [ ] 是否关闭文件/连接？

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

# 状态管理错误

> **错误 ID**: E005, E010
> **频率**: 中-低
> **严重度**: 🟡 中等 - 🟢 轻微

---

## 📋 错误 E005: 状态 ID 重复生成

**常见表现**:
- 每次渲染生成新 ID
- 状态无法正确关联
- 组件意外重新渲染

**根本原因**:
- 在渲染函数中生成 ID
- 未使用 `useState` 保存 ID

### ❌ 错误示例

```javascript
// ❌ 错误：每次渲染生成新 ID
function ScanButton() {
  const scanId = Date.now().toString(); // ❌ 每次渲染都变

  const handleScan = async () => {
    await startScan(scanId);
    await pollStatus(scanId); // ❌ scanId 可能已经变了
  };

  return <button onClick={handleScan}>开始扫描</button>;
}
```

### ✅ 正确做法

```javascript
// ✅ 正确：ID 只生成一次
function ScanButton() {
  const [scanId] = useState(() => Date.now().toString()); // ✅ 只生成一次

  const handleScan = async () => {
    await startScan(scanId);
    await pollStatus(scanId); // ✅ scanId 稳定
  };

  return <button onClick={handleScan}>开始扫描</button>;
}
```

---

## 📋 错误 E010: 硬编码魔法值

**常见表现**:
- 代码中出现神秘数字
- 难以维护和理解
- 修改时容易遗漏

**根本原因**:
- 直接使用字面量
- 未定义常量或配置

### ❌ 错误示例

```javascript
// ❌ 错误：魔法值
if (attempts > 30) { // ❌ 30 是什么意思？
  throw new Error('超时');
}

await wait(2000); // ❌ 2000 是什么单位？
```

### ✅ 正确做法

```javascript
// ✅ 正确：使用常量
const MAX_POLL_ATTEMPTS = 30; // 最多轮询 30 次
const POLL_INTERVAL_MS = 2000; // 轮询间隔 2 秒

if (attempts > MAX_POLL_ATTEMPTS) {
  throw new Error('超时');
}

await wait(POLL_INTERVAL_MS);
```

---

## 📌 自检清单

### 状态 ID（E005）
- [ ] ID 是否只生成一次？
- [ ] 是否使用 `useState` 保存 ID？
- [ ] 是否避免在渲染函数中生成 ID？

### 魔法值（E010）
- [ ] 是否定义了常量？
- [ ] 常量名称是否语义化？
- [ ] 是否有单位说明（MS, SEC 等）？

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

# 错误处理问题

> **包含错误**: E003 错误未重新抛出, E007 忘记资源清理

---

## E003: 错误未重新抛出

> **频率**: 中 | **严重度**: 🔴 严重

### 错误描述

在 catch 块中捕获错误后只记录日志，没有重新抛出，导致调用者无法感知错误。

### 自检问题

- [ ] `catch` 块是否 `throw error`？
- [ ] 错误信息是否对调用者有意义？
- [ ] 是否需要包装成更具体的错误类型？

### 错误案例

```javascript
// ❌ 错误：错误被吞掉
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('获取失败:', error);
    // 没有 throw，调用者无法感知错误
    // 返回 undefined，可能导致后续代码出错
  }
}

// 调用者以为成功了
const user = await fetchUser(123);
console.log(user.name); // TypeError: Cannot read property 'name' of undefined

// ✅ 正确：重新抛出有意义的错误
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('获取用户失败:', error);
    throw new Error(`无法获取用户 ${id}: ${error.message}`);
  }
}

// 调用者可以正确处理错误
try {
  const user = await fetchUser(123);
  console.log(user.name);
} catch (error) {
  showError(error.message); // "无法获取用户 123: HTTP 404"
}
```

### 何时可以不重新抛出

```javascript
// ✅ 有默认值的情况
async function getConfig(key) {
  try {
    return await fetchConfig(key);
  } catch (error) {
    console.warn(`配置 ${key} 获取失败，使用默认值`);
    return DEFAULT_CONFIG[key]; // 返回有意义的默认值
  }
}

// ✅ 可选操作（失败不影响主流程）
async function trackAnalytics(event) {
  try {
    await analytics.track(event);
  } catch (error) {
    // 分析追踪失败不应影响用户操作
    console.warn('Analytics tracking failed:', error);
  }
}
```

---

## E007: 忘记资源清理

> **频率**: 低 | **严重度**: 🔴 严重

### 错误描述

只在成功路径清理资源（定时器、监听器、连接等），在错误或超时路径忘记清理，导致资源泄漏。

### 自检问题

- [ ] 所有退出路径（成功/失败/超时）都清理资源？
- [ ] 使用 try-finally 确保清理？
- [ ] 组件卸载时是否清理？

### 错误案例

```javascript
// ❌ 错误：只在成功时清理
let pollInterval;

function startPolling(scanId) {
  pollInterval = setInterval(async () => {
    const data = await fetchStatus(scanId);
    if (data.status === 'completed') {
      clearInterval(pollInterval); // 只有这里清理
      updateUI(data);
    }
    // 失败时泄漏！服务端错误时泄漏！
  }, 2000);
}

// ✅ 正确：所有退出路径都清理
function startPolling(scanId, maxAttempts = 30) {
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    attempts++;

    // 超时清理
    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      showError('轮询超时');
      return;
    }

    try {
      const data = await fetchStatus(scanId);

      // 成功或失败都清理
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollInterval);
        updateUI(data);
      }
    } catch (error) {
      // 错误时也清理
      clearInterval(pollInterval);
      showError(error.message);
    }
  }, 2000);

  // 返回清理函数供外部使用
  return () => clearInterval(pollInterval);
}
```

### 使用 try-finally 确保清理

```javascript
// ✅ 使用 try-finally 模式
async function withConnection(fn) {
  const connection = await createConnection();
  try {
    return await fn(connection);
  } finally {
    // 无论成功还是失败，都会执行
    await connection.close();
  }
}

// 使用
const result = await withConnection(async (conn) => {
  return await conn.query('SELECT * FROM users');
});
```

### React 组件清理

```javascript
// ❌ 错误：组件卸载后继续执行
function UserStatus({ userId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchStatus(userId);
      setStatus(data); // 组件可能已卸载！
    }, 5000);

    // 忘记返回清理函数
  }, [userId]);

  return <div>{status}</div>;
}

// ✅ 正确：返回清理函数
function UserStatus({ userId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    const interval = setInterval(async () => {
      const data = await fetchStatus(userId);
      if (mounted) {
        setStatus(data);
      }
    }, 5000);

    // 清理函数
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  return <div>{status}</div>;
}
```

---

## 错误处理最佳实践

### 1. 错误分类

```javascript
// 定义错误类型
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

// 根据类型处理
try {
  await submitForm(data);
} catch (error) {
  if (error instanceof ValidationError) {
    highlightField(error.field);
  } else if (error instanceof NetworkError) {
    showRetryOption();
  } else {
    showGenericError();
  }
}
```

### 2. 错误边界（React）

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 3. 全局错误处理

```javascript
// 未捕获的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  logErrorToService(event.reason);
  event.preventDefault(); // 阻止默认的控制台错误
});

// 全局错误
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  logErrorToService(event.error);
});
```

---

## 相关错误

- [E001 异步未并行](./async-parallel.md)
- [E002 轮询无超时](./timeout-polling.md)

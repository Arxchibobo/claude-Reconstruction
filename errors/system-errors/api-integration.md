# API 集成错误

> **包含错误**: E006 API 参数顺序错误, E008 Chart 配置不完整, E009 依赖未安装

---

## E006: API 参数顺序错误

> **频率**: 中 | **严重度**: 🟡 中等

### 错误描述

调用 API 或函数时参数顺序错误，导致意外行为或错误。

### 自检问题

- [ ] 是否核对了 API 文档？
- [ ] 参数顺序是否正确？
- [ ] 是否使用了命名参数（对象参数）？

### 错误案例

```javascript
// ❌ 错误：参数顺序错误
// API 定义：createUser(name, email, role)
const user = createUser('admin', 'john@example.com', 'John');
// 实际创建：name='admin', email='john@example.com', role='John'

// ✅ 正确：确认参数顺序
const user = createUser('John', 'john@example.com', 'admin');

// ✅ 更好：使用对象参数，避免顺序问题
function createUser({ name, email, role }) {
  // ...
}

const user = createUser({
  name: 'John',
  email: 'john@example.com',
  role: 'admin'
});
```

### MCP 调用示例

```javascript
// ❌ 错误：MCP 参数格式错误
database_execute_sql('SELECT * FROM users');

// ✅ 正确：使用正确的参数格式
database_execute_sql({
  sql: 'SELECT * FROM users WHERE active = true'
});

// Observability 查询
observability_run_query({
  environment_slug: 'production',
  dataset_slug: 'api-logs',
  query_spec: {
    calculations: [{ op: 'COUNT' }],
    time_range: 3600
  }
});
```

---

## E008: Chart 配置不完整

> **频率**: 低 | **严重度**: 🟢 轻微

### 错误描述

生成图表时配置不完整，缺少 tooltip、legend、标题等，影响可读性。

### 自检问题

- [ ] 是否包含标题 (title)？
- [ ] 是否配置 tooltip？
- [ ] 是否需要图例 (legend)？
- [ ] 坐标轴标题是否清晰？

### 错误案例

```javascript
// ❌ 错误：最小配置，缺少关键元素
chart_generate_line_chart({
  data: [
    { time: '2026-01', value: 100 },
    { time: '2026-02', value: 150 }
  ]
});

// ✅ 正确：完整配置
chart_generate_line_chart({
  data: [
    { time: '2026-01', value: 100 },
    { time: '2026-02', value: 150 }
  ],
  title: '月度收入趋势',
  axisXTitle: '月份',
  axisYTitle: '收入 (USD)',
  width: 800,
  height: 400,
  theme: 'default',
  style: {
    lineWidth: 2
  }
});
```

### 各类图表配置清单

```javascript
// 折线图
{
  data: [...],
  title: '图表标题',
  axisXTitle: 'X轴标题',
  axisYTitle: 'Y轴标题',
  width: 800,
  height: 400
}

// 柱状图
{
  data: [...],
  title: '图表标题',
  axisXTitle: '类别',
  axisYTitle: '数值',
  group: false,  // 是否分组
  stack: true    // 是否堆叠
}

// 饼图
{
  data: [...],
  title: '图表标题',
  innerRadius: 0.6  // 环形图
}

// 漏斗图
{
  data: [...],
  title: '转化漏斗'
}
```

---

## E009: 依赖未安装就使用

> **频率**: 低 | **严重度**: 🟡 中等

### 错误描述

在代码中引用了未安装的包，导致运行时错误。

### 自检问题

- [ ] 是否执行了 `npm install`？
- [ ] package.json 是否包含该依赖？
- [ ] 是否需要 `@types/` 类型定义？

### 错误案例

```javascript
// ❌ 错误：直接使用未安装的包
import { format } from 'date-fns';
// Error: Cannot find module 'date-fns'

// ✅ 正确：先安装再使用
// 1. npm install date-fns
// 2. import { format } from 'date-fns';
```

### 安装命令参考

```bash
# 生产依赖
npm install package-name

# 开发依赖
npm install --save-dev package-name

# 类型定义
npm install --save-dev @types/package-name

# 一次性安装多个
npm install package1 package2 package3

# 安装特定版本
npm install package-name@1.2.3

# 检查已安装的包
npm list --depth=0
```

### 常见包和类型

| 包 | 类型定义 | 用途 |
|---|---------|-----|
| lodash | @types/lodash | 工具函数 |
| express | @types/express | Web 框架 |
| node | @types/node | Node.js API |
| react | @types/react | React |
| jest | @types/jest | 测试 |

---

## API 集成最佳实践

### 1. 类型安全的 API 调用

```typescript
// 定义 API 响应类型
interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

// 类型安全的 fetch 封装
async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return { data };
  } catch (error) {
    return { data: null as T, error: error.message };
  }
}

// 使用
const result = await fetchApi<User>('/api/users/1');
if (result.error) {
  console.error(result.error);
} else {
  console.log(result.data.name); // 类型安全
}
```

### 2. 重试机制

```javascript
async function fetchWithRetry(url, options = {}) {
  const { maxRetries = 3, delay = 1000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }

      // 不重试客户端错误
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // 指数退避
      await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt - 1)));
    }
  }
}
```

### 3. Rate Limiting 处理

```javascript
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.tokens = requestsPerSecond;
    this.maxTokens = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire() {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = (1 / this.maxTokens) * 1000;
      await new Promise(r => setTimeout(r, waitTime));
      this.refill();
    }

    this.tokens--;
    return true;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.maxTokens);
    this.lastRefill = now;
  }
}

// 使用
const limiter = new RateLimiter(10);

async function rateLimitedFetch(url) {
  await limiter.acquire();
  return fetch(url);
}
```

---

## 相关错误

- [E001 异步未并行](./async-parallel.md)
- [E003 错误未重新抛出](./error-handling.md)

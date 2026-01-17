# 最佳实践参考

> **用途**: 编码规范和最佳实践的快速参考

---

## TypeScript 最佳实践

### 类型定义

```typescript
// ✅ 使用接口定义对象类型
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ 使用类型别名定义联合类型
type Status = 'pending' | 'active' | 'completed' | 'failed';

// ✅ 使用泛型提高复用性
interface ApiResponse<T> {
  data: T;
  error?: string;
  timestamp: number;
}

// ✅ 使用 Partial/Required/Pick 等工具类型
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;
```

### 函数定义

```typescript
// ✅ 使用函数重载处理不同参数
function fetch(url: string): Promise<Response>;
function fetch(url: string, options: RequestOptions): Promise<Response>;
function fetch(url: string, options?: RequestOptions): Promise<Response> {
  // 实现
}

// ✅ 使用可选参数和默认值
function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
```

### 错误处理

```typescript
// ✅ 定义自定义错误类型
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ✅ 使用 Result 类型处理可预期错误
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      return { success: false, error: new Error('User not found') };
    }
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## 异步编程

### Promise 处理

```typescript
// ✅ 并行执行独立操作
const [users, orders, products] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
]);

// ✅ 使用 Promise.allSettled 处理部分失败
const results = await Promise.allSettled(urls.map(url => fetch(url)));
const successful = results
  .filter((r): r is PromiseFulfilledResult<Response> => r.status === 'fulfilled')
  .map(r => r.value);

// ✅ 带超时的 Promise
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```

### 轮询模式

```typescript
// ✅ 带超时和取消的轮询
async function poll<T>(
  fn: () => Promise<T>,
  options: {
    interval?: number;
    maxAttempts?: number;
    shouldStop?: (result: T) => boolean;
  } = {}
): Promise<T> {
  const { interval = 1000, maxAttempts = 30, shouldStop = () => false } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn();
    if (shouldStop(result)) {
      return result;
    }
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, interval));
    }
  }
  throw new Error('Polling timeout');
}
```

---

## API 设计

### RESTful 端点

```typescript
// ✅ 标准 CRUD 操作
// GET    /api/users          - 列表
// GET    /api/users/:id      - 详情
// POST   /api/users          - 创建
// PUT    /api/users/:id      - 全量更新
// PATCH  /api/users/:id      - 部分更新
// DELETE /api/users/:id      - 删除

// ✅ 标准响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}
```

### 输入验证

```typescript
// ✅ 使用 Zod 进行验证
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional()
});

type User = z.infer<typeof UserSchema>;

// 验证并处理错误
function validateUser(data: unknown): User {
  const result = UserSchema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      'Validation failed',
      'VALIDATION_ERROR',
      400
    );
  }
  return result.data;
}
```

---

## 数据库操作

### SQL 查询

```sql
-- ✅ 使用 CTE 预过滤
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE status = 'active'
    AND last_login > NOW() - INTERVAL '30 days'
)
SELECT au.*, COUNT(o.id) as order_count
FROM active_users au
LEFT JOIN orders o ON au.id = o.user_id
GROUP BY au.id, au.name, au.email;

-- ✅ 使用参数化查询防止 SQL 注入
-- 框架示例 (不要字符串拼接)
const users = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

-- ✅ 添加索引提升查询性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

### 事务处理

```typescript
// ✅ 使用事务保证数据一致性
async function transferFunds(from: string, to: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, from]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, to]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 错误处理

### 错误分层

```typescript
// ✅ 分层错误处理
// 1. 业务层 - 处理业务逻辑错误
class BusinessError extends AppError {
  constructor(message: string, code: string) {
    super(message, code, 400);
  }
}

// 2. 数据层 - 处理数据访问错误
class DataError extends AppError {
  constructor(message: string) {
    super(message, 'DATA_ERROR', 500);
  }
}

// 3. 全局错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message }
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  });
});
```

### 日志记录

```typescript
// ✅ 结构化日志
const logger = {
  info: (message: string, context?: object) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  error: (message: string, error: Error, context?: object) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: { name: error.name, message: error.message, stack: error.stack },
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};
```

---

## 安全实践

### 认证

```typescript
// ✅ JWT 验证
import jwt from 'jsonwebtoken';

function verifyToken(token: string): User {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as User;
  } catch (error) {
    throw new AppError('Invalid token', 'UNAUTHORIZED', 401);
  }
}

// ✅ 密码哈希
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 输入清理

```typescript
// ✅ XSS 防护
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}

// ✅ SQL 注入防护 - 使用参数化查询
// 永远不要这样做：
// ❌ `SELECT * FROM users WHERE email = '${email}'`
// ✅ 使用 ORM 或参数化查询
```

---

## 测试

### 单元测试

```typescript
// ✅ 测试结构
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = { name: 'Test', email: 'test@example.com' };
      const user = await userService.createUser(userData);

      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      const userData = { name: 'Test', email: 'invalid' };

      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email');
    });
  });
});
```

### Mock 和 Stub

```typescript
// ✅ 使用 Mock 隔离依赖
jest.mock('./database');

const mockDb = database as jest.Mocked<typeof database>;
mockDb.query.mockResolvedValue([{ id: 1, name: 'Test' }]);

// ✅ 测试异步代码
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBe(expected);
});
```

---

## 性能优化

### 缓存策略

```typescript
// ✅ 内存缓存
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item || item.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}
```

### 批量操作

```typescript
// ✅ 批量插入
async function batchInsert<T>(items: T[], batchSize: number = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await db.insert(batch);
  }
}

// ✅ 并发控制
async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}
```

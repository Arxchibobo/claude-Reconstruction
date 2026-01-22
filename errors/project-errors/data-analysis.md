# Data Analysis Automation 错误案例

> **项目**: Data Analysis Automation (DAA)
> **技术栈**: TypeScript, PostgreSQL, Vercel Serverless, MCP, Drizzle ORM
> **最后更新**: 2026-01-14

---

## 错误 1: SQL 查询未使用 CTE 预过滤

### 📋 错误描述

**常见表现**:
- Bot 归因查询耗时 60-180 秒
- 数据库负载过高
- JOIN 操作性能极差

**根本原因**:
- 直接在 JOIN 中使用全表扫描
- 没有在 CTE 中预先过滤数据
- 在 GROUP BY 中重复计算表达式

**影响**:
- 性能差 3-10 倍
- 资源浪费
- 用户体验差

### ❌ 错误示例

```sql
-- ❌ 错误：没有 CTE，直接 JOIN 全表
SELECT
  bot.bot_id,
  bot.bot_name,
  COUNT(DISTINCT task.id) as task_count,
  SUM(task.actual_energy_cost) / 100 as total_cost_usd
FROM bot
LEFT JOIN task ON task.bot_id = bot.bot_id
  AND task.status IN ('done', 'cancel')
  AND task.created_at >= '2024-01-01'  -- 每次 JOIN 都过滤
GROUP BY bot.bot_id, bot.bot_name;
-- 性能：60-180 秒，全表扫描
```

### ✅ 正确做法

```sql
-- ✅ 正确：使用 CTE 预过滤数据
WITH filtered_tasks AS (
  -- ✅ 先过滤，只保留需要的数据
  SELECT
    bot_id,
    id,
    actual_energy_cost,
    created_at
  FROM task
  WHERE status IN ('done', 'cancel')
    AND created_at >= '2024-01-01'
    AND created_at < '2024-02-01'
),
bot_costs AS (
  -- ✅ 在小数据集上 JOIN 和聚合
  SELECT
    bot.bot_id,
    bot.bot_name,
    COUNT(DISTINCT t.id) as task_count,
    SUM(t.actual_energy_cost) / 100 as total_cost_usd
  FROM bot
  LEFT JOIN filtered_tasks t ON t.bot_id = bot.bot_id
  GROUP BY bot.bot_id, bot.bot_name
)
SELECT * FROM bot_costs;
-- 性能：15-45 秒，性能提升 3-10 倍
```

### 🔍 关键改进

1. ✅ 使用 CTE 在 JOIN 前预过滤数据
2. ✅ 减少 JOIN 操作的数据量
3. ✅ 在 CTE 中明确选择需要的列
4. ✅ 避免在 JOIN 条件中重复过滤

**相关系统级错误**: [E004 - SQL 未使用 CTE](../system-errors/sql-optimization.md)

---

## 错误 2: Vercel Cron 环境变量未正确配置

### 📋 错误描述

**常见表现**:
- Cron job 在 Vercel 上执行失败
- 本地开发正常，部署后报错 "DATABASE_URL is undefined"
- 定时任务静默失败，没有通知

**根本原因**:
- 环境变量只在本地 `.env` 文件中配置
- 没有在 Vercel 项目设置中添加环境变量
- 使用了 Vercel 不支持的环境变量名

### ❌ 错误示例

```typescript
// ❌ 错误：直接使用 process.env，没有 fallback
export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL; // ❌ Vercel 上可能未定义
  const db = await connectDB(dbUrl);
  // 如果 dbUrl 为 undefined，会静默失败或崩溃
}
```

```bash
# ❌ 错误：只在本地 .env 配置
# .env.local (不会部署到 Vercel)
DATABASE_URL=postgresql://localhost:5432/mydb
```

### ✅ 正确做法

```typescript
// ✅ 正确：验证环境变量并提供清晰错误
export default async function handler(req, res) {
  const requiredEnvVars = ['DATABASE_URL', 'CRON_SECRET'];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      return res.status(500).json({
        error: 'Configuration error',
        message: `${varName} is not configured`
      });
    }
  }

  const dbUrl = process.env.DATABASE_URL!;
  const db = await connectDB(dbUrl);
  // ... rest of logic
}
```

**Vercel 项目设置**:
```bash
# ✅ 在 Vercel Dashboard → Settings → Environment Variables 中配置
DATABASE_URL=postgresql://user:password@host:5432/database
CRON_SECRET=your-random-secret
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
```

**验证脚本**:
```typescript
// ✅ 在 CI/CD 或本地验证环境变量
import { config } from 'dotenv';
config();

const requiredEnvVars = [
  'DATABASE_URL',
  'CRON_SECRET',
  'SLACK_BOT_TOKEN',
  'SLACK_CHANNEL_ID'
];

const missing = requiredEnvVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:');
  missing.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}

console.log('✅ All required environment variables are configured');
```

### 🔍 关键改进

1. ✅ 在代码中验证所有必需的环境变量
2. ✅ 在 Vercel Dashboard 中配置环境变量
3. ✅ 提供清晰的错误信息
4. ✅ 使用验证脚本在部署前检查

---

## 错误 3: Drizzle ORM Schema 与数据库不同步

### 📋 错误描述

**常见表现**:
- 查询时报错 "column does not exist"
- 新增字段在代码中可用但数据库中不存在
- 数据类型不匹配导致插入失败

**根本原因**:
- 修改了 schema.ts 但没有运行 `npm run db:push`
- 没有使用 migration 系统
- 开发和生产数据库 schema 不一致

### ❌ 错误示例

```typescript
// ❌ 错误：修改了 schema 但未同步数据库
// lib/db/schema.ts
export const daaf_bot_revenue_snapshots = pgTable('daaf_bot_revenue_snapshots', {
  id: serial('id').primaryKey(),
  bot_id: integer('bot_id').notNull(),
  bot_name: text('bot_name').notNull(),
  // ❌ 新增字段但未 db:push
  proportional_margin_pct: numeric('proportional_margin_pct', { precision: 10, scale: 2 }),
});

// api/cron/sync-bot-revenue.ts
const result = await db.insert(daaf_bot_revenue_snapshots).values({
  bot_id: 1,
  bot_name: 'Bot A',
  proportional_margin_pct: 0.75 // ❌ 数据库中不存在这个列
});
// 报错：column "proportional_margin_pct" does not exist
```

### ✅ 正确做法

```bash
# ✅ 工作流：修改 schema → 推送到数据库 → 验证
# 1. 修改 schema.ts
# 2. 推送变更到数据库
npm run db:push

# ✅ 或使用 migration（推荐生产环境）
npm run db:generate  # 生成 migration
npm run db:migrate   # 应用 migration

# 3. 验证 schema 同步
npm run db:studio    # 打开 Drizzle Studio 检查
```

```typescript
// ✅ 在代码中检测 schema 不一致
import { sql } from 'drizzle-orm';

async function validateSchema(db: DB) {
  try {
    // ✅ 尝试查询新字段
    await db.select().from(daaf_bot_revenue_snapshots).limit(1);
    console.log('✅ Schema is in sync');
  } catch (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('❌ Schema is out of sync. Run `npm run db:push`');
      throw new Error('Database schema is not in sync with code');
    }
    throw error;
  }
}
```

### 🔍 关键改进

1. ✅ 修改 schema 后立即运行 `db:push`
2. ✅ 生产环境使用 migration 而非 push
3. ✅ 在 CI/CD 中验证 schema 同步
4. ✅ 使用 Drizzle Studio 可视化验证

---

## 错误 4: 时区处理不一致

### 📋 错误描述

**常见表现**:
- 每日快照时间偏差 8 小时
- 日期范围查询结果不准确
- 同一天的数据被分到不同日期

**根本原因**:
- 数据库使用 UTC，代码使用本地时间
- 没有统一时区处理
- 日期格式化时未指定时区

### ❌ 错误示例

```typescript
// ❌ 错误：使用本地时间，不指定时区
const today = new Date().toISOString().split('T')[0];
// 如果在北京时间 2024-01-15 01:00 执行
// toISOString() 返回 2024-01-14T17:00:00.000Z
// split 后得到 '2024-01-14'，比实际日期早了一天

const snapshot = await db.insert(daaf_daily_summary_snapshots).values({
  snapshot_date: today, // ❌ 时区错误
  total_cost: 1000
});
```

```sql
-- ❌ 错误：查询时不考虑时区
SELECT * FROM daaf_daily_summary_snapshots
WHERE snapshot_date = '2024-01-15'; -- ❌ 可能查不到北京时间的数据
```

### ✅ 正确做法

```typescript
// ✅ 正确：统一使用北京时间（Asia/Shanghai）
import { format, toZonedTime } from 'date-fns-tz';

function getBeijingDate(): string {
  const now = new Date();
  const beijingTime = toZonedTime(now, 'Asia/Shanghai');
  return format(beijingTime, 'yyyy-MM-dd', { timeZone: 'Asia/Shanghai' });
}

const today = getBeijingDate(); // ✅ 北京时间日期
const snapshot = await db.insert(daaf_daily_summary_snapshots).values({
  snapshot_date: today, // ✅ 正确的北京时间日期
  total_cost: 1000
});
```

```typescript
// ✅ 或在数据库查询中转换时区
import { sql } from 'drizzle-orm';

const snapshots = await db
  .select()
  .from(daaf_daily_summary_snapshots)
  .where(
    sql`DATE(snapshot_date AT TIME ZONE 'Asia/Shanghai') = ${today}`
  );
```

### 🔍 关键改进

1. ✅ 使用 `date-fns-tz` 处理时区
2. ✅ 统一使用北京时间（Asia/Shanghai）
3. ✅ 在数据库层面转换时区
4. ✅ 文档中明确说明时区约定

---

## 错误 5: Vercel Serverless 函数超时未处理

### 📋 错误描述

**常见表现**:
- Cron job 执行到一半被强制终止
- 日志显示 "Function execution timed out"
- 数据部分更新，状态不一致

**根本原因**:
- Vercel Hobby 计划函数超时 10 秒
- 长时间运行的查询没有优化
- 没有实现超时保护机制

### ❌ 错误示例

```typescript
// ❌ 错误：可能超过 10 秒的操作，没有超时保护
export default async function handler(req, res) {
  // ❌ 没有超时限制
  const bots = await db.select().from(bot); // 可能很慢

  for (const bot of bots) {
    // ❌ 顺序执行，总时间 = n × 单次时间
    const revenue = await calculateRevenue(bot.id);
    await db.insert(daaf_bot_revenue_snapshots).values({
      bot_id: bot.id,
      revenue
    });
  }

  return res.json({ success: true });
  // 如果超时，数据只部分更新
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：使用超时保护和批处理
export default async function handler(req, res) {
  const startTime = Date.now();
  const maxDuration = 8000; // ✅ 留 2 秒缓冲

  try {
    const bots = await db
      .select()
      .from(bot)
      .limit(100); // ✅ 限制批次大小

    // ✅ 并行处理，设置超时
    const revenuePromises = bots.map(bot =>
      Promise.race([
        calculateRevenue(bot.id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]).catch(error => {
        console.error(`Failed for bot ${bot.id}:`, error.message);
        return null; // 单个失败不影响其他
      })
    );

    const revenues = await Promise.all(revenuePromises);

    // ✅ 检查剩余时间
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDuration) {
      console.warn('Approaching timeout, stopping early');
      return res.status(202).json({
        success: 'partial',
        processed: revenues.filter(r => r !== null).length
      });
    }

    // ✅ 批量插入
    const validRevenues = revenues
      .map((revenue, i) => revenue ? { bot_id: bots[i].id, revenue } : null)
      .filter(Boolean);

    if (validRevenues.length > 0) {
      await db.insert(daaf_bot_revenue_snapshots).values(validRevenues);
    }

    return res.json({
      success: true,
      processed: validRevenues.length,
      duration: Date.now() - startTime
    });
  } catch (error) {
    console.error('Handler failed:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Vercel 配置**:
```json
// vercel.json - 升级到 Pro 计划可增加超时
{
  "functions": {
    "api/cron/*.ts": {
      "maxDuration": 60 // Pro 计划：最多 60 秒
    }
  }
}
```

### 🔍 关键改进

1. ✅ 设置安全的超时限制（留缓冲）
2. ✅ 使用 `Promise.race()` 为单个操作设置超时
3. ✅ 并行处理提高效率
4. ✅ 批量操作减少数据库往返
5. ✅ 监控执行时间，提前停止
6. ✅ 考虑升级 Vercel 计划延长超时

---

## 📌 总结

### 高频错误排名

1. 🔴 **SQL 未使用 CTE**（错误 1）- 性能差 3-10 倍
2. 🔴 **环境变量未配置**（错误 2）- 部署后崩溃
3. 🟡 **Schema 不同步**（错误 3）- 运行时错误
4. 🟡 **时区处理不一致**（错误 4）- 数据错误
5. 🟡 **Serverless 超时**（错误 5）- 数据不一致

### 关键预防措施

- ✅ 使用 CTE 在 JOIN 前预过滤数据
- ✅ 在 Vercel Dashboard 配置所有环境变量
- ✅ 修改 schema 后立即运行 `db:push`
- ✅ 统一使用北京时间（date-fns-tz）
- ✅ 为 Serverless 函数设置超时保护
- ✅ 使用并行处理和批量操作
- ✅ 监控函数执行时间

### 性能优化清单

- [ ] SQL 查询使用 CTE 预过滤（3-10x 提升）
- [ ] 并行执行独立操作（Promise.all）
- [ ] 批量插入减少数据库往返
- [ ] 设置合理的 LIMIT 和超时
- [ ] 使用索引优化查询
- [ ] 监控 Serverless 函数执行时间

---

**返回**: [project-errors/README.md](./README.md) | [ERROR_CATALOG.md](../ERROR_CATALOG.md)

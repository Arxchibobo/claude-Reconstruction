# SQL 优化错误

> **错误 ID**: E004 | **频率**: 中 | **严重度**: 🟡 中等

---

## 错误描述

SQL 查询未使用 CTE（Common Table Expression）预过滤数据，导致全表扫描和性能问题。

## 自检问题

- [ ] 是否用 CTE 预过滤大表？
- [ ] 避免在 JOIN 后再过滤？
- [ ] GROUP BY 中是否有重复计算？

---

## 错误案例

### 案例 1: JOIN 后过滤

```sql
-- ❌ 错误：JOIN 后再过滤，全表扫描
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2026-01-01';

-- ✅ 正确：CTE 预过滤
WITH recent_orders AS (
  SELECT user_id, total
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT u.name, ro.total
FROM users u
JOIN recent_orders ro ON u.id = ro.user_id;
```

### 案例 2: 多次使用相同子查询

```sql
-- ❌ 错误：相同子查询重复执行
SELECT
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
  (SELECT SUM(total) FROM orders WHERE user_id = u.id) as total_amount
FROM users u;

-- ✅ 正确：CTE 只计算一次
WITH user_orders AS (
  SELECT
    user_id,
    COUNT(*) as order_count,
    SUM(total) as total_amount
  FROM orders
  GROUP BY user_id
)
SELECT
  u.name,
  COALESCE(uo.order_count, 0) as order_count,
  COALESCE(uo.total_amount, 0) as total_amount
FROM users u
LEFT JOIN user_orders uo ON u.id = uo.user_id;
```

### 案例 3: 复杂聚合查询

```sql
-- ❌ 错误：在 GROUP BY 中重复计算
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM orders
WHERE created_at > '2026-01-01'
GROUP BY DATE(created_at);

-- ✅ 正确：先过滤，再聚合
WITH filtered_orders AS (
  SELECT
    DATE(created_at) as order_date,
    status
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT
  order_date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM filtered_orders
GROUP BY order_date;
```

### 案例 4: 窗口函数优化

```sql
-- ❌ 错误：多次扫描表
SELECT
  user_id,
  amount,
  (SELECT SUM(amount) FROM transactions t2
   WHERE t2.user_id = t1.user_id AND t2.id <= t1.id) as running_total
FROM transactions t1;

-- ✅ 正确：使用窗口函数
SELECT
  user_id,
  amount,
  SUM(amount) OVER (
    PARTITION BY user_id
    ORDER BY id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as running_total
FROM transactions;
```

---

## CTE 使用模式

### 模式 1: 分步过滤

```sql
-- 复杂查询分解为可读的步骤
WITH
  -- 第一步：过滤活跃用户
  active_users AS (
    SELECT id, name
    FROM users
    WHERE last_login > NOW() - INTERVAL '30 days'
  ),
  -- 第二步：计算用户订单统计
  user_stats AS (
    SELECT
      user_id,
      COUNT(*) as order_count,
      SUM(total) as total_spent
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
  )
-- 第三步：合并结果
SELECT
  au.name,
  COALESCE(us.order_count, 0) as orders,
  COALESCE(us.total_spent, 0) as spent
FROM active_users au
LEFT JOIN user_stats us ON au.id = us.user_id
ORDER BY us.total_spent DESC;
```

### 模式 2: 递归 CTE

```sql
-- 组织架构树遍历
WITH RECURSIVE org_tree AS (
  -- 基础情况：顶级管理者
  SELECT id, name, manager_id, 1 as level
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- 递归情况：下属
  SELECT e.id, e.name, e.manager_id, ot.level + 1
  FROM employees e
  JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

---

## 性能优化检查清单

### 索引检查

```sql
-- 检查查询是否使用索引
EXPLAIN ANALYZE SELECT ...;

-- 常见需要索引的列
-- 1. WHERE 子句中的列
-- 2. JOIN 条件中的列
-- 3. ORDER BY 中的列
-- 4. GROUP BY 中的列
```

### 避免的反模式

| 反模式 | 问题 | 解决方案 |
|-------|------|---------|
| `SELECT *` | 传输不必要的数据 | 只选择需要的列 |
| `WHERE column LIKE '%text%'` | 无法使用索引 | 使用全文搜索 |
| `WHERE FUNCTION(column) = value` | 无法使用索引 | 转换为范围查询 |
| `OR` 条件 | 可能导致全表扫描 | 使用 `UNION` 或 `IN` |

---

## 数据库特定优化

### PostgreSQL

```sql
-- 使用 EXPLAIN (ANALYZE, BUFFERS) 查看详细执行计划
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;

-- 使用物化 CTE（强制先执行）
WITH stats AS MATERIALIZED (
  SELECT ...
)
SELECT * FROM stats;
```

### MySQL

```sql
-- 使用 STRAIGHT_JOIN 控制连接顺序
SELECT STRAIGHT_JOIN ...;

-- 使用索引提示
SELECT * FROM orders USE INDEX (idx_created_at) WHERE ...;
```

---

## 相关错误

- [E001 异步未并行](./async-parallel.md) - 应用层优化
- [E003 错误未重新抛出](./error-handling.md) - 数据库错误处理

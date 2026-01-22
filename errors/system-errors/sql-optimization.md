# SQL 优化错误

> **错误 ID**: E004
> **频率**: 中
> **严重度**: 🟡 中等

---

## 📋 错误描述

**常见表现**:
- 查询时间过长（数十秒到数分钟）
- 数据库 CPU 占用高
- 慢查询日志警告

**根本原因**:
- 未使用 CTE 预过滤数据
- 在 `GROUP BY` 中重复计算
- JOIN 前未过滤数据

---

## ❌ 错误示例

```sql
-- ❌ 错误：未使用 CTE，重复计算
SELECT
  SUBSTRING_INDEX(u.email, '@', -1) AS domain,
  COUNT(*) AS user_count,
  SUM(t.cost) AS total_cost
FROM user u
LEFT JOIN task t ON u.id = t.user_id
WHERE u.membership = 'FREE'
  AND t.created_at >= '2024-01-01'
GROUP BY SUBSTRING_INDEX(u.email, '@', -1)  -- ❌ 重复计算
ORDER BY total_cost DESC
LIMIT 30;
-- 执行时间：60-180 秒
```

---

## ✅ 正确做法

```sql
-- ✅ 正确：使用 CTE 预过滤
WITH free_users AS (
  SELECT
    id,
    SUBSTRING_INDEX(email, '@', -1) AS domain  -- ✅ 计算一次
  FROM user
  WHERE membership = 'FREE'
),
tasks_filtered AS (
  SELECT
    user_id,
    cost
  FROM task
  WHERE created_at >= '2024-01-01'  -- ✅ JOIN 前过滤
    AND user_id IN (SELECT id FROM free_users)
)
SELECT
  fu.domain,
  COUNT(DISTINCT fu.id) AS user_count,
  SUM(tf.cost) AS total_cost
FROM free_users fu
LEFT JOIN tasks_filtered tf ON fu.id = tf.user_id
GROUP BY fu.domain  -- ✅ 直接使用预计算值
ORDER BY total_cost DESC
LIMIT 30;
-- 执行时间：15-45 秒（3-10x 更快）
```

---

## 🔍 关键改进

1. ✅ 使用 CTE 预过滤数据（减少 JOIN 数据量）
2. ✅ 在 CTE 中计算一次 domain（避免重复）
3. ✅ JOIN 前过滤 task（只处理相关数据）
4. ✅ `GROUP BY` 直接使用 CTE 列（不重复计算）

---

## 📌 自检清单

- [ ] 是否使用 CTE 预过滤数据？
- [ ] `GROUP BY` 是否避免重复计算？
- [ ] JOIN 前是否过滤数据？
- [ ] 是否有不必要的子查询？

---

## 🎯 优化技巧

1. **CTE 分层**：将复杂查询分解为多个 CTE
2. **早期过滤**：在 CTE 中尽早过滤数据
3. **避免重复计算**：在 CTE 中计算一次，后续直接使用
4. **索引优化**：为过滤条件添加索引

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

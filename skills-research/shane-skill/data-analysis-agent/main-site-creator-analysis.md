# 主站 Creator vs Non-Creator 成本分析

## 目标

分析主站用户中 Creator 和 Non-Creator 的成本分布，评估限制 Non-Creator 只能使用 Art 站的潜在节省。

通过 MCP 直接查询 `my_shell_prod` 数据库。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数    | 说明              | 默认值 |
| ------- | ----------------- | ------ |
| `days`  | 查询天数          | 14     |
| `top_n` | Top Bot 数量      | 30     |

## 数据源

- `my_shell_prod.user_energy_bot_usage_logs` - 总电量消耗表（包含主站+Art）
- `my_shell_prod.art_task` - Art任务表（仅Art消耗）
- `my_shell_prod.user_membership_info` - 用户会员信息（Creator判断）
- `my_shell_prod.bot` - Bot信息表

## 核心逻辑

### Creator 用户定义

```sql
-- Creator 用户：满足以下任一条件
SELECT DISTINCT userId as user_id
FROM user_membership_info
WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
```

**说明**：
- `genesisPasscard > 0` - 持有 Genesis Passcard
- `genesisPassCardCount > 0` - Creator 会员
- 两个条件任一满足即为 Creator

### 主站消耗计算

采用差值法按用户+Bot维度计算：

```
用户A在BotX的主站消耗 = user_energy_bot_usage_logs中的消耗 - art_task中的消耗
```

---

## Step 1: Creator vs Non-Creator 总体分布

### 查询1: 主站成本按用户类型分布

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
user_total AS (
    SELECT user_id, SUM(energy) as energy
    FROM user_energy_bot_usage_logs
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
    GROUP BY user_id
),
user_art AS (
    SELECT user_id, SUM(actual_energy_cost) as energy
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL AND status = 'done'
    GROUP BY user_id
),
main_site_by_user AS (
    SELECT
        t.user_id,
        t.energy - COALESCE(a.energy, 0) as main_energy
    FROM user_total t
    LEFT JOIN user_art a ON t.user_id = a.user_id
    WHERE t.energy - COALESCE(a.energy, 0) > 0
)
SELECT
    CASE WHEN c.user_id IS NOT NULL THEN 'Creator' ELSE 'Non-Creator' END as user_type,
    COUNT(DISTINCT m.user_id) as unique_users,
    SUM(m.main_energy) as main_site_energy,
    SUM(m.main_energy) / 100 as cost_usd,
    ROUND(SUM(m.main_energy) * 100.0 / (SELECT SUM(main_energy) FROM main_site_by_user), 2) as pct
FROM main_site_by_user m
LEFT JOIN creators c ON m.user_id = c.user_id
GROUP BY user_type
ORDER BY main_site_energy DESC;
```

**预期结果格式：**

| user_type    | unique_users | main_site_energy | cost_usd  | pct    |
| ------------ | ------------ | ---------------- | --------- | ------ |
| Non-Creator  | ~12,000      | ~606,000         | ~$6,060   | ~91.8% |
| Creator      | ~75          | ~54,000          | ~$540     | ~8.2%  |

---

## Step 2: 主站 Top Bots 分析（按用户类型）

### 查询2: Top Bots 的 Creator vs Non-Creator 分布

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
user_total AS (
    SELECT user_id, bot_id, SUM(energy) as energy
    FROM user_energy_bot_usage_logs
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
    GROUP BY user_id, bot_id
),
user_art AS (
    SELECT user_id, bot_id, SUM(actual_energy_cost) as energy
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL AND status = 'done'
    GROUP BY user_id, bot_id
),
main_site_by_user_bot AS (
    SELECT
        t.user_id,
        t.bot_id,
        t.energy - COALESCE(a.energy, 0) as main_energy
    FROM user_total t
    LEFT JOIN user_art a ON t.user_id = a.user_id AND t.bot_id = a.bot_id
    WHERE t.energy - COALESCE(a.energy, 0) > 0
)
SELECT
    m.bot_id,
    b.name as bot_name,
    SUM(m.main_energy) / 100 as total_cost_usd,
    SUM(CASE WHEN c.user_id IS NOT NULL THEN m.main_energy ELSE 0 END) / 100 as creator_cost_usd,
    SUM(CASE WHEN c.user_id IS NULL THEN m.main_energy ELSE 0 END) / 100 as non_creator_cost_usd,
    ROUND(SUM(CASE WHEN c.user_id IS NULL THEN m.main_energy ELSE 0 END) * 100.0 / SUM(m.main_energy), 1) as non_creator_pct
FROM main_site_by_user_bot m
LEFT JOIN creators c ON m.user_id = c.user_id
LEFT JOIN bot b ON m.bot_id = b.id
GROUP BY m.bot_id, b.name
ORDER BY total_cost_usd DESC
LIMIT {top_n};
```

---

## Step 3: 人均消耗分析

### 查询3: Creator vs Non-Creator 人均消耗

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
user_total AS (
    SELECT user_id, SUM(energy) as energy
    FROM user_energy_bot_usage_logs
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
    GROUP BY user_id
),
user_art AS (
    SELECT user_id, SUM(actual_energy_cost) as energy
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL AND status = 'done'
    GROUP BY user_id
),
main_site_by_user AS (
    SELECT
        t.user_id,
        t.energy - COALESCE(a.energy, 0) as main_energy
    FROM user_total t
    LEFT JOIN user_art a ON t.user_id = a.user_id
    WHERE t.energy - COALESCE(a.energy, 0) > 0
)
SELECT
    CASE WHEN c.user_id IS NOT NULL THEN 'Creator' ELSE 'Non-Creator' END as user_type,
    COUNT(DISTINCT m.user_id) as unique_users,
    SUM(m.main_energy) / 100 as total_cost_usd,
    ROUND(SUM(m.main_energy) / COUNT(DISTINCT m.user_id) / 100, 2) as avg_cost_per_user_usd,
    ROUND(SUM(m.main_energy) / COUNT(DISTINCT m.user_id) / {days} / 100, 3) as daily_avg_per_user_usd
FROM main_site_by_user m
LEFT JOIN creators c ON m.user_id = c.user_id
GROUP BY user_type;
```

**预期结果格式：**

| user_type   | unique_users | total_cost_usd | avg_cost_per_user_usd | daily_avg_per_user_usd |
| ----------- | ------------ | -------------- | --------------------- | ---------------------- |
| Creator     | 75           | $542.75        | $7.24                 | $0.52                  |
| Non-Creator | 12,337       | $6,058.93      | $0.49                 | $0.035                 |

---

## Step 4: 潜在节省分析

### 查询4: 如果限制 Non-Creator 只能用 Art

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
user_total AS (
    SELECT user_id, SUM(energy) as energy
    FROM user_energy_bot_usage_logs
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
    GROUP BY user_id
),
user_art AS (
    SELECT user_id, SUM(actual_energy_cost) as energy
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL AND status = 'done'
    GROUP BY user_id
),
main_site_by_user AS (
    SELECT
        t.user_id,
        t.energy - COALESCE(a.energy, 0) as main_energy
    FROM user_total t
    LEFT JOIN user_art a ON t.user_id = a.user_id
    WHERE t.energy - COALESCE(a.energy, 0) > 0
)
SELECT
    '现状' as scenario,
    SUM(m.main_energy) / 100 as main_site_cost_usd
FROM main_site_by_user m

UNION ALL

SELECT
    '限制后（仅Creator）' as scenario,
    SUM(CASE WHEN c.user_id IS NOT NULL THEN m.main_energy ELSE 0 END) / 100 as main_site_cost_usd
FROM main_site_by_user m
LEFT JOIN creators c ON m.user_id = c.user_id;
```

---

## 核心指标

| 指标                   | 计算方式                                        | 用途               |
| ---------------------- | ----------------------------------------------- | ------------------ |
| **Non-Creator成本占比** | Non-Creator主站成本 / 主站总成本 × 100%         | 评估限制潜在节省   |
| **Creator人均消耗**     | Creator总消耗 / Creator用户数                   | 监控付费用户价值   |
| **Top Bot集中度**       | Top 10 Bot Non-Creator成本 / 总Non-Creator成本  | 识别重点优化Bot    |

---

## 业务决策参考

### 场景分析：限制 Non-Creator 只能使用 Art

**假设**：Non-Creator 用户被限制后必须跳转到 Art 站使用

| 指标 | 当前 | 限制后 | 变化 |
|------|------|--------|------|
| 主站成本 | $6,601/14天 | $543/14天 | -91.8% |
| 节省金额 | - | $6,058/14天 | $433/天 |

**注意**：
1. Non-Creator 成本会转移到 Art 站，总成本不变
2. 需评估 Art 站是否有更好的付费转化或限制机制
3. 可能影响用户体验和留存

---

## 注意事项

1. **Creator判断准确性**：仅依赖 `user_membership_info` 表，确保该表数据完整
2. **订阅用户无法区分**：`user_subscriptions` 无法区分是主站还是Art订阅
3. **成本单位**：1 energy = $0.01 USD
4. **时间范围**：建议使用7-14天数据，太短不稳定，太长查询慢

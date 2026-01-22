# Apple 支付分析报告

## 目标

分析 Apple IAP (In-App Purchase)
支付数据，包括订单详情、产品分布、收入趋势和用户行为。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数         | 说明                       | 默认值 |
| ------------ | -------------------------- | ------ |
| `start_date` | 开始日期 (YYYY-MM-DD, UTC) | 7天前  |
| `end_date`   | 结束日期 (YYYY-MM-DD, UTC) | 今天   |

> **时区说明**: 参数使用 UTC 时间，数据库存储北京时间 (UTC+8)，SQL
> 查询会自动转换。

## 数据源

### 主表

- `my_shell_prod.apple_used_transactions` - Apple IAP 交易记录

### 表结构

| 字段             | 类型         | 说明               |
| ---------------- | ------------ | ------------------ |
| `id`             | bigint       | 主键，自增         |
| `transaction_id` | varchar(255) | Apple 交易ID，唯一 |
| `user_id`        | bigint       | 用户ID             |
| `product_id`     | varchar(255) | 产品标识           |
| `created_date`   | datetime(6)  | 交易时间           |

## 产品价格映射

| product_id                | 产品名称             | 价格 (USD) |
| ------------------------- | -------------------- | ---------- |
| `PLAYER_MONTHLY`          | 玩家月度订阅         | $6.99      |
| `PLAYER_YEARLY`           | 玩家年度订阅         | $58.99     |
| `DEVELOPER_MONTHLY`       | 开发者月度订阅       | $59.99     |
| `DEVELOPER_YEARLY`        | 开发者年度订阅       | $499.99    |
| `33OFF_DEVELOPER_MONTHLY` | 开发者月度订阅(67折) | $39.99     |
| `energy_500`              | 500能量包            | $6.99      |
| `energy_2000`             | 2000能量包           | $20.99     |

---

## Step 1: 查询总收入汇总

```sql
-- 参数为 UTC 时间，数据库为北京时间 (UTC+8)，需 +8 小时转换
SELECT
  COUNT(*) as total_transactions,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END
  ) as total_revenue_usd
FROM apple_used_transactions
WHERE created_date >= '{start_date} 08:00:00'
  AND created_date < DATE_ADD('{end_date} 08:00:00', INTERVAL 1 DAY);
```

---

## Step 2: 按产品汇总

```sql
SELECT
  product_id,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END
  ) as revenue_usd
FROM apple_used_transactions
WHERE created_date >= '{start_date} 08:00:00'
  AND created_date < DATE_ADD('{end_date} 08:00:00', INTERVAL 1 DAY)
GROUP BY product_id
ORDER BY revenue_usd DESC;
```

---

## Step 3: 每日支付详情

```sql
SELECT
  DATE(DATE_SUB(created_date, INTERVAL 8 HOUR)) as payment_date_utc,
  product_id,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END
  ) as revenue_usd
FROM apple_used_transactions
WHERE created_date >= '{start_date} 08:00:00'
  AND created_date < DATE_ADD('{end_date} 08:00:00', INTERVAL 1 DAY)
GROUP BY DATE(DATE_SUB(created_date, INTERVAL 8 HOUR)), product_id
ORDER BY payment_date_utc DESC, revenue_usd DESC;
```

---

## Step 4: 每笔订单详情

```sql
SELECT
  id,
  transaction_id,
  user_id,
  product_id,
  CASE product_id
    WHEN 'PLAYER_MONTHLY' THEN 6.99
    WHEN 'PLAYER_YEARLY' THEN 58.99
    WHEN 'DEVELOPER_MONTHLY' THEN 59.99
    WHEN 'DEVELOPER_YEARLY' THEN 499.99
    WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
    WHEN 'energy_500' THEN 6.99
    WHEN 'energy_2000' THEN 20.99
    ELSE 0
  END as price_usd,
  DATE_SUB(created_date, INTERVAL 8 HOUR) as created_date_utc
FROM apple_used_transactions
WHERE created_date >= '{start_date} 08:00:00'
  AND created_date < DATE_ADD('{end_date} 08:00:00', INTERVAL 1 DAY)
ORDER BY created_date DESC;
```

---

## Step 5: 高价值用户分析

识别多次购买的用户：

```sql
SELECT
  user_id,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT product_id) as product_types,
  GROUP_CONCAT(DISTINCT product_id) as products,
  SUM(
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END
  ) as total_spent_usd,
  DATE_SUB(MIN(created_date), INTERVAL 8 HOUR) as first_purchase_utc,
  DATE_SUB(MAX(created_date), INTERVAL 8 HOUR) as last_purchase_utc
FROM apple_used_transactions
WHERE created_date >= '{start_date} 08:00:00'
  AND created_date < DATE_ADD('{end_date} 08:00:00', INTERVAL 1 DAY)
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY total_spent_usd DESC
LIMIT 20;
```

---

## Step 6: 可视化

### 6a: 每日收入趋势折线图

使用 `mcp_mcphub_mcp-server-chart-generate_line_chart` 生成：

```json
{
  "title": "Apple IAP 每日收入趋势",
  "axisXTitle": "日期",
  "axisYTitle": "收入 (USD)",
  "data": [
    { "time": "01-01", "value": 27.96 },
    { "time": "01-02", "value": 41.94 },
    ...
  ]
}
```

### 6b: 产品收入占比饼图

使用 `mcp_mcphub_mcp-server-chart-generate_pie_chart` 生成：

```json
{
  "title": "Apple IAP 产品收入占比",
  "data": [
    { "category": "DEVELOPER_MONTHLY", "value": 959.84 },
    { "category": "PLAYER_MONTHLY", "value": 230.67 },
    { "category": "energy_500", "value": 62.91 },
    { "category": "33OFF_DEVELOPER_MONTHLY", "value": 39.99 },
    { "category": "energy_2000", "value": 20.99 }
  ]
}
```

### 6c: 每日产品分布堆叠柱状图

使用 `mcp_mcphub_mcp-server-chart-generate_bar_chart` 生成：

```json
{
  "title": "每日产品销售分布",
  "axisXTitle": "产品",
  "axisYTitle": "收入 (USD)",
  "stack": true,
  "data": [
    { "category": "01-01", "value": 20.97, "group": "PLAYER_MONTHLY" },
    { "category": "01-01", "value": 6.99, "group": "energy_500" },
    ...
  ]
}
```

---

## 输出格式

### 汇总指标

```
分析时间范围: {start_date} 至 {end_date}
总交易数: {total_transactions} 笔
独立用户数: {unique_users} 人
总收入: ${total_revenue_usd}

按产品分布:
  - DEVELOPER_MONTHLY: ${xxx} (xx.x%)
  - PLAYER_MONTHLY: ${xxx} (xx.x%)
  - energy_500: ${xxx} (xx.x%)
  - 其他: ${xxx} (xx.x%)

日均收入: ${avg_daily_revenue}
日均交易数: {avg_daily_transactions} 笔
```

### CSV 格式

```
日期,产品,交易数,用户数,收入(USD)
2026-01-07,DEVELOPER_MONTHLY,3,3,179.97
2026-01-07,energy_500,5,4,34.95
...
```

---

## 关键注意事项

1. **价格映射**: 表中没有 `price` 字段，需要通过 `product_id` 映射价格

2. **无状态字段**: `apple_used_transactions` 表没有 `status`
   字段，默认所有记录都是成功交易

3. **折扣处理**:
   - `33OFF_DEVELOPER_MONTHLY` 是预设的折扣产品 ($39.99)
   - 其他折扣码优惠不在此表体现

4. **时区**: `created_date` 存储的是北京时间 (UTC+8)，查询参数使用 UTC 时间，SQL
   会自动转换 (+8 小时)

5. **重复购买**:
   - 同一用户可能多次购买同一产品（如 energy 包）
   - 订阅产品通常每月自动续费

6. **与其他支付渠道对比**:
   - Stripe: `user_subscription_stripe_orders`
   - PayPal: `user_subscription_paypal_orders`
   - 综合分析参见 `gross-margin-analysis.md`

---

## 相关文档

- **gross-margin-analysis.md**: 整体毛利率分析，包含所有支付渠道
- **bot-margin-analysis.md**: Bot 级别毛利率分析
- **cost-trend-chart.md**: 成本趋势分析

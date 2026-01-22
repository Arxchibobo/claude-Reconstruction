# 2025年收入与订阅分析报告

## 目标

分析2025年（自art_task第一条数据起）的收入构成、Bot收入贡献、订阅复购率和用户套餐分布。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `start_date` | 开始日期 (YYYY-MM-DD) | 2025-10-15 |
| `end_date` | 结束日期 (YYYY-MM-DD) | 今天 |

**说明**: `start_date` 为 art_task 表第一条数据的日期（已查询确认为 2025-10-15）。

## 数据源

### 收入表
- `my_shell_prod.user_subscription_stripe_orders` - Stripe 订单
- `my_shell_prod.user_subscription_paypal_orders` - PayPal 订单
- `my_shell_prod.apple_used_transactions` - Apple IAP 订单
  - ⚠️ **数据起始时间**: 2025-12-17（仅有最近2周数据）
  - 2025-10-15 至 2025-12-16 期间的 Apple IAP 订单数据缺失

### 任务表
- `my_shell_prod.art_task` - 任务表，包含 bot 使用记录和成本数据

### 用户表
- `my_shell_prod.user` - 用户表，用于套餐分类

## 核心指标

1. **按月收入** = 每月总收入（Stripe + PayPal + Apple IAP）
2. **Bot收入归因** = 使用 Last-Touch 优化版归因模型分配收入到各个 bot
3. **订阅复购率** = 购买过2次及以上的用户数 / 总付费用户数 × 100%
4. **按月套餐销售统计**:
   - Basic 订单数：当月卖出的 Basic 套餐数量
   - Pro 订单数：当月卖出的 Pro/Developer 套餐数量
   - 复购订单数：用户在分析期间内有过历史订单，本月又购买的订单数
   - 升级订单数：套餐等级 > 分析期间内历史最高等级的订单数

---

## Step 1: 按月收入分析

### 查询1a: Stripe 按月收入

```sql
SELECT
  DATE_FORMAT(created_date, '%Y-%m') as revenue_month,
  SUM(amount) as stripe_revenue,
  COUNT(*) as stripe_order_count
FROM my_shell_prod.user_subscription_stripe_orders
WHERE status = 'ORDER_STATUS_SUCCESS'
  AND amount >= 0
  AND created_date >= '{start_date} 00:00:00'
  AND created_date <= '{end_date} 23:59:59'
GROUP BY DATE_FORMAT(created_date, '%Y-%m')
ORDER BY revenue_month;
```

### 查询1b: PayPal 按月收入

```sql
SELECT
  DATE_FORMAT(created_date, '%Y-%m') as revenue_month,
  SUM(
    CASE
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '500' THEN 6.99
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '2000' THEN 20.99
      ELSE amount
    END
  ) as paypal_revenue,
  COUNT(*) as paypal_order_count
FROM my_shell_prod.user_subscription_paypal_orders
WHERE status = 'ORDER_STATUS_SUCCESS'
  AND created_date >= '{start_date} 00:00:00'
  AND created_date <= '{end_date} 23:59:59'
GROUP BY DATE_FORMAT(created_date, '%Y-%m')
ORDER BY revenue_month;
```

### 查询1c: Apple IAP 按月收入

```sql
SELECT
  DATE_FORMAT(created_date, '%Y-%m') as revenue_month,
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
  ) as iap_revenue,
  COUNT(*) as iap_order_count
FROM my_shell_prod.apple_used_transactions
WHERE created_date >= '{start_date} 00:00:00'
  AND created_date <= '{end_date} 23:59:59'
GROUP BY DATE_FORMAT(created_date, '%Y-%m')
ORDER BY revenue_month;
```

**注意**:
- Apple IAP 收入按原价计算，**未计算折扣码优惠**
- ⚠️ **数据起始时间**: 2025-12-17，10月和11月的 Apple IAP 数据完全缺失
- 实际 IAP 收入可能高于统计值（折扣优惠 + 历史数据缺失）

### 数据合并

```javascript
// 伪代码：合并三个收入源
const monthlyRevenue = new Map();

for (const row of stripeData) {
  const month = row.revenue_month;
  if (!monthlyRevenue.has(month)) {
    monthlyRevenue.set(month, { stripe: 0, paypal: 0, iap: 0, total: 0 });
  }
  monthlyRevenue.get(month).stripe = parseFloat(row.stripe_revenue);
}

for (const row of paypalData) {
  const month = row.revenue_month;
  if (!monthlyRevenue.has(month)) {
    monthlyRevenue.set(month, { stripe: 0, paypal: 0, iap: 0, total: 0 });
  }
  monthlyRevenue.get(month).paypal = parseFloat(row.paypal_revenue);
}

for (const row of iapData) {
  const month = row.revenue_month;
  if (!monthlyRevenue.has(month)) {
    monthlyRevenue.set(month, { stripe: 0, paypal: 0, iap: 0, total: 0 });
  }
  monthlyRevenue.get(month).iap = parseFloat(row.iap_revenue);
}

// 计算每月总收入
for (const [month, data] of monthlyRevenue.entries()) {
  data.total = data.stripe + data.paypal + data.iap;
}
```

---

## Step 2: Bot收入归因（Last-Touch 优化版）

### 查询2: Bot收入归因（完整查询参考 bot-margin-analysis.md）

```sql
-- ====================================================================
-- Bot 收入归因查询（Last-Touch 优化版）
-- 参考: bot-margin-analysis.md Step 1
-- ====================================================================

WITH orders AS (
  -- Stripe 订单
  SELECT
    user_id,
    amount,
    created_date,
    'stripe' as source
  FROM my_shell_prod.user_subscription_stripe_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- PayPal 订单
  SELECT
    user_id,
    CASE
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '500' THEN 6.99
      WHEN biz_type = 'ENERGY' AND paypal_price_id = '2000' THEN 20.99
      ELSE amount
    END as amount,
    created_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- Apple IAP 订单
  SELECT
    user_id,
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 6.99
      WHEN 'PLAYER_YEARLY' THEN 58.99
      WHEN 'DEVELOPER_MONTHLY' THEN 59.99
      WHEN 'DEVELOPER_YEARLY' THEN 499.99
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 39.99
      WHEN 'energy_500' THEN 6.99
      WHEN 'energy_2000' THEN 20.99
      ELSE 0
    END as amount,
    created_date,
    'apple' as source
  FROM my_shell_prod.apple_used_transactions
  WHERE created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),

-- 获取任务数据（扩展时间窗口 ±7天）
tasks AS (
  SELECT
    user_id,
    slug_id,
    created_date
  FROM my_shell_prod.art_task
  WHERE status = 'done'
    AND created_date >= DATE_SUB('{start_date}', INTERVAL 7 DAY)
    AND created_date <= DATE_ADD('{end_date}', INTERVAL 7 DAY)
),

-- Last-touch 归因（订单前最后一个任务）
last_touch_before AS (
  SELECT
    user_id,
    amount,
    order_date,
    source,
    attributed_bot,
    attribution_type
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.created_date as order_date,
      o.source,
      t.slug_id as attributed_bot,
      'before' as attribution_type,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.created_date
        ORDER BY t.created_date DESC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date <= o.created_date
  ) ranked
  WHERE rn = 1
),

-- First-touch 归因（订单后第一个任务）
first_touch_after AS (
  SELECT
    user_id,
    amount,
    order_date,
    source,
    attributed_bot,
    attribution_type
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.created_date as order_date,
      o.source,
      t.slug_id as attributed_bot,
      'after' as attribution_type,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.created_date
        ORDER BY t.created_date ASC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date > o.created_date
    WHERE NOT EXISTS (
      SELECT 1
      FROM tasks t2
      WHERE t2.user_id = o.user_id
        AND t2.created_date <= o.created_date
    )
  ) ranked
  WHERE rn = 1
),

-- 合并两种归因结果
attributed_orders AS (
  SELECT * FROM last_touch_before
  UNION ALL
  SELECT * FROM first_touch_after
)

-- 按 bot 汇总归因收入
SELECT
  attributed_bot as slug_id,
  SUM(amount) as attributed_revenue,
  COUNT(*) as attributed_order_count
FROM attributed_orders
GROUP BY attributed_bot
ORDER BY attributed_revenue DESC;
```

### 查询2b: 按月按Bot收入归因（扩展版）

在上面查询的基础上，增加按月分组：

```sql
-- 在 attributed_orders 之后，增加月份字段
SELECT
  DATE_FORMAT(order_date, '%Y-%m') as revenue_month,
  attributed_bot as slug_id,
  SUM(amount) as attributed_revenue,
  COUNT(*) as attributed_order_count
FROM attributed_orders
GROUP BY DATE_FORMAT(order_date, '%Y-%m'), attributed_bot
ORDER BY revenue_month, attributed_revenue DESC;
```

---

## Step 3: 订阅复购率分析

### 查询3: 用户订单次数统计（整体）

```sql
WITH all_orders AS (
  -- Stripe 订单
  SELECT
    user_id,
    created_date,
    'stripe' as source
  FROM my_shell_prod.user_subscription_stripe_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- PayPal 订单
  SELECT
    user_id,
    created_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- Apple IAP 订单
  SELECT
    user_id,
    created_date,
    'apple' as source
  FROM my_shell_prod.apple_used_transactions
  WHERE created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),

user_purchase_counts AS (
  SELECT
    user_id,
    COUNT(*) as purchase_count
  FROM all_orders
  GROUP BY user_id
)

SELECT
  COUNT(DISTINCT user_id) as total_paying_users,
  COUNT(DISTINCT CASE WHEN purchase_count >= 2 THEN user_id END) as repeat_purchase_users,
  ROUND(
    COUNT(DISTINCT CASE WHEN purchase_count >= 2 THEN user_id END) * 100.0 /
    COUNT(DISTINCT user_id),
    2
  ) as repeat_purchase_rate
FROM user_purchase_counts;
```

### 查询3b: 购买次数分布

```sql
-- 继续使用上面的 user_purchase_counts CTE
SELECT
  purchase_count,
  COUNT(*) as user_count
FROM user_purchase_counts
GROUP BY purchase_count
ORDER BY purchase_count;
```

---

## Step 4: 按月套餐销售统计

### 套餐等级定义

| 套餐类型 | 等级 | 对应 product_id |
|---------|------|----------------|
| FREE | 0 | - |
| Basic/PLAYER | 1 | PLAYER_MONTHLY, PLAYER_YEARLY, energy_500, energy_2000 |
| Pro | 2 | - |
| Developer | 3 | DEVELOPER_MONTHLY, DEVELOPER_YEARLY, 33OFF_DEVELOPER_MONTHLY |

### 查询4: 按月套餐销售统计（含复购和升级）

```sql
-- ====================================================================
-- 按月套餐销售统计：Basic订单、Pro订单、复购订单、升级订单
-- ====================================================================

WITH all_orders AS (
  -- Stripe 订单（需要从 user 表 JOIN 获取套餐类型）
  SELECT
    o.user_id,
    o.created_date as order_date,
    u.user_membership_type,
    'stripe' as source,
    CASE
      WHEN u.user_membership_type = 'BASIC' THEN 1
      WHEN u.user_membership_type = 'PRO' THEN 2
      WHEN u.user_membership_type = 'DEVELOPER' THEN 3
      ELSE 0
    END as plan_level
  FROM my_shell_prod.user_subscription_stripe_orders o
  LEFT JOIN my_shell_prod.user u ON o.user_id = u.id
  WHERE o.status = 'ORDER_STATUS_SUCCESS'
    AND o.amount >= 0
    AND o.created_date >= '{start_date} 00:00:00'
    AND o.created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- PayPal 订单（能量包归为 Basic，订阅需要从 user 表获取）
  SELECT
    o.user_id,
    o.created_date as order_date,
    CASE
      WHEN o.biz_type = 'ENERGY' THEN 'BASIC'
      ELSE u.user_membership_type
    END as user_membership_type,
    'paypal' as source,
    CASE
      WHEN o.biz_type = 'ENERGY' THEN 1
      WHEN u.user_membership_type = 'BASIC' THEN 1
      WHEN u.user_membership_type = 'PRO' THEN 2
      WHEN u.user_membership_type = 'DEVELOPER' THEN 3
      ELSE 0
    END as plan_level
  FROM my_shell_prod.user_subscription_paypal_orders o
  LEFT JOIN my_shell_prod.user u ON o.user_id = u.id
  WHERE o.status = 'ORDER_STATUS_SUCCESS'
    AND o.created_date >= '{start_date} 00:00:00'
    AND o.created_date <= '{end_date} 23:59:59'

  UNION ALL

  -- Apple IAP 订单（从 product_id 判断套餐类型）
  SELECT
    user_id,
    created_date as order_date,
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 'BASIC'
      WHEN 'PLAYER_YEARLY' THEN 'BASIC'
      WHEN 'energy_500' THEN 'BASIC'
      WHEN 'energy_2000' THEN 'BASIC'
      WHEN 'DEVELOPER_MONTHLY' THEN 'DEVELOPER'
      WHEN 'DEVELOPER_YEARLY' THEN 'DEVELOPER'
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 'DEVELOPER'
      ELSE 'UNKNOWN'
    END as user_membership_type,
    'apple' as source,
    CASE product_id
      WHEN 'PLAYER_MONTHLY' THEN 1
      WHEN 'PLAYER_YEARLY' THEN 1
      WHEN 'energy_500' THEN 1
      WHEN 'energy_2000' THEN 1
      WHEN 'DEVELOPER_MONTHLY' THEN 3
      WHEN 'DEVELOPER_YEARLY' THEN 3
      WHEN '33OFF_DEVELOPER_MONTHLY' THEN 3
      ELSE 0
    END as plan_level
  FROM my_shell_prod.apple_used_transactions
  WHERE created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),

-- 为每个订单标记：是否复购、是否升级
order_with_flags AS (
  SELECT
    o.user_id,
    o.order_date,
    DATE_FORMAT(o.order_date, '%Y-%m') as order_month,
    o.user_membership_type,
    o.plan_level,
    o.source,
    -- 复购标记：这个订单之前有过历史订单（在分析时间范围内）
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM all_orders o2
        WHERE o2.user_id = o.user_id
          AND o2.order_date < o.order_date
      ) THEN 1
      ELSE 0
    END as is_repeat,
    -- 升级标记：本次套餐等级 > 历史最高等级（在分析时间范围内）
    CASE
      WHEN o.plan_level > COALESCE((
        SELECT MAX(o3.plan_level)
        FROM all_orders o3
        WHERE o3.user_id = o.user_id
          AND o3.order_date < o.order_date
      ), 0) THEN 1
      ELSE 0
    END as is_upgrade
  FROM all_orders o
)

-- 按月汇总统计
SELECT
  order_month,
  -- Basic 订单数
  COUNT(CASE WHEN user_membership_type = 'BASIC' THEN 1 END) as basic_orders,
  -- Pro 订单数（包含 Pro 和 Developer）
  COUNT(CASE WHEN user_membership_type IN ('PRO', 'DEVELOPER') THEN 1 END) as pro_orders,
  -- 复购订单数
  SUM(is_repeat) as repeat_orders,
  -- 升级订单数
  SUM(is_upgrade) as upgrade_orders,
  -- 总订单数
  COUNT(*) as total_orders
FROM order_with_flags
GROUP BY order_month
ORDER BY order_month;
```

**说明**:
- **复购判断**: 用户在分析时间范围内（2025-10-15之后），这笔订单之前有过订单
- **升级判断**: 本次购买的套餐等级 > 分析时间范围内历史最高套餐等级
- **套餐等级**: Basic=1, Pro=2, Developer=3
- **PayPal ENERGY 订单**: 归类为 Basic（能量包）
- **Apple IAP**: 从 product_id 判断套餐类型

---

## Step 5: 可视化

### 图表1: 按月收入趋势（堆叠面积图）

```json
{
  "title": "2025年按月收入趋势（按渠道堆叠）",
  "axisXTitle": "月份",
  "axisYTitle": "收入 (USD)",
  "stack": true,
  "data": [
    { "time": "2025-01", "value": 5000.00, "group": "Stripe" },
    { "time": "2025-01", "value": 3000.00, "group": "PayPal" },
    { "time": "2025-01", "value": 2000.00, "group": "Apple IAP（未计折扣）" },
    { "time": "2025-02", "value": 6000.00, "group": "Stripe" },
    { "time": "2025-02", "value": 3500.00, "group": "PayPal" },
    { "time": "2025-02", "value": 2500.00, "group": "Apple IAP（未计折扣）" }
  ],
  "style": {
    "palette": ["#3B82F6", "#10B981", "#F59E0B"]
  }
}
```

使用工具: `mcp__mcphub__mcp-server-chart-generate_area_chart`

### 图表2: Bot收入贡献（Top 10，柱状图）

```json
{
  "title": "Top 10 Bot收入贡献（Last-Touch优化版归因）",
  "axisXTitle": "收入 (USD)",
  "axisYTitle": "Bot",
  "data": [
    { "category": "ghibli-diffusion", "value": 15000.50 },
    { "category": "flux-dev", "value": 12000.30 },
    { "category": "sdxl-lightning", "value": 10000.00 },
    { "category": "anime-diffusion", "value": 8500.00 },
    { "category": "portrait-master", "value": 7200.00 }
  ],
  "style": {
    "palette": ["#8B5CF6"]
  }
}
```

使用工具: `mcp__mcphub__mcp-server-chart-generate_bar_chart`

### 图表3: 按月套餐销售统计（堆叠柱状图）

```json
{
  "title": "按月套餐销售统计",
  "axisXTitle": "订单数",
  "axisYTitle": "月份",
  "stack": true,
  "data": [
    { "category": "2025-10", "value": 150, "group": "Basic" },
    { "category": "2025-10", "value": 80, "group": "Pro/Developer" },
    { "category": "2025-11", "value": 200, "group": "Basic" },
    { "category": "2025-11", "value": 120, "group": "Pro/Developer" }
  ],
  "style": {
    "palette": ["#3B82F6", "#8B5CF6"]
  }
}
```

使用工具: `mcp__mcphub__mcp-server-chart-generate_bar_chart`

### 图表4: 按月复购和升级订单（折线图）

```json
{
  "title": "按月复购和升级订单趋势",
  "axisXTitle": "月份",
  "axisYTitle": "订单数",
  "data": [
    { "time": "2025-10", "value": 50, "group": "复购订单" },
    { "time": "2025-10", "value": 20, "group": "升级订单" },
    { "time": "2025-11", "value": 80, "group": "复购订单" },
    { "time": "2025-11", "value": 35, "group": "升级订单" }
  ],
  "style": {
    "palette": ["#10B981", "#F59E0B"]
  }
}
```

使用工具: `mcp__mcphub__mcp-server-chart-generate_line_chart`

---

## 输出格式

### 汇总报告

```
======================== 2025年收入分析报告 ========================
分析时间范围: {start_date} 至 {end_date}
分析周期: {days}天

======================== 收入汇总 ========================
总收入: ${total_revenue}
  - Stripe: ${total_stripe} ({stripe_pct}%)
  - PayPal: ${total_paypal} ({paypal_pct}%)
  - Apple IAP: ${total_iap} ({iap_pct}%) [未计折扣]

按月收入:
  - 2025-01: ${month_01_revenue}
  - 2025-02: ${month_02_revenue}
  - 2025-03: ${month_03_revenue}
  ...

月均收入: ${avg_monthly_revenue}
最高收入月份: {highest_month} (${highest_revenue})
最低收入月份: {lowest_month} (${lowest_revenue})

======================== Bot收入贡献（Top 10）========================
1. {bot_1_name} ({bot_1_slug}): ${bot_1_revenue} ({bot_1_pct}%)
2. {bot_2_name} ({bot_2_slug}): ${bot_2_revenue} ({bot_2_pct}%)
3. {bot_3_name} ({bot_3_slug}): ${bot_3_revenue} ({bot_3_pct}%)
...

归因说明: 使用 Last-Touch 优化版归因模型（±7天窗口）
归因覆盖率: {coverage_rate}%
未归因收入: ${unattributed_revenue} ({unattributed_pct}%)

======================== 订阅复购分析 ========================
总付费用户数: {total_paying_users}
复购用户数: {repeat_purchase_users}
订阅复购率: {repeat_purchase_rate}%

购买次数分布:
  - 1次: {count_1} 用户 ({pct_1}%)
  - 2次: {count_2} 用户 ({pct_2}%)
  - 3次: {count_3} 用户 ({pct_3}%)
  - 4次及以上: {count_4plus} 用户 ({pct_4plus}%)

======================== 按月套餐销售统计 ========================
{month} 月:
  - Basic 订单: {basic_orders}
  - Pro/Developer 订单: {pro_orders}
  - 复购订单: {repeat_orders} ({repeat_pct}%)
  - 升级订单: {upgrade_orders} ({upgrade_pct}%)
  - 总订单: {total_orders}

[重复显示每个月的数据...]

总计（全周期）:
  - Basic 订单: {total_basic_orders}
  - Pro/Developer 订单: {total_pro_orders}
  - 复购订单: {total_repeat_orders} ({total_repeat_pct}%)
  - 升级订单: {total_upgrade_orders} ({total_upgrade_pct}%)

======================== 关键洞察 ========================
1. 收入增长趋势: [上升/平稳/下降]
2. 主力渠道: [Stripe/PayPal/Apple IAP]
3. Top 3 Bot贡献了 {top3_pct}% 的归因收入
4. 复购率 {repeat_rate}% [高于/低于]行业平均水平
5. [Basic/Pro] 套餐用户占比最高
```

### CSV 导出格式

#### 按月收入

```csv
月份,Stripe收入,PayPal收入,IAP收入,总收入
2025-10,5000.00,3000.00,2000.00,10000.00
2025-11,6000.00,3500.00,2500.00,12000.00
2025-12,7000.00,4000.00,3000.00,14000.00
```

#### Bot收入贡献

```csv
Bot Slug,Bot名称,归因收入,归因订单数,收入占比(%)
ghibli-diffusion,Ghibli Diffusion,15000.50,500,18.5
flux-dev,Flux Dev,12000.30,400,14.8
```

#### 按月套餐销售统计

```csv
月份,Basic订单,Pro订单,复购订单,升级订单,总订单
2025-10,150,80,50,20,230
2025-11,200,120,80,35,320
2025-12,250,150,100,45,400
```

---

## 关键注意事项

1. **时间范围**:
   - 起始日期为 2025-10-15（`art_task` 表第一条数据的日期）
   - 结束日期为今天
   - 确保所有查询使用一致的时间范围

2. **Apple IAP 收入**:
   - 按原价计算，**未计算折扣码优惠**
   - ⚠️ **数据完整性问题**: `apple_used_transactions` 表从 2025-12-17 开始有数据
   - **影响范围**: 2025-10 和 2025-11 月的 Apple IAP 收入为 0（数据缺失，非真实值）
   - 实际 IAP 收入可能高于统计值（折扣优惠 + 历史数据缺失）
   - 图表中应标注此说明

3. **Bot收入归因**:
   - 使用 Last-Touch 优化版归因模型
   - 任务窗口扩展 ±7天（订单前7天 + 订单后7天）
   - 预期归因覆盖率: 70-80%
   - 未归因订单为正常现象（20-30%）

4. **订阅复购率定义**:
   - 分析时间范围内（2025-10-15之后）购买过2次及以上的用户比例
   - 不区分续费 vs 追加购买
   - 包含所有渠道（Stripe + PayPal + Apple IAP）

5. **按月套餐销售统计**:
   - **Basic 订单**: 包含 PLAYER 套餐和能量包（energy_500, energy_2000）
   - **Pro 订单**: 包含 Pro 和 Developer 套餐
   - **复购判断**: 用户在分析时间范围内（2025-10-15之后），这笔订单之前有过订单
   - **升级判断**: 本次购买的套餐等级 > 分析时间范围内历史最高套餐等级
   - **套餐等级**: Basic=1, Pro=2, Developer=3

6. **套餐类型识别**:
   - Stripe 订单：从 `user.user_membership_type` 获取
   - PayPal 订单：`biz_type='ENERGY'` 为 Basic，其他从 `user.user_membership_type` 获取
   - Apple IAP 订单：从 `product_id` 判断（PLAYER/energy 为 Basic，DEVELOPER 为 Developer）

7. **数据质量**:
   - PayPal ENERGY 订单需特殊处理价格（500→$6.99, 2000→$20.99）
   - 排除测试订单和退款
   - 确认时区一致性（Asia/Shanghai）

8. **性能优化**:
   - Bot归因查询使用 SQL 层归因（参考 bot-margin-analysis.md）
   - 避免传输百万级任务数据
   - 预计查询时间: 15-45秒

---

## 相关文档

- **gross-margin-analysis.md**: 整体毛利率分析
- **bot-margin-analysis.md**: Bot 级别毛利率分析（包含归因模型详解）
- **cost-trend-chart.md**: 成本趋势分析

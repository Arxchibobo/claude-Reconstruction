# Bot 收入与成本趋势分析（按天/按周）

## 目标

通过 MCP 直接查询 `my_shell_prod` 数据库，生成指定 bot(s) 的归因收入与成本趋势对比图，支持按天和按周两种粒度。同时展示任务数量趋势，帮助理解成本变化的驱动因素。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `slug_ids` | Bot slug ID 列表（逗号分隔） | 无（必填） |
| `start_date` | 开始日期 (YYYY-MM-DD) | Bot 第一个任务日期 |
| `end_date` | 结束日期 (YYYY-MM-DD) | 昨天 |
| `granularity` | 时间粒度：`daily`（按天）或 `weekly`（按周） | `daily` |

## 数据源

- `my_shell_prod.user_subscription_stripe_orders` - Stripe 订单
- `my_shell_prod.user_subscription_paypal_orders` - PayPal 订单
- `my_shell_prod.art_task` - 任务表（用于归因和成本计算）

## 归因模型：Last-Touch Optimized

使用 **Last-Touch Optimized** 归因模型，结合订单前后 ±7 天窗口：

### 归因窗口

- **订单窗口**: `start_date 00:00:00` 到 `end_date 23:59:59`
- **任务窗口**: `start_date - 7天` 到 `end_date + 7天`

### 归因逻辑

1. **Last-Touch Before（订单前归因）**: 订单下单前最后一个使用的 bot
2. **First-Touch After（订单后归因）**: 如果订单前无任务，则归因给订单后第一个使用的 bot

### 关键原则

**⚠️ 重要**: 在查询归因时，**不要在 tasks CTE 中预先过滤 slug_id**。必须让所有 bot 参与归因竞争，每个订单只归因给一个 bot（last-touch-before 或 first-touch-after）。

错误示例：
```sql
tasks AS (
  SELECT user_id, slug_id, created_date
  FROM art_task
  WHERE slug_id = 'target-bot'  -- ❌ 错误：会导致高估收入
)
```

正确示例：
```sql
tasks AS (
  SELECT user_id, slug_id, created_date
  FROM art_task  -- ✓ 正确：不过滤，让所有 bot 竞争归因
  WHERE status = 'done'
    AND created_date >= DATE_SUB('{start_date}', INTERVAL 7 DAY)
    AND created_date <= DATE_ADD('{end_date}', INTERVAL 7 DAY)
)
```

---

## Step 0: 查询 Bot 首次任务日期（如未指定 start_date）

如果用户没有指定 `start_date`，先查询每个 bot 的第一个任务日期：

```sql
SELECT
  slug_id,
  MIN(created_date) as first_task_date,
  DATE(MIN(created_date)) as start_date,
  COUNT(*) as total_tasks
FROM my_shell_prod.art_task
WHERE slug_id IN ('{slug_id_1}', '{slug_id_2}', ...)
GROUP BY slug_id
ORDER BY first_task_date;
```

---

## Step 1: 查询归因收入（按天或按周）

对**每个 bot** 分别执行以下查询。

**⚠️ 注意**: 必须使用完整的归因逻辑，不在 tasks CTE 中过滤 bot。

### 选项 A: 按天分组 (granularity = 'daily')

```sql
WITH orders AS (
  -- Stripe 订单 (金额已经是美元)
  SELECT
    user_id,
    amount,
    created_date as order_date,
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
    amount,
    created_date as order_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),
tasks AS (
  -- ✓ 关键：不过滤 slug_id，让所有 bot 参与归因竞争
  SELECT
    user_id,
    slug_id,
    created_date
  FROM my_shell_prod.art_task
  WHERE status = 'done'
    AND created_date >= DATE_SUB('{start_date}', INTERVAL 7 DAY)
    AND created_date <= DATE_ADD('{end_date}', INTERVAL 7 DAY)
),
-- Last touch before order (订单前最后一个任务)
last_touch_before AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date DESC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date <= o.order_date
  ) ranked
  WHERE rn = 1
),
-- First touch after order (订单后第一个任务)
first_touch_after AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date ASC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date > o.order_date
    LEFT JOIN last_touch_before ltb
      ON o.user_id = ltb.user_id
      AND o.order_date = ltb.order_date
      AND o.source = ltb.source
    WHERE ltb.user_id IS NULL
  ) ranked
  WHERE rn = 1
),
-- 合并归因
attributed_orders AS (
  SELECT user_id, amount, order_date, attributed_bot, source, 'before' as attribution_type
  FROM last_touch_before
  UNION ALL
  SELECT user_id, amount, order_date, attributed_bot, source, 'after' as attribution_type
  FROM first_touch_after
)
-- 按日期汇总当前 bot 的归因收入
SELECT
  DATE(order_date) as date,
  ROUND(SUM(amount), 2) as daily_revenue,
  COUNT(*) as order_count
FROM attributed_orders
WHERE attributed_bot = '{target_slug_id}'  -- 在最后过滤目标 bot
GROUP BY DATE(order_date)
ORDER BY date;
```

### 选项 B: 按周分组 (granularity = 'weekly')

使用相同的归因逻辑，但按周汇总：

```sql
WITH orders AS (
  -- Stripe 订单 (金额已经是美元)
  SELECT
    user_id,
    amount,
    created_date as order_date,
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
    amount,
    created_date as order_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),
tasks AS (
  -- ✓ 关键：不过滤 slug_id，让所有 bot 参与归因竞争
  SELECT
    user_id,
    slug_id,
    created_date
  FROM my_shell_prod.art_task
  WHERE status = 'done'
    AND created_date >= DATE_SUB('{start_date}', INTERVAL 7 DAY)
    AND created_date <= DATE_ADD('{end_date}', INTERVAL 7 DAY)
),
-- Last touch before order (订单前最后一个任务)
last_touch_before AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date DESC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date <= o.order_date
  ) ranked
  WHERE rn = 1
),
-- First touch after order (订单后第一个任务)
first_touch_after AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date ASC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date > o.order_date
    LEFT JOIN last_touch_before ltb
      ON o.user_id = ltb.user_id
      AND o.order_date = ltb.order_date
      AND o.source = ltb.source
    WHERE ltb.user_id IS NULL
  ) ranked
  WHERE rn = 1
),
-- 合并归因
attributed_orders AS (
  SELECT user_id, amount, order_date, attributed_bot, source, 'before' as attribution_type
  FROM last_touch_before
  UNION ALL
  SELECT user_id, amount, order_date, attributed_bot, source, 'after' as attribution_type
  FROM first_touch_after
)
-- 按周汇总当前 bot 的归因收入
SELECT
  DATE_FORMAT(order_date, '%Y-%u') as week,  -- 年份-周数
  DATE(DATE_SUB(order_date, INTERVAL WEEKDAY(order_date) DAY)) as week_start,  -- 周一日期
  ROUND(SUM(amount), 2) as weekly_revenue,
  COUNT(*) as order_count
FROM attributed_orders
WHERE attributed_bot = '{target_slug_id}'  -- 在最后过滤目标 bot
GROUP BY DATE_FORMAT(order_date, '%Y-%u'), DATE(DATE_SUB(order_date, INTERVAL WEEKDAY(order_date) DAY))
ORDER BY week;
```

---

## Step 1.5: 查询收入明细（可选）

如需查看具体订单明细（每一笔收入），可执行以下查询：

```sql
WITH orders AS (
  -- Stripe 订单
  SELECT
    user_id,
    amount,
    created_date as order_date,
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
    amount,
    created_date as order_date,
    'paypal' as source
  FROM my_shell_prod.user_subscription_paypal_orders
  WHERE status = 'ORDER_STATUS_SUCCESS'
    AND amount >= 0
    AND created_date >= '{start_date} 00:00:00'
    AND created_date <= '{end_date} 23:59:59'
),
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
last_touch_before AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date DESC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date <= o.order_date
  ) ranked
  WHERE rn = 1
),
first_touch_after AS (
  SELECT
    user_id,
    amount,
    order_date,
    attributed_bot,
    source
  FROM (
    SELECT
      o.user_id,
      o.amount,
      o.order_date,
      o.source,
      t.slug_id as attributed_bot,
      ROW_NUMBER() OVER (
        PARTITION BY o.user_id, o.order_date, o.source
        ORDER BY t.created_date ASC
      ) as rn
    FROM orders o
    INNER JOIN tasks t
      ON o.user_id = t.user_id
      AND t.created_date > o.order_date
    LEFT JOIN last_touch_before ltb
      ON o.user_id = ltb.user_id
      AND o.order_date = ltb.order_date
      AND o.source = ltb.source
    WHERE ltb.user_id IS NULL
  ) ranked
  WHERE rn = 1
),
attributed_orders AS (
  SELECT user_id, amount, order_date, attributed_bot, source, 'before' as attribution_type
  FROM last_touch_before
  UNION ALL
  SELECT user_id, amount, order_date, attributed_bot, source, 'after' as attribution_type
  FROM first_touch_after
)
-- 每一笔收入明细
SELECT
  order_date,
  DATE(order_date) as date,
  user_id,
  ROUND(amount, 2) as amount,
  source,
  attribution_type
FROM attributed_orders
WHERE attributed_bot = '{target_slug_id}'
ORDER BY order_date DESC;
```

**返回字段说明**:
- `order_date`: 订单完整时间戳
- `date`: 订单日期（用于分组统计）
- `user_id`: 用户 ID
- `amount`: 订单金额（美元）
- `source`: 订单来源（`stripe` 或 `paypal`）
- `attribution_type`: 归因类型（`before` = 订单前最后一次使用，`after` = 订单后首次使用）

---

## Step 2: 查询成本与任务数量（按天或按周）

对**每个 bot** 分别查询其成本和任务数量。

**💡 关键洞察**: 成本变化主要由任务数量驱动，因此任务数量是理解成本波动的关键指标。

### 选项 A: 按天分组 (granularity = 'daily')

```sql
SELECT
  DATE(created_date) as date,
  ROUND(SUM(actual_energy_cost) / 100, 2) as daily_cost,
  COUNT(*) as task_count,
  ROUND(AVG(actual_energy_cost) / 100, 4) as avg_cost_per_task
FROM my_shell_prod.art_task
WHERE status IN ('done', 'cancel')
  AND created_date >= '{start_date} 00:00:00'
  AND created_date <= '{end_date} 23:59:59'
  AND slug_id = '{target_slug_id}'
GROUP BY DATE(created_date)
ORDER BY date;
```

### 选项 B: 按周分组 (granularity = 'weekly')

```sql
SELECT
  DATE_FORMAT(created_date, '%Y-%u') as week,  -- 年份-周数
  DATE(DATE_SUB(created_date, INTERVAL WEEKDAY(created_date) DAY)) as week_start,  -- 周一日期
  ROUND(SUM(actual_energy_cost) / 100, 2) as weekly_cost,
  COUNT(*) as task_count,
  ROUND(AVG(actual_energy_cost) / 100, 4) as avg_cost_per_task
FROM my_shell_prod.art_task
WHERE status IN ('done', 'cancel')
  AND created_date >= '{start_date} 00:00:00'
  AND created_date <= '{end_date} 23:59:59'
  AND slug_id = '{target_slug_id}'
GROUP BY DATE_FORMAT(created_date, '%Y-%u'), DATE(DATE_SUB(created_date, INTERVAL WEEKDAY(created_date) DAY))
ORDER BY week;
```

**注意**:
- 成本包含 `done` 和 `cancel` 状态的任务（取消的任务仍产生成本）
- 成本单位：`actual_energy_cost` 是分（cents），除以 100 转为美元
- `task_count` 显示任务数量，这是成本变化的主要驱动因素
- `avg_cost_per_task` 显示单任务平均成本，用于识别定价变化

---

## Step 3: 合并数据

将每个 bot 的收入和成本数据按日期/周 `LEFT JOIN` 合并：

### 按天合并 (granularity = 'daily')

```javascript
// 伪代码
const mergedData = [];
const allDates = new Set([
  ...revenueData.map(r => r.date),
  ...costData.map(c => c.date)
]);

for (const date of Array.from(allDates).sort()) {
  const revenueRow = revenueData.find(r => r.date === date);
  const costRow = costData.find(c => c.date === date);

  mergedData.push({
    date,
    revenue: revenueRow?.daily_revenue || 0,
    cost: costRow?.daily_cost || 0,
    order_count: revenueRow?.order_count || 0,
    task_count: costRow?.task_count || 0,
    avg_cost_per_task: costRow?.avg_cost_per_task || 0
  });
}
```

### 按周合并 (granularity = 'weekly')

```javascript
// 伪代码
const mergedData = [];
const allWeeks = new Set([
  ...revenueData.map(r => r.week_start),
  ...costData.map(c => c.week_start)
]);

for (const week_start of Array.from(allWeeks).sort()) {
  const revenueRow = revenueData.find(r => r.week_start === week_start);
  const costRow = costData.find(c => c.week_start === week_start);

  mergedData.push({
    week_start,
    revenue: revenueRow?.weekly_revenue || 0,
    cost: costRow?.weekly_cost || 0,
    order_count: revenueRow?.order_count || 0,
    task_count: costRow?.task_count || 0,
    avg_cost_per_task: costRow?.avg_cost_per_task || 0
  });
}
```

---

## Step 4: 生成图表

为**每个 bot** 生成两张图表：
1. **收入与成本对比图** - 展示收入和成本的金额对比
2. **任务数量趋势图** - 展示任务数量变化（成本驱动因素）

### 图表 1: 收入与成本对比

使用 `mcp_mcphub_mcp-server-chart-generate_line_chart`：

#### 按天 (granularity = 'daily')

```json
{
  "title": "{bot_name} 每日收入与成本趋势",
  "axisXTitle": "日期",
  "axisYTitle": "金额 (USD)",
  "width": 1000,
  "height": 500,
  "data": [
    { "time": "11-26", "value": 0, "group": "收入" },
    { "time": "11-27", "value": 13.98, "group": "收入" },
    { "time": "11-28", "value": 105.97, "group": "收入" },
    ...
    { "time": "11-26", "value": 0, "group": "成本" },
    { "time": "11-27", "value": 0, "group": "成本" },
    { "time": "11-28", "value": 0, "group": "成本" },
    ...
  ],
  "style": {
    "palette": ["#1890ff", "#f5222d"],
    "lineWidth": 2
  }
}
```

**数据转换**:

```javascript
// 伪代码 - 按天
const chartData = [];
for (const row of mergedData) {
  const dateStr = row.date.slice(5); // "2025-12-19" → "12-19"
  chartData.push({ time: dateStr, value: row.revenue, group: "收入" });
  chartData.push({ time: dateStr, value: row.cost, group: "成本" });
}
```

#### 按周 (granularity = 'weekly')

```json
{
  "title": "{bot_name} 每周收入与成本趋势",
  "axisXTitle": "周",
  "axisYTitle": "金额 (USD)",
  "width": 1000,
  "height": 500,
  "data": [
    { "time": "W47", "value": 0, "group": "收入" },
    { "time": "W48", "value": 153.98, "group": "收入" },
    ...
    { "time": "W47", "value": 0, "group": "成本" },
    { "time": "W48", "value": 120.50, "group": "成本" },
    ...
  ],
  "style": {
    "palette": ["#1890ff", "#f5222d"],
    "lineWidth": 2
  }
}
```

**数据转换**:

```javascript
// 伪代码 - 按周
const chartData = [];
for (const row of mergedData) {
  const weekNum = row.week_start.slice(5, 10); // "2025-11-18" → "11-18" 或格式化为 "W47"
  chartData.push({ time: weekNum, value: row.revenue, group: "收入" });
  chartData.push({ time: weekNum, value: row.cost, group: "成本" });
}
```

### 图表 2: 任务数量趋势

使用 `mcp_mcphub_mcp-server-chart-generate_line_chart`：

#### 按天 (granularity = 'daily')

```json
{
  "title": "{bot_name} 每日任务数量趋势",
  "axisXTitle": "日期",
  "axisYTitle": "任务数量",
  "width": 1000,
  "height": 400,
  "data": [
    { "time": "11-26", "value": 0 },
    { "time": "11-27", "value": 1250 },
    { "time": "11-28", "value": 3420 },
    ...
  ],
  "style": {
    "palette": ["#52c41a"],
    "lineWidth": 2
  }
}
```

**数据转换**:

```javascript
// 伪代码 - 按天
const taskChartData = [];
for (const row of mergedData) {
  const dateStr = row.date.slice(5);
  taskChartData.push({ time: dateStr, value: row.task_count });
}
```

#### 按周 (granularity = 'weekly')

```json
{
  "title": "{bot_name} 每周任务数量趋势",
  "axisXTitle": "周",
  "axisYTitle": "任务数量",
  "width": 1000,
  "height": 400,
  "data": [
    { "time": "W47", "value": 0 },
    { "time": "W48", "value": 15680 },
    ...
  ],
  "style": {
    "palette": ["#52c41a"],
    "lineWidth": 2
  }
}
```

**数据转换**:

```javascript
// 伪代码 - 按周
const taskChartData = [];
for (const row of mergedData) {
  const weekNum = row.week_start.slice(5, 10);
  taskChartData.push({ time: weekNum, value: row.task_count });
}
```

---

## 颜色配置

### 单个 Bot

| 线条 | 颜色 | 说明 |
|------|------|------|
| 收入 | `#1890ff` (蓝色) | 归因收入 |
| 成本 | `#f5222d` (红色) | 实际成本 |

### 多个 Bot（如需对比）

可为每个 bot 使用不同配色方案：

| Bot | 收入颜色 | 成本颜色 |
|-----|----------|----------|
| Bot A | `#1890ff` (蓝色) | `#f5222d` (红色) |
| Bot B | `#52c41a` (绿色) | `#fa8c16` (橙色) |
| Bot C | `#722ed1` (紫色) | `#eb2f96` (粉色) |

---

## 输出示例

### 按天分析示例 (granularity = 'daily')

```
## undress-generator 每日收入与成本趋势 (2025-11-26 至 2025-12-31)

### 图表 1: 收入与成本对比

![undress-generator 收入成本趋势图](...)

### 图表 2: 任务数量趋势

![undress-generator 任务数量趋势图](...)

**汇总数据**:
- 总收入: $4,287.12 (207 订单)
- 总成本: $4,408.54 (51,203 任务)
- 平均单任务成本: $0.0861
- 总毛利润: $-121.42
- 总毛利率: -2.83%

**关键发现**:
- 12-17 之前成本接近 $0，几乎纯利润
- 12-17 成本开始激增，从 $0 跳升到 $188.81（任务数: 2,193）
- 12-18 出现最大成本峰值 $528.90（任务数: 6,142），而收入仅 $55.59
- 12-27 出现最大收入峰值 $401.92（订单数: 19）
- **任务数量驱动成本**: 成本峰值对应任务数量激增，单任务成本相对稳定

**收入明细（最近 10 笔订单）**:
| 订单时间 | 用户ID | 金额 | 来源 | 归因类型 |
|----------|--------|------|------|----------|
| 2025-12-27 23:45:12 | user_abc123 | $13.99 | stripe | before |
| 2025-12-27 22:18:34 | user_def456 | $19.99 | stripe | before |
| 2025-12-27 20:05:21 | user_ghi789 | $27.99 | paypal | after |
| 2025-12-27 18:32:45 | user_jkl012 | $13.99 | stripe | before |
| 2025-12-26 23:12:08 | user_mno345 | $13.99 | stripe | before |
| 2025-12-26 21:45:33 | user_pqr678 | $19.99 | paypal | before |
| 2025-12-26 19:28:17 | user_stu901 | $13.99 | stripe | after |
| 2025-12-25 22:56:42 | user_vwx234 | $27.99 | stripe | before |
| 2025-12-25 20:14:19 | user_yza567 | $13.99 | stripe | before |
| 2025-12-25 18:03:55 | user_bcd890 | $19.99 | paypal | before |

**归因类型说明**:
- `before`: 订单前最后一次使用该 bot（用户先试用后购买）
- `after`: 订单后首次使用该 bot（用户先购买后使用）
```

### 按周分析示例 (granularity = 'weekly')

```
## undress-generator 每周收入与成本趋势 (2025-11-26 至 2025-12-31)

### 图表 1: 收入与成本对比

![undress-generator 周收入成本趋势图](...)

### 图表 2: 任务数量趋势

![undress-generator 周任务数量趋势图](...)

**汇总数据**:
- 总收入: $4,287.12 (207 订单)
- 总成本: $4,408.54 (51,203 任务)
- 平均单任务成本: $0.0861
- 总毛利润: $-121.42
- 总毛利率: -2.83%

**按周统计**:
| 周 | 订单数 | 收入 | 任务数 | 成本 | 毛利润 | 毛利率 |
|----|--------|------|--------|------|--------|--------|
| W48 (11-25) | 15 | $423.83 | 2,145 | $0.00 | $423.83 | 100.00% |
| W49 (12-02) | 42 | $891.56 | 8,942 | $123.45 | $768.11 | 86.15% |
| W50 (12-09) | 58 | $1,234.67 | 15,234 | $1,345.23 | $-110.56 | -8.96% |
| W51 (12-16) | 52 | $1,089.34 | 14,567 | $1,567.89 | $-478.55 | -43.93% |
| W52 (12-23) | 40 | $647.72 | 10,315 | $1,371.97 | $-724.25 | -111.82% |

**关键发现**:
- **W48**: 成本为 $0，纯利润周
- **W49**: 成本开始产生，但毛利率仍高达 86.15%
- **W50-W52**: 毛利率转负，任务数量激增但收入增长放缓
- **任务数量趋势**: W49 后任务数持续在 10k-15k 区间，成本压力显著
```

---

## 常见问题

### Q1: 为什么我的收入数据和系统不一致？

**A**: 最常见原因是在 `tasks` CTE 中预先过滤了 `slug_id`。这会导致：
- 只看到使用过该 bot 的用户
- 忽略这些用户也可能使用过其他 bot
- 高估归因收入（把本应归因给其他 bot 的订单也算进来）

**解决方案**: 在 `tasks` CTE 中**不过滤 slug_id**，让所有 bot 参与归因竞争，最后在 `WHERE attributed_bot = '{target_slug_id}'` 处过滤。

### Q2: 收入和成本日期为什么不完全对齐？

**A**: 这是正常的：
- **收入**: 按订单下单日期（`order_date`）分组
- **成本**: 按任务创建日期（`created_date`）分组
- 用户可能在某天使用 bot（产生成本），但订单在其他日期

### Q3: 成本为什么突然从 $0 跳升？

**A**: 可能原因：
1. 计费系统在某个日期启用
2. `actual_energy_cost` 字段开始记录
3. 基础设施成本分摊规则变更

查看系统级成本趋势以确认是个别 bot 还是全局变化。

### Q4: 归因覆盖率是什么？

**A**: 归因覆盖率 = 被归因的订单数 / 总订单数 × 100%

期望值：70-80%。如果低于 60%，说明很多用户下单前后 ±7 天内没有使用任何 bot。

---

## 使用示例

### 示例 1: 按天分析单个 bot（默认）

```
分析 undress-generator 从上线至今的每日收入成本趋势，使用 bot-revenue-cost-trend.md
```

参数:
- `slug_ids`: `undress-generator`
- `granularity`: `daily` (默认)

### 示例 2: 按周分析单个 bot

```
分析 undress-generator 从上线至今的每周收入成本趋势，按周汇总，使用 bot-revenue-cost-trend.md
```

参数:
- `slug_ids`: `undress-generator`
- `granularity`: `weekly`

### 示例 3: 分析多个 bot（按天）

```
分析 undress-generator 和 breast-expansion 的每日收入成本趋势，
从各自首次任务日期开始，使用 bot-revenue-cost-trend.md
```

参数:
- `slug_ids`: `undress-generator,breast-expansion`
- `granularity`: `daily`

### 示例 4: 指定日期范围（按周）

```
分析 ai-blowjob 在 2025-12-01 至 2025-12-31 的每周收入成本趋势，
使用 bot-revenue-cost-trend.md
```

参数:
- `slug_ids`: `ai-blowjob`
- `start_date`: `2025-12-01`
- `end_date`: `2025-12-31`
- `granularity`: `weekly`

### 示例 5: 查看收入明细

```
分析 undress-generator 最近 7 天的每日收入成本趋势，
并列出收入明细订单，使用 bot-revenue-cost-trend.md
```

参数:
- `slug_ids`: `undress-generator`
- `start_date`: `2025-12-24`
- `end_date`: `2025-12-31`
- `granularity`: `daily`
- 执行 Step 1.5 查看收入明细

# Bot收入归因分析模板

## 目标

分析各Bot的收入贡献和毛利率表现，识别高价值Bot和优化机会。

## 参数

- **时间范围**: 过去7天/30天
- **归因模型**: Last Touch Optimized（推荐，覆盖率70-80%）
- **最小任务数**: 10（过滤低流量Bot）

## 数据源

**PostgreSQL表**（Vercel Functions自动生成）:
- `daaf_bot_revenue_snapshots` - Bot级别归因数据
- `daaf_daily_summary_snapshots` - 每日汇总数据

## Step 1: 获取Top Bot（按毛利额排序）

```sql
-- 使用Last Touch Optimized模型
WITH bot_metrics AS (
  SELECT
    bot_id,
    bot_name,
    SUM(task_count) as total_tasks,
    SUM(last_touch_opt_revenue_usd) as revenue_usd,
    SUM(total_cost_usd) as cost_usd,
    SUM(last_touch_opt_revenue_usd) - SUM(total_cost_usd) as margin_usd,
    SUM(last_touch_opt_order_count) as order_count,
    CASE
      WHEN SUM(last_touch_opt_revenue_usd) > 0
      THEN ((SUM(last_touch_opt_revenue_usd) - SUM(total_cost_usd)) / SUM(last_touch_opt_revenue_usd)) * 100
      ELSE NULL
    END as margin_pct
  FROM daaf_bot_revenue_snapshots
  WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY bot_id, bot_name
  HAVING SUM(task_count) >= 10  -- 至少10个任务
)
SELECT
  bot_id,
  bot_name,
  total_tasks,
  ROUND(revenue_usd::numeric, 2) as revenue_usd,
  ROUND(cost_usd::numeric, 2) as cost_usd,
  ROUND(margin_usd::numeric, 2) as margin_usd,
  ROUND(margin_pct::numeric, 2) as margin_pct,
  order_count
FROM bot_metrics
ORDER BY margin_usd DESC
LIMIT 20;
```

**预期输出**:
```
| bot_id     | bot_name           | total_tasks | revenue | cost  | margin | margin_pct | orders |
|------------|--------------------|-------------|---------|-------|--------|------------|--------|
| 1747502172 | Ultra Head Swap    | 229         | 487.30  | 4.58  | 482.72 | 99.06      | 24     |
| 1764937942 | AI Nude Generator  | 432         | 421.80  | 8.64  | 413.16 | 97.95      | 21     |
| 1764754691 | Face Swap Porn     | 526         | 398.50  | 10.52 | 387.98 | 97.36      | 19     |
```

## Step 2: 识别负毛利Bot

```sql
-- 找出成本大于收入的Bot
SELECT
  bot_id,
  bot_name,
  SUM(task_count) as total_tasks,
  SUM(last_touch_opt_revenue_usd) as revenue_usd,
  SUM(total_cost_usd) as cost_usd,
  SUM(total_cost_usd) - SUM(last_touch_opt_revenue_usd) as loss_usd
FROM daaf_bot_revenue_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY bot_id, bot_name
HAVING SUM(total_cost_usd) > SUM(last_touch_opt_revenue_usd)
  AND SUM(task_count) >= 10
ORDER BY loss_usd DESC
LIMIT 10;
```

**行动建议**:
- 评估是否需要调整定价
- 考虑限制免费用户使用
- 优化Bot算法降低成本

## Step 3: 归因覆盖率分析

```sql
-- 查看每日归因覆盖率趋势
SELECT
  snapshot_date,
  order_count,
  attributed_order_count,
  ROUND(attribution_coverage_pct::numeric, 2) as coverage_pct
FROM daaf_daily_summary_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date DESC;
```

**目标覆盖率**: 70-80%

如果覆盖率低于50%，说明：
1. 大量新用户未使用Bot就付费（需要优化onboarding）
2. 归因窗口太窄（考虑扩展到±14天）
3. 用户在付费后才首次使用（考虑提供试用激励）

## Step 4: 比较三种归因模型

```sql
-- 对比三种模型的差异
SELECT
  bot_id,
  bot_name,
  ROUND(SUM(proportional_revenue_usd)::numeric, 2) as proportional_rev,
  ROUND(SUM(last_touch_revenue_usd)::numeric, 2) as last_touch_rev,
  ROUND(SUM(last_touch_opt_revenue_usd)::numeric, 2) as last_touch_opt_rev,
  SUM(proportional_order_count) as prop_orders,
  SUM(last_touch_order_count) as lt_orders,
  SUM(last_touch_opt_order_count) as lto_orders
FROM daaf_bot_revenue_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
  AND bot_id IN (1747502172, 1764937942, 1764754691)  -- Top 3 bots
GROUP BY bot_id, bot_name;
```

**模型选择建议**:
- **Proportional**: 用于公平分配，但可能低估明星Bot
- **Last Touch**: 简单直接，但漏掉付费后才使用的情况
- **Last Touch Optimized**: 最推荐，覆盖率最高

## Step 5: 生成可视化报告

### 5.1 Top 10 Bot毛利额条形图

```javascript
// 数据转换（从Step 1查询结果）
const data = [
  { category: 'Ultra Head Swap', value: 482.72 },
  { category: 'AI Nude Generator', value: 413.16 },
  { category: 'Face Swap Porn', value: 387.98 },
  // ... 其他7个
];
```

使用MCP Chart工具生成条形图：
```
mcp__mcphub__mcp-server-chart-generate_bar_chart
```

### 5.2 每日归因覆盖率趋势线图

```javascript
// 数据转换（从Step 3查询结果）
const data = [
  { time: '2025-12-29', value: 72.5, group: '覆盖率%' },
  { time: '2025-12-30', value: 68.3, group: '覆盖率%' },
  // ...
];
```

使用MCP Chart工具生成折线图。

## 关键指标

### 整体指标
- **总收入归因**: 所有Bot的LTO模型收入总和
- **归因覆盖率**: 有任务历史的订单 / 总订单
- **平均每订单归因收入**: 总归因收入 / 归因订单数

### Bot级别指标
- **毛利额 (Margin USD)**: Revenue - Cost
- **毛利率 (Margin %)**: (Revenue - Cost) / Revenue × 100%
- **每任务平均收入**: Revenue / Task Count
- **每订单平均任务数**: Task Count / Order Count

## 优化建议

### 高毛利Bot（>90%）
✅ **策略**: 加大推广力度
- 增加首页展示位
- 社交媒体营销
- 优化SEO

### 中等毛利Bot（50-90%）
⚠️ **策略**: 平衡增长和成本
- 监控成本趋势
- 考虑分级定价
- 优化算法效率

### 低/负毛利Bot（<50%）
❌ **策略**: 紧急优化
- 限制免费用户额度
- 提高付费转化率
- 降低算法成本
- 必要时下线Bot

## 自动化报告

可以创建定时任务每周生成报告：

```typescript
// functions/api/cron/weekly-bot-report.ts
// 每周一02:00 UTC发送Slack报告
```

包含：
1. Top 10高毛利Bot
2. 需要关注的负毛利Bot
3. 归因覆盖率趋势
4. 周环比变化

## 注意事项

⚠️ **收入与成本日期不匹配**
- 收入归因到订单日期
- 成本记录在任务执行日期
- 单日数据可能有波动，建议看7天或30天趋势

⚠️ **新Bot冷启动**
- 前7-14天可能无归因数据
- 需要积累足够订单历史
- 初期重点关注成本效率

⚠️ **季节性影响**
- 节假日订单量波动
- 考虑同比而非环比
- 识别周期性模式

## 下一步行动

1. ✅ 部署归因系统到Vercel
2. ✅ 等待24小时收集首批数据
3. ✅ 运行本分析模板
4. ✅ 识别Top 5高价值Bot和Top 5需优化Bot
5. ✅ 制定具体的增长/优化策略
6. ✅ 设置每周自动报告

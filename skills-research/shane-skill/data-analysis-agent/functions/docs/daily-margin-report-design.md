# 每日毛利报告设计方案

## 表设计

### 表1: `daaf_daily_margin_summary`
**用途**: 存储每日整体业务指标（成本、收入、毛利、归因汇总）

```typescript
{
  id: uuid
  snapshot_date: date (UNIQUE)

  // ========== 成本分析 ==========
  // 来自 cost-trend-chart.md
  paid_cost: decimal                // 付费用户成本
  free_cost_regular_email: decimal  // 免费-常用邮箱
  free_cost_temp_email: decimal     // 免费-临时邮箱
  free_cost_deleted: decimal        // 免费-已删除用户
  free_cost_visitor: decimal        // 免费-访客
  total_cost: decimal               // 总成本
  free_cost_pct: decimal            // 免费成本占比

  // ========== 收入分析 ==========
  // 来自 gross-margin-analysis.md
  stripe_revenue: decimal           // Stripe 收入
  paypal_revenue: decimal           // PayPal 收入
  iap_revenue: decimal              // IAP 收入（原价，未扣折扣）
  total_revenue: decimal            // 总收入

  // ========== 毛利分析 ==========
  gross_profit: decimal             // 毛利润 = 总收入 - 总成本
  gross_margin_pct: decimal         // 毛利率 = 毛利润 / 总收入 * 100

  // ========== Bot 归因汇总 ==========
  // 来自 bot-margin-analysis.md
  total_order_revenue: decimal      // 所有订单总收入
  attributed_revenue: decimal       // 已归因到bot的收入
  unattributed_revenue: decimal     // 未归因收入
  attribution_coverage_pct: decimal // 归因覆盖率

  // 元数据
  created_at: timestamp
}
```

**注意**：
- ✅ 只存储原始值，不存储变化百分比
- ✅ DoD/WoW 变化在 alert 里实时计算
- ✅ 所有成本和收入单位：美元

---

### 表2: `daaf_bot_daily_margin`
**用途**: 存储每个 bot 每天的毛利表现（用于 Top10 和趋势分析）

```typescript
{
  id: uuid
  snapshot_date: date
  slug_id: text
  bot_name: text

  // ========== 收入和成本 ==========
  attributed_revenue: decimal       // 归因收入
  attributed_order_count: integer   // 归因订单数
  avg_order_amount: decimal         // 平均订单金额 = 归因收入 / 归因订单数

  paid_user_cost: decimal           // 付费用户成本
  free_user_cost: decimal           // 免费用户成本
  total_cost: decimal               // 总成本

  // ========== 毛利指标 ==========
  gross_profit: decimal             // 毛利润 = 收入 - 成本
  gross_margin_pct: decimal         // 毛利率 = 毛利润 / 收入 * 100

  // 元数据
  created_at: timestamp

  UNIQUE(snapshot_date, slug_id)
}
```

**注意**：
- ✅ 只存储原始值
- ✅ DoD/WoW 变化在 alert 里实时计算（查询昨天和上周的数据对比）
- ✅ 支持高效查询 Top10 和历史趋势

---

## Cron Jobs 设计

### Job 1: `sync-daily-margin` (数据同步)
**时间**: 16:10 UTC（北京时间 00:10）
**依赖**:
- `sync-cost-snapshot` (16:05 UTC)
- `sync-art-revenue` (16:00 UTC)

**功能**：
1. 查询昨天的成本数据（从 `daaf_cost_daily_snapshots`）
2. 查询昨天的收入数据（Stripe + PayPal + IAP）
3. 计算毛利（收入 - 成本）
4. 运行 bot margin 归因查询（Last-touch 优化版）
5. 插入 `daaf_daily_margin_summary`
6. 插入所有活跃 bot 到 `daaf_bot_daily_margin`

**预计耗时**: 60-90秒

---

### Job 2: `daily-margin-alert` (告警)
**时间**: 02:00 UTC（北京时间 10:00）

**功能**：
1. 查询昨天、前天、上周同期的数据
2. 计算 DoD/WoW 变化
3. 生成 Slack 消息（主消息 + 3个 Thread）

**预计耗时**: 5-10秒

---

## Alert 消息结构

### 主消息
```
📊 2025-12-28 毛利报告

========== 成本分析 ==========
总成本: $2,345.67 | 环比昨天 📈+5.2% 同比上周 📉-2.1%
  - 付费用户: $1,200.50 | 📈+8.0% 📈+3.5%
  - 免费-常用邮箱: $800.30 | 📈+3.2% 📉-5.0%
  - 免费-临时邮箱: $150.20 | 📉-10.5% 📉-15.3%
  - 免费-已删除: $180.50 | 📈+12.0% 📈+8.2%
  - 免费-访客: $14.17 | ➡️+0.5% ➡️-0.2%
免费成本占比: 48.8% | 📉-1.2pt 📉-2.5pt

========== 收入分析 ==========
总收入: $3,500.00 | 环比昨天 📈+10.5% 同比上周 📈+8.2%
  - Stripe: $2,000.00 | 📈+12.0% 📈+9.5%
  - PayPal: $800.00 | 📈+8.5% 📈+6.0%
  - IAP（原价）: $700.00 | 📈+7.2% 📈+5.5%

========== 毛利分析 ==========
毛利润: $1,154.33 | 📈+18.5% 📈+25.0%
毛利率: 33.0% | 📈+2.1pt 📈+4.2pt

========== Bot 归因分析 ==========
总订单收入: $3,500.00
  - 已归因: $2,800.00 (80.0%) | 📈+10.2% 📈+8.5%
  - 未归因: $700.00 (20.0%) | 📈+11.0% 📈+7.8%
```

### Thread 1: Top 10 最高毛利润 Bot
```
💰 毛利润最高 Top 10

1. Ghibli Diffusion
   毛利润: $450.50 | 环比昨天 📈+25.0% 同比上周 📈+30.5%
   毛利率: 36.0%
   收入: $1,250.50 | 成本: $800.00
   订单数: 85 | 订单均价: $14.71 | 📈+5.0% 📈+8.2%

   最近7天趋势:
   12-22: 毛利$420, 毛利率34.5%
   12-23: 毛利$430, 毛利率35.0%
   12-24: 毛利$440, 毛利率35.5%
   12-25: 毛利$360, 毛利率33.0% (圣诞节)
   12-26: 毛利$400, 毛利率34.0%
   12-27: 毛利$425, 毛利率35.2%
   12-28: 毛利$450, 毛利率36.0% ✅

（共10个）
```

### Thread 2: Top 10 最低毛利润 Bot
```
📉 毛利润最低 Top 10

1. Free Bot ABC
   毛利润: -$300.00 | 环比昨天 📉-15.0% 同比上周 📉-20.0%
   毛利率: -100.0%
   收入: $0.00 | 成本: $300.00
   订单数: 0

   最近7天趋势:
   12-22: 毛利-$250, 毛利率-100%
   12-23: 毛利-$260, 毛利率-100%
   12-24: 毛利-$270, 毛利率-100%
   12-25: 毛利-$280, 毛利率-100%
   12-26: 毛利-$285, 毛利率-100%
   12-27: 毛利-$295, 毛利率-100%
   12-28: 毛利-$300, 毛利率-100% ⚠️

   建议: 考虑限制免费使用或下线

（共10个）
```

### Thread 3: 昨日无收入的 Bot（Top 30）
```
🚫 昨日无收入 Bot (Top 30 by cost)

1. Bot XYZ
   成本: $250.50
   任务数: 1,250
   用户数: 85 (免费)

2. Bot ABC
   成本: $180.30
   任务数: 920
   用户数: 60 (免费)

（共30个或更少）
```

---

## 查询示例

### 查询昨天的汇总数据 + DoD/WoW 计算
```typescript
// 1. 查询3天数据（昨天、前天、上周同期）
const yesterday = '2025-12-28';
const dayBefore = '2025-12-27';
const lastWeek = '2025-12-21';

const [todayData, yesterdayData, lastWeekData] = await Promise.all([
  db.select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, yesterday))
    .limit(1),
  db.select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, dayBefore))
    .limit(1),
  db.select()
    .from(dailyMarginSummary)
    .where(eq(dailyMarginSummary.snapshotDate, lastWeek))
    .limit(1),
]);

// 2. 计算变化百分比
const totalCostDodChange = calculateChange(
  todayData.totalCost,
  yesterdayData.totalCost
);
const totalCostWowChange = calculateChange(
  todayData.totalCost,
  lastWeekData.totalCost
);

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
```

### 查询 Top 10 最高毛利润 Bot
```typescript
const topProfitable = await db
  .select()
  .from(botDailyMargin)
  .where(eq(botDailyMargin.snapshotDate, yesterday))
  .orderBy(desc(botDailyMargin.grossProfit))
  .limit(10);

// 查询对比数据（昨天和上周）
for (const bot of topProfitable) {
  const [yesterdayBot, lastWeekBot] = await Promise.all([
    db.select()
      .from(botDailyMargin)
      .where(
        and(
          eq(botDailyMargin.slugId, bot.slugId),
          eq(botDailyMargin.snapshotDate, dayBefore)
        )
      )
      .limit(1),
    db.select()
      .from(botDailyMargin)
      .where(
        and(
          eq(botDailyMargin.slugId, bot.slugId),
          eq(botDailyMargin.snapshotDate, lastWeek)
        )
      )
      .limit(1),
  ]);

  // 计算变化
  bot.revenueDodChange = calculateChange(bot.revenue, yesterdayBot?.revenue);
  bot.revenueWowChange = calculateChange(bot.revenue, lastWeekBot?.revenue);
}
```

### 查询最近7天趋势
```typescript
const last7Days = await db
  .select()
  .from(botDailyMargin)
  .where(
    and(
      eq(botDailyMargin.slugId, 'some-bot'),
      gte(botDailyMargin.snapshotDate, sql`${yesterday}::date - interval '6 days'`),
      lte(botDailyMargin.snapshotDate, yesterday)
    )
  )
  .orderBy(botDailyMargin.snapshotDate);
```

### 查询昨日无收入的 Bot（Top 30）
```typescript
const noRevenue = await db
  .select()
  .from(botDailyMargin)
  .where(
    and(
      eq(botDailyMargin.snapshotDate, yesterday),
      eq(botDailyMargin.attributedRevenue, 0),
      gt(botDailyMargin.totalCost, 0)
    )
  )
  .orderBy(desc(botDailyMargin.totalCost))
  .limit(30);
```

---

## 实施步骤

### 阶段1: 表设计 (10分钟)
- [x] 创建两张表的 schema
- [x] 更新 `lib/db/schema.ts`
- [x] 运行 `npm run db:push`

### 阶段2: Sync Job (30-45分钟)
- [ ] 实现 `sync-daily-margin.ts` cron job
- [ ] 成本查询逻辑
- [ ] 收入查询逻辑（Stripe + PayPal + IAP）
- [ ] Bot margin 归因查询
- [ ] 数据插入逻辑

### 阶段3: Alert Job (20-30分钟)
- [ ] 实现 `daily-margin-alert.ts` cron job
- [ ] DoD/WoW 计算逻辑
- [ ] Slack 消息格式化
- [ ] Thread 消息发送

### 阶段4: 配置 (5分钟)
- [ ] 更新 `vercel.json` cron 配置
- [ ] 测试运行

---

## 关键决策

### ✅ 已确认
1. **表命名**: `daaf_daily_margin_summary` / `daaf_bot_daily_margin`
2. **不预计算变化**: 所有 DoD/WoW 在 alert 里实时计算
3. **查询方式**: 使用 Drizzle ORM + JS（不用原生 SQL）
4. **包含全部分类**: 临时邮箱、访客、PayPal 都要
5. **订单均价**: `归因收入 / 归因订单数`
6. **无收入bot**: Top 30（按成本降序）

### 📊 数据流
```
Source DB (my_shell_prod)
  ↓
Sync Jobs (16:00-16:10 UTC)
  ↓
PostgreSQL (daaf_* tables)
  ↓
Alert Job (02:00 UTC)
  ↓
Slack
```

---

## 性能估算

### Sync Job (`sync-daily-margin`)
- 成本查询: 1-2s（从快照表）
- 收入查询: 5-10s（3个订单表）
- Bot margin 归因: 15-45s（最耗时）
- Bot 详情计算: 5-10s
- 数据插入: 2-5s
- **总耗时**: 30-75秒

### Alert Job (`daily-margin-alert`)
- 查询3天数据: 2-3s
- DoD/WoW 计算: 1s
- Top10 查询: 1-2s
- 7天趋势查询: 2-3s（每个bot）
- 消息构建: 1-2s
- Slack 发送: 2-3s
- **总耗时**: 10-15秒（不含7天趋势），30-60秒（含趋势）

import {
  pgTable,
  text,
  integer,
  timestamp,
  decimal,
  uuid,
  date,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Bot Revenue Snapshots Table
 *
 * 存储每日的 Bot 收入快照数据，用于趋势分析和波动监控
 *
 * 时间粒度：天级
 * 主要用途：
 * - 收入趋势分析
 * - Bot 排名变化
 * - 付费用户转化
 * - 能耗效率对比
 * - ROI 分析
 * - 波动监控报警 (DoD, WoW, 移动平均, 异常检测)
 */
export const botRevenueSnapshots = pgTable(
  "daaf_bot_revenue_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // 时间维度
    snapshotDate: date("snapshot_date").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // Bot 信息
    slugId: text("slug_id").notNull(),
    botName: text("bot_name").notNull(),
    botId: integer("bot_id"),

    // 使用量指标
    taskCount: integer("task_count").default(0).notNull(),
    uniqueUsers: integer("unique_users").default(0).notNull(),
    paidUserTasks: integer("paid_user_tasks").default(0).notNull(),
    freeUserTasks: integer("free_user_tasks").default(0).notNull(),
    paidUserPercentage: decimal("paid_user_percentage", {
      precision: 5,
      scale: 2,
    }),

    // 收入指标 (三种归因模型)
    revenueProportional: decimal("revenue_proportional", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    revenueLastTouch: decimal("revenue_last_touch", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    revenueLastTouchOptimized: decimal("revenue_last_touch_optimized", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),

    // 成本指标
    energyCost: decimal("energy_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    paidUserEnergy: decimal("paid_user_energy", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    freeUserEnergy: decimal("free_user_energy", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    revenueCostRatio: decimal("revenue_cost_ratio", { precision: 8, scale: 2 }),

    // 其他
    daysOnline: integer("days_online"),
    firstTaskDate: timestamp("first_task_date", { withTimezone: true }),

    // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("unique_snapshot_slug").on(table.snapshotDate, table.slugId)]
);

/**
 * Daily Summary Snapshots Table
 *
 * 存储每日的全局汇总数据，用于快速概览和趋势分析
 */
export const dailySummarySnapshots = pgTable(
  "daaf_daily_summary_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // 时间维度
    snapshotDate: date("snapshot_date").notNull().unique(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // 汇总指标
    totalTasks: integer("total_tasks").default(0).notNull(),
    totalBots: integer("total_bots").default(0).notNull(),
    totalUniqueUsers: integer("total_unique_users").default(0).notNull(),
    totalPayingUsers: integer("total_paying_users").default(0).notNull(),

    // 收入汇总
    totalRevenueProportional: decimal("total_revenue_proportional", {
      precision: 14,
      scale: 2,
    })
      .default("0")
      .notNull(),
    totalRevenueLastTouch: decimal("total_revenue_last_touch", {
      precision: 14,
      scale: 2,
    })
      .default("0")
      .notNull(),
    totalRevenueLastTouchOptimized: decimal(
      "total_revenue_last_touch_optimized",
      {
        precision: 14,
        scale: 2,
      }
    )
      .default("0")
      .notNull(),

    // 成本汇总
    totalEnergyCost: decimal("total_energy_cost", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),

    // 订单数
    stripeOrderCount: integer("stripe_order_count").default(0).notNull(),
    paypalOrderCount: integer("paypal_order_count").default(0).notNull(),

    // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

/**
 * Cost Daily Snapshots Table
 *
 * 每日成本快照，按用户类型下钻
 * 时间范围：北京时间 00:00-23:59
 * 成本单位：美元 (actual_energy_cost / 100)
 *
 * 核心指标：free_cost_pct (免费成本占比)，期望趋势向下
 */
export const costDailySnapshots = pgTable("daaf_cost_daily_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),

  // 时间维度
  snapshotDate: date("snapshot_date").notNull().unique(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

  // 汇总指标
  totalCost: decimal("total_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  paidCost: decimal("paid_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  freeCost: decimal("free_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  freeCostPct: decimal("free_cost_pct", { precision: 5, scale: 2 }), // 核心指标
  totalTasks: integer("total_tasks").default(0).notNull(),
  totalUsers: integer("total_users").default(0).notNull(),

  // 免费成本 - 用户类型下钻：临时邮箱
  tempEmailCost: decimal("temp_email_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  tempEmailUsers: integer("temp_email_users").default(0).notNull(),
  tempEmailTasks: integer("temp_email_tasks").default(0).notNull(),

  // 免费成本 - 用户类型下钻：常用邮箱
  regularEmailCost: decimal("regular_email_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  regularEmailUsers: integer("regular_email_users").default(0).notNull(),
  regularEmailTasks: integer("regular_email_tasks").default(0).notNull(),

  // 免费成本 - 用户类型下钻：已删除用户
  deletedUserCost: decimal("deleted_user_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  deletedUserCount: integer("deleted_user_count").default(0).notNull(),
  deletedUserTasks: integer("deleted_user_tasks").default(0).notNull(),

  // 免费成本 - 用户类型下钻：访客
  visitorCost: decimal("visitor_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  visitorCount: integer("visitor_count").default(0).notNull(),
  visitorTasks: integer("visitor_tasks").default(0).notNull(),

  // 元数据
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Free Cost By Bot Snapshots Table
 *
 * 免费成本按 Bot 下钻，每日存 Top 30
 * 用于分析哪些 Bot 被薅得最多
 */
export const freeCostByBotSnapshots = pgTable(
  "daaf_free_cost_by_bot_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // 时间维度
    snapshotDate: date("snapshot_date").notNull(),

    // Bot 信息
    slugId: text("slug_id").notNull(),
    botName: text("bot_name").notNull(),

    // 成本指标 (美元)
    freeCost: decimal("free_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    freeTasks: integer("free_tasks").default(0).notNull(),
    freeUsers: integer("free_users").default(0).notNull(),

    // 占比和排名
    costPct: decimal("cost_pct", { precision: 5, scale: 2 }), // 占当日免费总成本%
    rank: integer("rank").notNull(), // 当日排名

    // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("unique_free_cost_bot_snapshot").on(table.snapshotDate, table.slugId),
  ]
);

/**
 * Daily Margin Summary Table
 *
 * 存储每日整体业务指标（成本、收入、毛利、归因汇总）
 * 时间范围：北京时间 00:00-23:59
 * 金额单位：美元
 *
 * 核心指标：
 * - 成本分析：按用户类型下钻（付费/免费-常用邮箱/免费-临时邮箱/免费-已删除/免费-访客）
 * - 收入分析：按渠道下钻（Stripe/PayPal/IAP）
 * - 毛利分析：毛利润、毛利率
 * - Bot归因：已归因收入、未归因收入、归因覆盖率
 *
 * 注意：不存储 DoD/WoW 变化，由 alert 实时计算
 */
export const dailyMarginSummary = pgTable("daaf_daily_margin_summary", {
  id: uuid("id").primaryKey().defaultRandom(),

  // 时间维度
  snapshotDate: date("snapshot_date").notNull().unique(),

  // ========== 成本分析 ==========
  paidCost: decimal("paid_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  freeCostRegularEmail: decimal("free_cost_regular_email", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  freeCostTempEmail: decimal("free_cost_temp_email", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  freeCostGmailAlias: decimal("free_cost_gmail_alias", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  freeCostDeleted: decimal("free_cost_deleted", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  freeCostVisitor: decimal("free_cost_visitor", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  totalCost: decimal("total_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  freeCostPct: decimal("free_cost_pct", { precision: 5, scale: 2 }),

  // ========== 收入分析 ==========
  stripeRevenue: decimal("stripe_revenue", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  paypalRevenue: decimal("paypal_revenue", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  iapRevenue: decimal("iap_revenue", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  totalRevenue: decimal("total_revenue", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),

  // ========== 毛利分析 ==========
  grossProfit: decimal("gross_profit", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  grossMarginPct: decimal("gross_margin_pct", { precision: 7, scale: 2 }),

  // ========== Bot 归因汇总 ==========
  totalOrderRevenue: decimal("total_order_revenue", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  attributedRevenue: decimal("attributed_revenue", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  unattributedRevenue: decimal("unattributed_revenue", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  attributionCoveragePct: decimal("attribution_coverage_pct", {
    precision: 5,
    scale: 2,
  }),

  // 元数据
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Cost Breakdown Summary Table
 *
 * 存储每日总成本分解（主站 vs Art站，主站进一步分 Creator/Non-Creator）
 * 时间范围：北京时间 00:00-23:59
 * 金额单位：美元
 *
 * 核心逻辑：
 * - Art站成本：art_task 表中 status='done' 的 actual_energy_cost
 * - 主站成本：通过精确匹配算法（user_id + bot_id + energy + 时间窗口±5秒）从 user_energy_bot_usage_logs 识别
 * - Creator 定义：user_membership_info 表中 genesisPasscard > 0 或 genesisPassCardCount > 0
 *
 * 数据来源：total-cost-breakdown.md
 */
export const costBreakdownSummary = pgTable("daaf_cost_breakdown_summary", {
  id: uuid("id").primaryKey().defaultRandom(),

  // 时间维度
  snapshotDate: date("snapshot_date").notNull().unique(),

  // ========== 成本分解 ==========
  artCost: decimal("art_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  mainCreatorCost: decimal("main_creator_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  mainNonCreatorCost: decimal("main_non_creator_cost", {
    precision: 14,
    scale: 2,
  })
    .default("0")
    .notNull(),
  totalCost: decimal("total_cost", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),

  // ========== 占比 ==========
  artCostPct: decimal("art_cost_pct", { precision: 5, scale: 2 }),
  mainCreatorCostPct: decimal("main_creator_cost_pct", {
    precision: 5,
    scale: 2,
  }),
  mainNonCreatorCostPct: decimal("main_non_creator_cost_pct", {
    precision: 5,
    scale: 2,
  }),
  mainSiteCostPct: decimal("main_site_cost_pct", { precision: 5, scale: 2 }),
  creatorOfMainSitePct: decimal("creator_of_main_site_pct", {
    precision: 5,
    scale: 2,
  }),

  // 元数据
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Bot Daily Margin Table
 *
 * 存储每个 bot 每天的毛利表现
 * 用于 Top10 查询和历史趋势分析
 *
 * 核心指标：
 * - 归因收入、订单数、订单均价
 * - 成本（付费/免费）
 * - 毛利润、毛利率
 *
 * 注意：不存储 DoD/WoW 变化，由 alert 实时计算
 */
export const botDailyMargin = pgTable(
  "daaf_bot_daily_margin",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // 时间维度
    snapshotDate: date("snapshot_date").notNull(),

    // Bot 信息
    slugId: text("slug_id").notNull(),
    botName: text("bot_name").notNull(),

    // ========== 收入和成本 ==========
    attributedRevenue: decimal("attributed_revenue", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    attributedOrderCount: integer("attributed_order_count")
      .default(0)
      .notNull(),
    avgOrderAmount: decimal("avg_order_amount", { precision: 10, scale: 2 }),

    paidUserCost: decimal("paid_user_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    paidUserTaskCount: integer("paid_user_task_count").default(0).notNull(),
    freeUserCost: decimal("free_user_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    freeUserTaskCount: integer("free_user_task_count").default(0).notNull(),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalTaskCount: integer("total_task_count").default(0).notNull(),

    // ========== 毛利指标 ==========
    grossProfit: decimal("gross_profit", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    grossMarginPct: decimal("gross_margin_pct", { precision: 7, scale: 2 }),

    // 元数据
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("unique_bot_daily_margin").on(table.snapshotDate, table.slugId),
  ]
);


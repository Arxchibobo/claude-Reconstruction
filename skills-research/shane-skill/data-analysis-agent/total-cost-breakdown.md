# 总成本分解分析

## 目标

分析总成本的组成结构，按 **主站** 和 **Art站** 分解，主站进一步区分 **Creator** 和 **Non-Creator**，展示每日趋势和占比变化。

通过 MCP 直接查询 `my_shell_prod` 数据库。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数         | 说明                | 默认值 |
| ------------ | ------------------- | ------ |
| `start_date` | 开始日期 (YYYY-MM-DD) | 7天前 |
| `end_date`   | 结束日期 (YYYY-MM-DD) | 昨天   |

## 数据源

- `my_shell_prod.user_energy_bot_usage_logs` - 总电量消耗表（主站+Art）
- `my_shell_prod.art_task` - Art任务表（仅Art消耗）
- `my_shell_prod.user_membership_info` - 用户会员信息（Creator判断）

## 核心逻辑

### 表关系说明

```
user_energy_bot_usage_logs（总消耗）
├── 主站消耗（对话、聊天等）
└── Art消耗（图片生成）← 同时记录在 art_task.actual_energy_cost
```

**关键发现**：Art任务完成时（`art_task.updated_date`），会在 `user_energy_bot_usage_logs` 中产生一条对应记录。

### 精确匹配算法

通过时间匹配识别并排除Art记录：

- **匹配条件**：`user_id` + `bot_id` + `energy` + 时间窗口（±5秒）
- **Art记录**：能在 `art_task` 中找到匹配的 `updated_date`
- **主站记录**：无法匹配的记录

### 成本分类

| 分类              | 说明                                           |
| ----------------- | ---------------------------------------------- |
| **Art站**         | `art_task` 表中 `status='done'` 的 `actual_energy_cost` |
| **主站-Creator**  | 精确匹配后的主站消耗，且用户是 Creator          |
| **主站-Non-Creator** | 精确匹配后的主站消耗，且用户不是 Creator     |

**Creator 定义**：`user_membership_info` 表中 `genesisPasscard > 0` 或 `genesisPassCardCount > 0`

---

## Step 1: 每日成本趋势数据

使用 `mcp_mcphub_bytebase-execute_sql` 执行以下 SQL：

### 查询1: 每日成本分解（精确匹配算法）

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
-- Art任务记录（用于精确匹配）
art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date, DATE(created_date) as snapshot_date
    FROM art_task
    WHERE DATE(created_date) BETWEEN '{start_date}' AND '{end_date}'
        AND deleted_at IS NULL
        AND status = 'done'
),
-- Art站每日成本
art_daily AS (
    SELECT snapshot_date, SUM(energy) / 100 as cost_usd
    FROM art_done
    GROUP BY snapshot_date
),
-- 精确匹配：识别每条记录是Art还是主站
classified AS (
    SELECT
        DATE(u.created_date) as snapshot_date,
        u.user_id,
        u.energy,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM art_done a
                WHERE a.user_id = u.user_id
                    AND a.bot_id = u.bot_id
                    AND a.energy = u.energy
                    AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
            ) THEN 'Art'
            ELSE 'Main'
        END as source
    FROM user_energy_bot_usage_logs u
    WHERE DATE(u.created_date) BETWEEN '{start_date}' AND '{end_date}'
),
-- 主站记录按日按用户汇总
main_site_daily AS (
    SELECT snapshot_date, user_id, SUM(energy) as main_energy
    FROM classified
    WHERE source = 'Main'
    GROUP BY snapshot_date, user_id
),
-- 主站按Creator/Non-Creator汇总
main_site_grouped AS (
    SELECT
        m.snapshot_date,
        SUM(CASE WHEN c.user_id IS NOT NULL THEN m.main_energy ELSE 0 END) / 100 as main_creator_cost,
        SUM(CASE WHEN c.user_id IS NULL THEN m.main_energy ELSE 0 END) / 100 as main_non_creator_cost
    FROM main_site_daily m
    LEFT JOIN creators c ON m.user_id = c.user_id
    GROUP BY m.snapshot_date
)
SELECT
    mg.snapshot_date,
    COALESCE(a.cost_usd, 0) as art_cost,
    COALESCE(mg.main_creator_cost, 0) as main_creator_cost,
    COALESCE(mg.main_non_creator_cost, 0) as main_non_creator_cost,
    COALESCE(a.cost_usd, 0) + COALESCE(mg.main_creator_cost, 0) + COALESCE(mg.main_non_creator_cost, 0) as total_cost
FROM main_site_grouped mg
LEFT JOIN art_daily a ON mg.snapshot_date = a.snapshot_date
ORDER BY mg.snapshot_date;
```

**性能提示**：精确匹配算法使用 EXISTS 子查询，建议时间范围控制在 7 天内（14天可能超时）。

---

## Step 2: 汇总占比分析

### 查询2: 总体成本占比（精确匹配算法）

```sql
WITH creators AS (
    SELECT DISTINCT userId as user_id
    FROM user_membership_info
    WHERE genesisPasscard > 0 OR genesisPassCardCount > 0
),
-- Art任务记录（用于精确匹配）
art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date
    FROM art_task
    WHERE DATE(created_date) BETWEEN '{start_date}' AND '{end_date}'
        AND deleted_at IS NULL
        AND status = 'done'
),
-- Art站总成本
art_total AS (
    SELECT SUM(energy) / 100 as cost_usd FROM art_done
),
-- 精确匹配：识别每条记录是Art还是主站
classified AS (
    SELECT
        u.user_id,
        u.energy,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM art_done a
                WHERE a.user_id = u.user_id
                    AND a.bot_id = u.bot_id
                    AND a.energy = u.energy
                    AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
            ) THEN 'Art'
            ELSE 'Main'
        END as source
    FROM user_energy_bot_usage_logs u
    WHERE DATE(u.created_date) BETWEEN '{start_date}' AND '{end_date}'
),
-- 主站按用户汇总
main_site_by_user AS (
    SELECT user_id, SUM(energy) as main_energy
    FROM classified
    WHERE source = 'Main'
    GROUP BY user_id
),
-- 主站按Creator/Non-Creator汇总
main_grouped AS (
    SELECT
        SUM(CASE WHEN c.user_id IS NOT NULL THEN m.main_energy ELSE 0 END) / 100 as main_creator_cost,
        SUM(CASE WHEN c.user_id IS NULL THEN m.main_energy ELSE 0 END) / 100 as main_non_creator_cost
    FROM main_site_by_user m
    LEFT JOIN creators c ON m.user_id = c.user_id
)
SELECT
    'Art站' as category,
    (SELECT cost_usd FROM art_total) as cost_usd,
    ROUND((SELECT cost_usd FROM art_total) * 100.0 /
        ((SELECT cost_usd FROM art_total) + (SELECT main_creator_cost + main_non_creator_cost FROM main_grouped)), 2) as pct
UNION ALL
SELECT
    '主站-Creator' as category,
    main_creator_cost as cost_usd,
    ROUND(main_creator_cost * 100.0 /
        ((SELECT cost_usd FROM art_total) + main_creator_cost + main_non_creator_cost), 2) as pct
FROM main_grouped
UNION ALL
SELECT
    '主站-Non-Creator' as category,
    main_non_creator_cost as cost_usd,
    ROUND(main_non_creator_cost * 100.0 /
        ((SELECT cost_usd FROM art_total) + main_creator_cost + main_non_creator_cost), 2) as pct
FROM main_grouped;
```

**预期结果格式：**

| category          | cost_usd | pct   |
| ----------------- | -------- | ----- |
| Art站             | ~$8,500  | ~56%  |
| 主站-Creator      | ~$550    | ~4%   |
| 主站-Non-Creator  | ~$6,000  | ~40%  |

---

## Step 3: 生成图表

### 图表1: 每日成本堆叠面积图

使用 `mcp_mcphub_mcp-server-chart-generate_area_chart` 或堆叠柱状图：

**数据转换**（将查询1结果转换为图表格式）：

```javascript
// 将每日数据转换为堆叠格式
const chartData = dailyData.flatMap(row => [
    { time: row.snapshot_date, value: row.art_cost, group: 'Art站' },
    { time: row.snapshot_date, value: row.main_creator_cost, group: '主站-Creator' },
    { time: row.snapshot_date, value: row.main_non_creator_cost, group: '主站-Non-Creator' }
]);
```

**图表配置**：

```json
{
    "title": "每日成本趋势（按来源分解）",
    "axisXTitle": "日期",
    "axisYTitle": "成本 (USD)",
    "data": [
        { "time": "2025-01-01", "value": 580, "group": "Art站" },
        { "time": "2025-01-01", "value": 35, "group": "主站-Creator" },
        { "time": "2025-01-01", "value": 420, "group": "主站-Non-Creator" }
    ],
    "stack": true,
    "style": {
        "palette": ["#10B981", "#3B82F6", "#F59E0B"]
    }
}
```

### 图表2: 成本占比饼图

使用 `mcp_mcphub_mcp-server-chart-generate_pie_chart`：

```json
{
    "title": "成本构成占比",
    "data": [
        { "category": "Art站", "value": 8500 },
        { "category": "主站-Creator", "value": 550 },
        { "category": "主站-Non-Creator", "value": 6000 }
    ],
    "style": {
        "palette": ["#10B981", "#3B82F6", "#F59E0B"]
    }
}
```

### 图表3: 主站 vs Art站 简化对比（柱状图）

```json
{
    "title": "主站 vs Art站 成本对比",
    "data": [
        { "category": "Art站", "value": 8500 },
        { "category": "主站", "value": 6550 }
    ],
    "style": {
        "palette": ["#10B981", "#6366F1"]
    }
}
```

---

## 核心指标

| 指标               | 计算方式                                    | 监控目标     |
| ------------------ | ------------------------------------------- | ------------ |
| **Art站占比**      | Art成本 / 总成本 × 100%                     | 观察趋势变化 |
| **主站占比**       | 主站成本 / 总成本 × 100%                    | 监控主站消耗 |
| **Creator占主站比** | 主站Creator成本 / 主站总成本 × 100%         | ~8%为正常    |
| **日均总成本**     | 总成本 / 天数                               | 成本基线     |

---

## 注意事项

1. **成本单位**：1 energy = $0.01 USD
2. **Art任务状态**：仅计算 `status = 'done'` 的任务
3. **精确匹配算法**：通过 `user_id` + `bot_id` + `energy` + 时间窗口（±5秒）精确识别Art记录
4. **性能考虑**：EXISTS 子查询在大数据量下较慢，建议时间范围 ≤7 天（后续可通过预计算 snapshot 支持更长时间范围）
5. **Creator定义**：依赖 `user_membership_info` 表，确保数据完整

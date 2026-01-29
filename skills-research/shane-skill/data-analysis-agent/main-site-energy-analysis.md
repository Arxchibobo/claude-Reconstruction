# 主站电量消耗分析

## 目标

分析主站（非Art）的电量消耗来源，识别消耗最多的Bot和用户。

通过 MCP 直接查询 `my_shell_prod` 数据库，区分主站和 Art 站的电量消耗。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数    | 说明              | 默认值          |
| ------- | ----------------- | --------------- |
| `days`  | 查询天数          | 1（最近24小时） |
| `top_n` | Top Bot/User 数量 | 20              |

## 数据源

- `my_shell_prod.user_energy_bot_usage_logs` - 总电量消耗表（包含主站+Art）
- `my_shell_prod.art_task` - Art任务表（仅Art消耗）
- `my_shell_prod.bot` - Bot信息表
- `my_shell_prod.user` - 用户表
- `my_shell_prod.user_privy` - 用户邮箱信息

## 核心逻辑

### 表关系说明

```
user_energy_bot_usage_logs（总消耗）
├── 主站消耗（对话、聊天等）
└── Art消耗（图片生成）← 同时记录在 art_task.actual_energy_cost
```

**关键发现**：Art任务完成时（`art_task.updated_date`），会在
`user_energy_bot_usage_logs` 中产生一条对应记录。

### 主站消耗计算方法

**方法1: 直接差值法（简单）**

```
主站电量 = user_energy_bot_usage_logs.SUM(energy) - art_task.SUM(actual_energy_cost)
```

**方法2: 精确匹配法（推荐）**

通过时间匹配识别并排除Art记录：

- 匹配条件：`user_id` + `bot_id` + `energy` + 时间窗口（±5秒）
- Art记录：能在 `art_task` 中找到匹配的 `updated_date`
- 主站记录：无法匹配的记录

---

## Step 1: 总体分布统计

使用 `mcp_mcphub_bytebase-execute_sql` 执行以下 SQL：

### 查询1: 主站 vs Art 消耗对比

```sql
-- 精确匹配法：通过 art_task.updated_date 识别Art记录
WITH art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL
        AND status = 'done'
),
classified AS (
    SELECT
        u.user_id, u.bot_id, u.energy,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM art_done a
                WHERE a.user_id = u.user_id
                    AND a.bot_id = u.bot_id
                    AND a.energy = u.energy
                    AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
            ) THEN 'Art'
            ELSE 'Main Site'
        END as source
    FROM user_energy_bot_usage_logs u
    WHERE u.created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
)
SELECT
    source,
    COUNT(*) as records,
    SUM(energy) as total_energy,
    ROUND(SUM(energy) * 100.0 / SUM(SUM(energy)) OVER(), 2) as percentage
FROM classified
GROUP BY source;
```

**预期结果格式：**

| source    | records | total_energy | percentage |
| --------- | ------- | ------------ | ---------- |
| Main Site | ~9,000  | ~56,000      | ~42%       |
| Art       | ~13,000 | ~78,000      | ~58%       |

---

## Step 2: 主站 Top Bots 分析

### 查询2: 主站消耗最多的Bot

```sql
-- 主站Top Bots
WITH art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL
        AND status = 'done'
),
main_site AS (
    SELECT u.bot_id, u.user_id, u.energy
    FROM user_energy_bot_usage_logs u
    WHERE u.created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND NOT EXISTS (
            SELECT 1 FROM art_done a
            WHERE a.user_id = u.user_id
                AND a.bot_id = u.bot_id
                AND a.energy = u.energy
                AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
        )
)
SELECT
    CAST(m.bot_id AS CHAR) as bot_id,  -- 将 bot_id 转换为字符串，避免 JavaScript 精度丢失
    b.name as bot_name,
    b.botType,
    SUM(m.energy) as total_energy,
    COUNT(*) as usage_count,
    COUNT(DISTINCT m.user_id) as unique_users,
    ROUND(SUM(m.energy) * 100.0 / (SELECT SUM(energy) FROM main_site), 2) as percentage
FROM main_site m
LEFT JOIN bot b ON m.bot_id = b.id
GROUP BY m.bot_id, b.name, b.botType
ORDER BY total_energy DESC
LIMIT {top_n};
```

---

## Step 3: 主站 Top Users 分析

### 查询3: 主站消耗最多的用户

```sql
-- 主站Top Users
WITH art_done AS (
    SELECT user_id, bot_id, actual_energy_cost as energy, updated_date
    FROM art_task
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND deleted_at IS NULL
        AND status = 'done'
),
main_site AS (
    SELECT u.bot_id, u.user_id, u.energy
    FROM user_energy_bot_usage_logs u
    WHERE u.created_date >= DATE_SUB(NOW(), INTERVAL {days} DAY)
        AND NOT EXISTS (
            SELECT 1 FROM art_done a
            WHERE a.user_id = u.user_id
                AND a.bot_id = u.bot_id
                AND a.energy = u.energy
                AND ABS(TIMESTAMPDIFF(SECOND, u.created_date, a.updated_date)) <= 5
        )
)
SELECT
    m.user_id,
    usr.source,
    COALESCE(NULLIF(up.email,''), NULLIF(up.google_email,''), NULLIF(up.apple_email,''), 'N/A') as email,
    SUM(m.energy) as total_energy,
    COUNT(*) as usage_count,
    COUNT(DISTINCT m.bot_id) as unique_bots,
    ROUND(SUM(m.energy) * 100.0 / (SELECT SUM(energy) FROM main_site), 2) as percentage
FROM main_site m
LEFT JOIN user usr ON m.user_id = usr.id
LEFT JOIN user_privy up ON m.user_id = up.user_id
GROUP BY m.user_id, usr.source, email
ORDER BY total_energy DESC
LIMIT {top_n};
```

---

## Step 4: 生成图表

### 图表1: 主站 vs Art 消耗饼图

使用 `mcp_mcphub_mcp-server-chart-generate_pie_chart`：

```json
{
    "title": "电量消耗分布（主站 vs Art）",
    "data": [
        { "category": "主站", "value": 56253 },
        { "category": "Art", "value": 78093 }
    ],
    "style": {
        "palette": ["#3B82F6", "#10B981"]
    }
}
```

### 图表2: 主站Top Bots 柱状图

使用 `mcp_mcphub_mcp-server-chart-generate_bar_chart`：

```json
{
  "title": "主站Top 10 Bots 电量消耗",
  "axisXTitle": "Bot",
  "axisYTitle": "电量",
  "data": [
    { "category": "Take off clothes-PRO", "value": 11963 },
    { "category": "POV Missionary", "value": 10204 },
    { "category": "Breast Expansion", "value": 6171 },
    ...
  ],
  "style": {
    "palette": ["#3B82F6"]
  }
}
```

---

## 核心指标

| 指标           | 计算方式                            | 目标          |
| -------------- | ----------------------------------- | ------------- |
| **主站占比**   | 主站电量 / 总电量 × 100%            | 监控变化趋势  |
| **Bot集中度**  | Top 3 Bot电量 / 主站总电量 × 100%   | 识别高消耗Bot |
| **用户集中度** | Top 10 用户电量 / 主站总电量 × 100% | 识别异常用户  |

---

## 注意事项

1. **时间窗口选择**：±5秒窗口经验证可准确匹配Art记录
2. **性能考虑**：EXISTS子查询在大数据量下可能较慢，建议限制时间范围（1-7天）
3. **数据一致性**：两种方法（差值法 vs 精确匹配法）结果应基本一致（误差<5%）

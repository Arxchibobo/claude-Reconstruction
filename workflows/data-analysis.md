# 数据分析工作流

> **用途**: 从数据查询到可视化报告的完整流程

---

## 标准流程

```
1️⃣ 需求理解 → 明确分析目标
        ↓
2️⃣ 数据查询 → bytebase MCP 获取数据
        ↓
3️⃣ 数据处理 → 清洗、聚合、计算
        ↓
4️⃣ 可视化 → chart MCP 生成图表
        ↓
5️⃣ 报告生成 → 总结发现和建议
```

---

## 阶段 1: 需求理解

### 明确分析目标

- 要回答什么问题？
- 需要哪些维度的数据？
- 时间范围是什么？
- 输出形式是什么？（图表/报告/数字）

### 示例对话

```
用户: 分析上个月的用户增长情况

需要明确:
- 时间范围: 2026-01-01 到 2026-01-31
- 指标: 新增用户数、日活、留存率
- 维度: 按天/按周、按渠道
- 输出: 趋势图 + 关键数字
```

---

## 阶段 2: 数据查询

### 使用 Bytebase MCP

```javascript
// 基础查询
mcp__mcphub__bytebase-execute_sql({
  sql: `
    SELECT
      DATE(created_at) as date,
      COUNT(*) as new_users
    FROM users
    WHERE created_at >= '2026-01-01'
      AND created_at < '2026-02-01'
    GROUP BY DATE(created_at)
    ORDER BY date
  `
});
```

### SQL 最佳实践

1. **使用 CTE 预过滤**

```sql
WITH filtered_data AS (
  SELECT *
  FROM orders
  WHERE created_at >= '2026-01-01'
)
SELECT
  DATE(created_at) as date,
  SUM(amount) as total
FROM filtered_data
GROUP BY DATE(created_at);
```

2. **避免 SELECT ***

```sql
-- ❌ 错误
SELECT * FROM users;

-- ✅ 正确
SELECT id, name, email, created_at
FROM users;
```

3. **添加 LIMIT**

```sql
SELECT *
FROM large_table
LIMIT 1000;
```

---

## 阶段 3: 数据处理

### 常见处理操作

```javascript
// 数据清洗
const cleanedData = rawData
  .filter(row => row.value !== null)
  .map(row => ({
    ...row,
    date: new Date(row.date).toISOString().split('T')[0]
  }));

// 聚合计算
const aggregated = data.reduce((acc, row) => {
  const key = row.category;
  if (!acc[key]) {
    acc[key] = { count: 0, total: 0 };
  }
  acc[key].count++;
  acc[key].total += row.value;
  return acc;
}, {});

// 计算衍生指标
const withMetrics = data.map(row => ({
  ...row,
  growthRate: row.previous ? (row.current - row.previous) / row.previous : 0,
  percentage: row.value / totalValue * 100
}));
```

### 时间序列处理

```javascript
// 填充缺失日期
function fillMissingDates(data, startDate, endDate) {
  const dateMap = new Map(data.map(d => [d.date, d]));
  const result = [];

  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    result.push(dateMap.get(dateStr) || { date: dateStr, value: 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// 计算移动平均
function movingAverage(data, window = 7) {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const windowData = data.slice(start, i + 1);
    const avg = windowData.reduce((sum, d) => sum + d.value, 0) / windowData.length;
    return { ...d, movingAvg: avg };
  });
}
```

---

## 阶段 4: 可视化

### 选择合适的图表

| 分析目的 | 推荐图表 |
|---------|---------|
| 趋势分析 | 折线图 |
| 对比分析 | 柱状图 |
| 占比分析 | 饼图 |
| 转化分析 | 漏斗图 |
| 增减分析 | 瀑布图 |

### 图表生成示例

```javascript
// 折线图：趋势分析
mcp__mcphub__mcp-server-chart-generate_line_chart({
  data: timeSeriesData.map(d => ({
    time: d.date,
    value: d.users,
    group: '新增用户'
  })),
  title: '用户增长趋势',
  axisXTitle: '日期',
  axisYTitle: '用户数',
  width: 800,
  height: 400
});

// 柱状图：分类对比
mcp__mcphub__mcp-server-chart-generate_bar_chart({
  data: channelData.map(d => ({
    category: d.channel,
    value: d.users
  })),
  title: '各渠道用户数',
  axisXTitle: '渠道',
  axisYTitle: '用户数'
});

// 饼图：占比分析
mcp__mcphub__mcp-server-chart-generate_pie_chart({
  data: segmentData.map(d => ({
    category: d.segment,
    value: d.count
  })),
  title: '用户分布',
  innerRadius: 0.6
});
```

---

## 阶段 5: 报告生成

### 报告结构

```markdown
# [分析主题] 分析报告

## 概要
- 分析时间范围: YYYY-MM-DD 到 YYYY-MM-DD
- 数据来源: [表名/数据集]
- 关键发现: [1-2句话总结]

## 关键指标
| 指标 | 数值 | 环比 | 同比 |
|-----|-----|------|-----|
| 指标1 | xxx | +x% | +x% |
| 指标2 | xxx | -x% | +x% |

## 趋势分析
[插入趋势图]

主要发现：
1. 发现1
2. 发现2

## 分布分析
[插入分布图]

主要发现：
1. 发现1
2. 发现2

## 结论与建议
### 结论
1. 结论1
2. 结论2

### 建议
1. 建议1
2. 建议2

## 附录
- 数据查询: [SQL 或查询描述]
- 数据处理: [处理逻辑说明]
```

---

## 常见分析场景

### 场景 1: 用户增长分析

```
查询:
- 每日新增用户
- 按渠道分布
- 留存率计算

输出:
- 用户增长趋势图
- 渠道对比柱状图
- 留存曲线
```

### 场景 2: 收入分析

```
查询:
- 每日/每月收入
- 按产品分类
- 按客户分层

输出:
- 收入趋势图
- 产品收入对比
- 客户分层饼图
```

### 场景 3: 转化漏斗

```
查询:
- 各阶段用户数
- 转化率计算
- 流失原因

输出:
- 漏斗图
- 各阶段转化率
- 优化建议
```

---

## 最佳实践

1. **数据验证** - 检查数据质量和完整性
2. **异常处理** - 识别并处理异常值
3. **可复现** - 记录查询和处理逻辑
4. **可视化清晰** - 图表标题、坐标轴、图例完整
5. **结论明确** - 基于数据给出明确结论

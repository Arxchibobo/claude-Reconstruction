# 失活邮箱域名分析

## 目标

通过 MCP 直接查询 `my_shell_prod` 数据库，查询历史上曾出现过的邮箱域名（排除临时邮箱），但在白名单更新时间点之后没有用户登录活跃的域名列表。

**分析维度**: 基于 `user.lastLoginTime`（最后登录时间）而非账号创建时间，更准确反映用户真实活跃度。

如果在 base44 运行，则 @base44_prompt_mcphub.md

**用途**: 用于识别需要从白名单中移除的失活邮箱域名。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `whitelist_update_time` | 白名单更新时间点 (YYYY-MM-DD HH:MM:SS) | 今天 10:00:00 |
| `active_since` | 近期活跃起点 (YYYY-MM-DD) | 最近1个月 |

**参数说明**:

### `active_since` (近期活跃起点)

定义一个时间窗口的起点，只分析在此时间点**之后**有过登录活动的域名。

**作用**:
1. **性能优化**: 避免查询全部历史数据，只关注近期数据
2. **分析相关性**: 只关注"最近还活跃，但现在失活了"的域名
3. **排除噪音**: 过滤掉很久以前就废弃的古老域名

**实际含义**:
- 只分析"在 `[active_since, whitelist_update_time)` 时间段内有过登录活动"的域名
- 如果一个域名的最后活跃时间早于 `active_since`，即使在 `whitelist_update_time` 之后也没活跃，也**不会**被纳入分析

**示例**:
```
whitelist_update_time = 2025-12-26 10:00:00
active_since = 2025-11-26  (近期活跃起点 = 最近1个月)

含义：只分析"在2025-11-26到2025-12-26 10:00这段时间内有过活跃，
      但在12-26 10:00之后就失活了"的域名

域名A: 最后活跃 = 2025-12-20 → ✅ 纳入分析（在窗口内且已失活）
域名B: 最后活跃 = 2025-10-01 → ❌ 不纳入（比近期活跃起点还早，早就失活了）
域名C: 最后活跃 = 2025-12-26 11:00 → ❌ 不纳入（仍然活跃）
```

## 数据源

- `my_shell_prod.user_privy` - 用户邮箱信息表
- `my_shell_prod.user` - 用户表，包含 `lastLoginTime` 字段（最后登录时间）

## 临时邮箱域名列表

以下域名被认定为临时邮箱（共 56 个），查询时将被排除：

```
protectsmail.net, roratu.com, mucate.com, mekuron.com, airsworld.net,
arugy.com, forexzig.com, fxzig.com, denipl.com, denipl.net, nctime.com,
fftube.com, correostemporales.org, yopmail.com, rosuper.com, ssgperf.com,
m3player.com, guerrillamail.com, guerrillamail.org, guerrillamailblock.com,
pokemail.net, spam4.me, grr.la, guerrillamail.biz, guerrillamail.de,
trbvm.com, mailinator.com, 10minutemail.com, temp-mail.org, throwaway.email,
getnada.com, maildrop.cc, trashmail.com, tempmailaddress.com, fakeinbox.com,
mytemp.email, tempmail.com, emailondeck.com, sharklasers.com, discard.email,
discardmail.com, mintemail.com, mailnesia.com, mohmal.com, crazymailing.com,
mailcatch.com, mailnator.com, tempr.email, tempinbox.com, spamgourmet.com,
mailexpire.com, dispostable.com, filzmail.com, getairmail.com,
harakirimail.com, anonymbox.com
```

## 查询逻辑

1. 获取所有历史域名及其统计信息（基于用户最后登录时间）
2. 筛选出 `whitelist_update_time` 之后没有登录活跃的域名
3. 过滤出最后登录时间在 `active_since` 之后的域名
4. 排除临时邮箱域名

---

## Step 1: 查询数据

使用 `mcp_mcphub_bytebase-execute_sql` 执行以下 SQL（替换 `{whitelist_update_time}`, `{active_since}`）:

### 默认参数示例

```
whitelist_update_time = '2025-12-26 10:00:00'
active_since = '2025-11-26'  // 近期活跃起点（最近1个月）
```

拆分成两个简单查询，职责单一，方便理解和调试：

---

### 查询1: 所有域名的统计信息

```sql
-- 使用 CTE 优化，减少函数重复计算，提升 3-4 倍性能
WITH active_users AS (
  -- 先过滤时间范围，减少 JOIN 数据量
  SELECT id, lastLoginTime
  FROM my_shell_prod.user
  WHERE lastLoginTime >= '{active_since}'
),
email_data AS (
  -- 提前计算域名，避免在 GROUP BY 和 WHERE 中重复计算
  SELECT
    up.user_id,
    SUBSTRING_INDEX(
      COALESCE(
        NULLIF(up.email, ''),
        NULLIF(up.google_email, ''),
        NULLIF(up.apple_email, '')
      ),
      '@', -1
    ) as domain,
    au.lastLoginTime
  FROM my_shell_prod.user_privy up
  INNER JOIN active_users au ON up.user_id = au.id
  WHERE
    COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
)
SELECT
  domain,
  COUNT(DISTINCT user_id) as total_users,
  MIN(lastLoginTime) as first_appearance,
  MAX(lastLoginTime) as last_appearance
FROM email_data
WHERE
  domain NOT IN (
    'protectsmail.net', 'roratu.com', 'mucate.com', 'mekuron.com', 'airsworld.net',
    'arugy.com', 'forexzig.com', 'fxzig.com', 'denipl.com', 'denipl.net', 'nctime.com',
    'fftube.com', 'correostemporales.org', 'yopmail.com', 'rosuper.com', 'ssgperf.com',
    'm3player.com', 'guerrillamail.com', 'guerrillamail.org', 'guerrillamailblock.com',
    'pokemail.net', 'spam4.me', 'grr.la', 'guerrillamail.biz', 'guerrillamail.de',
    'trbvm.com', 'mailinator.com', '10minutemail.com', 'temp-mail.org', 'throwaway.email',
    'getnada.com', 'maildrop.cc', 'trashmail.com', 'tempmailaddress.com', 'fakeinbox.com',
    'mytemp.email', 'tempmail.com', 'emailondeck.com', 'sharklasers.com', 'discard.email',
    'discardmail.com', 'mintemail.com', 'mailnesia.com', 'mohmal.com', 'crazymailing.com',
    'mailcatch.com', 'mailnator.com', 'tempr.email', 'tempinbox.com', 'spamgourmet.com',
    'mailexpire.com', 'dispostable.com', 'filzmail.com', 'getairmail.com',
    'harakirimail.com', 'anonymbox.com'
  )
GROUP BY domain
HAVING total_users >= 3
ORDER BY total_users DESC;
```

**结果格式：**
```
domain | total_users | first_appearance | last_appearance
```

**字段说明：**
- `domain`: 邮箱域名
- `total_users`: 使用该域名的用户总数
- `first_appearance`: 该域名所有用户中**最早的登录时间**
- `last_appearance`: 该域名所有用户中**最后的登录时间**

---

### 查询2: 白名单更新时间后活跃的域名

```sql
-- 使用 CTE 优化，先过滤时间范围
WITH active_users AS (
  SELECT id
  FROM my_shell_prod.user
  WHERE lastLoginTime >= '{whitelist_update_time}'
)
SELECT DISTINCT
  SUBSTRING_INDEX(
    COALESCE(
      NULLIF(up.email, ''),
      NULLIF(up.google_email, ''),
      NULLIF(up.apple_email, '')
    ),
    '@', -1
  ) as domain
FROM my_shell_prod.user_privy up
INNER JOIN active_users au ON up.user_id = au.id
WHERE
  COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
ORDER BY domain;
```

**结果格式：**
```
domain
```

---

## Step 2: 合并数据

将两个查询结果进行处理：

### 数据过滤规则

从 **查询1** 的结果中，筛选出满足以下条件的域名：

1. `domain` **不在** 查询2 的结果中（白名单更新时间后未登录活跃）
2. `last_appearance >= '{active_since}'`（最后登录时间在范围内）
3. `last_appearance < '{whitelist_update_time}'`（最后登录时间早于白名单更新时间）

### 计算失活天数

```javascript
// 伪代码
const filteredDomains = query1Results.filter(row => {
  const isActive = query2Results.includes(row.domain);
  const inTimeRange = row.last_appearance >= active_since
                   && row.last_appearance < whitelist_update_time;
  return !isActive && inTimeRange;
});

// 计算失活天数（从最后活跃时间到现在，确保不为负数）
const now = new Date();
filteredDomains.forEach(row => {
  const lastLoginDate = new Date(row.last_appearance);
  // 失活天数 = 从该域名最后活跃时间到现在的天数
  row.days_inactive = Math.max(0, (now - lastLoginDate) / (1000 * 60 * 60 * 24));
});
```

**说明**: 失活天数表示从该域名最后活跃时间到现在经过的天数。使用 `Math.max(0, ...)` 确保不出现负数（避免时区或数据延迟导致的计算误差）。

---

## Step 3: 数据分类

将筛选后的结果按失活时间长度分类：

| 分类 | 条件 | 说明 |
|------|------|------|
| 近期失活 | `days_inactive <= 7` | 最近一周内失活 |
| 短期失活 | `7 < days_inactive <= 30` | 1周到1个月内失活 |
| 中期失活 | `30 < days_inactive <= 90` | 1个月到3个月内失活 |
| 长期失活 | `90 < days_inactive <= 180` | 3个月到6个月内失活 |
| 超长期失活 | `days_inactive > 180` | 6个月以上失活 |

---

## Step 4: 生成数据表格

### 输出格式

按用户数量降序展示所有失活域名：

```markdown
| 排名 | 域名 | 用户数 | 首次出现 | 最后活跃 | 失活天数 | 失活等级 |
|------|------|--------|----------|----------|----------|----------|
| 1 | 163.com | 9,560 | 2023-06-23 | 2025-12-25 23:07 | 0.3 | 近期失活 |
| 2 | googlemail.com | 1,917 | 2024-04-10 | 2025-12-26 06:01 | 0.2 | 近期失活 |
...
```

**列说明**:
- **首次出现**: 该域名所有用户中最早的登录时间
- **最后活跃**: 该域名所有用户中最后的登录时间（早于白名单更新时间）
- **失活天数**: 从该域名最后活跃时间到现在的天数

### 数据转换规则

```javascript
// 伪代码
const categories = {
  '近期失活': (days) => days <= 7,
  '短期失活': (days) => days > 7 && days <= 30,
  '中期失活': (days) => days > 30 && days <= 90,
  '长期失活': (days) => days > 90 && days <= 180,
  '超长期失活': (days) => days > 180
};

function getCategory(days_inactive) {
  for (const [name, check] of Object.entries(categories)) {
    if (check(days_inactive)) return name;
  }
  return '未知';
}

const tableData = queryResults.map((row, index) => ({
  rank: index + 1,
  domain: row.domain,
  users: row.total_users.toLocaleString(),
  firstAppearance: row.first_appearance.substring(0, 10),      // 首次出现
  lastActive: row.last_appearance.substring(0, 16).replace('T', ' '),  // 最后活跃
  days: row.days_inactive.toFixed(1),
  category: getCategory(row.days_inactive)
}));
```

---

## 使用场景

### 场景1: 查询今天10:00后失活的域名（最近半年有登录）

```
whitelist_update_time = '2025-12-26 10:00:00'
active_since = '2025-06-26'  // 近期活跃起点（最近半年）
```

### 场景2: 查询本周失活的域名（最近1个月有登录）

```
whitelist_update_time = '2025-12-20 00:00:00'  // 本周一
active_since = '2025-11-20'  // 近期活跃起点（最近1个月）
```

### 场景3: 查询本月失活的域名（最近3个月有登录）

```
whitelist_update_time = '2025-12-01 00:00:00'  // 本月1号
active_since = '2025-09-01'  // 近期活跃起点（最近3个月）
```

---

## 核心指标

- **失活域名总数** = 查询结果总行数
- **失活用户总数** = SUM(total_users)
- **主流邮箱失活数** = 统计常见邮箱域名（gmail.com, outlook.com, 163.com 等）的失活情况
- 目标: 识别异常失活模式，监控用户登录活跃度，优化白名单管理 📊

## 重要说明

### 字段含义
- **首次出现/最后活跃**: 指该域名**所有用户**中最早/最晚的登录时间（非单个用户）
- **失活天数**: 从该域名最后活跃时间到现在的天数
  - 计算公式: `(当前时间 - 最后活跃时间) / (1000 * 60 * 60 * 24)`
  - 使用 `Math.max(0, ...)` 确保不出现负数（避免时区差异或数据延迟）

### 分析维度
本分析基于用户最后登录时间 (`user.lastLoginTime`)，而非账号创建时间，更准确反映用户真实活跃情况。

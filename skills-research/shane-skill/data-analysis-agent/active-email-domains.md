# 活跃邮箱域名分析

## 目标

通过 MCP 直接查询 `my_shell_prod` 数据库，获取最近一周内有用户登录的邮箱域名列表（排除已知临时邮箱），**列出所有域名供人工审核**。

**分析维度**: 基于 `user.lastLoginTime`（最后登录时间）

如果在 base44 运行，则 @base44_prompt_mcphub.md

**用途**: 人工识别正常邮箱域名，用于白名单管理。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `days` | 查询最近 N 天内的活跃用户 | 7 |

## 数据源

- `my_shell_prod.user_privy` - 用户邮箱信息表
- `my_shell_prod.user` - 用户表，包含 `lastLoginTime` 字段（最后登录时间）
- `my_shell_prod.app_setting` - 应用配置表，`name='art_trial_email_whitelist'` 存储白名单域名

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

---

## Step 1: 获取当前白名单

使用 `mcp_mcphub_bytebase-execute_sql` 执行：

```sql
SELECT value FROM my_shell_prod.app_setting WHERE name = 'art_trial_email_whitelist';
```

**结果**: 逗号分隔的域名列表，用于后续过滤。

---

## Step 2: 查询活跃域名

使用 `mcp_mcphub_bytebase-execute_sql` 执行以下 SQL（替换 `{days}`）:

### 默认参数

```
days = 7  // 最近一周
```

### 查询: 最近一周活跃的所有邮箱域名

```sql
SELECT
  LOWER(SUBSTRING_INDEX(
    COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')),
    '@', -1
  )) as domain,
  COUNT(DISTINCT up.user_id) as active_users
FROM my_shell_prod.user_privy up
INNER JOIN my_shell_prod.user u ON up.user_id = u.id
WHERE
  u.lastLoginTime >= DATE_SUB(NOW(), INTERVAL {days} DAY)
  AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
GROUP BY domain
ORDER BY active_users DESC;
```

**结果**: `domain | active_users`

---

## Step 3: 过滤域名

将 Step 2 的结果过滤，**排除白名单和临时邮箱**。

```javascript
// 伪代码
const whitelist = step1Result.value.split(',').map(d => d.trim().toLowerCase());

const tempEmails = [
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
];

const filtered = step2Results.filter(row =>
  !whitelist.includes(row.domain) &&
  !tempEmails.includes(row.domain)
);
```

---

## Step 4: 人工审核

查询结果按用户数量降序排列，**需要人工逐一审核**判断是否为正常邮箱。

### 审核要点

**疑似正常邮箱特征：**
- 知名邮箱服务商（gmail, outlook, yahoo, 163, qq 等）
- 企业/学校域名（xxx.edu, xxx.com 等正规机构）
- 域名格式规范，无随机字符

**疑似临时邮箱特征：**
- 域名包含 temp, mail, trash, fake, disposable 等关键词
- 域名过长或包含随机字符组合
- 非常见后缀（.xyz, .top, .click 等）
- 只有极少量用户（1-2人）

### 输出格式

```markdown
| 排名 | 域名 | 活跃用户数 | 最早登录 | 最后登录 |
|------|------|------------|----------|----------|
| 1 | gmail.com | 12,345 | 2025-01-01 08:00 | 2025-01-07 23:59 |
| 2 | outlook.com | 5,678 | 2025-01-01 09:00 | 2025-01-07 22:30 |
...
```

---

## 使用场景

### 场景1: 查询最近一周活跃的域名（默认）

```
days = 7
```

### 场景2: 查询最近一天活跃的域名

```
days = 1
```

---

## 核心指标

- **活跃域名总数** = 查询结果总行数
- **活跃用户总数** = SUM(active_users)

## 重要说明

- SQL 只负责查询，不做任何过滤
- 白名单 + 临时邮箱在应用层统一过滤（Step 3）
- 最终结果需要**人工审核**
- 建议关注用户数较多的域名优先审核

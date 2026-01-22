# 每日成本趋势图 (Stacked Area Chart)

## 目标

通过 MCP 直接查询 `my_shell_prod` 数据库，生成按用户类型堆叠的每日成本趋势图。

如果在 base44 运行，则 @base44_prompt_mcphub.md。

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `start_date` | 开始日期 (YYYY-MM-DD) | 7天前 |
| `end_date` | 结束日期 (YYYY-MM-DD) | 昨天 |

## 数据源

- `my_shell_prod.art_task` - 任务表，包含成本数据
- `my_shell_prod.user` - 用户表，包含 source 字段
- `my_shell_prod.user_privy` - 用户邮箱信息

## 临时邮箱域名列表

以下域名被认定为临时邮箱（共 56 个）：

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

## 白名单邮箱域名列表

以下域名被认定为白名单邮箱（共 153 个，来源：[Notion 白名单](https://www.notion.so/myshellai/2d43f81ff51e805cb05df7eef873f2f5)）：

```
126.com, 139.com, 163.com, abv.bg, alice.it, aol.com, arcor.de, asia.com,
au.com, azet.sk, bk.ru, bluewin.ch, btinternet.com, centrum.cz, charter.net,
comcast.net, daum.net, docomo.ne.jp, earthlink.net, email.cz, email.it,
ezweb.ne.jp, fastmail.com, foxmail.com, free.fr, freenet.de, gmail.com,
gmx.at, gmx.ch, gmx.com, gmx.de, gmx.fr, gmx.net, googlemail.com, hanmail.net,
hey.com, hotmail.ca, hotmail.co.uk, hotmail.com, hotmail.de, hotmail.es,
hotmail.fr, hotmail.it, icloud.com, inbox.eu, inbox.lv, inbox.ru, interia.com,
interia.pl, internet.ru, iol.pt, laposte.net, libero.it, list.ru, live.ca,
live.com, live.de, live.fr, live.it, live.nl, live.se, mac.com, mail.com,
mail.ee, mail.ru, mailbox.org, me.com, msn.com, naver.com, netzero.net,
nifty.com, ntlworld.com, o2.pl, onet.pl, op.pl, orange.fr, outlook.co.id,
outlook.com, outlook.com.br, outlook.com.gr, outlook.cz, outlook.de,
outlook.es, outlook.hu, outlook.it, outlook.ph, petalmail.com, pm.me,
poczta.fm, post.com, posteo.de, prokonto.pl, proton.me, protonmail.com,
qq.com, rambler.ru, rediffmail.com, ro.ru, rocketmail.com, rogers.com,
runbox.com, sapo.pt, sbcglobal.net, seznam.cz, sfr.fr, sina.com, sky.com,
softbank.ne.jp, sohu.com, spoko.pl, t-online.de, telefonica.net, telus.net,
terra.com, tim.it, tin.it, tlen.pl, tuta.io, tutamail.com, tutanota.com,
ukr.net, verizon.net, virgilio.it, vk.com, vp.pl, wanadoo.fr, web.de, wp.pl,
ya.ru, yahoo.ca, yahoo.co.in, yahoo.co.jp, yahoo.com, yahoo.com.au, yahoo.de,
yahoo.es, yahoo.fr, yahoo.in, yahoo.it, yandex.ru, yeah.net, ymail.com,
zoho.com, zohomail.com, zoznam.sk
```

## 用户分类逻辑（互斥分类）

**重要**：以下分类是互斥的，每个用户的每次任务只会被计入一个分类，确保成本总和准确。

| 类型 | 条件 | 优先级 |
|------|------|--------|
| 付费用户 | `user_membership_type != 'FREE'` | 1 |
| 免费-Gmail别名 ⚠️ | `user_membership_type = 'FREE'` + Gmail/Googlemail 邮箱 + 包含 `+` 符号（包括活跃用户和已删除用户） | 2 |
| 免费-临时邮箱 | `user_membership_type = 'FREE'` + 邮箱域名在临时邮箱列表中 + **不是Gmail别名** | 3 |
| 免费-常用邮箱 | `user_membership_type = 'FREE'` + 有邮箱 + **不是临时邮箱** + **不是Gmail别名** | 4 |
| 免费-已删除 | `user_membership_type = 'FREE'` + `user.source = 'privy'` + `user_privy` 无记录 + **不是Gmail别名** | 5 |
| 免费-访客 | `user_membership_type = 'FREE'` + `user.source = 'visitor'` | 6 |

**分类说明**：
- **Gmail别名** 作为独立分类优先识别，不会被计入其他免费用户分类
- 包括活跃用户（从 `user_privy` 查询）和已删除用户（从 `delete_user_log` 查询）
- 其他免费分类均需排除 Gmail 别名用户，避免重复计数

---

## Step 1: 查询数据

使用 `mcp_mcphub_bytebase-execute_sql` 执行以下 SQL（替换 `{start_date}` 和 `{end_date}`）:

### 查询1: 付费用户每日成本

```sql
SELECT
  DATE(created_date) as snapshot_date,
  SUM(actual_energy_cost) / 100 as paid_cost
FROM my_shell_prod.art_task
WHERE user_membership_type != 'FREE'
  AND status IN ('done', 'cancel')
  AND DATE(created_date) >= '{start_date}'
  AND DATE(created_date) <= '{end_date}'
GROUP BY DATE(created_date)
ORDER BY snapshot_date
```

### 查询2: 免费用户每日成本 (按类型分组)

拆分成 5 个独立查询，每个查询职责单一，方便理解和调试：

#### 查询2a: 临时邮箱用户成本

```sql
-- 临时邮箱用户：有邮箱 + 域名在临时邮箱列表中
SELECT
  DATE(at.created_date) as snapshot_date,
  SUM(at.actual_energy_cost) / 100 as temp_email_cost
FROM my_shell_prod.art_task at
LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
WHERE at.user_membership_type = 'FREE'
  AND at.status IN ('done', 'cancel')
  AND DATE(at.created_date) >= '{start_date}'
  AND DATE(at.created_date) <= '{end_date}'
  -- 有邮箱
  AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
  -- 邮箱域名在临时邮箱列表中
  AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
      IN ('protectsmail.net', 'roratu.com', 'mucate.com', 'mekuron.com', 'airsworld.net',
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
          'harakirimail.com', 'anonymbox.com')
GROUP BY DATE(at.created_date)
ORDER BY snapshot_date
```

#### 查询2b: Gmail 别名用户成本

```sql
-- Gmail 别名用户：Gmail/Googlemail 域名 + 包含 '+' 符号（包含已删除用户）
WITH free_users_with_email AS (
  SELECT
    at.user_id,
    DATE(at.created_date) as task_date,
    at.actual_energy_cost / 100 as cost_usd,
    COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) as active_email,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.email')) as deleted_email,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.google_email')) as deleted_google_email,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.apple_email')) as deleted_apple_email,
    CASE WHEN dul.user_id IS NOT NULL THEN 1 ELSE 0 END as is_deleted
  FROM my_shell_prod.art_task at
  LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
  LEFT JOIN my_shell_prod.delete_user_log dul ON at.user_id = dul.user_id AND dul.source = 'user_privy'
  WHERE at.user_membership_type = 'FREE'
    AND at.status IN ('done', 'cancel')
    AND DATE(at.created_date) >= '{start_date}'
    AND DATE(at.created_date) <= '{end_date}'
)
SELECT
  task_date as snapshot_date,
  SUM(cost_usd) as gmail_alias_cost
FROM free_users_with_email
WHERE (
  -- 已删除用户的 Gmail 别名
  (is_deleted = 1
   AND SUBSTRING_INDEX(COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
   AND COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')) LIKE '%+%@%')
  OR
  -- 活跃用户的 Gmail 别名
  (is_deleted = 0
   AND SUBSTRING_INDEX(active_email, '@', -1) IN ('gmail.com', 'googlemail.com')
   AND active_email LIKE '%+%@%')
)
GROUP BY task_date
ORDER BY snapshot_date
```

#### 查询2c: 白名单邮箱用户成本

```sql
-- 白名单邮箱用户：有邮箱 + 域名在白名单中 + 排除 Gmail 别名
SELECT
  DATE(at.created_date) as snapshot_date,
  SUM(at.actual_energy_cost) / 100 as whitelist_email_cost
FROM my_shell_prod.art_task at
LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
WHERE at.user_membership_type = 'FREE'
  AND at.status IN ('done', 'cancel')
  AND DATE(at.created_date) >= '{start_date}'
  AND DATE(at.created_date) <= '{end_date}'
  -- 有邮箱
  AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
  -- 邮箱域名在白名单中
  AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
      IN ('126.com', '139.com', '163.com', 'abv.bg', 'alice.it', 'aol.com', 'arcor.de', 'asia.com',
          'au.com', 'azet.sk', 'bk.ru', 'bluewin.ch', 'btinternet.com', 'centrum.cz', 'charter.net',
          'comcast.net', 'daum.net', 'docomo.ne.jp', 'earthlink.net', 'email.cz', 'email.it',
          'ezweb.ne.jp', 'fastmail.com', 'foxmail.com', 'free.fr', 'freenet.de', 'gmail.com',
          'gmx.at', 'gmx.ch', 'gmx.com', 'gmx.de', 'gmx.fr', 'gmx.net', 'googlemail.com', 'hanmail.net',
          'hey.com', 'hotmail.ca', 'hotmail.co.uk', 'hotmail.com', 'hotmail.de', 'hotmail.es',
          'hotmail.fr', 'hotmail.it', 'icloud.com', 'inbox.eu', 'inbox.lv', 'inbox.ru', 'interia.com',
          'interia.pl', 'internet.ru', 'iol.pt', 'laposte.net', 'libero.it', 'list.ru', 'live.ca',
          'live.com', 'live.de', 'live.fr', 'live.it', 'live.nl', 'live.se', 'mac.com', 'mail.com',
          'mail.ee', 'mail.ru', 'mailbox.org', 'me.com', 'msn.com', 'naver.com', 'netzero.net',
          'nifty.com', 'ntlworld.com', 'o2.pl', 'onet.pl', 'op.pl', 'orange.fr', 'outlook.co.id',
          'outlook.com', 'outlook.com.br', 'outlook.com.gr', 'outlook.cz', 'outlook.de',
          'outlook.es', 'outlook.hu', 'outlook.it', 'outlook.ph', 'petalmail.com', 'pm.me',
          'poczta.fm', 'post.com', 'posteo.de', 'prokonto.pl', 'proton.me', 'protonmail.com',
          'qq.com', 'rambler.ru', 'rediffmail.com', 'ro.ru', 'rocketmail.com', 'rogers.com',
          'runbox.com', 'sapo.pt', 'sbcglobal.net', 'seznam.cz', 'sfr.fr', 'sina.com', 'sky.com',
          'softbank.ne.jp', 'sohu.com', 'spoko.pl', 't-online.de', 'telefonica.net', 'telus.net',
          'terra.com', 'tim.it', 'tin.it', 'tlen.pl', 'tuta.io', 'tutamail.com', 'tutanota.com',
          'ukr.net', 'verizon.net', 'virgilio.it', 'vk.com', 'vp.pl', 'wanadoo.fr', 'web.de', 'wp.pl',
          'ya.ru', 'yahoo.ca', 'yahoo.co.in', 'yahoo.co.jp', 'yahoo.com', 'yahoo.com.au', 'yahoo.de',
          'yahoo.es', 'yahoo.fr', 'yahoo.in', 'yahoo.it', 'yandex.ru', 'yeah.net', 'ymail.com',
          'zoho.com', 'zohomail.com', 'zoznam.sk')
  -- 排除 Gmail 别名用户（互斥分类）
  AND NOT (
    SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
    AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) LIKE '%+%@%'
  )
GROUP BY DATE(at.created_date)
ORDER BY snapshot_date
```

#### 查询2d: 其他邮箱用户成本

```sql
-- 其他邮箱用户：有邮箱 + 域名不在临时邮箱列表中 + 不在白名单中 + 排除 Gmail 别名
SELECT
  DATE(at.created_date) as snapshot_date,
  SUM(at.actual_energy_cost) / 100 as other_email_cost
FROM my_shell_prod.art_task at
LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
WHERE at.user_membership_type = 'FREE'
  AND at.status IN ('done', 'cancel')
  AND DATE(at.created_date) >= '{start_date}'
  AND DATE(at.created_date) <= '{end_date}'
  -- 有邮箱
  AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) IS NOT NULL
  -- 邮箱域名不在临时邮箱列表中
  AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
      NOT IN ('protectsmail.net', 'roratu.com', 'mucate.com', 'mekuron.com', 'airsworld.net',
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
              'harakirimail.com', 'anonymbox.com')
  -- 邮箱域名不在白名单中
  AND SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1)
      NOT IN ('126.com', '139.com', '163.com', 'abv.bg', 'alice.it', 'aol.com', 'arcor.de', 'asia.com',
              'au.com', 'azet.sk', 'bk.ru', 'bluewin.ch', 'btinternet.com', 'centrum.cz', 'charter.net',
              'comcast.net', 'daum.net', 'docomo.ne.jp', 'earthlink.net', 'email.cz', 'email.it',
              'ezweb.ne.jp', 'fastmail.com', 'foxmail.com', 'free.fr', 'freenet.de', 'gmail.com',
              'gmx.at', 'gmx.ch', 'gmx.com', 'gmx.de', 'gmx.fr', 'gmx.net', 'googlemail.com', 'hanmail.net',
              'hey.com', 'hotmail.ca', 'hotmail.co.uk', 'hotmail.com', 'hotmail.de', 'hotmail.es',
              'hotmail.fr', 'hotmail.it', 'icloud.com', 'inbox.eu', 'inbox.lv', 'inbox.ru', 'interia.com',
              'interia.pl', 'internet.ru', 'iol.pt', 'laposte.net', 'libero.it', 'list.ru', 'live.ca',
              'live.com', 'live.de', 'live.fr', 'live.it', 'live.nl', 'live.se', 'mac.com', 'mail.com',
              'mail.ee', 'mail.ru', 'mailbox.org', 'me.com', 'msn.com', 'naver.com', 'netzero.net',
              'nifty.com', 'ntlworld.com', 'o2.pl', 'onet.pl', 'op.pl', 'orange.fr', 'outlook.co.id',
              'outlook.com', 'outlook.com.br', 'outlook.com.gr', 'outlook.cz', 'outlook.de',
              'outlook.es', 'outlook.hu', 'outlook.it', 'outlook.ph', 'petalmail.com', 'pm.me',
              'poczta.fm', 'post.com', 'posteo.de', 'prokonto.pl', 'proton.me', 'protonmail.com',
              'qq.com', 'rambler.ru', 'rediffmail.com', 'ro.ru', 'rocketmail.com', 'rogers.com',
              'runbox.com', 'sapo.pt', 'sbcglobal.net', 'seznam.cz', 'sfr.fr', 'sina.com', 'sky.com',
              'softbank.ne.jp', 'sohu.com', 'spoko.pl', 't-online.de', 'telefonica.net', 'telus.net',
              'terra.com', 'tim.it', 'tin.it', 'tlen.pl', 'tuta.io', 'tutamail.com', 'tutanota.com',
              'ukr.net', 'verizon.net', 'virgilio.it', 'vk.com', 'vp.pl', 'wanadoo.fr', 'web.de', 'wp.pl',
              'ya.ru', 'yahoo.ca', 'yahoo.co.in', 'yahoo.co.jp', 'yahoo.com', 'yahoo.com.au', 'yahoo.de',
              'yahoo.es', 'yahoo.fr', 'yahoo.in', 'yahoo.it', 'yandex.ru', 'yeah.net', 'ymail.com',
              'zoho.com', 'zohomail.com', 'zoznam.sk')
  -- 排除 Gmail 别名用户（互斥分类）
  AND NOT (
    SUBSTRING_INDEX(COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
    AND COALESCE(NULLIF(up.email, ''), NULLIF(up.google_email, ''), NULLIF(up.apple_email, '')) LIKE '%+%@%'
  )
GROUP BY DATE(at.created_date)
ORDER BY snapshot_date
```

#### 查询2e: 已删除用户成本

```sql
-- 已删除用户：user.source = 'privy' 但 user_privy 表无记录 + 排除 Gmail 别名
WITH deleted_users AS (
  SELECT
    at.user_id,
    DATE(at.created_date) as task_date,
    at.actual_energy_cost / 100 as cost_usd,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.email')) as deleted_email,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.google_email')) as deleted_google_email,
    JSON_UNQUOTE(JSON_EXTRACT(dul.info, '$.apple_email')) as deleted_apple_email
  FROM my_shell_prod.art_task at
  LEFT JOIN my_shell_prod.user u ON at.user_id = u.id
  LEFT JOIN my_shell_prod.user_privy up ON at.user_id = up.user_id
  LEFT JOIN my_shell_prod.delete_user_log dul ON at.user_id = dul.user_id AND dul.source = 'user_privy'
  WHERE at.user_membership_type = 'FREE'
    AND at.status IN ('done', 'cancel')
    AND DATE(at.created_date) >= '{start_date}'
    AND DATE(at.created_date) <= '{end_date}'
    AND u.source = 'privy'
    AND up.user_id IS NULL
)
SELECT
  task_date as snapshot_date,
  SUM(cost_usd) as deleted_user_cost
FROM deleted_users
WHERE NOT (
  -- 排除 Gmail 别名用户（互斥分类）
  SUBSTRING_INDEX(COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')), '@', -1) IN ('gmail.com', 'googlemail.com')
  AND COALESCE(NULLIF(deleted_email, ''), NULLIF(deleted_google_email, ''), NULLIF(deleted_apple_email, '')) LIKE '%+%@%'
)
GROUP BY task_date
ORDER BY snapshot_date
```

#### 查询2f: 访客用户成本

```sql
-- 访客用户：user.source = 'visitor'
SELECT
  DATE(at.created_date) as snapshot_date,
  SUM(at.actual_energy_cost) / 100 as visitor_cost
FROM my_shell_prod.art_task at
LEFT JOIN my_shell_prod.user u ON at.user_id = u.id
WHERE at.user_membership_type = 'FREE'
  AND at.status IN ('done', 'cancel')
  AND DATE(at.created_date) >= '{start_date}'
  AND DATE(at.created_date) <= '{end_date}'
  -- 用户来源是访客
  AND u.source = 'visitor'
GROUP BY DATE(at.created_date)
ORDER BY snapshot_date
```

---

## Step 2: 合并数据

将查询结果按 `snapshot_date` 合并，得到每日的完整数据：

```
snapshot_date | paid_cost | temp_email_cost | gmail_alias_cost | whitelist_email_cost | other_email_cost | deleted_user_cost | visitor_cost
```

---

## Step 3: 生成图表

使用 `mcp_mcphub_mcp-server-chart-generate_area_chart` 生成堆叠面积图：

```json
{
  "title": "每日成本趋势（按用户类型堆叠）",
  "axisXTitle": "日期",
  "axisYTitle": "成本 ($)",
  "stack": true,
  "data": [
    { "time": "12-19", "value": 95.5, "group": "付费用户" },
    { "time": "12-19", "value": 105.2, "group": "免费-临时邮箱" },
    { "time": "12-19", "value": 32.5, "group": "免费-Gmail别名" },
    { "time": "12-19", "value": 380.3, "group": "免费-白名单邮箱" },
    { "time": "12-19", "value": 70.0, "group": "免费-其他邮箱" },
    { "time": "12-19", "value": 180.1, "group": "免费-已删除" },
    { "time": "12-19", "value": 45.6, "group": "免费-访客" },
    { "time": "12-20", "value": 120.8, "group": "付费用户" },
    ...
  ],
  "style": {
    "palette": ["#3B82F6", "#06B6D4", "#EAB308", "#F97316", "#10B981", "#D946EF", "#8B5CF6"]
  }
}
```

### 数据转换规则

将 SQL 结果转换为 chart data 格式：

```javascript
// 伪代码
const chartData = [];
for (const row of mergedData) {
  const date = row.snapshot_date.slice(5); // "2025-12-19" → "12-19"
  chartData.push({ time: date, value: row.paid_cost, group: "付费用户" });
  chartData.push({ time: date, value: row.temp_email_cost, group: "免费-临时邮箱" });
  chartData.push({ time: date, value: row.gmail_alias_cost, group: "免费-Gmail别名" });
  chartData.push({ time: date, value: row.whitelist_email_cost, group: "免费-白名单邮箱" });
  chartData.push({ time: date, value: row.other_email_cost, group: "免费-其他邮箱" });
  chartData.push({ time: date, value: row.deleted_user_cost, group: "免费-已删除" });
  chartData.push({ time: date, value: row.visitor_cost, group: "免费-访客" });
}
```

---

## 颜色配置

| group | 颜色 |
|-------|------|
| 付费用户 | `#3B82F6` (蓝色) |
| 免费-临时邮箱 | `#06B6D4` (青色) |
| 免费-Gmail别名 | `#EAB308` (黄色) ⚠️ |
| 免费-白名单邮箱 | `#F97316` (橙色) |
| 免费-其他邮箱 | `#10B981` (绿色) |
| 免费-已删除 | `#D946EF` (粉色) |
| 免费-访客 | `#8B5CF6` (紫色) |

---

## 核心指标

- **免费成本占比** = 免费总成本 / 总成本 × 100%
- 目标: 免费成本占比趋势向下 📉

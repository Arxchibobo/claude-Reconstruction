# Bot收入归因系统 - 部署指南

## 前置要求

1. ✅ Vercel账号
2. ✅ PostgreSQL数据库（推荐Neon或Supabase）
3. ✅ MySQL数据库访问（my_shell_prod）
4. ✅ Node.js 18+

## 部署步骤

### 1. 准备PostgreSQL数据库

**推荐方案A: Neon (免费额度足够)**

1. 访问 https://neon.tech
2. 创建新项目
3. 复制连接字符串 (格式: `postgresql://user:password@host/dbname`)

**推荐方案B: Supabase**

1. 访问 https://supabase.com
2. 创建新项目
3. 从Settings > Database获取连接字符串

### 2. 配置环境变量

在Vercel项目设置中添加以下环境变量：

```bash
# PostgreSQL (for storing snapshots)
DATABASE_URL=postgresql://user:password@host:5432/database

# MySQL Source Database (my_shell_prod)
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password

# Vercel Cron Secret (generate random string)
CRON_SECRET=$(openssl rand -hex 32)

# Optional: Slack notifications
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
```

### 3. 安装依赖并推送数据库Schema

```bash
cd functions

# 安装依赖
npm install

# 推送schema到PostgreSQL
npm run db:push
```

**验证Schema**:
```bash
# 打开Drizzle Studio查看表结构
npm run db:studio
```

应该看到以下表：
- `daaf_bot_revenue_snapshots`
- `daaf_daily_summary_snapshots`
- `daaf_cost_daily_snapshots`
- `daaf_free_cost_by_bot_snapshots`

### 4. 本地测试

```bash
# 测试归因逻辑（需要配置MySQL访问）
npx tsx test-attribution.ts 2026-01-01
```

**预期输出**:
```
🧪 Testing Bot Attribution System
📅 Date: 2026-01-01

📊 Attribution Summary:
   Total Revenue: $1,106.46
   Total Orders: 54
   Attributed Orders: 38
   Coverage: 70.37%

✅ Attribution test completed successfully
```

如果测试失败，检查：
- MySQL连接配置是否正确
- 数据库是否有该日期的数据
- art_task表是否有bot_id字段

### 5. 部署到Vercel

```bash
# 首次部署
vercel

# 生产环境部署
vercel --prod
```

### 6. 验证Cron Job配置

1. 访问 Vercel Dashboard > Your Project > Settings > Cron Jobs
2. 确认看到：`/api/cron/sync-bot-revenue-attribution` - `10 16 * * *`
3. Cron将在每天16:10 UTC运行（北京时间00:10）

### 7. 手动触发首次运行（可选）

等不及24小时？手动触发：

```bash
curl -X POST https://your-project.vercel.app/api/cron/sync-bot-revenue-attribution \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 8. 验证数据生成

24小时后，查询PostgreSQL验证数据：

```sql
-- 查看最新快照
SELECT * FROM daaf_bot_revenue_snapshots
ORDER BY snapshot_date DESC
LIMIT 10;

-- 查看每日汇总
SELECT * FROM daaf_daily_summary_snapshots
ORDER BY snapshot_date DESC
LIMIT 7;
```

## 故障排查

### 问题1: "DATABASE_URL is required" 错误

**解决方案**:
- 在Vercel项目设置中添加`DATABASE_URL`环境变量
- 重新部署：`vercel --prod`

### 问题2: Cron Job未运行

**检查步骤**:
1. Vercel Dashboard > Deployments > Functions > Logs
2. 确认`CRON_SECRET`已设置
3. 确认cron schedule正确配置在`vercel.json`

**手动触发测试**:
```bash
curl -X POST https://your-project.vercel.app/api/cron/sync-bot-revenue-attribution \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 问题3: MySQL连接超时

**解决方案**:
- 确认MySQL允许Vercel IP范围
- 考虑使用连接池
- 增加连接超时时间

### 问题4: 归因覆盖率太低 (<30%)

**可能原因**:
1. 大量新用户未使用Bot就付费
2. Bot ID未正确记录在订单表
3. 归因窗口需要调整

**排查**:
```sql
-- 检查订单中bot_id分布
SELECT bot_id, COUNT(*) as count
FROM user_subscription_stripe_orders
WHERE status = 'ORDER_STATUS_SUCCESS'
GROUP BY bot_id;

-- 如果都是bot_id=0，需要修复订单记录逻辑
```

## 监控和维护

### 日常监控

1. **每周查看归因覆盖率**:
   ```sql
   SELECT AVG(attribution_coverage_pct) as avg_coverage
   FROM daaf_daily_summary_snapshots
   WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days';
   ```
   目标: >70%

2. **识别异常Bot**:
   ```sql
   -- 成本突增的Bot
   SELECT bot_id, bot_name,
          SUM(total_cost_usd) as week_cost
   FROM daaf_bot_revenue_snapshots
   WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY bot_id, bot_name
   ORDER BY week_cost DESC
   LIMIT 10;
   ```

### 性能优化

如果归因计算变慢（>60秒）：

1. **添加MySQL索引**:
   ```sql
   CREATE INDEX idx_art_task_user_date ON art_task(user_id, created_date);
   CREATE INDEX idx_art_task_bot_date ON art_task(bot_id, created_date);
   CREATE INDEX idx_stripe_orders_user_date ON user_subscription_stripe_orders(user_id, created_date);
   ```

2. **增加Vercel函数超时**:
   在`vercel.json`添加：
   ```json
   {
     "functions": {
       "api/cron/*.ts": {
         "maxDuration": 60
       }
     }
   }
   ```

### 数据备份

PostgreSQL快照数据很重要，建议：

1. **Neon**: 自动每日备份，保留30天
2. **Supabase**: 启用Point-in-Time Recovery
3. **自定义**: 使用pg_dump定期导出

```bash
# 每周备份（添加到crontab）
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## 成本估算

### Vercel
- **Hobby计划**: 免费（足够）
  - 100 GB-Hours/月
  - 每日cron够用

- **Pro计划**: $20/月（如需更多）
  - 1000 GB-Hours/月
  - 更短cron间隔

### PostgreSQL
- **Neon Free**: $0（足够）
  - 10 GB存储
  - 预计使用: <100 MB/月

- **Supabase Free**: $0（足够）
  - 500 MB数据库
  - 预计使用: <100 MB/月

### MySQL
- 现有数据库，无额外成本
- 建议添加只读副本用于分析

**总成本**: $0-20/月（取决于Vercel计划）

## 扩展功能

### 1. Slack每日报告

创建 `functions/api/cron/daily-bot-report.ts`:
```typescript
// 每日发送Top 10 Bot报告到Slack
// Schedule: 01:00 UTC daily
```

### 2. 异常警报

添加逻辑检测：
- 归因覆盖率骤降
- 单Bot成本暴涨
- 负毛利Bot增加

### 3. 实时仪表板

使用Retool、Metabase或Grafana连接PostgreSQL，创建可视化仪表板。

### 4. A/B测试支持

在归因表中添加`experiment_id`字段，支持按实验分组分析。

## 下一步

1. ✅ 完成部署并验证数据生成
2. ✅ 运行`bot-revenue-attribution-analysis.md`中的查询
3. ✅ 识别Top 5高价值Bot和需优化Bot
4. ✅ 设置每周报告（Slack或邮件）
5. ✅ 2周后评估归因模型准确性
6. ✅ 基于数据优化Bot推广策略

## 支持

遇到问题？检查：
1. Vercel Function Logs
2. PostgreSQL连接状态
3. MySQL数据完整性
4. 本地测试结果

需要帮助？提供以下信息：
- 错误日志
- 测试脚本输出
- 环境变量配置（去掉敏感信息）

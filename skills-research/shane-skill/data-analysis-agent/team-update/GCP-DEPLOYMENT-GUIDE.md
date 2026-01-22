# Bot收入归因系统 - Google Cloud Platform 完整部署指南

> **知识库文档** - 包含完整部署流程、配置说明、故障排查和最佳实践

## 📋 目录

1. [系统概述](#系统概述)
2. [前置准备](#前置准备)
3. [自动化部署](#自动化部署)
4. [手动部署](#手动部署)
5. [验证和测试](#验证和测试)
6. [监控和维护](#监控和维护)
7. [故障排查](#故障排查)
8. [成本优化](#成本优化)
9. [最佳实践](#最佳实践)

---

## 系统概述

### 架构图

```
┌─────────────────────┐
│ Cloud Scheduler     │  每日16:10 UTC触发
│ (Cron Job)          │
└──────────┬──────────┘
           │ HTTP POST + Bearer Token
           ↓
┌─────────────────────┐
│ Cloud Function      │  Node.js 20, 512MB, 9min timeout
│ Gen2                │
└──────────┬──────────┘
           │
           ├→ Secret Manager (凭据)
           │  ├─ DATABASE_URL
           │  ├─ MYSQL_*
           │  └─ CRON_SECRET
           │
           ├→ MySQL (my_shell_prod)
           │  └─ 读取订单和任务数据
           │
           └→ PostgreSQL (Neon)
              └─ 存储归因快照
                 ├─ daaf_bot_revenue_snapshots
                 ├─ daaf_daily_summary_snapshots
                 ├─ daaf_cost_daily_snapshots
                 └─ daaf_free_cost_by_bot_snapshots
```

### 核心功能

1. **三种归因模型**：
   - Proportional（比例归因）
   - Last Touch（最后触点）
   - Last Touch Optimized（优化最后触点，推荐）

2. **归因窗口**：订单日期 ±7天

3. **自动化执行**：每日自动计算并存储结果

4. **数据快照**：PostgreSQL存储每日快照用于快速查询

---

## 前置准备

### 1. GCP账号和项目

```bash
# 检查gcloud是否安装
gcloud --version

# 如未安装，访问：https://cloud.google.com/sdk/docs/install

# 登录GCP
gcloud auth login

# 创建或选择项目
gcloud projects create myshell-attribution  # 如需新项目
gcloud config set project YOUR_PROJECT_ID
```

### 2. PostgreSQL数据库

**推荐方案：Neon（免费10GB）**

1. 访问 https://neon.tech
2. 注册账号
3. 创建新项目（选择 `us-west-2`）
4. 复制连接字符串：
   ```
   postgresql://user:password@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

**替代方案：Cloud SQL**
```bash
# 更贵但集成更好
gcloud sql instances create myshell-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### 3. MySQL访问（my_shell_prod）

确保你有以下信息：
- `MYSQL_HOST`: 数据库主机地址
- `MYSQL_USER`: 用户名
- `MYSQL_PASSWORD`: 密码

**通过MCP获取**：
```javascript
// 如果使用MCP Bytebase
mcp__mcphub__bytebase-search_objects
// 获取数据库连接信息
```

### 4. 所需工具

```bash
# Node.js 20+
node --version  # 应该 >=20.0.0

# npm
npm --version

# gcloud CLI
gcloud --version

# Git (可选)
git --version
```

---

## 自动化部署

### 一键部署（推荐）

**步骤1：准备环境**

```bash
cd gcp-functions

# 安装依赖
npm install

# 交互式配置环境变量
bash setup-env.sh
```

这会询问你：
1. GCP Project ID
2. GCP Region（默认us-central1）
3. PostgreSQL连接字符串
4. MySQL凭据
5. 生成随机CRON_SECRET
6. 可选：Slack通知

**步骤2：初始化数据库**

```bash
# 推送schema到PostgreSQL
npm run db:push

# 验证表已创建（打开浏览器）
npm run db:studio
```

应该看到4个表：
- `daaf_bot_revenue_snapshots`
- `daaf_daily_summary_snapshots`
- `daaf_cost_daily_snapshots`
- `daaf_free_cost_by_bot_snapshots`

**步骤3：本地测试（可选）**

```bash
# 测试归因逻辑
npm run test 2026-01-01
```

预期输出：
```
🧪 Testing Bot Attribution System
📅 Date: 2026-01-01

📊 Attribution Summary:
   Total Revenue: $1,106.46
   Total Orders: 54
   Attributed Orders: 38
   Coverage: 70.37%
```

**步骤4：部署到GCP**

```bash
# 自动化部署（5-10分钟）
bash deploy-full.sh
```

脚本会自动：
1. ✅ 验证GCP认证
2. ✅ 启用必需的API
3. ✅ 创建Secret Manager密钥
4. ✅ 部署Cloud Function
5. ✅ 配置Cloud Scheduler
6. ✅ 运行初始测试

**成功输出示例：**
```
=================================================
  Deployment Complete! 🎉
=================================================

Resources created:
  • Cloud Function: sync-bot-revenue-attribution
  • Region: us-central1
  • Function URL: https://sync-bot-revenue-attribution-xxx.a.run.app
  • Scheduler: Daily at 16:10 UTC
  • Secrets: 5 secrets in Secret Manager

Next steps:
  1. Wait 24 hours for first data collection
  2. Verify data: npm run db:studio
  3. Run analysis queries

🚀 Bot attribution system is now live!
```

---

## 手动部署

如果自动脚本失败，可以手动执行每个步骤。

### 步骤1：启用GCP API

```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
```

### 步骤2：创建Secrets

```bash
# 创建.env文件
cp .env.example .env
nano .env  # 填入你的凭据

# 上传到Secret Manager
source .env

echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "$MYSQL_HOST" | gcloud secrets create MYSQL_HOST --data-file=-
echo -n "$MYSQL_USER" | gcloud secrets create MYSQL_USER --data-file=-
echo -n "$MYSQL_PASSWORD" | gcloud secrets create MYSQL_PASSWORD --data-file=-
echo -n "$CRON_SECRET" | gcloud secrets create CRON_SECRET --data-file=-
```

### 步骤3：授权Service Account

```bash
# 获取默认service account
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# 授予Secret Manager访问权限
for secret in DATABASE_URL MYSQL_HOST MYSQL_USER MYSQL_PASSWORD CRON_SECRET; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 步骤4：构建代码

```bash
npm install
npm run build
```

### 步骤5：部署Cloud Function

```bash
gcloud functions deploy sync-bot-revenue-attribution \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=syncBotRevenue \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=512MB \
  --max-instances=10 \
  --set-env-vars="GCP_PROJECT=$PROJECT_ID,NODE_ENV=production"
```

### 步骤6：创建Cloud Scheduler

```bash
# 获取函数URL
FUNCTION_URL=$(gcloud functions describe sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri)")

# 创建定时任务
gcloud scheduler jobs create http sync-bot-revenue-attribution \
  --location=us-central1 \
  --schedule="10 16 * * *" \
  --time-zone="UTC" \
  --uri="$FUNCTION_URL" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET"
```

---

## 验证和测试

### 1. 验证部署

```bash
# 检查Cloud Function状态
gcloud functions describe sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1

# 检查Scheduler状态
gcloud scheduler jobs describe sync-bot-revenue-attribution \
  --location=us-central1
```

### 2. 手动触发测试

```bash
# 获取函数URL
FUNCTION_URL=$(gcloud functions describe sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1 \
  --format="value(serviceConfig.uri)")

# 触发函数
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

预期响应：
```json
{
  "success": true,
  "date": "2026-01-04",
  "bot_count": 87,
  "summary": {
    "total_revenue": 1106.46,
    "attributed_orders": 38,
    "total_orders": 54,
    "attribution_coverage_pct": 70.37
  },
  "duration_ms": 28456
}
```

### 3. 查看日志

```bash
# 实时日志
gcloud functions logs tail sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1

# 最近50条
gcloud functions logs read sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1 \
  --limit=50
```

### 4. 验证数据

```bash
# 打开Drizzle Studio
npm run db:studio
```

查询PostgreSQL：
```sql
-- 检查最新快照
SELECT * FROM daaf_bot_revenue_snapshots
ORDER BY snapshot_date DESC
LIMIT 10;

-- 查看归因覆盖率
SELECT snapshot_date, attribution_coverage_pct
FROM daaf_daily_summary_snapshots
ORDER BY snapshot_date DESC
LIMIT 7;
```

---

## 监控和维护

### 日常监控

#### 1. Cloud Console Dashboard

访问：https://console.cloud.google.com

- **Cloud Functions** > `sync-bot-revenue-attribution`
  - 监控调用次数
  - 查看错误率
  - 检查执行时间

- **Cloud Scheduler** > `sync-bot-revenue-attribution`
  - 确认任务状态
  - 查看执行历史

- **Secret Manager**
  - 验证密钥状态

#### 2. 命令行监控

```bash
# 查看函数统计
gcloud functions describe sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1 \
  --format="table(state, updateTime, serviceConfig.availableMemory)"

# Scheduler执行历史
gcloud scheduler jobs describe sync-bot-revenue-attribution \
  --location=us-central1 \
  --format="table(state, lastAttemptTime, scheduleTime)"

# 查看最近错误
gcloud functions logs read sync-bot-revenue-attribution \
  --gen2 \
  --region=us-central1 \
  --limit=10 \
  --filter="severity=ERROR"
```

#### 3. 设置告警

创建Cloud Monitoring告警：

```bash
# 函数执行失败告警
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Bot Attribution Function Errors" \
  --conditions='{
    "displayName": "Function Error Rate",
    "conditionThreshold": {
      "filter": "resource.type=\"cloud_function\" AND metric.type=\"cloudfunctions.googleapis.com/function/execution_count\" AND metric.label.status=\"error\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 1,
      "duration": "300s"
    }
  }'
```

### 定期维护

#### 每周检查

1. **归因覆盖率**：
   ```sql
   SELECT AVG(attribution_coverage_pct) as avg_coverage
   FROM daaf_daily_summary_snapshots
   WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days';
   ```
   目标：>70%

2. **执行时间**：
   ```bash
   gcloud functions logs read sync-bot-revenue-attribution \
     --gen2 --region=us-central1 --limit=7 \
     --format="value(jsonPayload.duration_ms)"
   ```
   目标：<60000ms（1分钟）

3. **错误率**：
   ```bash
   gcloud logging read \
     'resource.type="cloud_function" AND severity="ERROR"' \
     --limit=10 --format=json
   ```

#### 每月检查

1. **成本分析**：
   ```bash
   gcloud billing accounts list
   # 访问Cloud Console查看详细账单
   ```

2. **数据增长**：
   ```sql
   SELECT
     COUNT(*) as record_count,
     pg_size_pretty(pg_total_relation_size('daaf_bot_revenue_snapshots')) as table_size
   FROM daaf_bot_revenue_snapshots;
   ```

3. **性能优化**：
   - 检查MySQL索引
   - 评估是否需要增加函数内存
   - 考虑缓存策略

---

## 故障排查

### 常见问题

#### 1. 部署失败："Permission Denied"

**原因**：Service Account没有足够权限

**解决**：
```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 授予必要角色
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/cloudfunctions.developer"
```

#### 2. 函数超时

**症状**：日志显示 "Function execution took 540000 ms, finished with status: 'timeout'"

**原因**：归因计算超过9分钟限制

**解决方案**：

A. 优化MySQL查询（最有效）：
```sql
-- 添加关键索引
CREATE INDEX idx_art_task_user_created ON art_task(user_id, created_date);
CREATE INDEX idx_art_task_bot_created ON art_task(bot_id, created_date);
CREATE INDEX idx_stripe_orders_user_created
  ON user_subscription_stripe_orders(user_id, created_date);
```

B. 减少归因窗口：
编辑 `src/lib/attribution.ts`:
```typescript
// 从 ±7天 改为 ±5天
startDate.setDate(startDate.getDate() - 5);  // 原来是 -7
endDate.setDate(endDate.getDate() + 5);      // 原来是 +7
```

C. 增加函数资源：
```bash
gcloud functions deploy sync-bot-revenue-attribution \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --memory=1024MB \  # 从512MB增加到1GB
  --timeout=540s
```

#### 3. Secret Manager访问失败

**症状**：`Failed to get secret DATABASE_URL`

**诊断**：
```bash
# 检查secret是否存在
gcloud secrets describe DATABASE_URL

# 检查IAM权限
gcloud secrets get-iam-policy DATABASE_URL
```

**解决**：
```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 4. 归因覆盖率太低（<30%）

**原因**：
- 订单中bot_id=0（未记录Bot信息）
- 用户付款前未使用任何Bot
- 归因窗口太窄

**诊断**：
```sql
-- 检查订单中bot_id分布
SELECT bot_id, COUNT(*)
FROM user_subscription_stripe_orders
WHERE status = 'ORDER_STATUS_SUCCESS'
  AND created_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY bot_id;
```

**解决**：
如果大部分是bot_id=0，需要修复订单记录逻辑（应用层修改）。

#### 5. PostgreSQL连接失败

**症状**：`connection to server at "xxx.neon.tech" failed`

**检查**：
```bash
# 测试连接
psql "$DATABASE_URL" -c "SELECT 1;"

# 检查SSL设置
echo $DATABASE_URL | grep sslmode
```

**解决**：
确保连接字符串包含 `?sslmode=require`：
```
postgresql://user:pass@host/db?sslmode=require
```

#### 6. Cloud Scheduler未触发

**症状**：到了16:10 UTC但函数未执行

**诊断**：
```bash
# 检查Scheduler状态
gcloud scheduler jobs describe sync-bot-revenue-attribution \
  --location=us-central1

# 查看执行历史
gcloud scheduler jobs describe sync-bot-revenue-attribution \
  --location=us-central1 \
  --format="value(status.lastAttemptTime)"
```

**解决**：
```bash
# 手动运行测试
gcloud scheduler jobs run sync-bot-revenue-attribution \
  --location=us-central1

# 检查是否被暂停
gcloud scheduler jobs resume sync-bot-revenue-attribution \
  --location=us-central1
```

---

## 成本优化

### 当前成本估算

| 服务 | 用量 | 免费额度 | 月成本 |
|------|------|---------|--------|
| Cloud Functions | 30次/月, ~30s/次 | 200万次, 40万GB-秒 | **$0** |
| Cloud Scheduler | 1个作业 | 3个作业 | **$0** |
| Secret Manager | 5个密钥, 900次访问/月 | 6个密钥, 1万次操作 | **$0** |
| Cloud Build | ~1次/月 | 120 构建分钟 | **$0** |
| **总计** | - | - | **$0/月** |

**外部成本**：
- Neon PostgreSQL：$0（免费10GB）
- MySQL：$0（现有）

### 成本优化建议

#### 1. 保持在免费额度内

✅ **当前配置已优化**：
- 每日执行1次（30次/月 << 200万次限制）
- 执行时间<1分钟（每月<30分钟 << 40万GB-秒限制）
- Scheduler作业=1个（< 3个免费额度）

#### 2. 如果需要扩展

如果未来需要更频繁执行（如每小时）：

```bash
# 修改为每小时执行
gcloud scheduler jobs update http sync-bot-revenue-attribution \
  --location=us-central1 \
  --schedule="0 * * * *"  # 每小时
```

**成本影响**：
- 每月720次执行
- 仍在免费额度内（< 200万次）
- 月成本：$0

#### 3. 监控用量

设置预算告警：
```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Bot Attribution Budget" \
  --budget-amount=10USD \
  --threshold-rule=percent=50,80,100
```

#### 4. 长期优化

如果数据量增长：
1. **添加数据分区**：按月分区旧数据
2. **使用Cloud Storage**：归档6个月以上数据
3. **考虑Preemptible Functions**（Gen2不支持，但可用Cloud Run）

---

## 最佳实践

### 1. 安全

#### Secret管理
```bash
# 定期轮换CRON_SECRET
NEW_SECRET=$(openssl rand -hex 32)
echo -n "$NEW_SECRET" | gcloud secrets versions add CRON_SECRET --data-file=-

# 更新Scheduler
gcloud scheduler jobs update http sync-bot-revenue-attribution \
  --location=us-central1 \
  --headers="Authorization=Bearer $NEW_SECRET"

# 禁用旧版本
OLD_VERSION=$(gcloud secrets versions list CRON_SECRET --format="value(name)" | sed -n '2p')
gcloud secrets versions disable $OLD_VERSION --secret=CRON_SECRET
```

#### 访问控制
```bash
# 启用函数认证（推荐生产环境）
gcloud functions deploy sync-bot-revenue-attribution \
  --gen2 \
  --no-allow-unauthenticated  # 移除公开访问

# Scheduler需要service account
gcloud scheduler jobs update http sync-bot-revenue-attribution \
  --location=us-central1 \
  --oidc-service-account-email="SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com"
```

### 2. 数据备份

#### PostgreSQL备份
```bash
# 使用pg_dump定期备份
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# 上传到Cloud Storage
gsutil cp backup-*.sql gs://YOUR_BUCKET/backups/
```

#### 自动化备份脚本
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump "$DATABASE_URL" | gzip > /tmp/backup-$DATE.sql.gz
gsutil cp /tmp/backup-$DATE.sql.gz gs://your-bucket/backups/
# 保留30天
gsutil -m rm gs://your-bucket/backups/backup-$(date -d '30 days ago' +%Y%m%d).sql.gz
```

### 3. 性能监控

创建自定义指标：
```bash
# 记录归因覆盖率到Cloud Monitoring
gcloud logging metrics create attribution_coverage \
  --description="Bot attribution coverage percentage" \
  --log-filter='resource.type="cloud_function" AND jsonPayload.summary.attribution_coverage_pct>0' \
  --value-extractor='EXTRACT(jsonPayload.summary.attribution_coverage_pct)'
```

### 4. 版本管理

```bash
# 使用Git管理代码
cd gcp-functions
git init
git add .
git commit -m "Initial deployment"

# 部署前打tag
git tag -a v1.0.0 -m "Initial production release"

# 每次更新
git add .
git commit -m "Optimize MySQL queries"
git tag -a v1.0.1 -m "Performance improvements"
npm run build
gcloud functions deploy ...
```

### 5. 文档维护

在代码中添加注释：
```typescript
/**
 * Bot Revenue Attribution System
 *
 * @version 1.0.1
 * @updated 2026-01-05
 * @attribution-window ±7 days
 * @coverage-target 70%
 * @execution-time ~30s
 */
```

---

## 附录

### A. 完整环境变量列表

| 变量 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL连接字符串 | `postgresql://user:pass@host/db?sslmode=require` |
| `MYSQL_HOST` | ✅ | MySQL主机 | `db.example.com` |
| `MYSQL_USER` | ✅ | MySQL用户名 | `readonly_user` |
| `MYSQL_PASSWORD` | ✅ | MySQL密码 | `***` |
| `CRON_SECRET` | ✅ | 认证令牌 | `32字节随机hex` |
| `GCP_PROJECT` | ✅ | GCP项目ID | `myshell-attribution` |
| `GCP_REGION` | ❌ | 部署区域 | `us-central1` |
| `SLACK_BOT_TOKEN` | ❌ | Slack通知 | `xoxb-...` |
| `SLACK_CHANNEL_ID` | ❌ | Slack频道 | `C01234567` |

### B. 有用的gcloud命令

```bash
# 查看所有functions
gcloud functions list --gen2

# 删除function
gcloud functions delete sync-bot-revenue-attribution --gen2 --region=us-central1

# 查看所有secrets
gcloud secrets list

# 查看secret版本
gcloud secrets versions list CRON_SECRET

# 查看Scheduler作业
gcloud scheduler jobs list

# 暂停Scheduler
gcloud scheduler jobs pause sync-bot-revenue-attribution --location=us-central1

# 恢复Scheduler
gcloud scheduler jobs resume sync-bot-revenue-attribution --location=us-central1

# 查看项目配额
gcloud compute project-info describe --project=YOUR_PROJECT

# 查看账单账户
gcloud billing accounts list

# 设置默认region
gcloud config set functions/region us-central1
```

### C. SQL性能优化索引

在MySQL（my_shell_prod）添加这些索引可显著提升性能：

```sql
-- art_task表索引
CREATE INDEX idx_art_task_user_created
  ON art_task(user_id, created_date);

CREATE INDEX idx_art_task_bot_created
  ON art_task(bot_id, created_date, status);

CREATE INDEX idx_art_task_status_created
  ON art_task(status, created_date);

-- user_subscription_stripe_orders表索引
CREATE INDEX idx_stripe_orders_user_created
  ON user_subscription_stripe_orders(user_id, created_date, status);

CREATE INDEX idx_stripe_orders_bot_created
  ON user_subscription_stripe_orders(bot_id, created_date, status);

CREATE INDEX idx_stripe_orders_status_created
  ON user_subscription_stripe_orders(status, created_date);

-- user_subscription_paypal_orders表索引
CREATE INDEX idx_paypal_orders_user_created
  ON user_subscription_paypal_orders(user_id, created_date, status);

CREATE INDEX idx_paypal_orders_status_created
  ON user_subscription_paypal_orders(status, created_date);
```

**预期效果**：
- 查询时间：60秒 → 15秒
- 函数执行时间：减少75%

### D. 相关文档链接

- [Google Cloud Functions文档](https://cloud.google.com/functions/docs)
- [Cloud Scheduler文档](https://cloud.google.com/scheduler/docs)
- [Secret Manager文档](https://cloud.google.com/secret-manager/docs)
- [Neon PostgreSQL文档](https://neon.tech/docs)
- [Drizzle ORM文档](https://orm.drizzle.team)

---

## 总结

这份完整指南涵盖了Bot收入归因系统在GCP上的部署、监控和维护。

**核心优势**：
- ✅ **零成本**：完全在GCP免费额度内
- ✅ **自动化**：一键部署，每日自动运行
- ✅ **可扩展**：易于扩展到更高频率
- ✅ **可靠**：GCP托管服务，99.9%可用性

**下一步**：
1. 执行自动化部署：`bash deploy-full.sh`
2. 24小时后验证数据
3. 运行分析查询（见`bot-revenue-attribution-analysis.md`）
4. 基于数据优化Bot策略

**需要帮助？**
- 查看日志：`gcloud functions logs read sync-bot-revenue-attribution --gen2 --region=us-central1`
- 检查状态：Cloud Console > Cloud Functions
- 参考故障排查章节

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-05
**状态**: ✅ 生产就绪

# 登录成功率告警设计方案

## 概述

**目标**: 每天北京时间 10:00 自动统计昨天（北京时间 00:00 ~ 23:59）的登录成功率，并发送告警到 Slack。

**数据源**: Honeycomb `dev` 环境的 `test-servicename` 数据集

**告警内容**:
1. 总登录尝试次数
2. 成功/失败次数和成功率
3. 失败原因详细统计（Top 10）

---

## 数据定义

### 成功登录
- **事件名称**: `auth_success_art`
- **统计方式**: COUNT
- **特殊情况**: 以下 `error_message` 的 `auth_error_art` 事件也算作成功：
  1. `invalid_credentials` - 用户输入错误凭证，说明认证流程正常工作
  2. `attempted_submit_otp_before_sending` - 用户尝试提前提交 OTP，说明 UI 正常
  3. `too_many_requests` - 说明系统保护机制正常工作
  4. `Verification code must have 6 digits` - 输入验证正常工作
  5. `login_with_oauth_was_cancelled_by_user` - 用户主动取消 OAuth 登录，系统正常

### 失败登录
- **事件名称**: `auth_error_art`
- **统计方式**: COUNT，按 `error_message` 分组
- **排序**: 按出现次数降序
- **注意**:
  - 特殊成功的 error_message 会在列表中标注 `✅ (视为成功)`
  - Honeycomb 返回的 "TOTAL" 汇总行会被自动过滤

### 成功率计算
```
成功率 = (成功次数 / 总尝试次数) × 100%
总尝试次数 = 成功次数 + 失败次数
```

### 成功率阈值
- ✅ 绿色: ≥ 95%（健康状态）
- ⚠️ 黄色: 90% - 95%（需要关注）
- 🚨 红色: < 90%（需要紧急处理）

---

## Cron Job 设计

### Job: `auth-success-alert` (告警)
**时间**: 02:00 UTC（北京时间 10:00）

**功能**：
1. 查询昨天（北京时间 00:00 ~ 23:59）的登录数据
2. 统计成功/失败次数
3. 按 `error_message` 统计失败原因
4. 生成 Slack 主消息（概览）
5. 将失败原因详情作为 thread 回复

**预计耗时**: 5-10秒

**依赖**:
- MCP Server (Honeycomb 连接)
- Slack Bot Token

---

## Alert 消息结构

### 主消息
```
🔐 2026-01-04 登录成功率报告
━━━━━━━━━━━━━━━━━━━━━━━━━━

总登录尝试次数: 1,234
成功次数: 1,200 (含特殊成功 50 次)
失败次数: 34
成功率: ✅ 97.25%

━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 已将 50 个预期的用户错误计入成功（包括 invalid_credentials、too_many_requests 等系统正常工作的情况）

━━━━━━━━━━━━━━━━━━━━━━━━━━
生成时间: 2026-01-04T02:00:00.000Z | 数据时间范围: 北京时间 2026-01-03 00:00 ~ 23:59

📊 成功登录查询
📊 失败登录查询
```

### Thread 消息（失败原因详情）
```
❌ 失败原因统计（Top 10）
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Account locked
   出现次数: 20 | 占比: 58.82%

2. Network timeout
   出现次数: 14 | 占比: 41.18%

... (最多显示 10 条)
```

### 成功率颜色指示
- **✅ 97.25%**: 成功率 ≥ 95%
- **⚠️ 92.50%**: 成功率 90% - 95%
- **🚨 85.00%**: 成功率 < 90%

---

## 查询示例

### 1. 计算北京时间昨天的时间范围
```typescript
// 计算北京时间昨天的时间范围
const beijingOffset = 8 * 60 * 60 * 1000; // UTC+8
const now = new Date();
const beijingNow = new Date(now.getTime() + beijingOffset);

// 昨天 00:00:00（北京时间）
const yesterdayStart = new Date(beijingNow);
yesterdayStart.setUTCHours(0 - 8, 0, 0, 0); // 北京时间 00:00 = UTC 16:00（前一天）
yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

// 今天 00:00:00（北京时间） = 昨天 23:59:59 的结束
const yesterdayEnd = new Date(beijingNow);
yesterdayEnd.setUTCHours(0 - 8, 0, 0, 0);

// Honeycomb 需要 Unix 时间戳（秒）
const startTime = Math.floor(yesterdayStart.getTime() / 1000);
const endTime = Math.floor(yesterdayEnd.getTime() / 1000);
```

### 2. 查询成功的登录
```typescript
const successQuerySpec = {
  start_time: startTime,
  end_time: endTime,
  filters: [
    {
      column: "name",
      op: "=",
      value: "auth_success_art"
    }
  ],
  calculations: [
    { op: "COUNT" }
  ]
};

const successResponse = await callMCPTool("honeycomb-run_query", {
  environment_slug: "dev",
  dataset_slug: "test-servicename",
  query_spec: successQuerySpec,
});
```

### 3. 查询失败的登录（按 error_message 分组）
```typescript
const errorQuerySpec = {
  start_time: startTime,
  end_time: endTime,
  filters: [
    {
      column: "name",
      op: "=",
      value: "auth_error_art"
    }
  ],
  breakdowns: ["error_message"],
  calculations: [
    { op: "COUNT" }
  ]
};

const errorResponse = await callMCPTool("honeycomb-run_query", {
  environment_slug: "dev",
  dataset_slug: "test-servicename",
  query_spec: errorQuerySpec,
});
```

### 4. 特殊成功情况处理（已实现）
```typescript
/**
 * 特殊的 error_message 列表：这些错误也视为成功
 */
const SPECIAL_SUCCESS_ERROR_MESSAGES = [
  "invalid_credentials",
  "attempted_submit_otp_before_sending",
  "too_many_requests",
  "Verification code must have 6 digits",
  "login_with_oauth_was_cancelled_by_user",
];

/**
 * 检查 error_message 是否应该视为成功
 */
function isSpecialSuccessError(errorMessage: string): boolean {
  return SPECIAL_SUCCESS_ERROR_MESSAGES.some(msg =>
    errorMessage.toLowerCase().includes(msg.toLowerCase())
  );
}

// 在处理错误数据时
for (const row of errorData.results) {
  const count = (row.COUNT as number) || 0;
  const errorMessage = (row.error_message as string) || "Unknown";

  // 检查是否是特殊的成功情况
  if (isSpecialSuccessError(errorMessage)) {
    specialSuccessCount += count;
    // 标注为"视为成功"
    errorReasons.push({
      reason: `${errorMessage} ✅ (视为成功)`,
      count,
      percentage: 0,
    });
  } else {
    errorCount += count;
    errorReasons.push({
      reason: errorMessage,
      count,
      percentage: 0,
    });
  }
}

// 将特殊情况计入成功
successCount += specialSuccessCount;
```

**为什么这些算作成功？**
- `invalid_credentials`: 说明认证系统正常工作，用户输入错误是预期行为
- `attempted_submit_otp_before_sending`: 说明 UI 正常，是用户操作问题
- `too_many_requests`: 说明限流保护正常工作
- `Verification code must have 6 digits`: 说明输入验证正常工作
- `login_with_oauth_was_cancelled_by_user`: 用户主动取消 OAuth 登录，系统正常

---

## 实施步骤

### 阶段1: Cron Job 实现 ✅
- [x] 创建 `auth-success-alert.ts`
- [x] 实现 Honeycomb 查询逻辑
- [x] 实现 ASCII/JSON 响应解析
- [x] 实现 Slack 消息格式化

### 阶段2: 配置 ✅
- [x] 更新 `vercel.json` cron 配置
- [x] 添加环境变量说明

### 阶段3: 部署和测试 ⏳
- [ ] 部署到 Vercel
- [ ] 配置环境变量
- [ ] 手动触发测试
- [ ] 验证 Slack 消息格式

### 阶段4: 扩展功能（可选）
- [ ] 添加成功率趋势（对比昨天/上周）
- [ ] 添加按小时的成功率分布
- [ ] 添加地理位置/设备类型分组

---

## 配置指南

### 环境变量
```bash
# MCP Server 连接
MCP_SERVER_URL=http://52.12.230.109:3000/mcp
MCP_AUTH_TOKEN=your_mcp_token_here

# Slack 通知
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_IOS_ID=C07XXXXXXXXX  # 登录成功率报告专用频道

# Cron 认证
CRON_SECRET=your_random_secret_string
```

### Vercel Cron 配置
```json
{
  "crons": [
    {
      "path": "/api/cron/auth-success-alert",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Slack Bot 权限
需要的 Bot Token Scopes:
- `chat:write` - 发送消息
- `chat:write.public` - 发送到公开频道

---

## 手动触发

### 方式1: 使用 Vercel Dashboard
1. 登录 Vercel Dashboard
2. 进入项目 → Cron Jobs
3. 找到 `auth-success-alert`
4. 点击 "Run Now"

### 方式2: 使用 API
```bash
# 使用 CRON_SECRET 认证
curl -X GET "https://your-project.vercel.app/api/cron/auth-success-alert?token=YOUR_CRON_SECRET"

# 或使用 Bearer Token
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://your-project.vercel.app/api/cron/auth-success-alert"
```

---

## 关键决策

### ✅ 已确认
1. **不存储历史数据**: 每次查询昨天（北京时间）的实时数据
2. **查询方式**: 使用 MCP Honeycomb 工具
3. **时间范围**: 北京时间昨天 00:00 ~ 23:59（使用 start_time/end_time Unix 时间戳，单位：秒）
4. **Top N**: 失败原因显示 Top 10
5. **时区**: 北京时间 10:00 发送（UTC 2:00）
6. **特殊成功规则**: 5 种特定 error_message 视为成功（见数据定义部分）
7. **显示方式**: 特殊成功只显示总数提示，不列出详细列表（避免超长）

### 🔄 可扩展
1. **添加更多特殊成功规则**: 修改 `SPECIAL_SUCCESS_ERROR_MESSAGES` 数组
2. **数据集切换**: 可修改 `environment_slug` 和 `dataset_slug`
3. **阈值调整**: 可修改成功率阈值（当前 95%/90%）
4. **时间窗口**: 可修改查询时间范围

### 📊 数据流
```
Honeycomb (test-servicename)
  ↓
MCP Server (honeycomb-run_query)
  ↓
Vercel Function (auth-success-alert)
  ↓
Slack (发送消息)
```

---

## 性能估算

### Alert Job (`auth-success-alert`)
- Honeycomb 查询（成功）: 1-2s
- Honeycomb 查询（失败+分组）: 2-3s
- 数据解析和计算: <1s
- Slack 消息发送: 1-2s
- **总耗时**: 5-8秒

### 数据量估算
- **假设日活**: 10,000 次登录尝试/天
- **Honeycomb 查询**: 返回 1 行（成功）+ 10-50 行（失败原因）
- **数据传输**: 约 5-10 KB
- **Slack 消息**: 约 2 KB

---

## 故障排查

### 问题1: 查询返回空数据
**可能原因**:
- Honeycomb 中无对应事件
- `name` 字段值不匹配
- 时间范围错误

**解决方案**:
1. 检查 Honeycomb UI 确认事件存在
2. 确认事件名称: `auth_success_art` / `auth_error_art`
3. 确认 `dataset_slug` 和 `environment_slug` 正确

### 问题2: MCP 连接失败
**可能原因**:
- `MCP_SERVER_URL` 或 `MCP_AUTH_TOKEN` 配置错误
- MCP 服务器不可访问

**解决方案**:
1. 验证环境变量配置
2. 测试 MCP 服务器连接: `curl http://52.12.230.109:3000/mcp`
3. 检查防火墙规则

### 问题3: Slack 消息未发送
**可能原因**:
- `SLACK_BOT_TOKEN` 或 `SLACK_CHANNEL_ID` 配置错误
- Bot 未被添加到频道
- Bot 权限不足

**解决方案**:
1. 验证 Slack Token 有效性
2. 确认 Bot 已加入目标频道
3. 检查 Bot 权限包含 `chat:write`

### 问题4: 响应解析失败
**可能原因**:
- Honeycomb 返回格式变化
- ASCII 表格解析错误

**解决方案**:
1. 查看日志中的原始响应
2. 检查 `parseAsciiResponse()` 函数
3. 考虑使用 JSON 格式（如果 Honeycomb 支持）

### 问题5: 看到 "TOTAL" 在错误列表中
**原因**:
- Honeycomb 在按字段分组查询时会返回一个 "TOTAL" 汇总行

**解决方案**:
- 已在代码中自动过滤（v1.1+）
- 如果仍出现，检查过滤逻辑: `if (errorMessage.toUpperCase() === "TOTAL")`

### 问题6: Slack API 错误 `invalid_blocks` 或 `must be less than 3001 characters`
**原因**:
- Slack contextBlock 有 3000 字符限制
- 特殊成功列表太长超过限制

**解决方案**:
- 已在代码中修复（v1.3+）：特殊成功只显示总数提示，不列出详细的 error_message 列表

---

## 扩展功能示例

### 1. 添加成功率趋势对比
```typescript
// 查询昨天的数据
const yesterdaySuccessRate = await getSuccessRate(
  Date.now() - 24 * 60 * 60 * 1000,
  24 * 60 * 60
);

// 计算变化
const successRateChange = currentSuccessRate - yesterdaySuccessRate;

// 在消息中显示
const changeEmoji = successRateChange > 0 ? "📈" : "📉";
text += `\n环比昨天: ${changeEmoji} ${successRateChange.toFixed(2)}pt`;
```

### 2. 添加按小时的成功率分布
```typescript
const hourlyQuerySpec = {
  start_time: startTime,
  end_time: endTime,
  granularity: 3600, // 1 hour
  filters: [
    // ... 过滤条件
  ],
  calculations: [{ op: "COUNT" }]
};

// 可视化昨天 24 小时的趋势
```

### 3. 添加地理位置分组
```typescript
const geoQuerySpec = {
  start_time: startTime,
  end_time: endTime,
  breakdowns: ["country", "error_message"],
  filters: [
    {
      column: "name",
      op: "=",
      value: "auth_error_art"
    }
  ],
  calculations: [{ op: "COUNT" }]
};

// 分析不同地区的失败原因
```

---

## 参考资料

### 相关文件
- **实现**: `functions/api/cron/auth-success-alert.ts`
- **MCP 客户端**: `functions/lib/mcp/client.ts`
- **Slack 工具**: `functions/lib/slack.ts`

### 相关文档
- [Honeycomb Query API](https://docs.honeycomb.io/api/query-api/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

### 原始需求
- Honeycomb 查询: https://ui.honeycomb.io/shane/environments/dev/datasets/test-servicename/board-query/E21cT3MfrVD/result/umgXXqJP6Y6?cstype_0=cpie
- 参考实现: `functions/api/cron/daily-summary.ts`

# CLAUDE.md

> **Version**: 3.0 | **核心原则：计划 → 确认 → 执行到底 → 验收**

---

## 工作模式

```
1️⃣ 收到任务 → TodoList 规划 → 2️⃣ 展示计划 → 用户确认 → 3️⃣ 执行到底（不问问题）→ 4️⃣ 总结验收
```

### 4 种致命阻塞（唯一允许提问）

1. **缺少关键凭证** - 数据库密码、API key
2. **多个对立方案** - 无法从代码库判断
3. **需求本质矛盾** - 用户要求冲突
4. **不可逆高风险** - 删除生产数据、强制推送

### 禁止提问（自行决策）

文件命名/代码风格/依赖版本/测试策略/UI细节 → 遵循现有规范或最佳实践

---

## Top 5 错误模式（编码前必查）

### E001: 异步未并行 | 严重 | 高频

```javascript
// ❌ 错误：顺序执行 (13次 × 2秒 = 26秒)
for (const term of searchTerms) {
  const results = await api.search(term);
  allResults.push(...results);
}

// ✅ 正确：并行执行 (max 2秒)
const searchPromises = searchTerms.map(term =>
  api.search(term)
    .then(results => ({ term, results, success: true }))
    .catch(error => ({ term, results: [], success: false, error: error.message }))
);
const searchResults = await Promise.all(searchPromises);
```

**自检**: 多个独立异步操作是否用 `Promise.all()`？

---

### E002: 轮询无超时 | 严重 | 高频

```javascript
// ❌ 错误：无限轮询
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') clearInterval(scanPollInterval);
}, 2000);

// ✅ 正确：带超时
function pollStatus(scanId, maxAttempts = 30) {
  let attempts = 0;
  scanPollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(scanPollInterval);
      showError('轮询超时');
      return;
    }
    try {
      const data = await fetchStatus(scanId);
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(scanPollInterval);
        updateUI(data);
      }
    } catch (error) {
      clearInterval(scanPollInterval);
      showError(error.message);
    }
  }, 2000);
}
```

**自检**: 轮询是否设置 `maxAttempts`？失败/超时是否 `clearInterval`？

---

### E003: 错误未重新抛出 | 严重 | 中频

```javascript
// ❌ 错误：错误被吞掉
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('获取失败:', error);
    // 没有 throw，调用者无法感知
  }
}

// ✅ 正确：重新抛出
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('获取失败:', error);
    throw new Error(`无法获取用户 ${id}: ${error.message}`);
  }
}
```

**自检**: `catch` 块是否 `throw error`？

---

### E004: SQL 未用 CTE 预过滤 | 中等 | 中频

```sql
-- ❌ 错误：JOIN 后再过滤，全表扫描
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2026-01-01';

-- ✅ 正确：CTE 预过滤
WITH recent_orders AS (
  SELECT user_id, total
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT u.name, ro.total
FROM users u
JOIN recent_orders ro ON u.id = ro.user_id;
```

**自检**: 是否用 CTE 预过滤大表？避免 JOIN 后过滤？

---

### E007: 忘记资源清理 | 严重 | 低频

```javascript
// ❌ 错误：只在成功时清理
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') {
    clearInterval(scanPollInterval); // 只有这里清理
    updateUI(data);
  }
  // 失败时泄漏！
}, 2000);

// ✅ 正确：所有退出路径都清理
scanPollInterval = setInterval(async () => {
  try {
    const data = await fetchStatus(scanId);
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(scanPollInterval);
      updateUI(data);
    }
  } catch (error) {
    clearInterval(scanPollInterval); // 错误时也清理
    showError(error.message);
  }
}, 2000);
```

**自检**: 所有退出路径（成功/失败/超时）都清理资源？

---

## 核心方法论

### 三文件模式（长任务必用）

```
task_plan.md     - 任务规划和进度追踪（重要决策点重新读取！）
notes.md         - 研究笔记和发现记录
[deliverable].md - 最终产出物
```

**关键机制**: 每个重要决策点前 **重新读取 task_plan.md**，刷新注意力窗口，防止目标漂移。

### 失败追踪（避免重复错误）

```markdown
## Errors Encountered
### [时间] 错误类型
**Error**: 具体错误信息
**Root Cause**: 根本原因
**Solution**: 解决方案
**Learning**: 经验教训
```

### 阶段门控（关键决策点等待确认）

```
Phase 1: 需求理解 → [用户确认 "ready"] → Phase 2: 设计方案 → [确认] → Phase 3: 实现代码
```

**原则**: 永远不进入下一阶段，直到用户明确确认。

---

## 能力速查

### MCP Servers（外部数据访问）

| 任务 | MCP | 说明 |
|-----|-----|------|
| SQL查询 | `bytebase` | 数据库操作 |
| 图表生成 | `chart` | 数据可视化 |
| 监控日志 | `honeycomb` | 可观测性 |
| 支付集成 | `stripe` | 支付流程 |
| 文档搜索 | `context7` | 最新技术文档 |
| 浏览器 | `playwright` | E2E测试、截图 |

### Skills（自动化任务）

| 任务 | 命令 |
|-----|------|
| Git 提交 | `/commit` |
| 创建 PR | `/create-pr` |
| 代码审查 | `/code-review` |
| 生成测试 | `/write-tests` |
| UI 设计 | `ui-ux-pro-max`（自动激活）|
| 浏览器自动化 | `browser-use`（自动激活）|

### Plugins（自动激活，无需显式调用）

直接描述需求，相关 plugins 自动参与：
- 架构设计 → backend-development, cloud-infra
- 代码审查 → code-review-ai, security-scanning
- 数据分析 → data-engineering, database-design

### 快速决策树

```
需要外部数据？ → MCP (bytebase/honeycomb/stripe/context7)
需要自动化？   → Skills (/commit, /write-tests, browser-use)
需要建议？     → Plugins（自动激活，直接描述需求）
```

---

## 深度参考（按需读取）

| 文档 | 用途 | 路径 |
|-----|------|-----|
| 错误详情 | 完整错误案例 | `errors/ERROR_CATALOG.md` |
| 方法论图书馆 | AI工作流洞察 | `learning/AI_WORKFLOW_INSIGHTS.md` |
| 决策树 | 详细能力决策 | `DECISION_TREE.md` |
| MCP 详解 | 所有 MCP 用法 | `capabilities/mcp-servers.md` |
| Skills 清单 | Skills 使用指南 | `capabilities/skills-guide.md` |

---

**准备接收任务**

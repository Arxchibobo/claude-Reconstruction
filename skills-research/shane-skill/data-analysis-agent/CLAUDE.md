# CLAUDE.md

> **Version**: 3.2 | **Updated**: 2026-01-19

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Links

- [Gross Margin Analysis](https://profit-flow-analytics-b8a87f86.base44.app/)
- [Daily Cost Trends](https://app-d281d193.base44.app/)
- [Bot Profitability Analysis](https://bot-profitability-analyzer-3c46a267.base44.app/)

---

## Core Principles

### Workflow

```
1. Receive task → TodoList planning → 2. Show plan → User confirms → 3. Execute (no questions) → 4. Summary & review
```

### 4 Critical Blockers (Only Allowed Questions)

1. **Missing credentials** - Database passwords, API keys
2. **Conflicting approaches** - Cannot determine from codebase
3. **Contradictory requirements** - User requests conflict
4. **Irreversible high-risk** - Delete production data, force push

### Self-Decide (No Questions)

File naming / Code style / Dependency versions / Test strategy / UI details → Follow existing conventions or best practices

---

## Top 5 Error Patterns (Check Before Coding)

### E001: Async Not Parallel | Severe | High Frequency

```javascript
// Wrong: Sequential execution (13 times x 2s = 26s)
for (const term of searchTerms) {
  const results = await api.search(term);
  allResults.push(...results);
}

// Correct: Parallel execution (max 2s)
const searchPromises = searchTerms.map(term =>
  api.search(term)
    .then(results => ({ term, results, success: true }))
    .catch(error => ({ term, results: [], success: false, error: error.message }))
);
const searchResults = await Promise.all(searchPromises);
```

**Self-check**: Are independent async operations using `Promise.all()`?

---

### E002: Polling Without Timeout | Severe | High Frequency

```javascript
// Wrong: Infinite polling
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') clearInterval(scanPollInterval);
}, 2000);

// Correct: With timeout
function pollStatus(scanId, maxAttempts = 30) {
  let attempts = 0;
  scanPollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(scanPollInterval);
      showError('Polling timeout');
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

**Self-check**: Does polling have `maxAttempts`? Does failure/timeout call `clearInterval`?

---

### E003: Error Not Re-thrown | Severe | Medium Frequency

```javascript
// Wrong: Error swallowed
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('Fetch failed:', error);
    // No throw, caller cannot detect failure
  }
}

// Correct: Re-throw
async function fetchUser(id) {
  try {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  } catch (error) {
    console.error('Fetch failed:', error);
    throw new Error(`Cannot fetch user ${id}: ${error.message}`);
  }
}
```

**Self-check**: Does the `catch` block `throw error`?

---

### E004: SQL Without CTE Pre-filtering | Medium | Medium Frequency

```sql
-- Wrong: Filter after JOIN, full table scan
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2026-01-01';

-- Correct: CTE pre-filter
WITH recent_orders AS (
  SELECT user_id, total
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT u.name, ro.total
FROM users u
JOIN recent_orders ro ON u.id = ro.user_id;
```

**Self-check**: Use CTE to pre-filter large tables? Avoid filtering after JOIN?

---

### E005: Forgotten Resource Cleanup | Severe | Low Frequency

```javascript
// Wrong: Only cleanup on success
scanPollInterval = setInterval(async () => {
  const data = await fetchStatus(scanId);
  if (data.status === 'completed') {
    clearInterval(scanPollInterval); // Only here
    updateUI(data);
  }
  // Leak on failure!
}, 2000);

// Correct: Cleanup on all exit paths
scanPollInterval = setInterval(async () => {
  try {
    const data = await fetchStatus(scanId);
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(scanPollInterval);
      updateUI(data);
    }
  } catch (error) {
    clearInterval(scanPollInterval); // Also cleanup on error
    showError(error.message);
  }
}, 2000);
```

**Self-check**: All exit paths (success/failure/timeout) cleanup resources?

---

## Core Methodology

### Three-File Pattern (For Long Tasks)

```
task_plan.md     - Task planning and progress tracking (re-read at decision points!)
notes.md         - Research notes and discoveries
[deliverable].md - Final deliverable
```

**Key mechanism**: **Re-read task_plan.md** before each major decision point to refresh attention window and prevent goal drift.

### Failure Tracking (Avoid Repeated Errors)

```markdown
## Errors Encountered
### [Time] Error Type
**Error**: Specific error message
**Root Cause**: Root cause
**Solution**: Solution
**Learning**: Lessons learned
```

### Phase Gating (Wait for Confirmation at Decision Points)

```
Phase 1: Requirements → [User confirms "ready"] → Phase 2: Design → [Confirm] → Phase 3: Implementation
```

**Principle**: Never proceed to next phase until user explicitly confirms.

---

## Repository Overview

This is a data analysis and automation (DAA) repository for business intelligence, combining:
- Markdown-based analysis templates (executed via Claude Code or base44)
- Vercel serverless functions for scheduled data processing
- PostgreSQL database for storing analysis snapshots
- MCP (Model Context Protocol) integration for database access
- Slack notifications for automated reporting

## Project Structure

```
/
├── skills/                   # Analysis templates (Markdown-based skills)
│   ├── cost-trend-by-user-type.md    # Daily cost trends by user type
│   ├── bot-margin-analysis.md        # Bot profitability analysis
│   ├── gross-margin-analysis.md      # Overall gross margin analysis
│   ├── inactive-email-domains.md     # Inactive domain analysis
│   └── ...
├── base44_prompt_mcphub.md   # MCP client setup for base44 runtime
└── functions/                # Vercel serverless functions
    ├── api/
    │   ├── cron/             # Scheduled jobs
    │   │   ├── sync-art-revenue.ts
    │   │   ├── sync-cost-snapshot.ts
    │   │   ├── daily-summary.ts
    │   │   └── weekly-analysis.ts
    │   └── hello.ts          # Example API endpoints
    ├── lib/
    │   ├── db/               # Database layer
    │   │   ├── schema.ts     # Drizzle ORM schemas
    │   │   └── index.ts      # DB client
    │   ├── mcp/              # MCP client utilities
    │   │   └── client.ts
    │   ├── slack.ts          # Slack API utilities
    │   ├── alerts.ts         # Alert logic
    │   ├── revenue.ts        # Revenue attribution models
    │   └── cost-snapshot.ts  # Cost snapshot logic
    ├── package.json
    ├── vercel.json           # Cron job configuration
    └── tsconfig.json
```

## Development Commands

### Functions Directory

```bash
cd functions

# Install dependencies
npm install

# Run tests
npm test

# Database operations (Drizzle ORM)
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio GUI

# Local development
vercel dev           # Run locally with Vercel CLI

# Production deployment
vercel --prod
```

---

## Architecture

### Analysis Templates (Markdown Skills)

The `skills/*.md` files are **executable analysis templates**. They follow a structured format:

1. **Goal**: What the analysis aims to accomplish
2. **Parameters**: Configurable inputs (dates, thresholds)
3. **Data Sources**: MySQL tables from `my_shell_prod` database
4. **Step-by-step SQL queries**: Detailed queries with comments
5. **Data Transformation**: JavaScript pseudocode for processing
6. **Visualization**: Chart generation using MCP chart tools

**Execution Modes**:
- **Claude Code**: Run directly with MCP server access to `my_shell_prod` via Bytebase
- **base44**: Deploy as interactive single-page apps using Deno runtime (see `base44_prompt_mcphub.md`)

**Key Pattern**: Analysis templates use MCP tools:
- `mcp__mcphub__bytebase-execute_sql`: Execute SQL queries
- `mcp__mcphub__mcp-server-chart-*`: Generate charts (area, line, bar, pie, etc.)

### Serverless Functions Architecture

**Cron Jobs** (defined in `vercel.json`):
- `sync-art-revenue`: 16:00 UTC daily - Sync revenue attribution data
- `sync-cost-snapshot`: 16:05 UTC daily - Snapshot cost breakdown by user type
- `daily-summary`: 02:00 UTC daily - Generate daily summary report to Slack
- `weekly-analysis`: 02:00 UTC Monday - Weekly analysis report to Slack

**Database Schema** (`lib/db/schema.ts`):
- All tables use prefix `daaf_` (data analysis and automation functions)
- `botRevenueSnapshots`: Daily bot-level revenue with 3 attribution models
- `dailySummarySnapshots`: Daily aggregated metrics
- `costDailySnapshots`: Daily cost breakdown by user type
- `freeCostByBotSnapshots`: Top 30 bots by free user cost

### MCP Integration

The repository uses MCP (Model Context Protocol) to:
- Query `my_shell_prod` MySQL database via Bytebase MCP server
- Generate charts via chart MCP server
- Access Honeycomb, Statsig, Notion for extended analytics

**Honeycomb Datasets**:
- iOS dataset: `test-serviceName`

**iOS Tracking Events** (in Honeycomb `test-serviceName` dataset):

| Category | Event Name | Description |
|----------|------------|-------------|
| **Auth** | `auth_modal_display_art` | Login/register modal display |
| | `auth_method_select_art` | User selects auth method (google/apple/email) |
| | `auth_success_art` | Registration success |
| | `auth_failed_art` | Authentication failed |
| **Navigation** | `Page_Render_Start_art` | App render start |
| | `page_leave_art` | Leave app/page |
| **Image Generation** | `click_try_now` | User clicks try now button |
| | `image_upload_start_art` | Image upload start |
| | `image_upload_failed_art` | Image upload failed |
| | `generation_start_art` | Generation start |
| | `generation_success_art` | Generation success |
| | `generation_failed_art` | Generation failed |
| | `retry_click_art` | Retry button click |
| | `delete_click_art` | Delete button click |
| **Subscription** | `subscription_plan_display_art` | Subscription plan page display |
| | `subscription_upgrade_click_art` | User clicks upgrade button |
| | `subscription_pay_art` | Subscription payment (success/fail) |
| **Energy** | `energy_purchase_display_art` | Energy purchase page display |
| | `energy_purchase_click_art` | Energy purchase button click |
| | `energy_pay_art` | Energy payment (success/fail) |
| **Onboarding** | `login_view` | Login page view |
| | `login_click_method` | Login method click |
| | `login_result` | Login result |
| | `onboarding_intro_view` | Intro page view |
| | `onboarding_start_click` | Try it now click |
| | `onboarding_filter_view` | Filter selection view |
| | `onboarding_filter_select` | Filter selected |
| | `onboarding_filter_next` | Filter next click |
| | `onboarding_model_view` | Model selection view |
| | `onboarding_generate_click` | Generate click |
| | `onboarding_gen_start` | Generation start |
| | `onboarding_gen_result` | Generation result |
| | `onboarding_result_view` | Result page view |
| | `onboarding_result_explore_click` | Explore more click |
| | `onboarding_result_retry_click` | Retry click |
| **Paywall** | `OB_paywall_view` | Paywall display |
| | `OB_paywall_basic_switch_tab` | Switch to basic tab |
| | `OB_paywall_click_subscribe` | Subscribe button click |
| | `OB_paywall_purchase_result` | Purchase result (success/fail/cancel) |
| | `paywall_click_close` | Close paywall |

**Common Event Properties**: `user_id`, `trace_id`, `time`, `slug_id`, `entry_point`

**MCP Client Setup** (for base44):
- See `base44_prompt_mcphub.md` for Deno-based MCP client configuration
- Connects to MCP Hub at `http://52.12.230.109:3000/mcp`
- Requires `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` env vars

---

## Key Business Logic

### User Classification (6 Types)

| # | Type | Definition |
|---|------|------------|
| 1 | **Paid Users** | `user_membership_type != 'FREE'` |
| 2 | **Free - Temp Email** | Free users with temporary email domains (56 domains) |
| 3 | **Free - Whitelist Email** | Free users with whitelisted domains (153 domains) |
| 4 | **Free - Other Email** | Free users with uncategorized email domains |
| 5 | **Free - Deleted** | Free users deleted from `user_privy` table |
| 6 | **Free - Visitor** | Free users with `user.source = 'visitor'` |

### Cost Calculation

- Cost unit: `actual_energy_cost` in cents, convert to USD by dividing by 100
- Task statuses: Include both `done` and `cancel` for cost (canceled tasks still incurred cost)
- For revenue attribution: Only use `done` tasks (completed usage drives payment decisions)

### Revenue Attribution Models

| Model | Description |
|-------|-------------|
| **Proportional** | Revenue distributed by task count proportion |
| **Last Touch** | Revenue to last bot used before payment |
| **Last Touch Optimized** | Last touch before OR first touch after payment |

### Attribution Window

- **Order window**: `start_date` to `end_date`
- **Task window**: `start_date - 7 days` to `end_date + 7 days`
- Captures pre-payment trial usage and post-payment first usage
- Expected coverage: 70-80% of orders

---

## Data Analysis Skills

### Skills Overview

| # | Skill | File | Purpose | Frequency |
|---|-------|------|---------|-----------|
| 1 | Bot Margin Analysis | `bot-margin-analysis.md` | Per-bot profitability | Monthly |
| 2 | Bot Revenue/Cost Trend | `bot-revenue-cost-trend.md` | Specific bot time series | Weekly/On-demand |
| 3 | Cost Trend by User Type | `cost-trend-by-user-type.md` | Cost distribution by user type | Weekly |
| 4 | Gross Margin Analysis | `gross-margin-analysis.md` | Overall business profitability | Daily |
| 5 | Inactive Email Domains | `inactive-email-domains.md` | Whitelist management | Monthly |
| 6 | Active Email Domains | `active-email-domains.md` | Active domain audit | On-demand |
| 7 | Revenue & Subscription | `revenue-subscription-analysis.md` | Comprehensive business analysis | Monthly |
| 8 | Main Site Energy | `main-site-energy-analysis.md` | Main site vs Art consumption | On-demand |

### Quick Selection Guide

| You want to know... | Use this Skill |
|---------------------|----------------|
| Which bots are profitable/losing | Bot Margin Analysis |
| Specific bot's trend changes | Bot Revenue/Cost Trend |
| Free user cost percentage | Cost Trend by User Type |
| Overall business health | Gross Margin Analysis |
| Which domains need whitelist update | Inactive/Active Email Domain Analysis |
| Comprehensive business performance | Revenue & Subscription Analysis |
| Main site vs Art consumption comparison | Main Site Energy Analysis |

### Analysis Workflow

```
Month start: Revenue & Subscription Analysis → Understand overall performance
  ├─ Revenue dropping → Bot Margin Analysis + Gross Margin Analysis
  ├─ Cost too high → Cost Trend by User Type + Main Site Energy Analysis
  └─ Specific bot anomaly → Bot Revenue/Cost Trend
Regular maintenance: Run Inactive Email Domain Analysis monthly → Optimize whitelist
```

---

## Important Patterns

### SQL Optimization
- Use CTEs to pre-filter by date ranges before JOINs
- Avoid repeated `SUBSTRING_INDEX()` calls in GROUP BY - compute once in CTE
- For bot margin analysis: SQL-based attribution (15-45s) vs app-layer (60-180s) = 3-10x faster

### Temporary Email Domains
56 temporary email domains are hardcoded in analysis templates. If updating, modify in:
- `skills/cost-trend-by-user-type.md`
- `skills/inactive-email-domains.md`
- Any cron jobs that classify user types

### Database Naming
- All analysis tables MUST use `daaf_` prefix
- Example: `daaf_bot_revenue_snapshots`

### Working with Analysis Templates

When modifying `skills/*.md` analysis templates:

1. **SQL Queries**: Queries are split into multiple steps for clarity and debugging
2. **Date Parameters**: Use placeholders like `{start_date}` and `{end_date}`
3. **Chart Generation**: Include complete chart configuration JSON with palette colors
4. **Performance**: Note optimization strategies (CTEs, pre-filtering, avoiding repeated calculations)

---

## Core Data Tables

| Table | Purpose |
|-------|---------|
| `daaf_bot_revenue_snapshots` | Bot revenue attribution |
| `daaf_daily_summary_snapshots` | Daily summary |
| `daaf_cost_daily_snapshots` | Daily cost |
| `user_energy_bot_usage_logs` | Energy consumption (Main site + Art) |
| `art_task` | Art task table |

---

## Environment Variables

Required in Vercel project settings:

```bash
# Database (Postgres for snapshots)
DATABASE_URL=postgresql://...

# Slack notifications
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...

# Source database access (handled via MCP)
# No direct connection string needed
```

---

## Testing

```bash
cd functions
npm test  # Runs vitest
```

Test files use `.test.ts` suffix.

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Snapshot Tables** | Daily aggregated data for fast queries and trend analysis |
| **Attribution Models** | Different ways to assign revenue to bots (proportional vs touch-based) |
| **Free Cost Percentage** | Core KPI tracking free user cost as % of total (goal: decreasing trend) |
| **Bot Margin** | Revenue minus cost per bot, calculates which bots are profitable |
| **Gross Margin** | Overall business profitability: (Revenue - Cost) / Revenue x 100% |

---

## Typical Workflows

```
Data Analysis: bytebase query → chart generation → report writing
Debugging: honeycomb traces → bytebase slow query → root cause analysis
Payment: context7 docs → stripe MCP → /write-tests
Bot Analysis: @bot-margin-analysis.md query last 30 days
Cost Monitoring: @cost-trend-by-user-type.md show last 7 days
```

---

**Ready for tasks**

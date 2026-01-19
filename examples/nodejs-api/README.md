# Node.js API Project Example

This example demonstrates using Claude Reconstruction for building a RESTful API with Express.js.

## Project Overview

A simple user management API showcasing:
- ✅ E001: Parallel async operations with Promise.all
- ✅ E003: Proper error re-throwing
- ✅ E004: SQL optimization with CTE
- ✅ E006: API parameter validation

## Setup

```bash
# Install dependencies
npm install

# Setup database
npm run db:setup

# Start server
npm start
```

## Project Structure

```
nodejs-api/
├── src/
│   ├── controllers/
│   │   └── userController.js    # E001: Parallel queries
│   ├── services/
│   │   └── userService.js       # E003: Error handling
│   ├── db/
│   │   └── queries.js           # E004: CTE optimization
│   └── middleware/
│       └── validator.js         # E006: Input validation
├── project-errors.md            # Project-specific errors
└── workflow.md                  # Recommended workflow
```

## Key Patterns Demonstrated

### E001: Parallel Async Operations

```javascript
// ❌ Wrong: Sequential (slow)
async function getUsers(ids) {
  const users = [];
  for (const id of ids) {
    const user = await fetchUser(id);
    users.push(user);
  }
  return users;
}

// ✅ Correct: Parallel (fast)
async function getUsers(ids) {
  return await Promise.all(
    ids.map(id => fetchUser(id))
  );
}
```

### E003: Error Re-throwing

```javascript
// ❌ Wrong: Error swallowed
async function createUser(data) {
  try {
    return await db.insert(data);
  } catch (error) {
    console.error('Failed:', error);
    // Error not re-thrown!
  }
}

// ✅ Correct: Error re-thrown
async function createUser(data) {
  try {
    return await db.insert(data);
  } catch (error) {
    console.error('Failed:', error);
    throw new Error(`Cannot create user: ${error.message}`);
  }
}
```

### E004: SQL with CTE

```sql
-- ❌ Wrong: Filter after JOIN
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at > '2026-01-01'
GROUP BY u.id;

-- ✅ Correct: Pre-filter with CTE
WITH recent_orders AS (
  SELECT user_id, id
  FROM orders
  WHERE created_at > '2026-01-01'
)
SELECT u.name, COUNT(ro.id) as order_count
FROM users u
LEFT JOIN recent_orders ro ON u.id = ro.user_id
GROUP BY u.id;
```

## Workflow Guide

See [workflow.md](workflow.md) for the recommended Claude Code workflow for API development.

## Running with Claude Code

1. Copy project errors to Claude config:
   ```bash
   cp project-errors.md ~/.claude/errors/project-errors/api-project.md
   ```

2. Start Claude Code in this directory:
   ```bash
   claude-code
   ```

3. Ask Claude to:
   - "Add a new endpoint for user search"
   - "Optimize the database queries"
   - "Write tests for the user controller"

Claude will automatically apply the error patterns and workflows from Claude Reconstruction.

# Node.js API Development Workflow

This workflow is optimized for building RESTful APIs with Claude Code and Claude Reconstruction.

## Phase 1: Planning (5-10 min)

### 1.1 Create TodoList
```
User: "Add user search endpoint with filters"

Claude: [Creates TodoList]
- Design API endpoint structure
- Implement database query with CTE (E004)
- Add input validation (E006)
- Write unit tests
- Update API documentation
```

### 1.2 Self-Check Before Coding
- [ ] Does this involve multiple async operations? → Use E001 (Promise.all)
- [ ] Will I query the database? → Use E004 (CTE pre-filtering)
- [ ] Is user input involved? → Use E006 (validation)
- [ ] Do I need error handling? → Use E003 (re-throw errors)

---

## Phase 2: Implementation

### 2.1 API Endpoint Design

**Template Structure:**
```javascript
// Route definition
router.get('/api/users/search',
  validateSearchParams,    // E006: Validation
  rateLimitMiddleware,     // E101: Rate limiting
  searchUsers
);

// Controller
async function searchUsers(req, res) {
  try {
    const results = await userService.searchUsers(req.query);
    res.json(results);
  } catch (error) {
    console.error('Search failed:', error);
    throw new Error(`User search failed: ${error.message}`); // E003
  }
}
```

### 2.2 Database Query with CTE

```javascript
async function searchUsers(filters) {
  const { role, createdAfter, limit = 10 } = filters;

  // E004: Use CTE to pre-filter
  const query = `
    WITH filtered_users AS (
      SELECT id, name, email, role
      FROM users
      WHERE
        ($1::text IS NULL OR role = $1)
        AND ($2::timestamp IS NULL OR created_at > $2)
    )
    SELECT * FROM filtered_users
    ORDER BY created_at DESC
    LIMIT $3
  `;

  return await db.query(query, [role, createdAfter, limit]);
}
```

### 2.3 Parallel Operations

```javascript
// E001: Multiple independent queries
async function getUserDashboard(userId) {
  const [user, orders, stats] = await Promise.all([
    fetchUser(userId),
    fetchUserOrders(userId),
    fetchUserStats(userId)
  ]);

  return { user, orders, stats };
}
```

---

## Phase 3: Testing

### 3.1 Use /write-tests Skill

```
User: /write-tests

Claude:
1. Analyzes endpoint implementation
2. Generates test cases for:
   - Happy path
   - Error cases (E003)
   - Input validation (E006)
   - Rate limiting (E101)
3. Creates test files
```

### 3.2 Test Template

```javascript
describe('User Search API', () => {
  it('should search users with filters', async () => {
    const response = await request(app)
      .get('/api/users/search?role=admin')
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
  });

  it('should handle invalid filters (E006)', async () => {
    const response = await request(app)
      .get('/api/users/search?role=invalid_role')
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should respect rate limiting (E101)', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app).get('/api/users/search');
    }

    const response = await request(app)
      .get('/api/users/search')
      .expect(429); // Too Many Requests
  });
});
```

---

## Phase 4: Code Review

### 4.1 Use /code-review Skill

```
User: /code-review

Claude checks:
- E001: Are async operations parallelized?
- E002: Are there polling operations with timeout?
- E003: Are errors re-thrown?
- E004: Do SQL queries use CTE?
- E006: Is input validated?
- E101-E104: Project-specific patterns
```

### 4.2 Manual Checklist

- [ ] All endpoints have rate limiting
- [ ] All database IDs are validated
- [ ] Transactions have proper rollback
- [ ] No sensitive data in logs
- [ ] Error messages are user-friendly
- [ ] API responses follow consistent format

---

## Phase 5: Commit and Deploy

### 5.1 Use /commit Skill

```
User: /commit

Claude:
1. Runs git status
2. Analyzes changes
3. Generates commit message:
   "Add user search endpoint with role filtering

   - Implement search with CTE pre-filtering (E004)
   - Add input validation middleware (E006)
   - Add rate limiting (E101)
   - Write comprehensive tests

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
4. Waits for confirmation
```

### 5.2 Use /create-pr Skill

```
User: /create-pr

Claude:
1. Analyzes all commits in branch
2. Generates PR description
3. Creates PR with labels
```

---

## Common Scenarios

### Scenario 1: Adding New Endpoint

**Steps:**
1. Create TodoList with validation, query, tests
2. Implement with E001, E003, E004, E006 patterns
3. Run /write-tests
4. Run /code-review
5. Run /commit

### Scenario 2: Optimizing Slow Query

**Steps:**
1. Use observability MCP to identify slow query
2. Rewrite with CTE (E004)
3. Add indexes if needed
4. Measure improvement
5. Run /commit

### Scenario 3: Fixing Security Issue

**Steps:**
1. Identify vulnerability (E101-E104)
2. Implement fix following error pattern
3. Add regression test
4. Run /code-review
5. Run /commit with security label

---

## MCP Integration

### Database MCP
```
database_execute_sql({
  sql: "WITH ... SELECT ..."
})
```

### Observability MCP
```
observability_run_query({
  query: "SELECT * FROM traces WHERE duration > 1000"
})
```

### Chart MCP
```
chart_generate_line_chart({
  data: apiMetrics,
  title: 'API Response Times'
})
```

---

## Quick Reference

| Task | Tool | Pattern |
|------|------|---------|
| Multiple queries | Promise.all | E001 |
| Database query | CTE | E004 |
| Error handling | Re-throw | E003 |
| Input validation | Middleware | E006 |
| Write tests | /write-tests | Skill |
| Code review | /code-review | Skill |
| Git commit | /commit | Skill |

# Project-Specific Errors: Node.js API

## E101: Missing Rate Limiting

**Severity**: 🔴 Critical
**Frequency**: High

### Description
API endpoints without rate limiting can be abused, leading to DoS attacks or excessive resource usage.

### Self-Check
- [ ] Are public endpoints rate-limited?
- [ ] Is rate limit configured per IP or per user?
- [ ] Are rate limit errors logged?

### Wrong Code
```javascript
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
```

### Correct Code
```javascript
import rateLimit from 'express-rate-limit';

const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many accounts created, please try again later'
});

app.post('/api/users', createUserLimiter, async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
```

---

## E102: Unvalidated Database IDs

**Severity**: 🔴 Critical
**Frequency**: Medium

### Description
Using user-provided IDs directly in database queries without validation can lead to unauthorized access or SQL injection.

### Self-Check
- [ ] Are all user-provided IDs validated?
- [ ] Do queries check ownership before modification?
- [ ] Are parameterized queries used?

### Wrong Code
```javascript
app.delete('/api/users/:id', async (req, res) => {
  await db.query(`DELETE FROM users WHERE id = ${req.params.id}`);
  res.json({ success: true });
});
```

### Correct Code
```javascript
app.delete('/api/users/:id', authenticateUser, async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Check ownership
  if (req.user.id !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Use parameterized query
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  res.json({ success: true });
});
```

---

## E103: Missing Transaction Rollback

**Severity**: 🟡 Medium
**Frequency**: Medium

### Description
Multi-step database operations without transactions or proper rollback can leave data in an inconsistent state.

### Self-Check
- [ ] Are related operations wrapped in transactions?
- [ ] Is rollback performed on any error?
- [ ] Are connections properly released?

### Wrong Code
```javascript
async function transferMoney(fromId, toId, amount) {
  await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
}
```

### Correct Code
```javascript
async function transferMoney(fromId, toId, amount) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Transfer failed: ${error.message}`);
  } finally {
    client.release();
  }
}
```

---

## E104: Sensitive Data in Logs

**Severity**: 🔴 Critical
**Frequency**: Low

### Description
Logging sensitive data (passwords, tokens, credit cards) can lead to security breaches if logs are compromised.

### Self-Check
- [ ] Are passwords/tokens filtered from logs?
- [ ] Is a logging library with sanitization used?
- [ ] Are log files properly secured?

### Wrong Code
```javascript
app.post('/api/login', async (req, res) => {
  console.log('Login attempt:', req.body); // Contains password!
  const user = await authenticateUser(req.body.email, req.body.password);
  res.json({ token: user.token });
});
```

### Correct Code
```javascript
function sanitizeForLogging(obj) {
  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}

app.post('/api/login', async (req, res) => {
  console.log('Login attempt:', sanitizeForLogging(req.body));
  const user = await authenticateUser(req.body.email, req.body.password);
  res.json({ token: user.token });
});
```

# 状态管理错误

> **包含错误**: E005 状态 ID 重复生成, E010 硬编码魔法值

---

## E005: 状态 ID 重复生成

> **频率**: 中 | **严重度**: 🟡 中等

### 错误描述

在需要唯一 ID 的地方多次生成 ID，导致状态不一致或数据关联错误。

### 自检问题

- [ ] ID 是否只生成一次？
- [ ] 是否在正确的位置生成 ID？
- [ ] 多个组件是否使用同一个 ID？

### 错误案例

```javascript
// ❌ 错误：每次调用都生成新 ID
function createTask(title) {
  return {
    id: generateId(), // 每次调用都不同
    title,
    createdAt: new Date()
  };
}

// 问题：多次调用返回不同 ID
const task1 = createTask('Task 1');
const task2 = createTask('Task 1');
console.log(task1.id === task2.id); // false，但可能期望相同

// ✅ 正确：ID 由调用者控制或只生成一次
function createTask(title, id = generateId()) {
  return {
    id, // ID 在外部控制或只生成一次
    title,
    createdAt: new Date()
  };
}

// 或使用工厂模式
class TaskFactory {
  static create(title) {
    const id = generateId();
    return {
      id,
      title,
      createdAt: new Date()
    };
  }
}
```

### React 中的 ID 问题

```javascript
// ❌ 错误：在渲染中生成 ID
function TodoItem({ todo }) {
  const id = generateId(); // 每次渲染都不同！

  return (
    <div id={id}>
      <label htmlFor={`checkbox-${id}`}>{todo.title}</label>
      <input id={`checkbox-${id}`} type="checkbox" />
    </div>
  );
}

// ✅ 正确：使用 useId 或 useMemo
function TodoItem({ todo }) {
  // React 18+ 使用 useId
  const id = useId();

  // 或使用 useMemo 确保稳定
  // const id = useMemo(() => generateId(), []);

  return (
    <div id={id}>
      <label htmlFor={`checkbox-${id}`}>{todo.title}</label>
      <input id={`checkbox-${id}`} type="checkbox" />
    </div>
  );
}
```

---

## E010: 硬编码魔法值

> **频率**: 低 | **严重度**: 🟢 轻微

### 错误描述

在代码中直接使用数字或字符串字面量，没有说明其含义，降低代码可读性和可维护性。

### 自检问题

- [ ] 数字/字符串是否有语义化的常量名？
- [ ] 配置值是否集中管理？
- [ ] 是否容易找到需要修改的地方？

### 错误案例

```javascript
// ❌ 错误：魔法值
function calculateDiscount(price, userLevel) {
  if (userLevel === 3) {
    return price * 0.8; // 什么是 3？什么是 0.8？
  } else if (userLevel === 2) {
    return price * 0.9;
  }
  return price;
}

// 轮询间隔
setInterval(fetchData, 5000); // 5000 是什么？

// 状态判断
if (status === 'C') { // C 代表什么？
  processCompleted();
}

// ✅ 正确：使用命名常量
const USER_LEVELS = {
  BASIC: 1,
  PREMIUM: 2,
  VIP: 3
};

const DISCOUNT_RATES = {
  [USER_LEVELS.VIP]: 0.8,
  [USER_LEVELS.PREMIUM]: 0.9,
  [USER_LEVELS.BASIC]: 1.0
};

function calculateDiscount(price, userLevel) {
  const rate = DISCOUNT_RATES[userLevel] ?? 1.0;
  return price * rate;
}

// 配置常量
const POLLING_INTERVAL_MS = 5000;
setInterval(fetchData, POLLING_INTERVAL_MS);

// 状态枚举
const ORDER_STATUS = {
  PENDING: 'P',
  PROCESSING: 'R',
  COMPLETED: 'C',
  CANCELLED: 'X'
};

if (status === ORDER_STATUS.COMPLETED) {
  processCompleted();
}
```

### TypeScript 枚举

```typescript
// ✅ TypeScript 枚举提供类型安全
enum UserLevel {
  Basic = 1,
  Premium = 2,
  VIP = 3
}

enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

function processOrder(status: OrderStatus) {
  switch (status) {
    case OrderStatus.Completed:
      // TypeScript 会检查所有 case
      break;
    // ...
  }
}
```

---

## 状态管理最佳实践

### 1. 单一数据源

```javascript
// ❌ 错误：状态分散
const [userName, setUserName] = useState('');
const [userEmail, setUserEmail] = useState('');
const [userRole, setUserRole] = useState('');

// ✅ 正确：合并相关状态
const [user, setUser] = useState({
  name: '',
  email: '',
  role: ''
});

// 更新单个字段
setUser(prev => ({ ...prev, name: 'New Name' }));
```

### 2. 派生状态

```javascript
// ❌ 错误：手动同步派生状态
const [items, setItems] = useState([]);
const [total, setTotal] = useState(0);

function addItem(item) {
  setItems([...items, item]);
  setTotal(total + item.price); // 容易忘记同步
}

// ✅ 正确：计算派生值
const [items, setItems] = useState([]);
const total = useMemo(
  () => items.reduce((sum, item) => sum + item.price, 0),
  [items]
);

function addItem(item) {
  setItems([...items, item]); // total 自动更新
}
```

### 3. 状态规范化

```javascript
// ❌ 错误：嵌套数据结构
const [posts, setPosts] = useState([
  {
    id: 1,
    title: 'Post 1',
    author: { id: 1, name: 'Alice' },
    comments: [
      { id: 1, text: 'Great!', author: { id: 2, name: 'Bob' } }
    ]
  }
]);

// ✅ 正确：规范化状态
const [state, setState] = useState({
  users: {
    1: { id: 1, name: 'Alice' },
    2: { id: 2, name: 'Bob' }
  },
  posts: {
    1: { id: 1, title: 'Post 1', authorId: 1, commentIds: [1] }
  },
  comments: {
    1: { id: 1, text: 'Great!', authorId: 2 }
  }
});
```

---

## 相关错误

- [E001 异步未并行](./async-parallel.md)
- [E003 错误未重新抛出](./error-handling.md)

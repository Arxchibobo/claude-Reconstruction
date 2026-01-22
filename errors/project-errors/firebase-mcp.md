# Firebase MCP Integration 错误案例

> **项目**: Firebase MCP Integration
> **技术栈**: TypeScript, Firebase Admin SDK, MCP Protocol
> **最后更新**: 2026-01-14

---

## 错误 1: Firebase Admin SDK 多次初始化

### 📋 错误描述

**常见表现**:
- 报错 "The default Firebase app already exists"
- Serverless 函数冷启动后失败
- 开发环境重启后无法连接 Firebase

**根本原因**:
- 每次函数调用都尝试初始化 Firebase Admin
- 没有检查是否已经初始化
- 全局单例模式实现不正确

### ❌ 错误示例

```typescript
// ❌ 错误：每次导入都初始化
// lib/firebase.ts
import admin from 'firebase-admin';

// ❌ 直接初始化，没有检查
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

export const firestore = admin.firestore();
// 第二次导入时会报错：The default Firebase app already exists
```

### ✅ 正确做法

```typescript
// ✅ 正确：检查是否已初始化
// lib/firebase.ts
import admin from 'firebase-admin';

function initializeFirebase() {
  // ✅ 检查是否已经有默认 app
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase Admin initialized');
  } else {
    console.log('Firebase Admin already initialized');
  }

  return admin;
}

// ✅ 导出初始化函数，按需调用
export const getFirebaseAdmin = () => {
  return initializeFirebase();
};

// ✅ 导出服务实例
export const getFirestore = () => {
  const admin = initializeFirebase();
  return admin.firestore();
};

export const getAuth = () => {
  const admin = initializeFirebase();
  return admin.auth();
};
```

```typescript
// ✅ 使用方式
import { getFirestore, getAuth } from './lib/firebase';

export default async function handler(req, res) {
  const firestore = getFirestore(); // ✅ 安全地获取实例
  const auth = getAuth();

  const users = await firestore.collection('users').get();
  // ...
}
```

### 🔍 关键改进

1. ✅ 使用 `admin.apps.length` 检查是否已初始化
2. ✅ 导出 getter 函数而非直接导出实例
3. ✅ 支持多次调用不会报错
4. ✅ 添加日志记录初始化状态

---

## 错误 2: MCP Tool 未验证 Firebase 权限

### 📋 错误描述

**常见表现**:
- MCP tool 调用 Firebase 时报权限错误
- Firestore 规则拒绝操作
- 用户数据访问未授权

**根本原因**:
- 使用 Admin SDK 绕过了安全规则验证
- 没有在 MCP tool 层面实现权限检查
- 假设所有操作都有权限

### ❌ 错误示例

```typescript
// ❌ 错误：直接操作，不检查权限
// mcp/tools/firestore-query.ts
export async function firestoreQuery(params: {
  collection: string;
  documentId?: string;
}) {
  const firestore = getFirestore();

  // ❌ 没有验证用户是否有权限读取这个 collection
  if (params.documentId) {
    const doc = await firestore
      .collection(params.collection)
      .doc(params.documentId)
      .get();
    return doc.data();
  }

  // ❌ 直接返回所有文档，可能包含敏感数据
  const snapshot = await firestore.collection(params.collection).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：实现权限检查
// mcp/tools/firestore-query.ts
const ALLOWED_COLLECTIONS = ['public_data', 'analytics', 'logs'];
const SENSITIVE_COLLECTIONS = ['users', 'payments', 'secrets'];

export async function firestoreQuery(params: {
  collection: string;
  documentId?: string;
  userId?: string; // ✅ 传递用户 ID 用于权限检查
}) {
  const firestore = getFirestore();

  // ✅ 检查集合是否允许访问
  if (SENSITIVE_COLLECTIONS.includes(params.collection)) {
    throw new Error(
      `Access denied: Collection "${params.collection}" is restricted`
    );
  }

  if (!ALLOWED_COLLECTIONS.includes(params.collection)) {
    throw new Error(
      `Invalid collection: "${params.collection}". Allowed: ${ALLOWED_COLLECTIONS.join(', ')}`
    );
  }

  // ✅ 如果需要用户权限，验证用户 ID
  if (params.userId) {
    const userDoc = await firestore.collection('users').doc(params.userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const user = userDoc.data();
    if (!user.permissions?.includes(`read:${params.collection}`)) {
      throw new Error(`User does not have permission to read from "${params.collection}"`);
    }
  }

  // ✅ 执行查询
  if (params.documentId) {
    const doc = await firestore
      .collection(params.collection)
      .doc(params.documentId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  }

  // ✅ 限制返回数量
  const snapshot = await firestore
    .collection(params.collection)
    .limit(100) // ✅ 防止返回过多数据
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

```typescript
// ✅ 配置文件定义权限
// mcp/config/permissions.ts
export const MCP_PERMISSIONS = {
  collections: {
    allowed: ['public_data', 'analytics', 'logs'],
    restricted: ['users', 'payments', 'secrets'],
    requireAuth: ['analytics', 'logs']
  },
  operations: {
    read: ['public_data', 'analytics', 'logs'],
    write: ['analytics', 'logs'], // 更严格的写权限
    delete: [] // 禁止通过 MCP 删除
  }
};
```

### 🔍 关键改进

1. ✅ 定义允许访问的集合白名单
2. ✅ 限制敏感集合的访问
3. ✅ 验证用户权限（如需要）
4. ✅ 限制查询返回的数据量
5. ✅ 使用配置文件管理权限策略

---

## 错误 3: Firebase 私钥格式错误

### 📋 错误描述

**常见表现**:
- 报错 "Error parsing service account key"
- 初始化 Firebase Admin 失败
- 在 Vercel 上运行正常但本地失败（或相反）

**根本原因**:
- 环境变量中的换行符处理不正确
- JSON 格式的私钥直接存储为字符串
- 不同环境（Vercel、本地）处理换行符方式不同

### ❌ 错误示例

```typescript
// ❌ 错误：直接使用私钥，没有处理换行符
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY // ❌ 换行符可能被转义
  })
});
// 报错：Error parsing service account key
```

```bash
# ❌ 错误：在 Vercel 环境变量中粘贴带真实换行的私钥
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...
-----END PRIVATE KEY-----
# Vercel 会将换行符转义，导致格式错误
```

### ✅ 正确做法

```typescript
// ✅ 正确：处理换行符
function getFirebasePrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;

  if (!key) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
  }

  // ✅ 处理多种可能的换行符格式
  // 1. 如果是 \n 字符串，替换为真实换行符
  // 2. 如果已经是真实换行符，保持不变
  return key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: getFirebasePrivateKey() // ✅ 使用处理后的私钥
  })
});
```

**环境变量配置**:

```bash
# ✅ 方式 1：使用转义的换行符（推荐 Vercel）
# .env 或 Vercel Environment Variables
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n...\n-----END PRIVATE KEY-----\n"

# ✅ 方式 2：使用 base64 编码（更安全）
# 先将私钥 base64 编码
echo '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...
-----END PRIVATE KEY-----' | base64

# 存储 base64 编码的私钥
FIREBASE_PRIVATE_KEY_BASE64="LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUU..."
```

```typescript
// ✅ 从 base64 解码私钥
function getFirebasePrivateKey(): string {
  // ✅ 优先使用 base64 编码的私钥
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    return Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY_BASE64,
      'base64'
    ).toString('utf-8');
  }

  // ✅ 回退到普通私钥（处理换行符）
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  throw new Error('No Firebase private key found in environment variables');
}
```

**验证脚本**:

```typescript
// ✅ 验证私钥格式
function validateFirebaseKey(key: string): boolean {
  // 检查基本格式
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('❌ Missing BEGIN PRIVATE KEY header');
    return false;
  }

  if (!key.includes('-----END PRIVATE KEY-----')) {
    console.error('❌ Missing END PRIVATE KEY footer');
    return false;
  }

  // 检查是否有真实换行符（不是 \n 字符串）
  if (key.includes('\\n')) {
    console.warn('⚠️ Private key contains escaped newlines (\\n)');
    console.log('Attempting to convert...');
    const converted = key.replace(/\\n/g, '\n');
    return validateFirebaseKey(converted);
  }

  console.log('✅ Private key format is valid');
  return true;
}

// 在初始化前验证
const privateKey = getFirebasePrivateKey();
if (!validateFirebaseKey(privateKey)) {
  throw new Error('Invalid Firebase private key format');
}
```

### 🔍 关键改进

1. ✅ 使用函数处理私钥换行符
2. ✅ 支持 base64 编码的私钥（更安全）
3. ✅ 添加私钥格式验证
4. ✅ 提供清晰的错误信息
5. ✅ 在文档中说明正确的配置方式

---

## 📌 总结

### 高频错误排名

1. 🔴 **Firebase 多次初始化**（错误 1）- 运行时崩溃
2. 🔴 **权限未验证**（错误 2）- 安全风险
3. 🟡 **私钥格式错误**（错误 3）- 配置失败

### 关键预防措施

- ✅ 使用 `admin.apps.length` 检查是否已初始化
- ✅ 导出 getter 函数而非直接导出实例
- ✅ 定义集合访问白名单
- ✅ 验证用户权限和集合权限
- ✅ 限制查询返回的数据量
- ✅ 使用函数处理私钥换行符
- ✅ 支持 base64 编码的私钥
- ✅ 添加私钥格式验证

### Firebase 集成检查清单

#### 初始化
- [ ] 检查 `admin.apps.length` 避免重复初始化
- [ ] 使用 getter 函数导出服务实例
- [ ] 验证所有必需的环境变量

#### 权限
- [ ] 定义允许访问的集合白名单
- [ ] 限制敏感集合的访问
- [ ] 验证用户权限（如需要）
- [ ] 限制查询返回数量（如 100 条）
- [ ] 禁止危险操作（如删除）

#### 配置
- [ ] 使用 base64 编码私钥（推荐）
- [ ] 或正确处理换行符（`replace(/\\n/g, '\n')`）
- [ ] 添加私钥格式验证
- [ ] 在文档中说明配置方式
- [ ] 测试本地和 Vercel 环境

#### 错误处理
- [ ] 捕获并记录所有 Firebase 错误
- [ ] 提供清晰的错误信息
- [ ] 实现重试机制（网络错误）
- [ ] 监控 Firebase 配额使用情况

---

**返回**: [project-errors/README.md](./README.md) | [ERROR_CATALOG.md](../ERROR_CATALOG.md)

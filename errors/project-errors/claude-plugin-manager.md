# Claude Plugin Manager 错误案例

> **项目**: Claude Plugin Manager
> **技术栈**: TypeScript, React, MCP Protocol
> **最后更新**: 2026-01-14

---

## 错误 1: Plugin 配置文件路径硬编码

### 📋 错误描述

**常见表现**:
- Windows 路径分隔符（`\`）硬编码在代码中
- 跨平台运行时路径错误
- 在 macOS/Linux 上找不到配置文件

**根本原因**:
- 没有使用 `path.join()` 处理路径
- 直接拼接字符串路径
- 忽略了不同操作系统的路径差异

### ❌ 错误示例

```typescript
// ❌ 错误：硬编码 Windows 路径分隔符
const configPath = `${process.env.HOME}\\.claude\\plugins\\config.json`;

// ❌ 错误：字符串拼接路径
const pluginPath = homeDir + '/.claude/plugins/' + pluginName;
```

### ✅ 正确做法

```typescript
// ✅ 正确：使用 path.join() 处理路径
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.claude', 'plugins', 'config.json');

// ✅ 正确：使用 path.resolve() 获取绝对路径
const pluginPath = path.resolve(homeDir, '.claude', 'plugins', pluginName);
```

### 🔍 关键改进

1. ✅ 使用 `path.join()` 自动处理路径分隔符
2. ✅ 使用 `os.homedir()` 获取跨平台的 home 目录
3. ✅ 使用 `path.resolve()` 获取绝对路径
4. ✅ 避免手动拼接路径字符串

---

## 错误 2: Plugin 依赖未声明在 package.json

### 📋 错误描述

**常见表现**:
- 本地开发正常，部署后缺少依赖
- 用户安装插件时缺少必需的 npm 包
- 运行时抛出 "Cannot find module" 错误

**根本原因**:
- 依赖安装在全局或父项目
- 忘记在 plugin 的 package.json 中声明依赖
- 没有测试插件的独立安装

### ❌ 错误示例

```json
// ❌ plugin/package.json - 缺少 axios 依赖
{
  "name": "my-plugin",
  "version": "1.0.0",
  "dependencies": {}
}
```

```typescript
// plugin/index.ts - 使用了未声明的依赖
import axios from 'axios'; // ❌ 运行时找不到 axios
```

### ✅ 正确做法

```json
// ✅ plugin/package.json - 声明所有依赖
{
  "name": "my-plugin",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

```bash
# ✅ 在 plugin 目录中安装依赖
cd plugin
npm install axios --save
```

### 🔍 关键改进

1. ✅ 在插件的 package.json 中声明所有依赖
2. ✅ 使用 `npm install --save` 自动添加到 dependencies
3. ✅ 测试插件在全新环境中的独立安装
4. ✅ 使用 `npm ci` 验证依赖完整性

---

## 错误 3: MCP Tool 调用未处理超时

### 📋 错误描述

**常见表现**:
- MCP 工具调用时界面无响应
- 长时间等待后才抛出错误
- 用户体验差，无法中断操作

**根本原因**:
- 没有设置 MCP 调用的超时时间
- 没有提供取消机制
- 没有显示加载状态

### ❌ 错误示例

```typescript
// ❌ 错误：无超时，无取消机制
async function callMCPTool(tool: string, params: any) {
  const result = await mcpClient.call(tool, params);
  // 如果 MCP 服务器卡住，这里会永久等待
  return result;
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：带超时和取消机制
async function callMCPTool(
  tool: string,
  params: any,
  options: { timeout?: number; signal?: AbortSignal } = {}
) {
  const timeout = options.timeout || 30000; // 默认 30 秒
  const controller = new AbortController();
  const signal = options.signal || controller.signal;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await mcpClient.call(tool, params, { signal });
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`MCP tool "${tool}" timed out after ${timeout}ms`);
    }
    throw error;
  }
}
```

### 🔍 关键改进

1. ✅ 设置默认超时时间（30 秒）
2. ✅ 使用 `AbortController` 实现取消机制
3. ✅ 清理超时定时器避免内存泄漏
4. ✅ 提供清晰的超时错误信息

---

## 错误 4: React State 更新时机错误

### 📋 错误描述

**常见表现**:
- Plugin 列表渲染时闪烁
- 安装完成后列表未刷新
- 状态更新时组件未重新渲染

**根本原因**:
- 直接修改 state 对象（而非返回新对象）
- 在异步操作完成前更新 UI
- 没有正确使用 React 的 setState

### ❌ 错误示例

```typescript
// ❌ 错误：直接修改 state
const [plugins, setPlugins] = useState<Plugin[]>([]);

function installPlugin(plugin: Plugin) {
  plugins.push(plugin); // ❌ 直接修改 state
  // React 不会检测到变化
}

// ❌ 错误：异步操作未完成就更新 UI
async function enablePlugin(id: string) {
  setPlugins(prev =>
    prev.map(p => p.id === id ? { ...p, enabled: true } : p)
  );
  // UI 先更新，但实际操作可能失败
  await mcpClient.enablePlugin(id);
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：返回新数组
const [plugins, setPlugins] = useState<Plugin[]>([]);

function installPlugin(plugin: Plugin) {
  setPlugins(prev => [...prev, plugin]); // ✅ 创建新数组
}

// ✅ 正确：异步操作完成后才更新 UI
async function enablePlugin(id: string) {
  try {
    await mcpClient.enablePlugin(id); // 先执行操作
    setPlugins(prev =>
      prev.map(p => p.id === id ? { ...p, enabled: true } : p)
    ); // 成功后更新 UI
  } catch (error) {
    console.error('Failed to enable plugin:', error);
    // 操作失败，UI 保持不变
  }
}
```

### 🔍 关键改进

1. ✅ 使用扩展运算符创建新数组/对象
2. ✅ 异步操作完成后才更新 state
3. ✅ 错误处理确保 UI 状态一致性
4. ✅ 使用函数式 setState 避免竞态条件

---

## 错误 5: Plugin 卸载时未清理资源

### 📋 错误描述

**常见表现**:
- 卸载 plugin 后内存泄漏
- MCP 连接未关闭
- 事件监听器未移除

**根本原因**:
- 没有实现 cleanup 函数
- useEffect 没有返回 cleanup 函数
- 组件卸载时未取消订阅

### ❌ 错误示例

```typescript
// ❌ 错误：没有 cleanup
useEffect(() => {
  const client = new MCPClient(config);
  client.connect();
  // 组件卸载时连接未关闭
}, [config]);

// ❌ 错误：事件监听器未移除
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // 没有返回 cleanup 函数
}, []);
```

### ✅ 正确做法

```typescript
// ✅ 正确：返回 cleanup 函数
useEffect(() => {
  const client = new MCPClient(config);
  client.connect();

  return () => {
    client.disconnect(); // ✅ 清理 MCP 连接
  };
}, [config]);

// ✅ 正确：移除事件监听器
useEffect(() => {
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize); // ✅ 清理监听器
  };
}, []);
```

### 🔍 关键改进

1. ✅ useEffect 返回 cleanup 函数
2. ✅ 关闭 MCP 连接和其他持久连接
3. ✅ 移除所有事件监听器
4. ✅ 取消未完成的异步操作

---

## 错误 6: Plugin Manifest 版本兼容性未检查

### 📋 错误描述

**常见表现**:
- 旧版本 plugin 在新版本 manager 中崩溃
- 新版本 plugin 在旧版本 manager 中无法加载
- 缺少向后兼容性处理

**根本原因**:
- 没有检查 manifest 版本
- 没有版本兼容性策略
- 缺少版本迁移逻辑

### ❌ 错误示例

```typescript
// ❌ 错误：直接使用 manifest，不检查版本
function loadPlugin(manifest: any) {
  return {
    name: manifest.name,
    version: manifest.version,
    tools: manifest.tools // 如果格式变化会崩溃
  };
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：检查版本并迁移
interface PluginManifestV1 {
  version: '1.0';
  name: string;
  tools: string[];
}

interface PluginManifestV2 {
  version: '2.0';
  name: string;
  tools: { name: string; schema: any }[]; // 格式变化
}

function loadPlugin(manifestData: any): PluginManifestV2 {
  const manifestVersion = manifestData.version || '1.0';

  if (manifestVersion === '1.0') {
    // ✅ 迁移旧版本格式
    const v1Manifest = manifestData as PluginManifestV1;
    return {
      version: '2.0',
      name: v1Manifest.name,
      tools: v1Manifest.tools.map(name => ({ name, schema: {} }))
    };
  }

  if (manifestVersion === '2.0') {
    return manifestData as PluginManifestV2;
  }

  throw new Error(`Unsupported manifest version: ${manifestVersion}`);
}
```

### 🔍 关键改进

1. ✅ 明确定义版本接口
2. ✅ 实现版本迁移逻辑
3. ✅ 向后兼容旧版本格式
4. ✅ 对不支持的版本抛出清晰错误

---

## 错误 7: Plugin 搜索未做防抖处理

### 📋 错误描述

**常见表现**:
- 输入时发送大量搜索请求
- UI 卡顿，响应慢
- 浪费 API 调用次数

**根本原因**:
- 每次 onChange 都触发搜索
- 没有使用防抖（debounce）
- 没有取消未完成的请求

### ❌ 错误示例

```typescript
// ❌ 错误：每次输入都搜索
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // ❌ 每次 query 变化都立即搜索
    searchPlugins(query).then(setResults);
  }, [query]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：使用防抖和取消机制
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // ✅ 防抖：延迟 300ms 后才搜索
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        const controller = new AbortController();
        searchPlugins(query, { signal: controller.signal })
          .then(setResults)
          .catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Search failed:', error);
            }
          });

        return () => controller.abort(); // ✅ 清理：取消未完成的请求
      }
    }, 300);

    return () => clearTimeout(timeoutId); // ✅ 清理定时器
  }, [query]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### 🔍 关键改进

1. ✅ 使用 setTimeout 实现 300ms 防抖
2. ✅ 使用 AbortController 取消未完成的请求
3. ✅ useEffect cleanup 清理定时器和请求
4. ✅ 只在输入非空时搜索

---

## 错误 8: Plugin 权限配置未验证

### 📋 错误描述

**常见表现**:
- Plugin 请求过多权限（安全风险）
- Plugin 权限配置格式错误导致加载失败
- 用户不清楚 plugin 需要哪些权限

**根本原因**:
- 没有权限验证逻辑
- 缺少权限最小化原则检查
- 没有权限说明文档

### ❌ 错误示例

```json
// ❌ 错误：权限配置不清晰
{
  "permissions": ["all"] // ❌ 过于宽泛
}
```

```typescript
// ❌ 错误：不验证权限
function loadPlugin(manifest: any) {
  return {
    permissions: manifest.permissions // 直接使用，不验证
  };
}
```

### ✅ 正确做法

```typescript
// ✅ 正确：定义明确的权限类型
type PluginPermission =
  | 'mcp:read'
  | 'mcp:write'
  | 'fs:read'
  | 'fs:write'
  | 'network:fetch';

interface PluginManifest {
  name: string;
  permissions: PluginPermission[];
  permissionDescriptions: Record<PluginPermission, string>;
}

// ✅ 正确：验证权限配置
function validatePermissions(manifest: any): PluginManifest {
  const validPermissions: PluginPermission[] = [
    'mcp:read', 'mcp:write', 'fs:read', 'fs:write', 'network:fetch'
  ];

  const permissions = manifest.permissions || [];
  const invalid = permissions.filter(p => !validPermissions.includes(p));

  if (invalid.length > 0) {
    throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
  }

  // ✅ 检查是否提供了权限说明
  for (const permission of permissions) {
    if (!manifest.permissionDescriptions?.[permission]) {
      throw new Error(`Missing description for permission: ${permission}`);
    }
  }

  return manifest as PluginManifest;
}
```

```json
// ✅ 正确：明确的权限配置
{
  "permissions": ["mcp:read", "network:fetch"],
  "permissionDescriptions": {
    "mcp:read": "读取 MCP 工具列表和配置",
    "network:fetch": "从 GitHub 获取 plugin 元数据"
  }
}
```

### 🔍 关键改进

1. ✅ 定义明确的权限类型系统
2. ✅ 验证权限配置的有效性
3. ✅ 要求提供权限说明文档
4. ✅ 遵循最小权限原则

---

## 📌 总结

### 高频错误排名

1. 🔴 **路径硬编码**（错误 1）- 跨平台兼容性问题
2. 🔴 **依赖未声明**（错误 2）- 部署失败
3. 🟡 **MCP 调用无超时**（错误 3）- 用户体验差
4. 🟡 **State 更新时机错误**（错误 4）- UI 不一致
5. 🟡 **资源未清理**（错误 5）- 内存泄漏

### 关键预防措施

- ✅ 使用 `path` 模块处理所有路径操作
- ✅ 在插件 package.json 中声明所有依赖
- ✅ 为所有 MCP 调用设置超时和取消机制
- ✅ 异步操作完成后才更新 React state
- ✅ useEffect 返回 cleanup 函数清理资源
- ✅ 实现版本兼容性检查和迁移
- ✅ 搜索输入使用防抖和请求取消
- ✅ 验证和限制 plugin 权限配置

---

**返回**: [project-errors/README.md](./README.md) | [ERROR_CATALOG.md](../ERROR_CATALOG.md)

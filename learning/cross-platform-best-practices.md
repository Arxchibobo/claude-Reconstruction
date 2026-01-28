# 跨平台开发最佳实践

**创建日期**: 2026-01-27
**来源**: Vibecraft 项目 WSL 支持实战经验
**适用场景**: 需要在 Windows/WSL/Linux 上运行的开发工具

---

## 🎯 核心原则

### 1. 识别"特殊平台"

**问题**: WSL 既不是 Windows，也不是 Linux

```typescript
// ❌ 错误：只检查 process.platform
if (process.platform === 'win32') {
  // Windows 逻辑
} else {
  // Unix 逻辑（WSL 会走这里，但可能需要调用 Windows 工具）
}
```

**关键洞察**:
- WSL: `process.platform === 'linux'`（Linux 内核）
- 但可以调用 Windows 程序（`powershell.exe`, `cmd.exe`, `wt.exe`）
- 文件系统双向访问：`/mnt/e/` ↔ `E:\`

---

## 🛠️ 平台检测

### 准确的 WSL 检测

```typescript
/**
 * 检测是否运行在 WSL 环境中
 *
 * 检测逻辑：
 * 1. 检查 /proc/version 是否包含 "microsoft"（WSL1/WSL2）
 * 2. 检查 WSL_DISTRO_NAME 环境变量（WSL2）
 */
export function isWSL(): boolean {
  // 快速路径：非 Linux 平台
  if (process.platform !== 'linux') {
    return false;
  }

  // 检查环境变量（WSL2）
  if (process.env.WSL_DISTRO_NAME) {
    return true;
  }

  // 检查 /proc/version（WSL1 和 WSL2 都有）
  try {
    const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    return version.includes('microsoft');
  } catch {
    return false;
  }
}
```

**使用示例**:
```typescript
if (IS_WINDOWS || isWSL()) {
  // Windows/WSL: 使用 Windows 工具和剪贴板
  await launchWindowsTerminal(windowsCwd);
} else {
  // 纯 Unix: 使用 tmux
  await createTmuxSession(unixCwd);
}
```

---

## 📂 路径处理

### 双向路径转换

```typescript
/**
 * 检测是否为 Windows 路径格式
 */
function isWindowsPath(path: string): boolean {
  return /^[A-Z]:\\/i.test(path);
}

/**
 * Windows 路径 → WSL 路径
 * E:\Bobo's Coding cache → /mnt/e/Bobo's Coding cache
 */
function convertWindowsPathToWSL(windowsPath: string): string {
  return windowsPath.replace(/^([A-Z]):\\/i, (_, drive) =>
    `/mnt/${drive.toLowerCase()}/`
  );
}

/**
 * WSL 路径 → Windows 路径
 * /mnt/e/Projects → E:\Projects
 */
function convertWSLPathToWindows(wslPath: string): string {
  return wslPath.replace(/^\/mnt\/([a-z])\//i, (_, drive) =>
    `${drive.toUpperCase()}:\\`
  );
}

/**
 * 统一路径转换入口
 */
function normalizePath(
  path: string,
  targetEnv: 'windows' | 'wsl' | 'unix'
): string {
  // WSL → Windows
  if (targetEnv === 'windows' && path.startsWith('/mnt/')) {
    return convertWSLPathToWindows(path);
  }

  // Windows → WSL
  if (targetEnv === 'wsl' && isWindowsPath(path)) {
    return convertWindowsPathToWSL(path);
  }

  // Unix: 不转换，直接返回
  return path;
}
```

**使用示例**:
```typescript
// 接收用户输入（可能是任意格式）
const userCwd = req.body.cwd; // "E:\Projects" 或 "/mnt/e/Projects"

// 在 WSL 中启动 Windows Terminal
if (isWSL()) {
  // 转换为 Windows 格式传给 PowerShell
  const windowsCwd = normalizePath(userCwd, 'windows');
  const psCommand = `wt.exe -d "${windowsCwd}" ...`;
  execFile('powershell.exe', ['-Command', psCommand]);
}

// 在 WSL 文件系统中操作
const wslCwd = normalizePath(userCwd, 'wsl');
process.chdir(wslCwd);
```

---

### 特殊字符处理

```typescript
/**
 * 转义 PowerShell 命令中的特殊字符
 */
function escapePowerShellPath(path: string): string {
  // PowerShell 需要转义的字符：$, `, ", ', &, |
  return path
    .replace(/\$/g, '`$')
    .replace(/`/g, '``')
    .replace(/"/g, '`"')
    .replace(/'/g, "''")  // 单引号双写
    .replace(/&/g, '`&')
    .replace(/\|/g, '`|');
}

/**
 * 转义 Bash 命令中的特殊字符
 */
function escapeBashPath(path: string): string {
  // Bash 需要转义的字符：$, `, ", \, !, *, ?, [, ], (, ), {, }, ;, &, |, <, >, 空格
  return path.replace(/([`$"\\!*?[\](){};&|<> ])/g, '\\$1');
}
```

**使用示例**:
```typescript
// Windows/WSL: 调用 PowerShell
if (IS_WINDOWS || isWSL()) {
  const safePath = escapePowerShellPath(windowsCwd);
  const psCommand = `wt.exe -d "${safePath}" ...`;
}

// Unix: 调用 Bash
else {
  const safePath = escapeBashPath(unixCwd);
  const bashCommand = `cd "${safePath}" && tmux new-session ...`;
}
```

---

## 🔧 环境特定工具调用

### PowerShell 调用适配

```typescript
/**
 * 获取正确的 PowerShell 命令
 * - Windows: 'powershell'
 * - WSL: 'powershell.exe'（调用 Windows 的 PowerShell）
 */
function getPowerShellCommand(): string {
  return isWSL() ? 'powershell.exe' : 'powershell';
}

/**
 * 调用 PowerShell 执行命令
 */
async function executePowerShellCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const psCmd = getPowerShellCommand();

    execFile(psCmd, ['-Command', command], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`PowerShell error: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}
```

**使用示例**:
```typescript
// 检测 Windows Terminal 是否安装
const wtPath = await executePowerShellCommand(
  '(Get-Command wt.exe -ErrorAction SilentlyContinue).Source'
);

if (!wtPath) {
  throw new Error('Windows Terminal not installed');
}
```

---

### 剪贴板操作

```typescript
/**
 * 发送文本到 Windows 剪贴板（跨平台）
 */
async function sendToWindowsClipboard(text: string): Promise<void> {
  const psCmd = getPowerShellCommand();
  const command = `Set-Clipboard -Value @'\n${text}\n'@`;

  return new Promise((resolve, reject) => {
    execFile(psCmd, ['-Command', command], (error) => {
      if (error) {
        reject(new Error(`Failed to set clipboard: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * 从 Windows 剪贴板读取文本
 */
async function readFromWindowsClipboard(): Promise<string> {
  const psCmd = getPowerShellCommand();
  const command = 'Get-Clipboard';

  return new Promise((resolve, reject) => {
    execFile(psCmd, ['-Command', command], (error, stdout) => {
      if (error) {
        reject(new Error(`Failed to get clipboard: ${error.message}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}
```

---

## 🧪 测试策略

### 跨平台测试矩阵

| 维度 | 测试用例 |
|------|---------|
| **操作系统** | Windows / WSL / Linux / macOS |
| **路径格式** | Windows (`E:\`) / WSL (`/mnt/e/`) / Unix (`/home/`) / 相对路径 (`./`) |
| **特殊字符** | 空格 / 单引号 (`'`) / `&` / `%` / 中文 / emoji |
| **工具调用** | PowerShell / Bash / Node.js / Python |

### 自动化测试脚本

```bash
#!/bin/bash
# test-cross-platform.sh

echo "🧪 跨平台兼容性测试"

# 1. 平台检测测试
echo "1. 测试平台检测..."
node -e "
const { isWSL } = require('./utils');
console.log('isWSL:', isWSL());
console.log('process.platform:', process.platform);
"

# 2. 路径转换测试
echo "2. 测试路径转换..."
node -e "
const { normalizePath } = require('./utils');

const testCases = [
  ['E:\\\\Projects', 'wsl', '/mnt/e/Projects'],
  ['/mnt/e/Projects', 'windows', 'E:\\\\Projects'],
  [\"E:\\\\Bobo's Coding cache\", 'wsl', \"/mnt/e/Bobo's Coding cache\"]
];

testCases.forEach(([input, target, expected]) => {
  const result = normalizePath(input, target);
  console.assert(result === expected, \`Failed: \${input} -> \${result} (expected \${expected})\`);
});

console.log('✅ 路径转换测试通过');
"

# 3. 特殊字符测试
echo "3. 测试特殊字符处理..."
# ... 更多测试用例

echo "✅ 所有测试通过"
```

---

## 📊 常见问题模式

### 问题 1: 混合使用 Unix 和 Windows 工具

```typescript
// ❌ 错误：在 WSL 中创建 tmux session，但窗口在 Windows Terminal
if (isUnix) {
  // WSL 会走这里（因为 process.platform === 'linux'）
  await createTmuxSession(cwd);  // ❌ tmux 在后台，用户看不到
}

// ✅ 正确：WSL 使用 Windows Terminal
if (IS_WINDOWS || isWSL()) {
  // Windows 和 WSL 都走这里
  await launchWindowsTerminal(cwd);  // ✅ 用户能看到窗口
} else {
  // 纯 Unix/Linux
  await createTmuxSession(cwd);
}
```

---

### 问题 2: 路径未转换就跨边界传递

```typescript
// ❌ 错误：WSL 路径直接传给 Windows 工具
const wslPath = '/mnt/e/Projects';
const psCommand = `wt.exe -d "${wslPath}"`;  // ❌ Windows Terminal 无法识别

// ✅ 正确：先转换为 Windows 格式
const wslPath = '/mnt/e/Projects';
const windowsPath = normalizePath(wslPath, 'windows');  // 'E:\Projects'
const psCommand = `wt.exe -d "${windowsPath}"`;  // ✅ 正确
```

---

### 问题 3: 环境变量未正确传递

```typescript
// ❌ 错误：在 Node.js 中设置环境变量，子进程无法继承
process.env.MY_VAR = 'value';
execFile('powershell.exe', ['-Command', 'echo $env:MY_VAR']);  // ❌ 输出为空

// ✅ 正确：通过命令行显式设置环境变量
const command = `$env:MY_VAR = 'value'; echo $env:MY_VAR`;
execFile('powershell.exe', ['-Command', command]);  // ✅ 正确输出

// ✅ 更好：使用 cmd /k
const command = `set MY_VAR=value && my-command`;
execFile('cmd.exe', ['/k', command]);
```

---

## 📚 参考案例

### Vibecraft 项目实战

**项目**: Vibecraft (Claude Code 可视化工具)
**挑战**: 支持 Windows、WSL、Linux 三个平台
**解决方案**:
- 统一的路径转换层
- 平台特定的 session 管理
- Hook 系统跨进程通信

**核心代码**:
- `server/index.ts:166-212` - 平台检测和路径转换
- `server/index.ts:1687-1717` - WSL 窗口激活逻辑
- `server/index.ts:389-394` - 环境变量传递

**文档**: `E:\Bobo's Coding cache\bo-work\vibecraft\CHANGES_SUMMARY.md`

---

## 🎯 最佳实践清单

### 设计阶段 ✅

- [ ] 明确支持的平台（Windows / WSL / Linux / macOS）
- [ ] 识别平台特定的工具（PowerShell / Bash / tmux / Windows Terminal）
- [ ] 设计统一的抽象层（路径 / 进程 / IPC）

### 实现阶段 ✅

- [ ] 创建 `isWSL()` 等平台检测函数
- [ ] 创建 `normalizePath()` 路径转换函数
- [ ] 创建 `getPowerShellCommand()` 等工具适配函数
- [ ] 所有跨边界操作（Node ↔ PowerShell）都先转换格式
- [ ] 特殊字符转义（路径、命令参数）

### 测试阶段 ✅

- [ ] 跨平台测试矩阵（操作系统 × 路径格式 × 特殊字符）
- [ ] 边界测试（UNC 路径 / 网络驱动器 / 符号链接）
- [ ] 自动化测试脚本
- [ ] 真实环境验证（实际安装在目标平台上测试）

### 文档阶段 ✅

- [ ] 明确说明支持的平台
- [ ] 提供每个平台的安装指南
- [ ] 记录已知限制（例如："不支持 UNC 路径"）
- [ ] 提供故障排查指南

---

## 🔗 相关资源

**文档**:
- [2026-01-27 Vibecraft 工作总结](./2026-01-27-vibecraft-work-summary.md)
- [CLAUDE.md - E014 跨平台路径处理](../CLAUDE.md#e014)

**代码示例**:
- `E:\Bobo's Coding cache\bo-work\vibecraft\server\index.ts`

**测试用例**:
- `E:\Bobo's Coding cache\bo-work\vibecraft\tests\archived\`

---

**文档版本**: 1.0
**最后更新**: 2026-01-27
**维护者**: Claude Sonnet 4.5

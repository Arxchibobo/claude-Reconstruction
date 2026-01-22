---
issue: 002
title: Jupyter Notebook 可执行脚本提取规范
status: open
created: 2026-01-13
priority: P2
---

# Jupyter Notebook 可执行脚本提取规范

## 目标

设计一套规范，让 Jupyter Notebook
可以被通用工具自动提取为可执行脚本，无需业务特定的判断逻辑。

## 背景

### 当前问题

`notebook-to-executable.ts` 存在大量 hack 代码：

```typescript
// 硬编码的业务判断
if (
    source.includes("prompt(") ||
    source.includes("使用提示") ||
    source.includes("复制下面的代码") ||
    source.includes("获取所有国家的用户统计") ||
    source.includes("交互式配置") ||
    source.includes("批量分析多个国家")
) {
    continue;
}

// 硬编码的代码分类
if (
    source.includes("import { Client }") &&
    source.includes("@modelcontextprotocol")
) {
    importCode.push(source);
} else if (source.includes("globalThis.MCP_HUB_URL")) {
    configCode.push(source);
}
```

### 期望效果

1. Notebook 作为唯一代码源（single source of truth）
2. 通用提取工具，无业务代码依赖
3. 支持参数化（COUNTRY, DAYS 等）
4. 保持 Notebook 的交互性和可读性

## 设计方案

### 方案 A: Cell Metadata 标记（推荐）⭐

利用 Jupyter Notebook 的 cell metadata 机制，添加自定义标记：

```json
{
    "cell_type": "code",
    "metadata": {
        "extract": "config", // config | main | skip | once
        "params": ["COUNTRY", "DAYS"] // 该 cell 依赖的参数
    },
    "source": ["..."]
}
```

**Cell 类型**：

| 类型     | 说明                         | 提取行为              |
| -------- | ---------------------------- | --------------------- |
| `skip`   | 跳过，不提取                 | 忽略                  |
| `once`   | 一次性代码（imports, setup） | 提取到脚本开头        |
| `config` | 配置代码                     | 提取，替换参数        |
| `main`   | 主逻辑                       | 提取，替换 globalThis |
| (无标记) | 默认                         | 按 `skip` 处理        |

**优点**：

- 标准 Jupyter 机制，编辑器兼容
- 标记与代码分离，不污染代码
- 支持复杂的元数据（参数列表、顺序等）

**缺点**：

- 需要手动编辑 JSON 或使用支持的编辑器
- VS Code Jupyter 插件可能不显示自定义 metadata

### 方案 B: 魔法注释标记

在代码中使用特殊注释标记：

```typescript
// @extract: config
// @params: COUNTRY, DAYS
const COUNTRY_CODE = "${COUNTRY}";
const DAYS = ${DAYS};
```

**标记格式**：

```
// @extract: <type>
// @params: <param1>, <param2>, ...
// @order: <number>  // 可选，控制提取顺序
```

**优点**：

- 代码中直接可见
- 无需编辑 JSON
- 版本控制友好

**缺点**：

- 污染代码（虽然只是注释）
- 可能与其他工具冲突

### 方案 C: 混合方案（推荐实施）⭐⭐

结合方案 A 和 B，优先读取 metadata，fallback 到魔法注释：

1. **提取器优先读取 cell metadata**
2. **如果没有 metadata，扫描首行注释**
3. **默认行为：跳过无标记的 cell**

这样：

- 老 notebook 可以用注释快速适配
- 新 notebook 推荐使用 metadata
- 保持向后兼容

## Notebook 改造规范

### 1. 标准 Cell 结构

```
┌─────────────────────────────────────┐
│ Cell 0: README (markdown)           │  ← 必须：LLM 使用指南
├─────────────────────────────────────┤
│ Cell 1: 参数定义                     │  ← @extract: params
│   export interface NotebookParams   │
├─────────────────────────────────────┤
│ Cell 2: 导入和连接                   │  ← @extract: once
│   import { Client } from "..."      │
├─────────────────────────────────────┤
│ Cell 3: 配置（交互式）               │  ← @extract: skip
│   const input = prompt(...)         │
├─────────────────────────────────────┤
│ Cell 4: 配置（脚本用）               │  ← @extract: config
│   const COUNTRY_CODE = "${COUNTRY}" │
├─────────────────────────────────────┤
│ Cell 5: 主逻辑                       │  ← @extract: main
│   const result = await query(...)   │
├─────────────────────────────────────┤
│ Cell 6: 输出/可视化（交互式）        │  ← @extract: skip
│   console.table(result)             │
└─────────────────────────────────────┘
```

### 2. 参数规范

在 notebook 开头定义参数 schema：

```typescript
// @extract: params
// Notebook 参数定义（提取器会读取这个 cell）
interface NotebookParams {
    COUNTRY: string; // 国家代码，如 "DE", "US"
    DAYS: number; // 查询天数，1-30
}

// 默认值
const DEFAULT_PARAMS: NotebookParams = {
    COUNTRY: "DE",
    DAYS: 7,
};
```

### 3. 避免 globalThis

改用显式参数传递：

```typescript
// ❌ 不推荐
globalThis.COUNTRY_CODES = ["DE"];
const result = await query(globalThis.COUNTRY_CODES);

// ✅ 推荐
const params: NotebookParams = { COUNTRY: "DE", DAYS: 7 };
const result = await analyzeCountry(params);
```

### 4. 提取器友好的代码组织

```typescript
// @extract: main
// 主分析函数（提取器会将此函数提取到脚本中）
async function analyzeCountry(params: NotebookParams) {
    const { COUNTRY, DAYS } = params;

    // ... 分析逻辑 ...

    return result;
}

// 仅在 notebook 中执行（提取器忽略）
// @extract: skip
if (typeof Deno !== "undefined" && Deno.args.length === 0) {
    // Interactive mode
    const country = prompt("Country code:", "DE");
    const days = parseInt(prompt("Days:", "7") || "7");
    await analyzeCountry({ COUNTRY: country!, DAYS: days });
}
```

## 提取器实现

### 新版 `notebook-to-executable.ts`

```typescript
#!/usr/bin/env -S deno run -A

interface CellMeta {
    extract?: "skip" | "once" | "config" | "params" | "main";
    params?: string[];
    order?: number;
}

interface NotebookCell {
    cell_type: string;
    metadata: CellMeta;
    source: string | string[];
}

function parseExtractDirective(source: string): CellMeta | null {
    const match = source.match(/\/\/\s*@extract:\s*(\w+)/);
    if (!match) return null;

    const meta: CellMeta = { extract: match[1] as CellMeta["extract"] };

    const paramsMatch = source.match(/\/\/\s*@params:\s*(.+)/);
    if (paramsMatch) {
        meta.params = paramsMatch[1].split(",").map((p) => p.trim());
    }

    return meta;
}

function extractNotebook(
    notebook: { cells: NotebookCell[] },
    params: Record<string, any>,
) {
    const sections = {
        params: [] as string[],
        once: [] as string[],
        config: [] as string[],
        main: [] as string[],
    };

    for (const cell of notebook.cells) {
        if (cell.cell_type !== "code") continue;

        const source = Array.isArray(cell.source)
            ? cell.source.join("")
            : cell.source;

        // 优先读取 metadata，fallback 到注释
        const meta = cell.metadata?.extract
            ? cell.metadata
            : parseExtractDirective(source);

        if (!meta || meta.extract === "skip") continue;

        const section = meta.extract as keyof typeof sections;
        if (sections[section]) {
            sections[section].push(source);
        }
    }

    // 组装脚本
    return `#!/usr/bin/env -S deno run -A
// Auto-generated from notebook
// Params: ${JSON.stringify(params)}

${sections.once.join("\n\n")}

// Configuration
${sections.config.map((c) => substituteParams(c, params)).join("\n\n")}

// Main
${sections.main.map((c) => substituteParams(c, params)).join("\n\n")}
`;
}

function substituteParams(code: string, params: Record<string, any>): string {
    return code.replace(/\$\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? String(params[key]) : `\${${key}}`;
    });
}
```

## 迁移计划

### Phase 1: 添加标记 ✏️

- [ ] 1.1 在 `art-generation-country-analysis.ipynb` 中添加 `@extract` 注释
- [ ] 1.2 将交互式 cell 标记为 `@extract: skip`
- [ ] 1.3 将核心逻辑 cell 标记为 `@extract: main`
- [ ] 1.4 将 imports 标记为 `@extract: once`

### Phase 2: 重构 Notebook ♻️

- [ ] 2.1 添加 params 定义 cell
- [ ] 2.2 将 `globalThis` 改为参数传递
- [ ] 2.3 将分析逻辑封装为函数
- [ ] 2.4 添加参数默认值

### Phase 3: 重写提取器 🔧

- [ ] 3.1 实现新版 `notebook-to-executable.ts`
- [ ] 3.2 移除所有业务特定代码
- [ ] 3.3 支持 metadata 和注释两种标记
- [ ] 3.4 添加参数替换功能

### Phase 4: 测试验证 ✅

- [ ] 4.1 提取脚本并执行
- [ ] 4.2 对比 notebook 直接执行的结果
- [ ] 4.3 验证不同参数组合
- [ ] 4.4 更新文档

## 参考示例

### 改造后的 Notebook 结构

```
art-generation-country-analysis.ipynb
├── Cell 0: README (markdown) - LLM 使用指南
├── Cell 1: @extract: params - 参数定义
├── Cell 2: @extract: once - Imports
├── Cell 3: @extract: skip - 交互式配置
├── Cell 4: @extract: config - 脚本配置
├── Cell 5: @extract: skip - 国家列表查询（交互用）
├── Cell 6: @extract: main - 核心分析函数
└── Cell 7: @extract: skip - 结果展示
```

### 生成的脚本

```typescript
#!/usr/bin/env -S deno run -A
// Auto-generated from: art-generation-country-analysis.ipynb
// Params: { "COUNTRY": "DE", "DAYS": 7 }

// === Imports (from @extract: once) ===
import { Client } from "npm:@modelcontextprotocol/sdk@1.24.3/client/index.js";
// ...

// === Config (from @extract: config) ===
const COUNTRY_CODE = "DE";
const DAYS = 7;
// ...

// === Main (from @extract: main) ===
async function analyzeCountry(params) {
    // ...analysis logic...
}

await analyzeCountry({ COUNTRY: "DE", DAYS: 7 });
```

## 成功标准

- [ ] 提取器代码 < 100 行，无业务特定逻辑
- [ ] Notebook 保持可读性和交互性
- [ ] 生成的脚本可直接执行
- [ ] 支持参数化运行
- [ ] 适用于其他类似 notebook

## 相关文件

- `art-generation-country-analysis.ipynb` - 待改造的 notebook
- `notebook-to-executable.ts` - 待重写的提取器

## 下一步

1. **Review**: 确认方案 C（混合方案）是否可行
2. **Prototype**: 先在一个 notebook 上试验
3. **Iterate**: 根据实际效果调整规范

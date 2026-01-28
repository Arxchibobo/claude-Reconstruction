# Web Design Guidelines Skill 使用指南

> **来源**: Vercel Labs | **版本**: 1.0.0 | **类型**: UI/UX 代码审查

---

## 🎯 核心功能

**自动检查 UI 代码是否符合 Web Interface Guidelines 最佳实践**

- ✅ 无障碍性（Accessibility）
- ✅ 表单体验（Forms）
- ✅ 性能优化（Performance）
- ✅ 动画规范（Animation）
- ✅ 触摸交互（Touch）
- ✅ 深色模式（Dark Mode）
- ✅ 国际化（i18n）
- ✅ SEO & 语义化

---

## 📋 完整检查清单（60+ 规则）

### 🔍 无障碍性（Accessibility）- 10条

| 规则 | 说明 | 错误示例 |
|------|------|---------|
| Icon-only buttons | 需要 `aria-label` | `<button><Icon /></button>` ❌ |
| Form controls | 需要 `<label>` 或 `aria-label` | `<input />` ❌ |
| 键盘操作 | 需要 `onKeyDown`/`onKeyUp` | `<div onClick>` ❌ |
| 语义化 HTML | `<button>` 做操作，`<a>` 做导航 | `<div onClick>` ❌ |
| 图片 alt | 所有图片需要 `alt`，装饰性用 `alt=""` | `<img src="...">` ❌ |
| 装饰性图标 | 需要 `aria-hidden="true"` | `<Icon />` ❌ |
| 异步更新 | Toast/验证需要 `aria-live="polite"` | `toast()` ❌ |
| 标题层级 | 按层级使用 `<h1>-<h6>` | `<h1> <h3>` ❌ |
| Skip link | 包含跳转到主内容的链接 | 无 ❌ |
| 锚点 | `scroll-margin-top` 在标题锚点 | `#section` ❌ |

### 🎯 焦点状态（Focus States）- 4条

| 规则 | 说明 | 正确示例 |
|------|------|---------|
| 可见焦点 | `focus-visible:ring-*` 或等效 | `focus-visible:ring-2` ✅ |
| 禁止移除 outline | 不能用 `outline-none` 不替换 | `outline-none` ❌ |
| :focus-visible | 优先用 `:focus-visible` 而非 `:focus` | `focus-visible:` ✅ |
| :focus-within | 复合控件用 `:focus-within` | `focus-within:ring` ✅ |

### 📝 表单（Forms）- 13条

| 规则 | 说明 | 示例 |
|------|------|------|
| autocomplete | 输入框需要 `autocomplete` 和 `name` | `autocomplete="email"` ✅ |
| 正确的 type | 用正确的 `type` 和 `inputmode` | `type="email"` ✅ |
| 禁止阻止粘贴 | 不能 `onPaste` + `preventDefault` | ❌ 银行网站常犯 |
| 可点击标签 | 用 `htmlFor` 或包裹控件 | `<label htmlFor="email">` ✅ |
| 拼写检查 | 邮箱/验证码关闭 `spellCheck` | `spellCheck={false}` ✅ |
| Checkbox/Radio | 标签+控件共享点击区域 | 无死区 ✅ |
| 提交按钮 | 请求前保持启用，期间显示 spinner | `disabled={isLoading}` ✅ |
| 错误提示 | 内联在字段旁；提交时聚焦首个错误 | `focus()` ✅ |
| Placeholder | 以 `…` 结尾，显示示例格式 | `"john@example.com…"` ✅ |
| autocomplete="off" | 非认证字段避免密码管理器触发 | ✅ |
| 未保存警告 | 导航前警告 `beforeunload` | `usePrompt()` ✅ |
| 必需字段 | 用 `required` 和 `aria-required` | ✅ |
| 禁用粘贴 | ❌ 最差的用户体验 | 银行/政府网站 ❌ |

### 🎬 动画（Animation）- 6条

| 规则 | 说明 | 实现 |
|------|------|------|
| prefers-reduced-motion | 尊重用户偏好 | `@media (prefers-reduced-motion)` ✅ |
| 动画属性 | 只动画 `transform`/`opacity` | GPU 加速 ✅ |
| 禁止 transition: all | 明确列出属性 | `transition: opacity 0.2s` ✅ |
| transform-origin | 设置正确的原点 | `transform-origin: center` ✅ |
| SVG 动画 | 在 `<g>` 包裹上做 transform | `transform-box: fill-box` ✅ |
| 可中断动画 | 响应用户输入 | 监听事件 ✅ |

### ✍️ 排版（Typography）- 6条

| 规则 | 错误 | 正确 |
|------|------|------|
| 省略号 | `...` ❌ | `…` ✅ |
| 引号 | 直引号 `"` ❌ | 弯引号 `"` `"` ✅ |
| 不间断空格 | `10 MB` ❌ | `10&nbsp;MB` ✅ |
| Loading 状态 | `"Loading"` ❌ | `"Loading…"` ✅ |
| 数字列 | 默认字体 ❌ | `font-variant-numeric: tabular-nums` ✅ |
| 标题换行 | 默认 ❌ | `text-wrap: balance` ✅ |

### 📦 内容处理（Content Handling）- 4条

| 规则 | 说明 | 实现 |
|------|------|------|
| 长文本处理 | `truncate` / `line-clamp-*` / `break-words` | `line-clamp-2` ✅ |
| Flex 子元素 | 需要 `min-w-0` 允许截断 | `min-w-0 truncate` ✅ |
| 空状态 | 不渲染破损 UI | `{list.length > 0 && ...}` ✅ |
| UGC 内容 | 预期短/中/极长输入 | 防御性布局 ✅ |

### 🖼️ 图片（Images）- 3条

| 规则 | 说明 | 实现 |
|------|------|------|
| 尺寸属性 | 显式 `width` 和 `height` | 防止 CLS ✅ |
| 懒加载 | 折叠下方 `loading="lazy"` | Next.js 默认 ✅ |
| 优先加载 | 关键图片 `priority` | `fetchpriority="high"` ✅ |

### ⚡ 性能（Performance）- 7条

| 规则 | 说明 | 工具 |
|------|------|------|
| 虚拟化 | 大列表（>50）虚拟化 | `virtua` / `content-visibility` ✅ |
| 避免布局读取 | 渲染中不用 `getBoundingClientRect` 等 | ❌ 导致回流 |
| 批量 DOM 操作 | 避免读写交错 | `requestAnimationFrame` ✅ |
| 受控输入 | 优先非受控；受控必须轻量 | `defaultValue` ✅ |
| preconnect | CDN 域名 `<link rel="preconnect">` | ✅ |
| 字体预加载 | `<link rel="preload" as="font">` | `font-display: swap` ✅ |
| Code splitting | 路由级别代码分割 | `lazy()` / `dynamic()` ✅ |

### 🧭 导航 & 状态（Navigation & State）- 4条

| 规则 | 说明 | 实现 |
|------|------|------|
| URL 反映状态 | 过滤器/标签/分页在 URL | `useSearchParams()` ✅ |
| 链接语义化 | 用 `<a>`/`<Link>` | Cmd+点击 ✅ |
| 深链接 | 所有状态 UI 可深链接 | `nuqs` / `useQueryState` ✅ |
| 破坏性操作 | 需要确认或撤销 | Modal / Toast ✅ |

### 👆 触摸 & 交互（Touch & Interaction）- 5条

| 规则 | 说明 | 实现 |
|------|------|------|
| touch-action | `manipulation` 防双击缩放 | `touch-action: manipulation` ✅ |
| tap-highlight | 明确设置颜色 | `-webkit-tap-highlight-color` ✅ |
| overscroll-behavior | Modal 中 `contain` | 防止背景滚动 ✅ |
| 拖动时 | 禁用文本选择，`inert` 拖动元素 | `user-select: none` ✅ |
| autoFocus | 谨慎使用；桌面单主输入；避免移动端 | `autoFocus` ✅ |

### 📱 安全区 & 布局（Safe Areas & Layout）- 3条

| 规则 | 说明 | 实现 |
|------|------|------|
| 安全区 | 全出血布局 `env(safe-area-inset-*)` | iPhone 刘海 ✅ |
| 避免滚动条 | `overflow-x-hidden`，修复内容溢出 | ✅ |
| 布局方式 | Flex/Grid 优于 JS 测量 | `display: grid` ✅ |

### 🌙 深色模式 & 主题（Dark Mode & Theming）- 3条

| 规则 | 说明 | 实现 |
|------|------|------|
| color-scheme | `<html>` 上设置 `dark` | 修复滚动条/输入框 ✅ |
| theme-color | `<meta>` 匹配页面背景 | PWA 体验 ✅ |
| 原生控件 | 显式 `background-color` 和 `color` | Windows 深色模式 ✅ |

### 🌍 本地化 & i18n（Locale & i18n）- 3条

| 规则 | 说明 | 实现 |
|------|------|------|
| 日期格式 | `Intl.DateTimeFormat` | ❌ 不要硬编码 |
| 数字格式 | `Intl.NumberFormat` | ❌ 不要硬编码 |
| 语言检测 | `Accept-Language` / `navigator.languages` | ❌ 不用 IP |

### 💧 Hydration 安全（Hydration Safety）- 3条

| 规则 | 说明 | 实现 |
|------|------|------|
| 受控输入 | `value` 需要 `onChange` | 或用 `defaultValue` ✅ |
| 日期渲染 | 防止水合不匹配 | 客户端/服务端一致 ✅ |
| suppressHydrationWarning | 只在真正需要时 | 谨慎使用 ✅ |

### 🎨 悬停 & 交互状态（Hover & Interactive States）- 2条

| 规则 | 说明 | 实现 |
|------|------|------|
| hover 状态 | 按钮/链接需要 `hover:` | 视觉反馈 ✅ |
| 对比度提升 | 交互状态更突出 | `hover:brightness-110` ✅ |

### 📝 内容 & 文案（Content & Copy）- 7条

| 规则 | 错误 | 正确 |
|------|------|------|
| 主动语态 | "The CLI will be installed" ❌ | "Install the CLI" ✅ |
| 标题大小写 | sentence case ❌ | Title Case ✅ |
| 数字 | "eight deployments" ❌ | "8 deployments" ✅ |
| 按钮文案 | "Continue" ❌ | "Save API Key" ✅ |
| 错误信息 | 只说问题 ❌ | 包含解决方案 ✅ |
| 人称 | 第一人称 ❌ | 第二人称 ✅ |
| & vs and | "and" ❌ | `&` ✅（空间受限） |

### 🚫 反模式（Anti-patterns）- 14条

❌ **立即标记这些错误**：

1. `user-scalable=no` 或 `maximum-scale=1` - 禁用缩放
2. `onPaste` + `preventDefault` - 阻止粘贴
3. `transition: all` - 性能杀手
4. `outline-none` 无替换 - 破坏可访问性
5. 内联 `onClick` 导航 - 应该用 `<a>`
6. `<div>` / `<span>` + 点击 - 应该用 `<button>`
7. 图片无尺寸 - 导致 CLS
8. 大数组 `.map()` 无虚拟化 - 性能问题
9. 表单输入无标签 - 可访问性
10. Icon 按钮无 `aria-label` - 屏幕阅读器
11. 硬编码日期/数字格式 - i18n 问题
12. `autoFocus` 无理由 - 用户体验
13. 服务端/客户端日期不一致 - Hydration 错误
14. 缺少空状态处理 - UI 破损

---

## 🔧 使用方式

### 方式 1：自然对话（自动激活）

```
"Review my UI code for best practices"
"Check accessibility in src/components/Button.tsx"
"Audit this design for performance issues"
"Review UX of my form components"
```

### 方式 2：显式调用

```bash
/web-design-guidelines src/components/**/*.tsx
```

### 方式 3：在现有 Skills 中集成

在你的 `code-review` 或 `frontend-developer` skill 中自动调用此技能。

---

## 📊 输出格式

简洁、高信噪比、VS Code 可点击的 `file:line` 格式：

```
## src/Button.tsx

src/Button.tsx:42 - icon button missing aria-label
src/Button.tsx:18 - input lacks label
src/Button.tsx:55 - animation missing prefers-reduced-motion
src/Button.tsx:67 - transition: all → list properties

## src/Modal.tsx

src/Modal.tsx:12 - missing overscroll-behavior: contain
src/Modal.tsx:34 - "..." → "…"

## src/Card.tsx

✓ pass
```

---

## 🎯 整合到你的工程化体系

### 1. 与现有 Skills 整合

**前端开发流程**：
```
frontend-developer skill → 编写组件
    ↓
web-design-guidelines → 自动审查
    ↓
code-reviewer → 代码质量审查
    ↓
/commit → 提交代码
```

**UI/UX 设计流程**：
```
ui-ux-designer → 设计组件
    ↓
frontend-developer → 实现代码
    ↓
web-design-guidelines → 检查规范 ⭐ 新增
    ↓
ui-visual-validator → 视觉验证
```

### 2. 与 CLAUDE.md 整合

添加到 `CLAUDE.md` 的 **Skills 快速选择指南**：

| 你想... | 使用哪个 Skill |
|---------|---------------|
| 检查 UI 代码规范 | `web-design-guidelines` ⭐ 新增 |
| 审查无障碍性 | `web-design-guidelines` + `accessibility-compliance` |
| 优化前端性能 | `web-design-guidelines` + `performance-engineer` |

### 3. 在代码审查中自动运行

**Git pre-commit hook**：
```bash
# .git/hooks/pre-commit
#!/bin/bash
changed_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(tsx?|jsx?)$')

if [ -n "$changed_files" ]; then
  echo "Running Web Interface Guidelines check..."
  claude-code "Review these files with web-design-guidelines: $changed_files"
fi
```

### 4. CI/CD 集成

**GitHub Actions**：
```yaml
name: UI Guidelines Check
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Web Interface Guidelines
        run: |
          npx @anthropic-ai/claude-code \
            "Review UI files with web-design-guidelines: src/**/*.tsx"
```

---

## 🎓 学习建议

### 优先级修复顺序

1. **Critical（立即修复）**：
   - 无障碍性错误（aria-label、alt、label）
   - 性能问题（大列表无虚拟化）
   - 反模式（outline-none、transition: all）

2. **High（本周修复）**：
   - 表单体验（autocomplete、错误提示）
   - 焦点状态缺失
   - 动画无 `prefers-reduced-motion`

3. **Medium（本月修复）**：
   - 排版细节（`…`、引号）
   - 触摸优化
   - i18n 硬编码

4. **Low（逐步改进）**：
   - 内容文案优化
   - 深色模式细节

### 推荐阅读

- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

## 📚 相关 Skills

| Skill | 与 web-design-guidelines 的关系 |
|-------|-------------------------------|
| `ui-visual-validator` | 视觉验证（此技能做代码规范） |
| `accessibility-compliance` | WCAG 合规（此技能覆盖 a11y） |
| `performance-engineer` | 性能优化（此技能包含基础性能） |
| `frontend-developer` | 前端开发（此技能做审查） |
| `code-reviewer` | 代码审查（此技能做 UI 特定审查） |

---

## 🎯 典型应用场景

### 场景 1：新组件开发

```
1. 用 frontend-developer 写组件
2. 自动运行 web-design-guidelines 检查
3. 修复所有 Critical/High 问题
4. 提交代码
```

### 场景 2：重构现有 UI

```
1. 选择要重构的组件目录
2. 运行 web-design-guidelines 生成报告
3. 按优先级修复
4. 验证修复后通过所有规则
```

### 场景 3：Pull Request 审查

```
1. PR 创建时自动运行检查
2. 生成评论列表
3. 开发者修复
4. 再次检查通过后合并
```

### 场景 4：无障碍性审计

```
1. 运行 web-design-guidelines 检查 a11y 规则
2. 生成无障碍性报告
3. 修复所有 WCAG 相关问题
4. 用 accessibility-compliance 再次验证
```

---

## 📝 快速命令参考

```bash
# 检查单个文件
Review web-design-guidelines for src/components/Button.tsx

# 检查整个目录
Review src/components/**/*.tsx for web interface guidelines

# 只检查无障碍性
Review src/App.tsx focusing on accessibility rules

# 只检查性能
Review src/Dashboard.tsx focusing on performance rules

# 检查并生成修复计划
Review and create a fix plan for src/components/*.tsx using web-design-guidelines
```

---

## 🔄 更新记录

- **2026-01-23**: 初始安装，整合到 Claude Code 工程化体系
- **来源**: Vercel Labs - [GitHub](https://github.com/vercel-labs/agent-skills)

---

**准备使用这个技能来提升你的 UI 代码质量！** 🚀

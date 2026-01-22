# 命令速查表

## MCP 命令

### 数据查询
```bash
# Bytebase 数据库查询
bytebase-execute_sql: "SELECT * FROM table WHERE condition"

# Honeycomb 监控查询
honeycomb-run_query: {query: "...", dataset: "..."}

# Statsig 实验数据
statsig-Get_Experiment_Details: {experiment_id: "..."}
```

### 图表生成
```bash
# 柱状图
mcp-server-chart-generate_bar_chart: {...}

# 折线图
mcp-server-chart-generate_line_chart: {...}

# 饼图
mcp-server-chart-generate_pie_chart: {...}
```

## Skills 命令

### Git 工作流
```bash
/commit                  # 自动生成提交信息
/create-pr              # 创建 Pull Request
/commit-push-pr         # 提交+推送+创建PR
```

### 代码质量
```bash
/code-review            # 全面代码审查
/write-tests            # 生成测试用例
/refactor               # 重构建议
/add-comments           # 添加代码注释
```

### 开发工具
```bash
/browser-use            # 浏览器自动化
/ui-ux-pro-max          # UI/UX 设计
/webapp-testing         # Web 应用测试
```

## 自动化脚本

### 文档验证
```bash
# 验证所有文档链接
python scripts/validate-docs.py

# 修复破损链接
python scripts/fix-links.py

# 分析错误统计
python scripts/analyze-errors.py

# 自动优化
bash scripts/auto-optimize.sh
```

### Git Hooks
```bash
# Pre-commit 检查
.git/hooks/pre-commit

# 跳过检查（不推荐）
git commit --no-verify -m "message"
```

## GitHub Actions

### 手动触发工作流
```bash
# 在 GitHub 网页端:
# Actions → 选择工作流 → Run workflow
```

### 查看工作流状态
```bash
# 查看最近运行
gh run list

# 查看特定运行详情
gh run view <run-id>
```

## 常用快捷操作

### 快速查询
```bash
# 查询今日成本
"查询今日总成本和按用户类型分布"

# 查看 Bot 归因
"查看最新的 Bot 数据归因"

# 性能监控
"检查 API 响应时间趋势"
```

### 快速开发
```bash
# 新功能开发
"实现用户认证功能" → EnterPlanMode → 确认 → 执行

# 问题修复
"修复登录超时问题" → 自动诊断 → 修复 → 测试

# 代码审查
/code-review → 全面检查 → 生成报告
```

---

**提示**:
- 使用 `/help` 查看完整命令列表
- 使用 DECISION_TREE.md 选择合适的工具
- 遇到问题参考 ERROR_CATALOG.md

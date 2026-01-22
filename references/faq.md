# 常见问题 FAQ

## 工作流问题

### Q: 为什么 Claude 不问我问题就直接开始执行了？

A: 这是**自动执行模式**的设计。工作流是：

1. 收到任务 → 创建 TodoList
2. 展示计划给你确认
3. 你确认后 → 执行到底（不问问题）
4. 完成后 → 让你验收

**只有 4 种致命阻塞情况才会提问**:
- 缺少关键凭证（密码、API key）
- 多个完全对立的技术方案
- 用户需求本质矛盾
- 操作不可逆且风险极高

### Q: 我该什么时候用 MCP、什么时候用 Skills、什么时候用 Plugins？

A: 使用 **DECISION_TREE.md** 决策：

```
需要查询/操作外部数据？
→ 是 → MCP (bytebase, honeycomb, chart, stripe...)

需要执行自动化任务？
→ 是 → Skills (/commit, /write-tests, /code-review...)

需要架构建议/代码分析？
→ 是 → Plugins（自动激活，无需显式调用）
```

**快速判断**:
- 查数据库 → bytebase MCP
- 生成提交 → /commit Skill
- 设计架构 → backend-development Plugin（自动）

### Q: 如何知道有哪些可用的工具？

A: 查看这些文档：
- MCP 服务器：`docs/capabilities/mcp-servers.md`
- Skills 列表：`docs/capabilities/skills-guide.md`
- Plugins 列表：`docs/capabilities/plugins-auto.md`
- 决策树：`DECISION_TREE.md`

## 错误问题

### Q: Pre-commit hook 阻止了我的提交怎么办？

A: 根据错误信息修复问题：

```bash
# 1. 查看错误详情
.git/hooks/pre-commit

# 2. 修复问题后重新提交
git commit -m "message"

# 3. 如果确实需要跳过（不推荐）
git commit --no-verify -m "message"
```

### Q: 文档中有很多破损链接怎么办？

A: 运行自动修复脚本：

```bash
# 1. 验证链接
python scripts/validate-docs.py

# 2. 自动修复
python scripts/fix-links.py

# 3. 再次验证
python scripts/validate-docs.py
```

### Q: 如何查看错误统计和改进建议？

A: 查看错误分析报告：

```bash
# 生成报告
python scripts/analyze-errors.py

# 查看报告
cat errors/ERROR_ANALYSIS_REPORT.md

# 或直接查看错误目录
cat errors/ERROR_CATALOG.md
```

## 数据分析问题

### Q: 如何查询生产数据库？

A: 使用 bytebase MCP：

```
"查询 my_shell_prod 数据库中的用户表"
→ bytebase-execute_sql: "SELECT * FROM users LIMIT 10"
```

**注意**: 直接连接生产数据库，请谨慎操作

### Q: 如何生成数据可视化图表？

A: 使用 chart MCP：

```
1. bytebase 查询数据
2. 处理数据格式
3. chart MCP 生成图表
   - generate_bar_chart（柱状图）
   - generate_line_chart（折线图）
   - generate_pie_chart（饼图）
```

### Q: Bot 归因分析的时间窗口是什么？

A: **订单窗口 ±7 天**

- 订单窗口：start_date 到 end_date
- 任务窗口：start_date - 7 天 到 end_date + 7 天

**原因**:
- 前7天：试用后购买（"try before buy"）
- 后7天：购买后首次使用（"buy before use"）

预期覆盖率：70-80% 的订单

## 开发问题

### Q: 如何创建新的自动化脚本？

A: 参考现有脚本：

```bash
scripts/
├── validate-docs.py    # 文档验证
├── fix-links.py        # 链接修复
├── analyze-errors.py   # 错误分析
└── auto-optimize.sh    # 自动优化
```

**步骤**:
1. 编写 Python/Bash 脚本
2. 添加中文注释
3. 测试功能
4. 更新文档

### Q: 如何配置 GitHub Actions？

A: 查看 `.github/workflows/` 目录：

```
workflows/
├── docs-quality.yml     # 文档质量检查
└── weekly-optimize.yml  # 每周自动优化
```

**修改执行频率**:
```yaml
schedule:
  - cron: '0 8 * * 1'  # 分 时 日 月 周
```

### Q: 如何跳过 CI/CD 检查？

A: 在提交信息中添加 `[skip ci]`：

```bash
git commit -m "docs: update README [skip ci]"
```

## 性能问题

### Q: 文档加载太慢怎么办？

A: 当前 token 使用情况：

```
当前: ~54K tokens
目标: <130K tokens (65%)
状态: ✅ 正常
```

**如果超标**:
- 精简重复内容
- 移动详细内容到单独文件
- 使用链接代替内联

### Q: SQL 查询太慢怎么优化？

A: 参考 **errors/system-errors/sql-optimization.md**

**常见优化**:
1. 使用 CTE 预过滤
2. 添加合适的索引
3. 避免重复计算
4. 限制返回行数

### Q: API 响应慢怎么办？

A: 使用 honeycomb MCP 分析：

```
1. 查询慢请求 traces
2. 识别瓶颈（数据库、外部API、计算）
3. 针对性优化
```

## 配置问题

### Q: 如何更新 CLAUDE.md？

A: 直接编辑文件：

```bash
# 文件位置
E:\Bobo's Coding cache\CLAUDE.md

# 包含内容:
- 工作流配置
- MCP/Skills/Plugins 列表
- 项目特定规范
```

### Q: 如何添加新的错误模式？

A: 更新错误目录：

```bash
# 1. 添加到错误目录
errors/ERROR_CATALOG.md

# 2. 如果是系统级错误
errors/system-errors/<new-error>.md

# 3. 如果是项目级错误
errors/project-errors/<project>/<error>.md

# 4. 重新生成分析
python scripts/analyze-errors.py
```

### Q: 如何禁用某个 Plugin？

A: 编辑 Claude Code 配置：

```
1. 打开设置
2. 找到 Plugins 部分
3. 取消勾选不需要的 plugin
```

## 其他问题

### Q: 如何查看完整的更新历史？

A: 查看 `CHANGELOG.md`（即将创建）

### Q: 遇到问题如何获得帮助？

A: 优先顺序：

1. 查看 FAQ（本文件）
2. 查看 DECISION_TREE.md
3. 查看 ERROR_CATALOG.md
4. 查看 CLAUDE.md
5. 查看具体的能力文档

### Q: 如何贡献改进建议？

A: 通过以下方式：

1. 更新相关文档
2. 添加到错误集
3. 提交改进建议
4. 更新最佳实践

---

**还有其他问题？**

查看完整文档体系：
- 核心配置：`CLAUDE.md`
- 快速开始：`QUICK_START.md`
- 决策树：`DECISION_TREE.md`
- 错误集：`errors/ERROR_CATALOG.md`

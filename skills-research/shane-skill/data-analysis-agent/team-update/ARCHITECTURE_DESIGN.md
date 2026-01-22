# 🏗️ Claude Code 文档架构设计

> **版本**: v2.0
> **设计时间**: 2026-01-13
> **设计目标**: 模块化、精简化、自动化

---

## 🎯 设计原则

### 核心原则

1. **上下文预算管理**: 总加载内容 ≤ 65% token预算，保留 35% 思考空间
2. **模块化引用**: 主文档仅索引，详细内容分离到子文档
3. **自动化优先**: SessionStart 自动预览、错误自动收集
4. **分层管理**: 系统级 vs 项目级分离
5. **持续优化**: skill-self-evolution 驱动内容更新

### 指导思想

```
简洁 > 完整
索引 > 复制
链接 > 嵌入
自动 > 手动
分层 > 混合
```

---

## 📂 新文档结构

```
E:\Bobo's Coding cache/
├── 📋 CLAUDE.md                          # 主索引文档（精简版，≤500行）
│   ├─ 快速导航
│   ├─ 核心工作流
│   ├─ 链接到子文档
│   └─ SessionStart 检查清单
│
├── 📚 docs/                              # 子文档目录
│   ├── core/                             # 核心指南
│   │   ├── WORKFLOW.md                   # 工作流详解
│   │   ├── AUTO_EXECUTION_MODE.md        # 自动执行模式
│   │   ├── SESSION_STARTUP.md            # 启动协议
│   │   └── QUALITY_GOALS.md              # 质量目标
│   │
│   ├── capabilities/                     # 能力系统
│   │   ├── MCP_SERVERS.md               # MCP 服务器完整文档
│   │   ├── SKILLS.md                    # Skills 完整文档
│   │   ├── PLUGINS.md                   # Plugins 完整文档
│   │   ├── MARKETPLACE_PLUGINS.md       # 市场插件文档
│   │   └── DELEGATOR.md                 # 委托系统文档
│   │
│   ├── decision/                        # 决策系统
│   │   ├── DECISION_TREE.md            # 决策树（优化版）
│   │   ├── MCP_DECISION.md             # MCP 选择决策
│   │   ├── SKILL_DECISION.md           # Skill 选择决策
│   │   └── PLUGIN_DECISION.md          # Plugin 选择决策
│   │
│   ├── errors/                          # 错误系统
│   │   ├── SYSTEM_MISTAKES.md          # 系统级错误（影响全局思维）
│   │   ├── PROJECT_MISTAKES.md         # 项目级错误（特定场景）
│   │   └── ERROR_CHECKLIST.md          # 错误预防清单
│   │
│   ├── scenarios/                       # 场景指南
│   │   ├── DATA_ANALYSIS.md            # 数据分析场景
│   │   ├── FULL_STACK_DEV.md           # 全栈开发场景
│   │   ├── BROWSER_AUTOMATION.md       # 浏览器自动化场景
│   │   ├── DEBUGGING.md                # 调试优化场景
│   │   └── DEVOPS.md                   # DevOps 场景
│   │
│   └── reference/                       # 参考资料
│       ├── CAPABILITY_MATRIX.md        # 能力矩阵
│       ├── BEST_PRACTICES.md           # 最佳实践
│       ├── ANTI_PATTERNS.md            # 反模式
│       ├── QUICK_REFERENCE.md          # 快速参考卡
│       └── ADVANCED_TECHNIQUES.md      # 高级技巧
│
├── 📊 INVENTORY.md                       # 能力清单（现状分析）
├── 🏗️ ARCHITECTURE_DESIGN.md            # 本文档
│
├── .claude/                              # Claude 配置目录（保持不变）
│   ├── skills/                           # 81个技能
│   ├── agents/                           # Agent 定义
│   ├── plugins/                          # 插件管理
│   └── rules/                            # 规则系统
│       └── delegator/                    # 委托规则
│
└── hooks/                                # 自动化钩子（新增）
    ├── session-start.sh                  # SessionStart 预览脚本
    ├── error-collector.sh                # 错误收集脚本
    └── skill-evolver.sh                  # 技能进化脚本
```

---

## 📋 主文档设计（CLAUDE.md v2.0）

### 目标

- **行数限制**: ≤ 500 行
- **加载token**: ≤ 20% 总预算
- **核心功能**: 导航索引 + 快速参考 + 启动检查

### 内容结构

```markdown
# CLAUDE.md v2.0

## 🚀 快速导航
- [核心工作流](./QUICK_START.md)
- [自动执行模式](./docs/workflows/auto-execution.md)
- [能力决策树](./DECISION_TREE.md)
- [错误预防](./errors/ERROR_CATALOG.md)

## 🎯 核心原则（精简版）
计划 → 确认 → 执行到底 → 验收

## 📚 能力体系（索引）
### MCP 服务器（7个可用）
[详细文档](./docs/capabilities/mcp-servers.md)
- mcphub（数据分析核心）
- asana、context7、firebase、playwright、stripe、supabase

### Skills（81个）
[详细文档](./docs/capabilities/skills-guide.md)
- Git: /commit, /create-pr
- UI/UX: ui-ux-pro-max
- 浏览器: browser-use
- [完整列表](./docs/capabilities/skills-guide.md)

### Plugins（60个）
[详细文档](./docs/capabilities/plugins-auto.md)
- 自动激活，无需显式调用
- [使用场景](./DECISION_TREE.md)

## 🌳 快速决策
[完整决策树](./DECISION_TREE.md)

需要查询外部数据？ → [MCP](./DECISION_TREE.md)
需要自动化工作流？ → [Skills](./DECISION_TREE.md)
需要架构建议？ → [Plugins](./DECISION_TREE.md)

## ⚠️ 启动检查清单
每次会话开始必读：
- [ ] 阅读 [系统级错误](./errors/system-errors/)
- [ ] 审查 [项目级错误](./errors/project-errors/)
- [ ] 确认 [工作流模式](./docs/workflows/auto-execution.md)
- [ ] 验证项目结构

## 📊 实战场景速查
- [数据分析](./docs/workflows/data-analysis.md)
- [全栈开发](./docs/workflows/full-stack-dev.md)
- [浏览器自动化](./docs/workflows/browser-automation.md)
- [调试优化](./docs/workflows/debugging-ops.md)
- [DevOps](./docs/workflows/debugging-ops.md)

## 📖 参考资料
- [能力矩阵](./docs/references/capability-matrix.md)
- [最佳实践](./docs/references/best-practices.md)
- [快速参考](./docs/references/commands-cheatsheet.md)

## 🔄 更新记录
[查看完整历史](./CHANGELOG.md)
```

---

## 📚 子文档设计原则

### 文件命名规范

```
ALL_CAPS.md           # 系统级文档
CamelCase.md          # 废弃/迁移文档标记
```

### 行数限制

| 文档类型 | 行数上限 | Token 占比 |
|---------|---------|-----------|
| 主文档 CLAUDE.md | 500 | 20% |
| 核心文档（core/） | 300 | 12% |
| 能力文档（capabilities/） | 500 | 20% |
| 决策文档（decision/） | 400 | 16% |
| 错误文档（errors/） | 300 | 12% |
| 场景文档（scenarios/） | 200 | 8% |
| 参考文档（reference/） | 300 | 12% |

**总加载上限**: 主文档 + 2-3 个子文档 ≤ 65% token预算

### 内容分配

#### 核心文档（core/）

1. **WORKFLOW.md** - 工作流详解
   - 标准工作流（计划→确认→执行→验收）
   - 免问模式
   - 工具操作默认授权
   - 验收阶段

2. **AUTO_EXECUTION_MODE.md** - 自动执行模式
   - 4种致命阻塞
   - 决策原则
   - 实施细节

3. **SESSION_STARTUP.md** - 启动协议
   - 自动审查流程
   - 错误预防检查
   - 持续改进机制

4. **QUALITY_GOALS.md** - 质量目标
   - 错误率降低目标
   - 代码质量提升路径
   - 知识库建设

#### 能力文档（capabilities/）

1. **MCP_SERVERS.md** - MCP 完整文档
   - 每个服务器的详细说明
   - 使用场景
   - 工具调用示例
   - 连接状态管理

2. **SKILLS.md** - Skills 完整文档
   - 81个技能的详细说明
   - 激活条件
   - 使用示例
   - 配置建议

3. **PLUGINS.md** - Plugins 完整文档
   - 60个插件的详细说明
   - 自动激活逻辑
   - 使用场景
   - 配置建议

4. **MARKETPLACE_PLUGINS.md** - 市场插件文档
   - 13个市场插件详解
   - 工作流说明
   - 使用示例

5. **DELEGATOR.md** - 委托系统文档
   - 5个专家详解
   - 委托流程
   - 7段式提示词
   - 触发器规则

#### 决策文档（decision/）

1. **DECISION_TREE.md** - 完整决策树（优化版）
   - 高层决策流程
   - 链接到专项决策文档

2. **MCP_DECISION.md** - MCP 选择决策
   - 场景 → MCP 映射表
   - 决策流程图
   - 组合使用建议

3. **SKILL_DECISION.md** - Skill 选择决策
   - 任务类型 → Skill 映射
   - 激活条件
   - 并行使用策略

4. **PLUGIN_DECISION.md** - Plugin 选择决策
   - 自动激活规则
   - 场景匹配逻辑
   - 配置优化

#### 错误文档（errors/）

1. **SYSTEM_MISTAKES.md** - 系统级错误
   - 影响全局思维逻辑的错误
   - 跨项目反复出现的错误
   - 高频+严重错误
   - 修复记录和趋势

2. **PROJECT_MISTAKES.md** - 项目级错误
   - 特定项目场景的错误
   - 低频或轻微错误
   - 项目特定的陷阱

3. **ERROR_CHECKLIST.md** - 错误预防清单
   - 编码前检查清单
   - 提交前检查清单
   - 自检工具和脚本

#### 场景文档（scenarios/）

每个场景文档包含：
- 典型工作流
- 工具组合
- 代码示例
- 常见问题

1. **DATA_ANALYSIS.md** - 数据分析场景
2. **FULL_STACK_DEV.md** - 全栈开发场景
3. **BROWSER_AUTOMATION.md** - 浏览器自动化场景
4. **DEBUGGING.md** - 调试优化场景
5. **DEVOPS.md** - DevOps 场景

#### 参考文档（reference/）

1. **CAPABILITY_MATRIX.md** - 能力矩阵
   - 任务 → 最佳工具映射表
   - 评分系统

2. **BEST_PRACTICES.md** - 最佳实践
   - ✅ DO 列表
   - 成功案例

3. **ANTI_PATTERNS.md** - 反模式
   - ❌ DON'T 列表
   - 失败案例

4. **QUICK_REFERENCE.md** - 快速参考卡
   - MCP 快速调用
   - Slash Commands
   - 常用组合

5. **ADVANCED_TECHNIQUES.md** - 高级技巧
   - 并行工作流
   - 链式操作
   - 错误恢复
   - 性能优化

---

## 🔗 链接系统设计

### Markdown 链接格式

```markdown
# 相对路径链接（推荐）
[文档标题](./QUICK_START.md)
[章节锚点](./QUICK_START.md)

# 绝对路径链接（避免）
[文档标题](./QUICK_START.md)
```

### 链接层次

```
Level 1: CLAUDE.md（主索引）
  ↓
Level 2: 子文档索引（6个目录的 README）
  ↓
Level 3: 详细文档（30+ 个专题文档）
```

### 交叉引用规范

- **向上引用**: 子文档可引用主文档
- **横向引用**: 同级文档可相互引用
- **向下引用**: 索引文档引用详细文档

---

## ⚠️ 错误系统分层

### 分层标准

| 类型 | 判定标准 | 示例 |
|------|---------|------|
| **系统级** | • 跨项目反复出现<br>• 影响整体思维逻辑<br>• 严重程度 = 🔴<br>• 发生频率 ≥ 中 | • 异步并行处理错误<br>• 超时轮询未设置<br>• 错误处理不重新抛出 |
| **项目级** | • 特定项目场景<br>• 轻微或偶发<br>• 严重程度 = 🟡/🟢<br>• 发生频率 = 低 | • 某个API的参数顺序<br>• 特定库的使用模式<br>• 项目特定的配置问题 |

### 迁移规则

```
PROJECT_MISTAKES.md → SYSTEM_MISTAKES.md
条件:
  - 同一错误出现在 3+ 个不同项目
  - 严重程度升级为 🔴
  - 发生频率从 低 → 中/高
```

### 错误收集自动化

```bash
# hooks/error-collector.sh
# 在每次错误修复后自动运行

1. 检测错误类型和上下文
2. 判定系统级 vs 项目级
3. 更新对应的错误文档
4. 更新错误统计表
5. 生成改进建议
```

---

## 🤖 自动化机制设计

### 1. SessionStart 预览

**实现**: 通过 SessionStart hook

```bash
# hooks/session-start.sh

echo "📋 正在加载核心文档..."

# 1. 加载主文档
cat CLAUDE.md

# 2. 预览系统级错误（最近10条）
echo "\n⚠️ 系统级错误预览:"
tail -n 20 docs/errors/SYSTEM_MISTAKES.md

# 3. 预览项目级错误（最近5条）
echo "\n📊 项目级错误预览:"
tail -n 10 docs/errors/PROJECT_MISTAKES.md

# 4. 预览决策树摘要
echo "\n🌳 决策树摘要:"
head -n 30 docs/decision/DECISION_TREE.md

# 5. 上下文预算检查
TOKEN_USAGE=$(check_token_usage)
if [ $TOKEN_USAGE -gt 65 ]; then
    echo "⚠️ 上下文使用率: ${TOKEN_USAGE}%（超过65%限制）"
fi
```

### 2. 错误自动收集

**触发**: 每次错误修复后

```bash
# hooks/error-collector.sh

# 参数: 错误描述、错误类型、严重程度、项目名称

ERROR_DESC=$1
ERROR_TYPE=$2
SEVERITY=$3
PROJECT=$4

# 1. 判定系统级 vs 项目级
if [ $(count_occurrences "$ERROR_TYPE") -ge 3 ]; then
    TARGET="docs/errors/SYSTEM_MISTAKES.md"
else
    TARGET="docs/errors/PROJECT_MISTAKES.md"
fi

# 2. 添加错误记录
echo "## $ERROR_TYPE" >> $TARGET
echo "- **描述**: $ERROR_DESC" >> $TARGET
echo "- **严重程度**: $SEVERITY" >> $TARGET
echo "- **项目**: $PROJECT" >> $TARGET
echo "- **修复时间**: $(date +%Y-%m-%d)" >> $TARGET

# 3. 更新统计表
update_error_stats "$ERROR_TYPE" "$SEVERITY"

# 4. 生成改进建议
generate_fix_recommendation "$ERROR_TYPE" "$ERROR_DESC"
```

### 3. 技能自我进化

**触发**: 技能使用后 + 用户反馈

```bash
# hooks/skill-evolver.sh

SKILL_NAME=$1
FEEDBACK=$2  # success / failure / partial

# 1. 读取技能文档
SKILL_DOC=".claude/skills/$SKILL_NAME/prompt.md"

# 2. 分析使用模式
analyze_usage_patterns "$SKILL_NAME"

# 3. 基于反馈更新
if [ "$FEEDBACK" == "failure" ]; then
    # 添加失败案例
    add_failure_case "$SKILL_DOC"

    # 更新最佳实践
    update_best_practices "$SKILL_DOC"
fi

# 4. 优化触发条件
optimize_activation_conditions "$SKILL_NAME"

# 5. 生成进化报告
generate_evolution_report "$SKILL_NAME"
```

### 4. 上下文预算监控

**实现**: 实时监控和警告

```bash
# 在每次文档加载时检查

calculate_token_usage() {
    MAIN_DOC=$(wc -w < CLAUDE.md)
    LOADED_SUBDOCS=$(sum_loaded_subdocs)
    TOTAL=$(( MAIN_DOC + LOADED_SUBDOCS ))

    # 假设平均 1 word = 1.3 tokens
    TOKEN_COUNT=$(( TOTAL * 13 / 10 ))

    # 假设总预算 200k tokens
    USAGE_PERCENT=$(( TOKEN_COUNT * 100 / 200000 ))

    echo $USAGE_PERCENT
}

# 在 SessionStart 检查
USAGE=$(calculate_token_usage)
if [ $USAGE -gt 65 ]; then
    echo "⚠️ 警告: 上下文使用率 ${USAGE}%，超过65%限制"
    echo "建议: 减少加载的子文档数量或优化文档内容"
fi
```

---

## 🔄 迁移路径

### 第一步：内容拆分（Phase 3-4）

```
CLAUDE.md (1552行)
  ↓
CLAUDE.md v2.0 (500行) + 子文档系统
  - docs/core/*.md (1200行)
  - docs/capabilities/*.md (2500行)
  - docs/decision/*.md (1600行)
  - docs/scenarios/*.md (1000行)
  - docs/reference/*.md (1500行)
```

### 第二步：决策树优化（Phase 5）

```
DECISION_TREE.md (1488行)
  ↓
docs/decision/DECISION_TREE.md (400行)
  + docs/decision/MCP_DECISION.md (300行)
  + docs/decision/SKILL_DECISION.md (400行)
  + docs/decision/PLUGIN_DECISION.md (400行)
```

### 第三步：错误集重构（Phase 6）

```
COMMON_MISTAKES.md (620行)
  ↓
docs/errors/SYSTEM_MISTAKES.md (400行)
  + docs/errors/PROJECT_MISTAKES.md (220行)
  + docs/errors/ERROR_CHECKLIST.md (150行)
```

### 第四步：自动化集成（Phase 7）

```
创建 hooks/
  - session-start.sh
  - error-collector.sh
  - skill-evolver.sh

配置 SessionStart hook
测试自动化流程
```

### 第五步：去重整合（Phase 8）

```
1. 识别重复内容
2. 合并相似章节
3. 优化交叉引用
4. 验证链接完整性
```

### 第六步：验证测试（Phase 9）

```
1. 测试 SessionStart 自动加载
2. 验证上下文预算 ≤ 65%
3. 测试错误收集机制
4. 验证技能进化流程
5. 用户体验测试
```

---

## 📊 成功指标

### 量化指标

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|-------|--------|---------|
| **主文档行数** | 1552 | ≤ 500 | `wc -l CLAUDE.md` |
| **SessionStart 加载时间** | N/A | < 3秒 | 计时 |
| **上下文使用率** | N/A | ≤ 65% | Token 计数 |
| **系统级错误数** | 6 | 跟踪趋势 | 错误统计表 |
| **文档模块化程度** | 1 | 30+ | 子文档数量 |
| **链接完整性** | N/A | 100% | 链接检查脚本 |
| **自动化覆盖率** | 0% | 100% | Hook 覆盖率 |

### 质量指标

- ✅ 所有链接可访问
- ✅ 无重复内容
- ✅ 上下文预算合规
- ✅ 错误自动收集生效
- ✅ SessionStart 预览正常
- ✅ 技能进化机制运行

---

## 🚀 下一步行动

**Phase 3**: 创建核心文档
- 精简 CLAUDE.md v2.0（≤500行）
- 提取内容到 docs/core/

**Phase 4**: 创建子文档系统
- 建立 docs/ 目录结构
- 分离内容到各专题文档

**Phase 5**: 决策树优化
- 重构 DECISION_TREE.md
- 创建专项决策文档

**Phase 6**: 错误集重构
- 分离系统级 vs 项目级错误
- 创建错误预防清单

**Phase 7**: 自动化机制
- 创建 hooks/ 脚本
- 集成 SessionStart hook
- 测试自动化流程

**Phase 8**: 去重整合
- 识别并合并重复内容
- 优化交叉引用
- 验证链接完整性

**Phase 9**: 验证测试
- 全面测试新架构
- 性能和功能验证
- 用户体验测试


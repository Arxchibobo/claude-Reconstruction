# Claude Code 工程化知识图谱

> 🗺️ 可视化文档关系 | 🔗 依赖链路 | 📊 能力网络

---

## 🎯 核心架构

```mermaid
graph TD
    Start[用户需求] --> QuickStart[QUICK_START.md]
    QuickStart --> Claude[CLAUDE.md<br/>核心规则]

    Claude --> Decision[DECISION_TREE.md<br/>决策树]
    Claude --> Errors[errors/<br/>错误案例]

    Decision --> Capabilities[capabilities/<br/>能力文档]
    Decision --> Rules[rules/<br/>规则文件]

    Capabilities --> MCP[MCP Servers]
    Capabilities --> Skills[Skills]
    Capabilities --> Plugins[Plugins]

    style Start fill:#e1f5ff
    style Claude fill:#ffe1e1
    style Decision fill:#e1ffe1
    style Capabilities fill:#fff5e1
```

---

## 📹 视频制作能力链

```mermaid
graph LR
    User[用户: 做视频] --> Auto[remotion-auto-production.md]
    Auto --> Scene[场景识别]
    Auto --> Style[风格匹配]

    Style --> StyleLib[UI_DESIGN_STYLES_REFERENCE.md<br/>30种风格]
    Scene --> Remotion[Remotion 代码生成]

    Remotion --> Assets[素材生成]
    Assets --> Nano[Nano Banana Pro<br/>页面设计]
    Assets --> Processing[Processing Skill<br/>动画背景]

    Remotion --> Output[输出: React 项目]

    style User fill:#e1f5ff
    style Auto fill:#ffe1e1
    style Output fill:#e1ffe1
```

---

## 📊 PPT 制作能力链

```mermaid
graph TD
    User[用户: 做 PPT] --> Workflow[PPT_WORKFLOW.md]

    Workflow --> Step1[1. Nano Banana Pro<br/>生成页面设计]
    Workflow --> Step2[2. Python-pptx<br/>组装 PPT]
    Workflow --> Step3[3. Processing<br/>HTML 演示]

    Step1 --> StyleLib[UI_DESIGN_STYLES_REFERENCE.md]
    Step1 --> Persona[DESIGN_MASTER_PERSONA.md]

    Step3 --> Processing[PROCESSING_SKILL.md]

    Step2 --> Output1[.pptx 文件]
    Step3 --> Output2[.html 交互演示]
    Step1 --> Output3[图片文件夹]

    style User fill:#e1f5ff
    style Workflow fill:#ffe1e1
    style Output1 fill:#e1ffe1
    style Output2 fill:#e1ffe1
    style Output3 fill:#e1ffe1
```

---

## 📈 数据分析能力链

```mermaid
graph LR
    User[用户: 数据分析] --> Skills[Data Analysis Skills]

    Skills --> Bot[Bot 分析]
    Skills --> Cost[成本分析]
    Skills --> Revenue[收入分析]

    Bot --> BotMargin[bot-margin-analysis.md]
    Bot --> BotTrend[bot-revenue-cost-trend.md]

    Cost --> CostTrend[cost-trend-by-user-type.md]

    Revenue --> GrossMargin[gross-margin-analysis.md]
    Revenue --> RevenueFull[revenue-subscription-analysis.md]

    BotMargin --> Bytebase[bytebase MCP]
    BotTrend --> Bytebase
    CostTrend --> Bytebase

    Bytebase --> Chart[chart MCP]
    Chart --> Report[可视化报告]

    style User fill:#e1f5ff
    style Skills fill:#ffe1e1
    style Report fill:#e1ffe1
```

---

## 🌐 浏览器自动化决策链

```mermaid
graph TD
    User[用户: 浏览器操作] --> Decision[browser-automation-decision-tree.md]

    Decision --> Q1{对话式?}
    Q1 -->|是| Playwright[Playwright MCP<br/>主力工具]
    Q1 -->|否| Q2{批量操作?}

    Q2 -->|>50次| AgentBrowser[agent-browser CLI<br/>高性能]
    Q2 -->|否| Q3{脚本化?}

    Q3 -->|是| AgentBrowser
    Q3 -->|否| Playwright

    Playwright --> Action1[browser_navigate<br/>browser_snapshot<br/>browser_click]
    AgentBrowser --> Action2[agent-browser open<br/>agent-browser find<br/>agent-browser click]

    style User fill:#e1f5ff
    style Decision fill:#ffe1e1
    style Playwright fill:#e1ffe1
    style AgentBrowser fill:#fff5e1
```

---

## 🤖 GPT 专家委托链

```mermaid
graph TD
    User[用户需求] --> Triggers[triggers.md<br/>触发检测]

    Triggers --> Architect[Architect<br/>系统设计]
    Triggers --> Reviewer[Plan Reviewer<br/>计划验证]
    Triggers --> Scope[Scope Analyst<br/>需求分析]
    Triggers --> Code[Code Reviewer<br/>代码审查]
    Triggers --> Security[Security Analyst<br/>安全审计]

    Architect --> Format[delegation-format.md<br/>7部分模板]
    Reviewer --> Format
    Scope --> Format
    Code --> Format
    Security --> Format

    Format --> Orchestration[orchestration.md<br/>编排执行]

    Orchestration --> Advisory[Advisory 模式<br/>建议]
    Orchestration --> Implementation[Implementation 模式<br/>执行]

    style User fill:#e1f5ff
    style Triggers fill:#ffe1e1
    style Advisory fill:#e1ffe1
    style Implementation fill:#fff5e1
```

---

## 🏷️ 营销能力生态

```mermaid
graph TD
    User[用户: 营销需求] --> Marketing[MARKETING_SKILLS_GUIDE.md]

    Marketing --> CRO[转化优化<br/>6个Skills]
    Marketing --> Content[内容文案<br/>4个Skills]
    Marketing --> SEO[SEO<br/>4个Skills]
    Marketing --> Ads[付费广告<br/>1个Skills]
    Marketing --> Measure[测量测试<br/>2个Skills]
    Marketing --> Growth[增长工程<br/>2个Skills]
    Marketing --> Strategy[策略货币化<br/>5个Skills]

    CRO --> PageCRO[page-cro<br/>signup-flow-cro<br/>form-cro...]
    Content --> Copywriting[copywriting<br/>copy-editing<br/>email-sequence...]
    SEO --> SeoAudit[seo-audit<br/>programmatic-seo...]

    Marketing --> Vibe[Vibe Marketing]
    Vibe --> Firecrawl[Firecrawl MCP<br/>网站爬虫]
    Vibe --> Perplexity[Perplexity MCP<br/>市场研究]
    Vibe --> N8N[n8n<br/>自动化]

    style User fill:#e1f5ff
    style Marketing fill:#ffe1e1
    style Vibe fill:#fff5e1
```

---

## ❌ 错误案例网络

```mermaid
graph LR
    User[遇到错误] --> Catalog[ERROR_CATALOG.md]

    Catalog --> Perf[性能问题]
    Catalog --> Env[环境问题]
    Catalog --> Data[数据问题]
    Catalog --> System[系统问题]

    Perf --> E001[E001: 异步未并行]
    Perf --> E013[E013: 知识库重复加载]

    Env --> E011[E011: Git Bash npm]
    Env --> E012[E012: Pre-commit权限]
    Env --> E014[E014: 跨平台路径]

    Data --> E004[E004: SQL CTE]
    Data --> E008[E008: ID类型验证]

    System --> E002[E002: 轮询无超时]
    System --> E003[E003: 错误未抛出]
    System --> E007[E007: 资源清理]
    System --> E015[E015: Hook验证]

    E001 --> Test1[测试用例]
    E002 --> Test2[测试用例]
    E003 --> Test3[测试用例]

    style User fill:#e1f5ff
    style Catalog fill:#ffe1e1
    style E001 fill:#ffe1e1
    style E002 fill:#ffe1e1
    style E003 fill:#ffe1e1
```

---

## 🎨 设计能力网络

```mermaid
graph TD
    User[用户: 设计需求] --> Persona[DESIGN_MASTER_PERSONA.md]

    Persona --> Philosophy[设计哲学]
    Persona --> Standards[设计标准]

    Philosophy --> Principles[8个核心原则]
    Standards --> Grid[8px网格]
    Standards --> Animation[60fps动画]
    Standards --> Accessibility[WCAG可访问性]

    Persona --> StyleLib[UI_DESIGN_STYLES_REFERENCE.md]

    StyleLib --> Mainstream[主流风格<br/>6种]
    StyleLib --> Modern[现代趋势<br/>5种]
    StyleLib --> Retro[复古风格<br/>5种]
    StyleLib --> Tech[科技美学<br/>4种]
    StyleLib --> Natural[自然风格<br/>3种]

    Mainstream --> Minimal[极简主义]
    Mainstream --> Glass[玻璃态]
    Mainstream --> Neo[新拟物化]

    Tech --> Cyber[赛博朋克]
    Tech --> HUD[HUD科幻]
    Tech --> Dark[深色模式]

    User --> Guidelines[web-design-guidelines.md<br/>60+规则]
    Guidelines --> Accessibility2[无障碍性]
    Guidelines --> Performance[性能]
    Guidelines --> UX[用户体验]

    style User fill:#e1f5ff
    style Persona fill:#ffe1e1
    style StyleLib fill:#fff5e1
```

---

## 🔄 工作流网络

```mermaid
graph TD
    User[开发任务] --> TDD[TDD 工作流]
    User --> Git[Git 工作流]
    User --> Review[代码审查流程]

    TDD --> Red[红: 写失败测试]
    Red --> Green[绿: 最小实现]
    Green --> Refactor[重构: 优化代码]
    Refactor --> Red

    Git --> Stage[Stage 变更]
    Stage --> Analyze[分析 diff + log]
    Analyze --> Message[生成提交消息]
    Message --> Commit[git commit]

    Review --> Complete[完成功能]
    Complete --> SelfReview[自我审查]
    SelfReview --> GPT[GPT Code Reviewer]
    GPT --> Verdict[APPROVE/REJECT]
    Verdict --> Fix[修复问题]
    Fix --> SelfReview

    style User fill:#e1f5ff
    style TDD fill:#ffe1e1
    style Git fill:#e1ffe1
    style Review fill:#fff5e1
```

---

## 🧩 文档依赖关系

```mermaid
graph TD
    Claude[CLAUDE.md] --> Decision[DECISION_TREE.md]
    Claude --> QuickStart[QUICK_START.md]
    Claude --> Capabilities[capabilities/]
    Claude --> Errors[errors/]

    Decision --> Browser[browser-automation-decision-tree.md]
    Decision --> MCP[mcp-servers.md]
    Decision --> Skills[skills-guide.md]

    Capabilities --> PPT[PPT_WORKFLOW.md]
    PPT --> Design[design/]
    PPT --> Processing[PROCESSING_SKILL.md]

    Capabilities --> Marketing[MARKETING_SKILLS_GUIDE.md]
    Marketing --> Vibe[vibe-marketing/]

    Capabilities --> Web[web-design-guidelines.md]
    Web --> Design

    Errors --> Catalog[ERROR_CATALOG.md]
    Catalog --> Tests[tests/error-cases/]

    style Claude fill:#ffe1e1
    style Decision fill:#e1ffe1
    style Capabilities fill:#fff5e1
    style Errors fill:#ffe1e1
```

---

## 📦 模块化架构

```mermaid
graph LR
    Core[核心模块] --> Ext[扩展模块]
    Core --> Rules[规则模块]

    Core --> Claude[CLAUDE.md<br/>30KB核心]
    Core --> Decision[DECISION_TREE.md]
    Core --> QuickStart[QUICK_START.md]

    Ext --> Capabilities[capabilities/<br/>能力扩展]
    Ext --> Design[design/<br/>设计规范]
    Ext --> Learning[learning/<br/>学习笔记]

    Rules --> ErrorRules[errors/<br/>错误案例]
    Rules --> AutoRules[rules/<br/>自动化规则]
    Rules --> Delegator[delegator/<br/>委托规则]

    style Core fill:#ffe1e1
    style Ext fill:#e1ffe1
    style Rules fill:#fff5e1
```

---

## 🎓 学习路径

```mermaid
graph TD
    Beginner[新手] --> QuickStart[QUICK_START.md<br/>3分钟]
    QuickStart --> Simple[简单任务<br/>提交代码/数据分析]
    Simple --> Errors[errors/<br/>错误案例学习]

    Intermediate[进阶] --> Claude[CLAUDE.md<br/>完整规则]
    Claude --> Decision[DECISION_TREE.md<br/>决策逻辑]
    Decision --> Domain[领域专题]

    Domain --> PPT[PPT制作]
    Domain --> Video[视频制作]
    Domain --> Marketing[营销自动化]

    Expert[专家] --> Deep[深度参考]
    Deep --> Learning[learning/]
    Deep --> References[references/]
    Deep --> Advanced[高级主题]

    Advanced --> Remotion[Remotion深度]
    Advanced --> GPT[GPT专家系统]
    Advanced --> Custom[自定义扩展]

    style Beginner fill:#e1f5ff
    style Intermediate fill:#ffe1e1
    style Expert fill:#fff5e1
```

---

## 🔧 工具链关系

```mermaid
graph TD
    Tools[工具生态] --> MCP[MCP Servers]
    Tools --> Skills[Skills]
    Tools --> Plugins[Plugins]
    Tools --> CLI[CLI Tools]

    MCP --> Bytebase[bytebase<br/>SQL查询]
    MCP --> Honeycomb[honeycomb<br/>监控日志]
    MCP --> Playwright[playwright<br/>浏览器自动化]
    MCP --> Firecrawl[firecrawl<br/>网站爬虫]
    MCP --> Perplexity[perplexity<br/>搜索研究]

    Skills --> Commit[/commit<br/>Git提交]
    Skills --> CodeReview[/code-review<br/>代码审查]
    Skills --> UIUX[ui-ux-pro-max<br/>UI设计]
    Skills --> Marketing24[Marketing Skills<br/>24个]

    Plugins --> Backend[backend-development<br/>后端开发]
    Plugins --> Security[security-scanning<br/>安全扫描]
    Plugins --> Frontend[frontend-mobile<br/>前端移动]

    CLI --> AgentBrowser[agent-browser<br/>浏览器自动化]
    CLI --> NanoBanana[Nano Banana Pro<br/>图像生成]
    CLI --> Processing[Processing<br/>创意编程]

    style Tools fill:#e1f5ff
    style MCP fill:#ffe1e1
    style Skills fill:#e1ffe1
    style Plugins fill:#fff5e1
    style CLI fill:#ffe1ff
```

---

## 📊 文档规模分层

```mermaid
graph TD
    Layer1[核心层<br/>30KB] --> Claude[CLAUDE.md]
    Layer1 --> Decision[DECISION_TREE.md]

    Layer2[扩展层<br/>100KB] --> Capabilities[capabilities/]
    Layer2 --> Errors[errors/]
    Layer2 --> Design[design/]

    Layer3[专题层<br/>200KB] --> Skills[skills-research/]
    Layer3 --> Vibe[vibe-marketing/]
    Layer3 --> Learning[learning/]

    Layer4[参考层<br/>300KB] --> References[references/]
    Layer4 --> Examples[examples/]
    Layer4 --> Archive[archive/]

    style Layer1 fill:#ffe1e1
    style Layer2 fill:#e1ffe1
    style Layer3 fill:#fff5e1
    style Layer4 fill:#e1f5ff
```

---

## 🔄 更新传播路径

```mermaid
graph LR
    Local[~/.claude/] -->|同步| Repo[reconstruction仓库]
    Repo -->|推送| GitHub[GitHub远程]

    GitHub -->|拉取| User1[用户1]
    GitHub -->|拉取| User2[用户2]
    GitHub -->|拉取| User3[用户3]

    User1 -->|贡献PR| GitHub
    User2 -->|贡献PR| GitHub
    User3 -->|贡献PR| GitHub

    GitHub -->|自动同步| Local

    style Local fill:#ffe1e1
    style Repo fill:#e1ffe1
    style GitHub fill:#fff5e1
```

---

## 💡 快速导航提示

### 按需求查找
1. **做视频** → remotion-auto-production.md → PROCESSING_SKILL.md
2. **做 PPT** → PPT_WORKFLOW.md → DESIGN_MASTER_PERSONA.md
3. **数据分析** → data-analysis-agent/ → bytebase MCP
4. **营销研究** → VIBE_MARKETING_GUIDE.md → Firecrawl MCP
5. **UI 设计** → DESIGN_MASTER_PERSONA.md → UI_DESIGN_STYLES_REFERENCE.md

### 按角色查找
- **开发者** → CLAUDE.md → errors/ → workflows/
- **设计师** → DESIGN_MASTER_PERSONA.md → UI_DESIGN_STYLES_REFERENCE.md
- **营销人员** → MARKETING_SKILLS_GUIDE.md → VIBE_MARKETING_GUIDE.md
- **数据分析师** → data-analysis-agent/ → bytebase MCP

---

**知识图谱版本**: v1.0
**最后更新**: 2026-01-28
**维护者**: Arxchibobo

**查看完整索引**: [INDEX.md](INDEX.md)

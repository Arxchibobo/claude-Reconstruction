# 浏览器自动化工作流

## 概述

使用 browser-use Skill 和 playwright MCP 实现 Web 自动化、E2E 测试和网页数据抓取。

## 可用工具

### 1. browser-use Skill（推荐）🎯
**特点**:
- AI 驱动的浏览器控制
- 自动化网页交互
- 支持复杂场景
- Python 3.11+ async

**使用场景**:
- 网页数据抓取
- 表单自动填写
- E2E 测试
- LLM 控制浏览器

### 2. playwright MCP（基础）
**特点**:
- 直接浏览器控制
- 截图和 PDF
- 网络监控
- 多浏览器支持

**使用场景**:
- UI 截图验证
- 简单交互测试
- 网络流量分析
- 浏览器 console 日志

## 工作流模式

### 模式 1: 网页数据抓取

```
目标 → browser-use → 导航页面 → 提取数据 → 保存结果
```

**示例**:
```python
from browser_use import Agent, ChatBrowserUse

# 创建 Agent
agent = Agent(
    task="抓取 HackerNews 首页前 10 条新闻的标题和链接",
    llm=ChatBrowserUse()
)

# 执行抓取
result = await agent.run()
print(result)
```

**适用场景**:
- 新闻网站抓取
- 产品信息收集
- 价格监控
- 社交媒体数据

### 模式 2: 表单自动填写

```
准备数据 → browser-use → 导航表单 → 填写字段 → 提交 → 验证
```

**示例**:
```python
from browser_use import Agent, ChatBrowserUse, tools

# 定义自定义工具
@tools.action
def get_user_data():
    return {
        "name": "张三",
        "email": "zhangsan@example.com",
        "phone": "13800138000"
    }

# 创建 Agent
agent = Agent(
    task="填写注册表单并提交",
    llm=ChatBrowserUse(),
    tools=[get_user_data]
)

result = await agent.run()
```

**适用场景**:
- 自动化注册
- 批量表单提交
- 数据录入
- 订单创建

### 模式 3: E2E 测试

```
定义测试 → browser-use → 执行交互 → 验证结果 → 生成报告
```

**示例**:
```python
from browser_use import Agent, ChatBrowserUse

agent = Agent(
    task="""
    测试登录流程:
    1. 访问 https://example.com/login
    2. 输入用户名: test@example.com
    3. 输入密码: password123
    4. 点击登录按钮
    5. 验证跳转到 dashboard
    6. 截图保存
    """,
    llm=ChatBrowserUse()
)

result = await agent.run()
```

**适用场景**:
- 登录流程测试
- 购物流程测试
- 表单验证测试
- 页面跳转测试

### 模式 4: UI 截图验证

```
导航页面 → playwright → 截图 → 对比 → 生成报告
```

**示例**:
```bash
# 使用 playwright MCP
browser_navigate: "https://example.com"
browser_take_screenshot: {filename: "homepage.png"}
```

**适用场景**:
- 视觉回归测试
- UI 变更验证
- 响应式设计检查
- 跨浏览器兼容

## 前置条件

### browser-use Skill

```bash
# 安装 Python 3.11+
python --version  # >= 3.11

# 安装 uv 包管理器
pip install uv

# 安装 browser-use
uv pip install browser-use

# 或使用 poetry/pip
pip install browser-use
```

### playwright MCP

```bash
# 安装 Playwright
npm install -D @playwright/test

# 安装浏览器
npx playwright install chromium

# 验证安装
npx playwright --version
```

## 最佳实践

### 1. 选择合适的工具

**使用 browser-use**:
- ✅ 复杂的多步骤流程
- ✅ 需要智能决策
- ✅ 动态页面交互
- ✅ LLM 驱动的自动化

**使用 playwright MCP**:
- ✅ 简单的截图需求
- ✅ 基础交互测试
- ✅ 网络监控
- ✅ Console 日志收集

### 2. 错误处理

```python
from browser_use import Agent, ChatBrowserUse

try:
    agent = Agent(
        task="执行任务",
        llm=ChatBrowserUse()
    )
    result = await agent.run()
except Exception as error:
    logger.error('Browser automation failed', {error})
    # 截图保存现场
    await browser.screenshot({'path': 'error.png'})
    raise
```

### 3. 性能优化

```python
# 使用云浏览器扩展
from browser_use import Browser

browser = Browser(
    use_cloud=True,  # 使用云浏览器
    cloud_profile_id="profile123",  # 保持登录状态
    headless=True  # 无头模式更快
)
```

### 4. 数据验证

```python
# 验证抓取结果
result = await agent.run()

# 检查数据完整性
assert 'title' in result
assert len(result['items']) > 0

# 保存结果
with open('result.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
```

## 常见场景

### 场景 1: 定时数据抓取

```python
import schedule
from browser_use import Agent, ChatBrowserUse

async def scrape_news():
    agent = Agent(
        task="抓取最新新闻",
        llm=ChatBrowserUse()
    )
    result = await agent.run()
    save_to_database(result)

# 每小时执行
schedule.every().hour.do(scrape_news)
```

### 场景 2: 批量账号注册

```python
async def register_accounts(users):
    for user in users:
        agent = Agent(
            task=f"注册账号: {user['email']}",
            llm=ChatBrowserUse()
        )
        result = await agent.run()
        logger.info(f"注册成功: {user['email']}")
```

### 场景 3: 监控网站变化

```python
async def monitor_website(url):
    agent = Agent(
        task=f"检查 {url} 是否有变化",
        llm=ChatBrowserUse()
    )

    # 获取当前内容
    current = await agent.run()

    # 对比历史内容
    if current != previous:
        send_alert("网站内容已变化")
```

### 场景 4: 自动化测试

```python
async def test_checkout_flow():
    agent = Agent(
        task="""
        测试购物流程:
        1. 搜索商品
        2. 添加到购物车
        3. 填写地址
        4. 选择支付方式
        5. 确认订单
        6. 验证成功页面
        """,
        llm=ChatBrowserUse()
    )

    result = await agent.run()
    assert "订单成功" in result
```

## 故障排查

### 问题 1: 浏览器未安装

**错误**:
```
Executable doesn't exist at chromium-1179
```

**解决**:
```bash
# 方法 1: 安装匹配版本
npx playwright@1.40.0 install chromium

# 方法 2: 创建符号链接（Windows）
cd ~/AppData/Local/ms-playwright
cmd //c "mklink /J chromium-1179 chromium-1181"
```

### 问题 2: 超时错误

**错误**:
```
TimeoutError: page.goto: Timeout 30000ms exceeded
```

**解决**:
```python
# 增加超时时间
agent = Agent(
    task="...",
    llm=ChatBrowserUse(),
    timeout=60000  # 60秒
)
```

### 问题 3: 元素找不到

**错误**:
```
Element not found: #submit-button
```

**解决**:
```python
# 等待元素出现
await page.wait_for_selector('#submit-button', {
    timeout: 10000
})

# 或使用 browser-use 的智能查找
agent = Agent(
    task="找到提交按钮并点击（可能叫'提交'、'确认'或'Submit'）",
    llm=ChatBrowserUse()
)
```

## 参考资料

- [browser-use Skill](./docs/workflows/browser-automation.md)
- [Playwright 文档](https://playwright.dev/)
- [Browser-Use GitHub](https://github.com/browser-use/browser-use)
- [最佳实践](../references/best-practices.md)

---

**自动化浏览器，解放双手** 🤖

通过 browser-use 和 playwright 的组合，我们可以实现强大的 Web 自动化能力，从简单的截图到复杂的 E2E 测试，从数据抓取到流程自动化。

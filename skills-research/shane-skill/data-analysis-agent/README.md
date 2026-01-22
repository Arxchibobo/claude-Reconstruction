目前的思路
1. 生成 prompt 参考 @cost-trend-chart.md 原则就是方便 review
2. 给到 base44 的 prompt 为 @cost-trend-chart.md 去掉 `## Step 3: 生成图表` + @base44_prompt_mcphub.md

这个思路的主要解决了数据准确性问题，通过 md 方便 review 的方式 + cc 可被非技术人员理解的执行方式进行充分使用，使用中验证提高准确度。

1. 不再有代码，只有 md，md 里面只有分步展示的清晰的代码，方便人工 review
2. 既支持 `@cost-trend-chart.md 查询最近7天` 直接在 cc 里写 prompt，也支持交给 base44 生成单页面可交互应用
3. base44 如何修改（修改起来容易出 bug）还在研究中。


对应 @cost-trend-chart.md
https://app-d281d193.base44.app/
https://app.base44.com/apps/694e034b00da88c9d281d193/

对应 @inactive-email-domains.md
https://app.base44.com/apps/694e1e66781751f8c2e62339

对应 @bot-margin-analysis.md
app.base44.com/apps/694eb173593b2a2b3c46a267

对应 @gross-margin-analysis.md
https://profit-flow-analytics-b8a87f86.base44.app/

对应 bot-revenue-cost-trend.md
https://bot-performance-dashboard-e66b00ca.base44.app/
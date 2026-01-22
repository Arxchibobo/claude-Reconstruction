# API 集成错误

> **错误 ID**: E006, E008, E009
> **频率**: 中-低
> **严重度**: 🟡 中等 - 🟢 轻微

---

## 📋 错误 E006: API 参数顺序错误

**常见表现**:
- API 调用失败
- 返回意外结果
- 参数错误的错误提示

**根本原因**:
- 未查阅 API 文档
- 凭记忆编写参数顺序
- 混淆不同 API 的参数顺序

### ❌ 错误示例

```javascript
// ❌ 错误：参数顺序错误
await githubProxy.searchRepositories(
  'query string',
  100,          // ❌ per_page 应该在 page 前面
  1             // ❌ page
);
```

### ✅ 正确做法

```javascript
// ✅ 正确：查阅文档确认参数顺序
await githubProxy.searchRepositories(
  'query string',
  1,    // ✅ page
  100   // ✅ per_page
);
```

---

## 📋 错误 E008: Chart 配置不完整

**常见表现**:
- 图表显示不完整
- 缺少必要信息
- 用户体验差

**根本原因**:
- 只配置基本参数
- 未添加 tooltip、legend 等

### ❌ 错误示例

```javascript
// ❌ 错误：配置不完整
const chartConfig = {
  type: 'bar',
  data: chartData
  // ❌ 缺少 tooltip, legend 等
};
```

### ✅ 正确做法

```javascript
// ✅ 正确：完整配置
const chartConfig = {
  type: 'bar',
  data: chartData,
  options: {
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'index'
      },
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
};
```

---

## 📋 错误 E009: 依赖未安装就使用

**常见表现**:
- 模块未找到错误
- 运行时崩溃

**根本原因**:
- 忘记运行 `npm install`
- 未添加到 package.json

### ❌ 错误示例

```javascript
// ❌ 错误：直接使用
import { Something } from 'new-package'; // ❌ Module not found
```

### ✅ 正确做法

```bash
# ✅ 正确：先安装依赖
npm install new-package

# 然后使用
import { Something } from 'new-package';
```

---

## 📌 自检清单

### API 参数（E006）
- [ ] 是否查阅了 API 文档？
- [ ] 参数顺序是否正确？
- [ ] 是否处理 Rate Limit？

### Chart 配置（E008）
- [ ] 是否添加 tooltip？
- [ ] 是否添加 legend？
- [ ] 是否配置坐标轴？

### 依赖安装（E009）
- [ ] 是否运行 `npm install`？
- [ ] package.json 是否包含依赖？

---

**返回**: [ERROR_CATALOG.md](../ERROR_CATALOG.md)

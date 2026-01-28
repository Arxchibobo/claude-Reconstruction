#!/bin/bash

# 运行所有验证脚本
#
# 用法:
#   bash run-all-validations.sh           # 完整验证
#   bash run-all-validations.sh --quick   # 快速验证

set -e  # 遇到错误时退出

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUICK_MODE=""

# 解析参数
if [[ "$1" == "--quick" ]]; then
  QUICK_MODE="--quick"
  echo "⚡ 快速验证模式"
else
  echo "🔍 完整验证模式"
fi

echo "================================"
echo "Claude Code 工程化验证系统"
echo "================================"
echo ""

# 计数器
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 运行单个验证
run_check() {
  local name="$1"
  local command="$2"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  if eval "$command"; then
    echo -e "${GREEN}✅ $name 通过${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌ $name 失败${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

echo ""
echo "========================================="
echo "第 1 部分: 错误案例测试"
echo "========================================="
echo ""

# 检查 error-tests 目录是否有 package.json
if [ -f "$ROOT_DIR/validation/error-tests/package.json" ]; then
  cd "$ROOT_DIR/validation/error-tests"

  # 检查是否安装了依赖
  if [ ! -d "node_modules" ]; then
    echo "📦 安装测试依赖..."
    npm install --silent
  fi

  # 运行测试
  run_check "错误案例测试 (E001-E015)" "npm test --silent" || true
else
  echo -e "${YELLOW}⚠️  跳过错误案例测试（未找到 package.json）${NC}"
fi

echo ""
echo "========================================="
echo "第 2 部分: 文档验证"
echo "========================================="
echo ""

cd "$SCRIPT_DIR"

# 链接检查
if [ -f "check-links.js" ]; then
  run_check "链接检查" "node check-links.js $QUICK_MODE" || true
else
  echo -e "${YELLOW}⚠️  跳过链接检查（未找到脚本）${NC}"
fi

# Markdown 格式验证（如果存在）
if [ -f "validate-markdown.js" ]; then
  run_check "Markdown 格式验证" "node validate-markdown.js" || true
else
  echo -e "${YELLOW}⚠️  跳过 Markdown 验证（未找到脚本）${NC}"
fi

# 重复内容检测（如果存在）
if [ -f "check-duplicates.js" ]; then
  run_check "重复内容检测" "node check-duplicates.js" || true
else
  echo -e "${YELLOW}⚠️  跳过重复内容检测（未找到脚本）${NC}"
fi

# 结构完整性审计（如果存在）
if [ -f "audit-structure.js" ]; then
  run_check "结构完整性审计" "node audit-structure.js" || true
else
  echo -e "${YELLOW}⚠️  跳过结构审计（未找到脚本）${NC}"
fi

echo ""
echo "========================================="
echo "📊 验证总结"
echo "========================================="
echo ""
echo "总检查项: $TOTAL_CHECKS"
echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
echo -e "${RED}失败: $FAILED_CHECKS${NC}"
echo ""

# 生成审计报告（如果有失败）
if [ $FAILED_CHECKS -gt 0 ]; then
  AUDIT_DIR="$ROOT_DIR/validation/audit"
  mkdir -p "$AUDIT_DIR"

  REPORT_FILE="$AUDIT_DIR/$(date +%Y-%m-%d)-audit-report.md"

  cat > "$REPORT_FILE" <<EOF
# 验证审计报告

**日期**: $(date +%Y-%m-%d)
**模式**: $([ -n "$QUICK_MODE" ] && echo "快速" || echo "完整")

---

## 📊 总结

- **总检查项**: $TOTAL_CHECKS
- **通过**: $PASSED_CHECKS ✅
- **失败**: $FAILED_CHECKS ❌
- **通过率**: $(awk "BEGIN {printf \"%.1f\", ($PASSED_CHECKS / $TOTAL_CHECKS) * 100}")%

---

## ❌ 失败的检查

EOF

  if [ $FAILED_CHECKS -gt 0 ]; then
    echo "查看详细日志以获取失败原因" >> "$REPORT_FILE"
  fi

  cat >> "$REPORT_FILE" <<EOF

---

## 📝 建议

1. 修复所有失效的链接
2. 确保所有测试通过
3. 检查 Markdown 格式规范

---

**下次审计**: $(date -d "+7 days" +%Y-%m-%d)（建议每周运行一次）
EOF

  echo "📄 审计报告已保存: $REPORT_FILE"
  echo ""
fi

# 退出码
if [ $FAILED_CHECKS -gt 0 ]; then
  echo -e "${RED}❌ 验证失败（$FAILED_CHECKS 个问题）${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 所有验证通过${NC}"
  exit 0
fi

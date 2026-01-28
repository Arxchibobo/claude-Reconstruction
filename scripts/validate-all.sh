#!/bin/bash

# 完整文档验证脚本
# 调用所有验证工具，生成完整报告

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/validation-report-$(date +%Y%m%d-%H%M%S).txt"

# 统计变量
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

print_header() {
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}║ $1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
  echo ""
  echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# 运行验证工具
run_check() {
  local name="$1"
  local script="$2"
  local description="$3"

  echo "" >> "$REPORT_FILE"
  echo "═══════════════════════════════════════════════" >> "$REPORT_FILE"
  echo "$name" >> "$REPORT_FILE"
  echo "═══════════════════════════════════════════════" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"

  print_section "$name"
  print_info "$description"
  echo ""

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 运行脚本并捕获输出
  if bash "$script" "$PROJECT_ROOT" >> "$REPORT_FILE" 2>&1; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    print_success "$name 通过"
    echo "✓ 通过" >> "$REPORT_FILE"
    return 0
  else
    local exit_code=$?
    FAILED_CHECKS=$((FAILED_CHECKS + 1))

    # 区分错误和警告
    if grep -qi "warning" "$REPORT_FILE"; then
      print_warning "$name 通过（有警告）"
      WARNINGS=$((WARNINGS + 1))
      echo "⚠ 通过（有警告）" >> "$REPORT_FILE"
    else
      print_error "$name 失败 (退出码: $exit_code)"
      echo "✗ 失败 (退出码: $exit_code)" >> "$REPORT_FILE"
    fi

    return 1
  fi
}

# 生成系统信息
generate_system_info() {
  print_section "系统信息"

  local info="系统信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
验证时间: $(date '+%Y-%m-%d %H:%M:%S')
项目路径: $PROJECT_ROOT
操作系统: $(uname -s)
Shell: $SHELL
Git 版本: $(git --version 2>/dev/null || echo 'Not installed')
Bash 版本: $BASH_VERSION
"

  echo "$info"
  echo "$info" >> "$REPORT_FILE"
}

# 生成文件统计
generate_file_stats() {
  print_section "文件统计"

  local md_count=$(find "$PROJECT_ROOT" -type f -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/archive/*" | wc -l)
  local js_count=$(find "$PROJECT_ROOT" -type f -name "*.js" ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l)
  local sh_count=$(find "$PROJECT_ROOT" -type f -name "*.sh" ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l)
  local total_size=$(du -sh "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}' || echo "Unknown")

  local stats="文件统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Markdown 文件: $md_count
JavaScript 文件: $js_count
Shell 脚本: $sh_count
项目总大小: $total_size

主要目录:
  core/          $(find "$PROJECT_ROOT/core" -type f 2>/dev/null | wc -l) 个文件
  capabilities/  $(find "$PROJECT_ROOT/capabilities" -type f 2>/dev/null | wc -l) 个文件
  errors/        $(find "$PROJECT_ROOT/errors" -type f 2>/dev/null | wc -l) 个文件
  validation/    $(find "$PROJECT_ROOT/validation" -type f 2>/dev/null | wc -l) 个文件
"

  echo "$stats"
  echo "$stats" >> "$REPORT_FILE"
}

# 生成最终报告
generate_final_report() {
  print_header "验证完成"

  local report="
验证总结
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总检查项: $TOTAL_CHECKS
通过:     $PASSED_CHECKS
失败:     $FAILED_CHECKS
警告:     $WARNINGS

详细报告已保存到:
  $REPORT_FILE
"

  echo "$report"
  echo "$report" >> "$REPORT_FILE"

  # 健康评分
  local success_rate=0
  if [ $TOTAL_CHECKS -gt 0 ]; then
    success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
  fi

  echo ""
  echo "健康评分: $success_rate%" | tee -a "$REPORT_FILE"

  if [ $success_rate -eq 100 ]; then
    echo -e "${GREEN}状态: 优秀 ✨${NC}" | tee -a "$REPORT_FILE"
  elif [ $success_rate -ge 80 ]; then
    echo -e "${GREEN}状态: 良好 ✓${NC}" | tee -a "$REPORT_FILE"
  elif [ $success_rate -ge 60 ]; then
    echo -e "${YELLOW}状态: 需要改进 ⚠${NC}" | tee -a "$REPORT_FILE"
  else
    echo -e "${RED}状态: 需要修复 ✗${NC}" | tee -a "$REPORT_FILE"
  fi

  echo ""
}

# 主函数
main() {
  print_header "Claude Code 工程化验证套件"

  echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "项目路径: $PROJECT_ROOT"
  echo "报告路径: $REPORT_FILE"
  echo ""

  # 初始化报告文件
  cat > "$REPORT_FILE" << EOF
Claude Code 工程化验证报告
═══════════════════════════════════════════════
生成时间: $(date '+%Y-%m-%d %H:%M:%S')
项目路径: $PROJECT_ROOT

EOF

  # 系统信息
  generate_system_info

  # 文件统计
  generate_file_stats

  # 运行各项检查
  echo ""
  print_header "开始验证"

  # 1. Markdown 格式验证
  run_check \
    "Markdown 格式验证" \
    "$SCRIPT_DIR/validate-markdown.sh" \
    "检查所有 Markdown 文件的格式规范"

  # 2. 链接有效性验证
  run_check \
    "链接有效性验证" \
    "$SCRIPT_DIR/validate-links.sh" \
    "验证文档中的所有链接是否有效"

  # 3. 重复内容检测
  run_check \
    "重复内容检测" \
    "$SCRIPT_DIR/detect-duplicates.sh" \
    "检测重复内容和高相似度文件"

  # 4. 错误案例测试（如果存在）
  if [ -f "$PROJECT_ROOT/validation/error-tests/package.json" ]; then
    print_section "错误案例测试"
    print_info "运行 Jest 测试套件"
    echo ""

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    # 注意：npm test 在 Git Bash 中可能卡住，这里只输出提示
    if command -v npm &> /dev/null; then
      print_warning "检测到 npm，但在 Git Bash 中可能无法正常运行"
      print_info "建议在 PowerShell/CMD 中手动运行: npm test"
      echo ""
      echo "错误案例测试: 需要手动运行" >> "$REPORT_FILE"
    else
      print_info "未安装 npm，跳过测试"
      echo "错误案例测试: npm 未安装" >> "$REPORT_FILE"
    fi
  fi

  # 生成最终报告
  generate_final_report

  # 返回退出码
  if [ $FAILED_CHECKS -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

# 捕获中断信号
trap 'echo -e "\n${RED}验证被中断${NC}" | tee -a "$REPORT_FILE"; exit 130' INT TERM

# 执行
main "$@"

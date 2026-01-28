#!/bin/bash

# Markdown 格式验证器
# 检查文档是否符合规范

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 统计变量
TOTAL_FILES=0
PASSED_FILES=0
FAILED_FILES=0
WARNINGS=0

# 配置
CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

# 验证单个文件
validate_file() {
  local file="$1"
  local filename=$(basename "$file")
  local errors=()
  local warnings=()

  echo -e "\n${BLUE}检查文件:${NC} $filename"

  # 1. 检查文件是否为空
  if [ ! -s "$file" ]; then
    errors+=("文件为空")
  fi

  # 2. 检查标题层级
  local title_count=$(grep -c "^# " "$file" || true)
  if [ "$title_count" -eq 0 ]; then
    warnings+=("缺少主标题 (# Title)")
  fi
  if [ "$title_count" -gt 1 ]; then
    warnings+=("有多个主标题 (建议只有一个 # Title)")
  fi

  # 3. 检查代码块闭合
  local code_block_count=$(grep -c '^```' "$file" || true)
  if [ $((code_block_count % 2)) -ne 0 ]; then
    errors+=("代码块未闭合 (``` 数量为奇数)")
  fi

  # 4. 检查表格格式
  if grep -q "^|" "$file"; then
    # 检查表格分隔符行
    local table_start=$(grep -n "^|" "$file" | head -1 | cut -d: -f1)
    if [ -n "$table_start" ]; then
      local next_line=$((table_start + 1))
      local separator_line=$(sed -n "${next_line}p" "$file")
      if ! echo "$separator_line" | grep -qE "^\|[-: |]+\|$"; then
        warnings+=("表格可能缺少分隔符行 (第 $next_line 行)")
      fi
    fi
  fi

  # 5. 检查链接格式
  local malformed_links=$(grep -oE '\[([^\]]*)\]\([^\)]*$' "$file" || true)
  if [ -n "$malformed_links" ]; then
    errors+=("存在格式错误的链接")
  fi

  # 6. 检查常见拼写错误
  if grep -qi "sucessfully" "$file"; then
    warnings+=("可能的拼写错误: 'sucessfully' → 'successfully'")
  fi
  if grep -qi "occured" "$file"; then
    warnings+=("可能的拼写错误: 'occured' → 'occurred'")
  fi

  # 7. 检查中文文档标题格式
  if [[ "$filename" =~ \.md$ ]]; then
    # 检查是否有中文内容
    if grep -qP '[\p{Han}]' "$file"; then
      # 中文文档建议：标题与内容之间有空行
      local title_no_space=$(grep -A1 "^#" "$file" | grep -v "^#" | grep -v "^--$" | grep -v "^$" || true)
      if [ -n "$title_no_space" ]; then
        warnings+=("建议：标题后添加空行提高可读性")
      fi
    fi
  fi

  # 8. 检查行尾空格
  if grep -q " $" "$file"; then
    warnings+=("存在行尾空格（建议清理）")
  fi

  # 9. 检查特殊字符使用
  # 检查是否使用了不规范的引号
  if grep -qE '[""]' "$file"; then
    warnings+=("使用了中文引号 "" 建议使用英文引号 \"\"")
  fi

  # 10. 检查 Mermaid 图表语法
  if grep -q "^```mermaid" "$file"; then
    local mermaid_blocks=$(awk '/^```mermaid/,/^```/{print}' "$file")
    if echo "$mermaid_blocks" | grep -q "graph TD"; then
      # 检查基本的 Mermaid 语法
      if ! echo "$mermaid_blocks" | grep -qE "\[.*\]|(\(.*\))"; then
        warnings+=("Mermaid 图表可能缺少节点定义")
      fi
    fi
  fi

  # 输出结果
  if [ ${#errors[@]} -gt 0 ]; then
    print_error "发现 ${#errors[@]} 个错误:"
    for error in "${errors[@]}"; do
      echo -e "  ${RED}•${NC} $error"
    done
    FAILED_FILES=$((FAILED_FILES + 1))
    return 1
  fi

  if [ ${#warnings[@]} -gt 0 ]; then
    print_warning "发现 ${#warnings[@]} 个警告:"
    for warning in "${warnings[@]}"; do
      echo -e "  ${YELLOW}•${NC} $warning"
    done
    WARNINGS=$((WARNINGS + ${#warnings[@]}))
  fi

  if [ ${#errors[@]} -eq 0 ] && [ ${#warnings[@]} -eq 0 ]; then
    print_success "格式正确，无问题"
  elif [ ${#errors[@]} -eq 0 ]; then
    print_success "格式正确（有警告）"
  fi

  PASSED_FILES=$((PASSED_FILES + 1))
  return 0
}

# 主函数
main() {
  print_header "Markdown 格式验证"

  # 获取要验证的文件
  local target_dir="${1:-$PROJECT_ROOT}"

  echo "验证目录: $target_dir"
  echo ""

  # 查找所有 .md 文件（排除 node_modules, .git 等）
  local md_files=$(find "$target_dir" -type f -name "*.md" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/archive/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    | sort)

  if [ -z "$md_files" ]; then
    print_error "未找到 Markdown 文件"
    exit 1
  fi

  # 遍历所有文件
  while IFS= read -r file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    validate_file "$file" || true
  done <<< "$md_files"

  # 输出总结
  echo ""
  print_header "验证总结"
  echo -e "${BLUE}总文件数:${NC} $TOTAL_FILES"
  echo -e "${GREEN}通过:${NC} $PASSED_FILES"

  if [ $FAILED_FILES -gt 0 ]; then
    echo -e "${RED}失败:${NC} $FAILED_FILES"
  fi

  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}警告:${NC} $WARNINGS"
  fi

  echo ""

  if [ $FAILED_FILES -eq 0 ]; then
    if [ $WARNINGS -gt 0 ]; then
      print_warning "验证通过（有 $WARNINGS 个警告）"
      exit 0
    else
      print_success "所有文件验证通过！"
      exit 0
    fi
  else
    print_error "验证失败：$FAILED_FILES 个文件有错误"
    exit 1
  fi
}

# 执行
main "$@"

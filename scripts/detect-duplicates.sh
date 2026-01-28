#!/bin/bash

# 重复内容检测器
# 检测文档中的重复内容片段

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 统计变量
TOTAL_FILES=0
DUPLICATE_SECTIONS=0
DUPLICATE_PAIRS=0

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_DUPLICATE_LINES=5  # 最少连续相同行数才视为重复

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

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# 提取文档标题
get_section_titles() {
  local file="$1"
  grep -n "^##\? " "$file" | head -20 || true
}

# 计算两个文件的相似度
calculate_similarity() {
  local file1="$1"
  local file2="$2"

  # 提取标题进行对比
  local titles1=$(get_section_titles "$file1" | awk -F: '{print $2}' | sort)
  local titles2=$(get_section_titles "$file2" | awk -F: '{print $2}' | sort)

  # 统计相同标题数量
  local common_titles=$(comm -12 <(echo "$titles1") <(echo "$titles2") | wc -l)
  local total_titles=$(echo "$titles1" | wc -l)

  if [ "$total_titles" -eq 0 ]; then
    echo "0"
    return
  fi

  # 计算相似度（百分比）
  local similarity=$((common_titles * 100 / total_titles))
  echo "$similarity"
}

# 检测两个文件之间的重复内容
detect_duplicates_between_files() {
  local file1="$1"
  local file2="$2"
  local name1=$(basename "$file1")
  local name2=$(basename "$file2")

  # 计算相似度
  local similarity=$(calculate_similarity "$file1" "$file2")

  # 如果相似度高于 50%，报告重复
  if [ "$similarity" -gt 50 ]; then
    DUPLICATE_PAIRS=$((DUPLICATE_PAIRS + 1))
    print_warning "发现高相似度文件对 ($similarity%):"
    echo -e "  ${YELLOW}•${NC} $name1"
    echo -e "  ${YELLOW}•${NC} $name2"
    echo ""
  fi
}

# 检测单个文件内部的重复内容
detect_duplicates_within_file() {
  local file="$1"
  local filename=$(basename "$file")
  local temp_file="/tmp/detect_dup_$$"

  # 提取所有代码块（排除代码块内容）
  awk '/^```/,/^```/ {next} {print}' "$file" > "$temp_file"

  # 查找重复的段落（连续 5 行以上相同）
  local duplicates=$(awk '
    {
      lines[NR] = $0
      hashes[NR] = $0
    }
    END {
      for (i = 1; i <= NR - 5; i++) {
        block = ""
        for (j = 0; j < 5; j++) {
          block = block lines[i+j] "\n"
        }

        for (k = i + 5; k <= NR - 5; k++) {
          compare_block = ""
          for (j = 0; j < 5; j++) {
            compare_block = compare_block lines[k+j] "\n"
          }

          if (block == compare_block) {
            print "Lines " i "-" (i+4) " duplicate at " k "-" (k+4)
          }
        }
      }
    }
  ' "$temp_file")

  rm -f "$temp_file"

  if [ -n "$duplicates" ]; then
    DUPLICATE_SECTIONS=$((DUPLICATE_SECTIONS + 1))
    print_warning "$filename: 发现内部重复内容"
    echo "$duplicates" | while read -r line; do
      echo -e "  ${YELLOW}•${NC} $line"
    done
    echo ""
  fi
}

# 检测常见的重复模式
detect_common_patterns() {
  local file="$1"
  local filename=$(basename "$file")
  local warnings=()

  # 1. 重复的标题
  local duplicate_titles=$(grep "^##\? " "$file" | sort | uniq -d)
  if [ -n "$duplicate_titles" ]; then
    warnings+=("存在重复标题")
  fi

  # 2. 重复的代码块标识
  local code_blocks=$(grep "^##\?###" "$file" | wc -l)
  if [ "$code_blocks" -gt 20 ]; then
    warnings+=("代码块数量较多 ($code_blocks)，考虑拆分")
  fi

  # 3. 过长的文件
  local line_count=$(wc -l < "$file")
  if [ "$line_count" -gt 1000 ]; then
    warnings+=("文件过长 ($line_count 行)，建议拆分")
  fi

  # 输出警告
  if [ ${#warnings[@]} -gt 0 ]; then
    print_info "$filename:"
    for warning in "${warnings[@]}"; do
      echo -e "  ${BLUE}•${NC} $warning"
    done
    echo ""
  fi
}

# 主函数
main() {
  print_header "重复内容检测"

  local target_dir="${1:-$PROJECT_ROOT}"

  echo "检测目录: $target_dir"
  echo ""

  # 查找所有 .md 文件
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

  # 统计文件数
  TOTAL_FILES=$(echo "$md_files" | wc -l)

  # 1. 检测文件内部重复
  print_header "检测文件内部重复"
  while IFS= read -r file; do
    detect_duplicates_within_file "$file"
  done <<< "$md_files"

  # 2. 检测文件之间重复
  print_header "检测文件之间重复"
  local files_array=($md_files)
  for ((i=0; i<${#files_array[@]}; i++)); do
    for ((j=i+1; j<${#files_array[@]}; j++)); do
      detect_duplicates_between_files "${files_array[i]}" "${files_array[j]}"
    done
  done

  # 3. 检测常见模式
  print_header "检测常见问题模式"
  while IFS= read -r file; do
    detect_common_patterns "$file"
  done <<< "$md_files"

  # 输出总结
  echo ""
  print_header "检测总结"
  echo -e "${BLUE}总文件数:${NC} $TOTAL_FILES"
  echo -e "${YELLOW}内部重复:${NC} $DUPLICATE_SECTIONS 个文件"
  echo -e "${YELLOW}高相似度文件对:${NC} $DUPLICATE_PAIRS 对"

  echo ""

  if [ $DUPLICATE_SECTIONS -eq 0 ] && [ $DUPLICATE_PAIRS -eq 0 ]; then
    print_success "未检测到显著的重复内容"
    exit 0
  else
    print_warning "检测到重复内容，建议审查"
    echo ""
    echo "建议："
    echo "  1. 对于文件内部重复，考虑提取公共内容"
    echo "  2. 对于高相似度文件，考虑合并或引用"
    echo "  3. 对于过长文件，考虑拆分为多个模块"
    exit 0
  fi
}

# 执行
main "$@"

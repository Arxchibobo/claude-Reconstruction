#!/bin/bash

# 链接有效性验证器
# 检查文档中的所有链接是否有效

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 统计变量
TOTAL_LINKS=0
VALID_LINKS=0
BROKEN_LINKS=0
SKIPPED_LINKS=0

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKED_URLS=()

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

# 检查 URL 是否已验证过
is_url_checked() {
  local url="$1"
  for checked in "${CHECKED_URLS[@]}"; do
    if [ "$checked" = "$url" ]; then
      return 0
    fi
  done
  return 1
}

# 验证相对路径链接
validate_relative_link() {
  local file="$1"
  local link="$2"
  local file_dir=$(dirname "$file")

  # 处理 ../
  local target_path="$file_dir/$link"

  # 移除 # 锚点
  target_path="${target_path%%#*}"

  if [ -e "$target_path" ]; then
    return 0
  else
    return 1
  fi
}

# 验证绝对路径链接
validate_absolute_link() {
  local link="$1"

  # 移除 # 锚点
  link="${link%%#*}"

  # 转换为项目相对路径
  local target_path="$PROJECT_ROOT/$link"

  if [ -e "$target_path" ]; then
    return 0
  else
    return 1
  fi
}

# 验证 HTTP(S) 链接
validate_http_link() {
  local url="$1"

  # 检查是否已验证过
  if is_url_checked "$url"; then
    SKIPPED_LINKS=$((SKIPPED_LINKS + 1))
    return 0
  fi

  # 使用 curl 检查（静默模式，只检查头部，超时 10 秒）
  if curl -s -f -I --max-time 10 "$url" > /dev/null 2>&1; then
    CHECKED_URLS+=("$url")
    return 0
  else
    CHECKED_URLS+=("$url")
    return 1
  fi
}

# 从文件中提取所有链接
extract_links() {
  local file="$1"

  # 提取 Markdown 链接: [text](link)
  grep -oP '\[([^\]]*)\]\(\K[^)]+' "$file" 2>/dev/null || true
}

# 验证单个文件中的所有链接
validate_file_links() {
  local file="$1"
  local filename=$(basename "$file")
  local file_broken=0
  local file_valid=0

  echo -e "\n${BLUE}检查文件:${NC} $filename"

  # 提取所有链接
  local links=$(extract_links "$file")

  if [ -z "$links" ]; then
    print_info "无链接"
    return 0
  fi

  # 遍历每个链接
  while IFS= read -r link; do
    [ -z "$link" ] && continue

    TOTAL_LINKS=$((TOTAL_LINKS + 1))

    # 跳过邮件链接
    if [[ "$link" =~ ^mailto: ]]; then
      print_info "跳过邮件链接: $link"
      SKIPPED_LINKS=$((SKIPPED_LINKS + 1))
      continue
    fi

    # 跳过锚点链接
    if [[ "$link" =~ ^# ]]; then
      print_info "跳过锚点链接: $link"
      SKIPPED_LINKS=$((SKIPPED_LINKS + 1))
      continue
    fi

    # 判断链接类型并验证
    if [[ "$link" =~ ^https?:// ]]; then
      # HTTP(S) 链接
      if validate_http_link "$link"; then
        print_success "HTTP: $link"
        VALID_LINKS=$((VALID_LINKS + 1))
        file_valid=$((file_valid + 1))
      else
        print_error "HTTP broken: $link"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
        file_broken=$((file_broken + 1))
      fi
    elif [[ "$link" =~ ^/ ]]; then
      # 绝对路径
      if validate_absolute_link "$link"; then
        print_success "路径: $link"
        VALID_LINKS=$((VALID_LINKS + 1))
        file_valid=$((file_valid + 1))
      else
        print_error "路径不存在: $link"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
        file_broken=$((file_broken + 1))
      fi
    else
      # 相对路径
      if validate_relative_link "$file" "$link"; then
        print_success "相对路径: $link"
        VALID_LINKS=$((VALID_LINKS + 1))
        file_valid=$((file_valid + 1))
      else
        print_error "相对路径不存在: $link"
        BROKEN_LINKS=$((BROKEN_LINKS + 1))
        file_broken=$((file_broken + 1))
      fi
    fi
  done <<< "$links"

  # 文件总结
  if [ $file_broken -gt 0 ]; then
    print_error "$filename: $file_broken 个失效链接"
  else
    print_success "$filename: 所有 $file_valid 个链接有效"
  fi
}

# 主函数
main() {
  print_header "链接有效性验证"

  local target_dir="${1:-$PROJECT_ROOT}"

  echo "验证目录: $target_dir"
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

  # 遍历所有文件
  while IFS= read -r file; do
    validate_file_links "$file"
  done <<< "$md_files"

  # 输出总结
  echo ""
  print_header "验证总结"
  echo -e "${BLUE}总链接数:${NC} $TOTAL_LINKS"
  echo -e "${GREEN}有效:${NC} $VALID_LINKS"

  if [ $BROKEN_LINKS -gt 0 ]; then
    echo -e "${RED}失效:${NC} $BROKEN_LINKS"
  fi

  if [ $SKIPPED_LINKS -gt 0 ]; then
    echo -e "${YELLOW}跳过:${NC} $SKIPPED_LINKS"
  fi

  echo ""

  if [ $BROKEN_LINKS -eq 0 ]; then
    print_success "所有链接验证通过！"
    exit 0
  else
    print_error "验证失败：$BROKEN_LINKS 个链接失效"
    exit 1
  fi
}

# 执行
main "$@"

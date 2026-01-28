#!/bin/bash

# 全文搜索工具
# 在所有文档中搜索关键词，支持多种搜索模式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAX_RESULTS=50
CONTEXT_LINES=2

print_header() {
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_usage() {
  cat << EOF
用法: $(basename "$0") [选项] <搜索词>

选项:
  -h, --help          显示此帮助信息
  -i, --ignore-case   忽略大小写
  -w, --word          全词匹配
  -r, --regex         正则表达式搜索
  -f, --files         只显示文件名，不显示内容
  -c, --count         只显示匹配计数
  -l, --limit N       限制结果数量（默认 $MAX_RESULTS）
  -C, --context N     显示上下文行数（默认 $CONTEXT_LINES）
  -t, --type TYPE     指定文件类型（md, js, sh, all）
  -d, --dir DIR       指定搜索目录
  --no-color          禁用彩色输出

示例:
  $(basename "$0") "async"                    # 搜索 "async"
  $(basename "$0") -i "error handling"        # 忽略大小写搜索
  $(basename "$0") -w "test"                  # 全词匹配 "test"
  $(basename "$0") -r "E00[1-5]"              # 正则表达式
  $(basename "$0") -f "Promise.all"           # 只显示文件名
  $(basename "$0") -t md "验证"               # 只在 Markdown 文件中搜索
EOF
}

# 解析参数
SEARCH_TERM=""
IGNORE_CASE=""
WORD_MATCH=""
REGEX_MODE=""
FILES_ONLY=""
COUNT_ONLY=""
LIMIT=$MAX_RESULTS
CONTEXT=$CONTEXT_LINES
FILE_TYPE="all"
SEARCH_DIR="$PROJECT_ROOT"
USE_COLOR=true

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      print_usage
      exit 0
      ;;
    -i|--ignore-case)
      IGNORE_CASE="-i"
      shift
      ;;
    -w|--word)
      WORD_MATCH="-w"
      shift
      ;;
    -r|--regex)
      REGEX_MODE="-E"
      shift
      ;;
    -f|--files)
      FILES_ONLY="-l"
      shift
      ;;
    -c|--count)
      COUNT_ONLY="-c"
      shift
      ;;
    -l|--limit)
      LIMIT="$2"
      shift 2
      ;;
    -C|--context)
      CONTEXT="$2"
      shift 2
      ;;
    -t|--type)
      FILE_TYPE="$2"
      shift 2
      ;;
    -d|--dir)
      SEARCH_DIR="$2"
      shift 2
      ;;
    --no-color)
      USE_COLOR=false
      shift
      ;;
    -*)
      echo "未知选项: $1"
      print_usage
      exit 1
      ;;
    *)
      SEARCH_TERM="$1"
      shift
      ;;
  esac
done

# 检查搜索词
if [ -z "$SEARCH_TERM" ]; then
  echo -e "${RED}错误: 请提供搜索词${NC}"
  print_usage
  exit 1
fi

# 禁用颜色
if [ "$USE_COLOR" = false ]; then
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  MAGENTA=""
  CYAN=""
  NC=""
fi

# 构建文件模式
case "$FILE_TYPE" in
  md)
    FILE_PATTERN="*.md"
    ;;
  js)
    FILE_PATTERN="*.js"
    ;;
  sh)
    FILE_PATTERN="*.sh"
    ;;
  all)
    FILE_PATTERN="*"
    ;;
  *)
    echo -e "${RED}错误: 不支持的文件类型 '$FILE_TYPE'${NC}"
    exit 1
    ;;
esac

# 执行搜索
search_files() {
  print_header "搜索: $SEARCH_TERM"

  echo -e "${BLUE}搜索目录:${NC} $SEARCH_DIR"
  echo -e "${BLUE}文件类型:${NC} $FILE_TYPE"
  echo -e "${BLUE}选项:${NC}$([ -n "$IGNORE_CASE" ] && echo " 忽略大小写")$([ -n "$WORD_MATCH" ] && echo " 全词匹配")$([ -n "$REGEX_MODE" ] && echo " 正则表达式")"
  echo ""

  # 查找文件
  local files=$(find "$SEARCH_DIR" -type f -name "$FILE_PATTERN" \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/archive/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/coverage/*" \
    2>/dev/null)

  if [ -z "$files" ]; then
    echo -e "${YELLOW}未找到匹配的文件${NC}"
    exit 1
  fi

  # 构建 grep 命令
  local grep_cmd="grep"
  [ -n "$IGNORE_CASE" ] && grep_cmd="$grep_cmd $IGNORE_CASE"
  [ -n "$WORD_MATCH" ] && grep_cmd="$grep_cmd $WORD_MATCH"
  [ -n "$REGEX_MODE" ] && grep_cmd="$grep_cmd $REGEX_MODE"
  [ -n "$FILES_ONLY" ] && grep_cmd="$grep_cmd $FILES_ONLY"
  [ -n "$COUNT_ONLY" ] && grep_cmd="$grep_cmd $COUNT_ONLY"

  # 添加上下文和颜色
  if [ -z "$FILES_ONLY" ] && [ -z "$COUNT_ONLY" ]; then
    grep_cmd="$grep_cmd -n -C $CONTEXT"
    [ "$USE_COLOR" = true ] && grep_cmd="$grep_cmd --color=always"
  fi

  # 执行搜索
  local result_count=0
  local file_count=0

  while IFS= read -r file; do
    local output=$(echo "$file" | xargs $grep_cmd "$SEARCH_TERM" 2>/dev/null || true)

    if [ -n "$output" ]; then
      file_count=$((file_count + 1))

      if [ -n "$COUNT_ONLY" ]; then
        # 只显示计数
        local count=$(echo "$output" | cut -d: -f2)
        echo -e "${GREEN}$file${NC}: $count 个匹配"
        result_count=$((result_count + count))
      elif [ -n "$FILES_ONLY" ]; then
        # 只显示文件名
        echo -e "${GREEN}$file${NC}"
        result_count=$((result_count + 1))
      else
        # 显示详细结果
        echo -e "\n${GREEN}━━━━ $file ━━━━${NC}"
        echo "$output"
        result_count=$((result_count + $(echo "$output" | grep -c "^[0-9]" || true)))
      fi

      # 检查是否达到限制
      if [ $file_count -ge $LIMIT ]; then
        echo ""
        echo -e "${YELLOW}⚠ 已达到结果限制 ($LIMIT)，可能还有更多匹配${NC}"
        break
      fi
    fi
  done <<< "$files"

  # 输出总结
  echo ""
  print_header "搜索总结"

  if [ $file_count -eq 0 ]; then
    echo -e "${YELLOW}未找到匹配结果${NC}"
    exit 1
  else
    echo -e "${GREEN}匹配文件数:${NC} $file_count"
    if [ -z "$FILES_ONLY" ]; then
      echo -e "${GREEN}匹配次数:${NC} $result_count"
    fi

    # 提示
    if [ $file_count -ge $LIMIT ]; then
      echo ""
      echo -e "${BLUE}提示:${NC} 使用 -l 选项增加结果限制"
    fi

    if [ -z "$IGNORE_CASE" ]; then
      echo -e "${BLUE}提示:${NC} 使用 -i 选项忽略大小写"
    fi
  fi
}

# 快速搜索预设
quick_search() {
  local preset="$1"

  case "$preset" in
    errors)
      echo "搜索错误案例..."
      SEARCH_TERM="E00[1-9]|E01[0-5]"
      REGEX_MODE="-E"
      FILE_TYPE="md"
      ;;
    skills)
      echo "搜索 Skills..."
      SEARCH_TERM="skill"
      IGNORE_CASE="-i"
      FILE_TYPE="md"
      ;;
    mcp)
      echo "搜索 MCP..."
      SEARCH_TERM="mcp"
      IGNORE_CASE="-i"
      ;;
    *)
      echo "未知预设: $preset"
      echo "可用预设: errors, skills, mcp"
      exit 1
      ;;
  esac
}

# 交互式搜索
interactive_search() {
  print_header "交互式搜索"

  while true; do
    echo ""
    echo -e "${BLUE}搜索选项:${NC}"
    echo "  1) 普通搜索"
    echo "  2) 忽略大小写搜索"
    echo "  3) 全词匹配"
    echo "  4) 正则表达式搜索"
    echo "  5) 只显示文件名"
    echo "  6) 快速预设 (errors/skills/mcp)"
    echo "  q) 退出"
    echo ""

    read -p "选择选项 [1-6/q]: " choice

    case $choice in
      1)
        read -p "输入搜索词: " SEARCH_TERM
        search_files
        ;;
      2)
        read -p "输入搜索词: " SEARCH_TERM
        IGNORE_CASE="-i"
        search_files
        ;;
      3)
        read -p "输入搜索词: " SEARCH_TERM
        WORD_MATCH="-w"
        search_files
        ;;
      4)
        read -p "输入正则表达式: " SEARCH_TERM
        REGEX_MODE="-E"
        search_files
        ;;
      5)
        read -p "输入搜索词: " SEARCH_TERM
        FILES_ONLY="-l"
        search_files
        ;;
      6)
        read -p "选择预设 (errors/skills/mcp): " preset
        quick_search "$preset"
        search_files
        ;;
      q|Q)
        echo "退出"
        exit 0
        ;;
      *)
        echo -e "${RED}无效选项${NC}"
        ;;
    esac

    # 重置选项
    IGNORE_CASE=""
    WORD_MATCH=""
    REGEX_MODE=""
    FILES_ONLY=""
  done
}

# 主函数
main() {
  # 如果没有参数，启动交互式模式
  if [ $# -eq 0 ]; then
    interactive_search
  else
    search_files
  fi
}

# 执行
main "$@"

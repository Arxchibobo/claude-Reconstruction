#!/bin/bash

# 交互式文档导航工具
# 快速浏览和访问文档

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
HISTORY_FILE="$PROJECT_ROOT/.doc-history"
MAX_HISTORY=20

print_header() {
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 记录访问历史
record_history() {
  local file="$1"

  # 创建历史文件
  touch "$HISTORY_FILE"

  # 移除旧记录（如果存在）
  grep -v "^$file$" "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" 2>/dev/null || true
  mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"

  # 添加新记录
  echo "$file" >> "$HISTORY_FILE"

  # 保持最大历史数
  tail -n $MAX_HISTORY "$HISTORY_FILE" > "${HISTORY_FILE}.tmp"
  mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"
}

# 显示文档预览
preview_doc() {
  local file="$1"

  echo -e "\n${CYAN}━━━━ 预览 ━━━━${NC}"
  echo -e "${GREEN}文件:${NC} $(basename "$file")"
  echo -e "${GREEN}路径:${NC} $file"
  echo -e "${GREEN}大小:${NC} $(du -h "$file" | awk '{print $1}')"
  echo -e "${GREEN}修改:${NC} $(stat -c '%y' "$file" 2>/dev/null || stat -f '%Sm' "$file" 2>/dev/null || echo 'Unknown')"
  echo ""

  # 提取标题
  local title=$(grep "^# " "$file" | head -1 | sed 's/^# //')
  if [ -n "$title" ]; then
    echo -e "${BLUE}标题:${NC} $title"
  fi

  # 提取前几行
  echo -e "\n${BLUE}内容预览:${NC}"
  head -20 "$file" | sed 's/^/  /'
  echo ""
}

# 打开文档
open_doc() {
  local file="$1"

  # 记录历史
  record_history "$file"

  # 检测编辑器
  if command -v code &> /dev/null; then
    code "$file"
  elif command -v vim &> /dev/null; then
    vim "$file"
  elif command -v nano &> /dev/null; then
    nano "$file"
  elif command -v cat &> /dev/null; then
    cat "$file"
  else
    echo -e "${YELLOW}未找到编辑器，显示文件内容:${NC}"
    echo ""
    cat "$file"
  fi
}

# 按目录浏览
browse_by_directory() {
  print_header "按目录浏览"

  local dirs=(
    "core"
    "capabilities"
    "errors"
    "design"
    "rules"
    "workflows"
    "validation"
    "scripts"
  )

  echo "选择目录："
  for i in "${!dirs[@]}"; do
    local dir="${dirs[$i]}"
    local count=$(find "$PROJECT_ROOT/$dir" -type f -name "*.md" 2>/dev/null | wc -l || echo 0)
    echo "  $((i+1))) ${dir}/ ($count 个文档)"
  done
  echo "  q) 返回"
  echo ""

  read -p "选择 [1-${#dirs[@]}/q]: " choice

  if [[ "$choice" == "q" ]]; then
    return
  fi

  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#dirs[@]}" ]; then
    local selected_dir="${dirs[$((choice-1))]}"
    browse_directory "$PROJECT_ROOT/$selected_dir"
  else
    echo -e "${RED}无效选择${NC}"
  fi
}

# 浏览指定目录
browse_directory() {
  local dir="$1"

  print_header "浏览: $(basename "$dir")"

  # 列出所有文档
  local files=()
  while IFS= read -r file; do
    files+=("$file")
  done < <(find "$dir" -type f -name "*.md" ! -path "*/node_modules/*" ! -path "*/.git/*" | sort)

  if [ ${#files[@]} -eq 0 ]; then
    echo -e "${YELLOW}该目录没有文档${NC}"
    return
  fi

  # 显示文件列表
  for i in "${!files[@]}"; do
    local file="${files[$i]}"
    local name=$(basename "$file")
    local size=$(du -h "$file" | awk '{print $1}')
    echo "  $((i+1))) $name ($size)"
  done
  echo "  q) 返回"
  echo ""

  read -p "选择文档 [1-${#files[@]}/q]: " choice

  if [[ "$choice" == "q" ]]; then
    return
  fi

  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#files[@]}" ]; then
    local selected_file="${files[$((choice-1))]}"
    preview_doc "$selected_file"

    echo ""
    read -p "打开此文档? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      open_doc "$selected_file"
    fi
  else
    echo -e "${RED}无效选择${NC}"
  fi
}

# 按类别浏览
browse_by_category() {
  print_header "按类别浏览"

  echo "选择类别："
  echo "  1) 核心规则 (CLAUDE.md, DECISION_TREE.md)"
  echo "  2) 能力文档 (MCP, Skills, Plugins)"
  echo "  3) 错误案例 (E001-E015)"
  echo "  4) 设计规范 (UI/UX, Design)"
  echo "  5) 验证和测试"
  echo "  6) 工具脚本"
  echo "  q) 返回"
  echo ""

  read -p "选择 [1-6/q]: " choice

  case $choice in
    1)
      browse_directory "$PROJECT_ROOT/core"
      ;;
    2)
      browse_directory "$PROJECT_ROOT/capabilities"
      ;;
    3)
      browse_directory "$PROJECT_ROOT/errors"
      ;;
    4)
      browse_directory "$PROJECT_ROOT/design"
      ;;
    5)
      browse_directory "$PROJECT_ROOT/validation"
      ;;
    6)
      browse_directory "$PROJECT_ROOT/scripts"
      ;;
    q|Q)
      return
      ;;
    *)
      echo -e "${RED}无效选择${NC}"
      ;;
  esac
}

# 最近访问
show_recent() {
  print_header "最近访问"

  if [ ! -f "$HISTORY_FILE" ] || [ ! -s "$HISTORY_FILE" ]; then
    echo -e "${YELLOW}暂无访问历史${NC}"
    return
  fi

  # 读取历史（倒序）
  local files=()
  while IFS= read -r file; do
    files+=("$file")
  done < <(tac "$HISTORY_FILE")

  echo "最近访问的文档："
  for i in "${!files[@]}"; do
    local file="${files[$i]}"
    if [ -f "$file" ]; then
      echo "  $((i+1))) $(basename "$file")"
    fi
  done
  echo "  c) 清除历史"
  echo "  q) 返回"
  echo ""

  read -p "选择 [1-${#files[@]}/c/q]: " choice

  if [[ "$choice" == "q" ]]; then
    return
  elif [[ "$choice" == "c" ]]; then
    rm -f "$HISTORY_FILE"
    echo -e "${GREEN}历史已清除${NC}"
    return
  fi

  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#files[@]}" ]; then
    local selected_file="${files[$((choice-1))]}"
    if [ -f "$selected_file" ]; then
      preview_doc "$selected_file"
      echo ""
      read -p "打开此文档? [y/N]: " confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        open_doc "$selected_file"
      fi
    else
      echo -e "${RED}文件不存在: $selected_file${NC}"
    fi
  else
    echo -e "${RED}无效选择${NC}"
  fi
}

# 快速跳转
quick_jump() {
  print_header "快速跳转"

  echo "选择常用文档："
  echo "  1) CLAUDE.md - 核心规则"
  echo "  2) DECISION_TREE.md - 能力决策树"
  echo "  3) ERROR_CATALOG.md - 错误案例库"
  echo "  4) OPTIMIZATION_PLAN.md - 优化计划"
  echo "  5) CHANGELOG.md - 更新日志"
  echo "  6) CONTRIBUTING.md - 贡献指南"
  echo "  q) 返回"
  echo ""

  read -p "选择 [1-6/q]: " choice

  local file=""
  case $choice in
    1) file="$PROJECT_ROOT/core/CLAUDE.md" ;;
    2) file="$PROJECT_ROOT/core/DECISION_TREE.md" ;;
    3) file="$PROJECT_ROOT/errors/ERROR_CATALOG.md" ;;
    4) file="$PROJECT_ROOT/OPTIMIZATION_PLAN.md" ;;
    5) file="$PROJECT_ROOT/CHANGELOG.md" ;;
    6) file="$PROJECT_ROOT/CONTRIBUTING.md" ;;
    q|Q) return ;;
    *)
      echo -e "${RED}无效选择${NC}"
      return
      ;;
  esac

  if [ -f "$file" ]; then
    preview_doc "$file"
    echo ""
    read -p "打开此文档? [y/N]: " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      open_doc "$file"
    fi
  else
    echo -e "${RED}文件不存在: $file${NC}"
  fi
}

# 搜索文档
search_docs() {
  print_header "搜索文档"

  read -p "输入搜索词: " keyword

  if [ -z "$keyword" ]; then
    echo -e "${RED}搜索词不能为空${NC}"
    return
  fi

  # 调用 search.sh
  if [ -f "$PROJECT_ROOT/scripts/search.sh" ]; then
    bash "$PROJECT_ROOT/scripts/search.sh" -f -l 20 "$keyword"
  else
    # 简单搜索
    echo -e "\n${BLUE}搜索结果:${NC}"
    grep -ril "$keyword" "$PROJECT_ROOT" \
      --include="*.md" \
      --exclude-dir=node_modules \
      --exclude-dir=.git \
      --exclude-dir=archive \
      | head -20
  fi
}

# 主菜单
main_menu() {
  while true; do
    clear
    print_header "Claude Code 文档导航"

    echo ""
    echo "选择导航方式："
    echo "  1) 按目录浏览"
    echo "  2) 按类别浏览"
    echo "  3) 最近访问"
    echo "  4) 快速跳转"
    echo "  5) 搜索文档"
    echo "  q) 退出"
    echo ""

    read -p "选择 [1-5/q]: " choice

    case $choice in
      1)
        browse_by_directory
        ;;
      2)
        browse_by_category
        ;;
      3)
        show_recent
        ;;
      4)
        quick_jump
        ;;
      5)
        search_docs
        ;;
      q|Q)
        echo "再见！"
        exit 0
        ;;
      *)
        echo -e "${RED}无效选择${NC}"
        ;;
    esac

    echo ""
    read -p "按 Enter 继续..."
  done
}

# 执行
main_menu

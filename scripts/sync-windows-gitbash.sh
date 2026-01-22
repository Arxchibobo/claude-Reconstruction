#!/bin/bash
# Windows Git Bash 专用同步脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Windows 路径
PROJECT_ROOT="E:/Bobo's Coding cache/bo-work/claude-reconstruction"
TARGET_DIR="C:/Users/Administrator/.claude"

# Dry-run 模式
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 Dry-run 模式：仅显示将要执行的操作${NC}\n"
fi

# 打印函数
print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 检查目标目录
if [ ! -d "$TARGET_DIR" ]; then
    print_error "目标目录 $TARGET_DIR 不存在"
    exit 1
fi

print_info "源目录: $PROJECT_ROOT"
print_info "目标目录: $TARGET_DIR"
echo ""

# 复制目录
copy_directory() {
    local src=$1
    local dest=$2
    local label=$3

    if [ ! -d "$src" ]; then
        print_warning "跳过 $label: 源目录不存在"
        return
    fi

    print_info "同步 $label..."

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] cp -r \"$src\"/* \"$dest/\""
    else
        mkdir -p "$dest"
        cp -r "$src"/* "$dest/"
        print_success "$label 已同步"
    fi
}

# 复制文件
copy_file() {
    local src=$1
    local dest=$2
    local label=$3

    if [ ! -f "$src" ]; then
        print_warning "跳过 $label: 源文件不存在"
        return
    fi

    print_info "复制 $label..."

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] cp \"$src\" \"$dest\""
    else
        cp "$src" "$dest"
        print_success "$label 已复制"
    fi
}

# 开始同步
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  开始同步 Claude Reconstruction${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. 核心配置文件
print_info "📋 同步核心配置文件..."
copy_file "$PROJECT_ROOT/core/CLAUDE.md" "$TARGET_DIR/CLAUDE.md" "CLAUDE.md"
copy_file "$PROJECT_ROOT/core/DECISION_TREE.md" "$TARGET_DIR/DECISION_TREE.md" "DECISION_TREE.md"
copy_file "$PROJECT_ROOT/core/QUICK_START.md" "$TARGET_DIR/QUICK_START.md" "QUICK_START.md"
echo ""

# 2. 错误知识库
print_info "🔴 同步错误知识库..."
copy_directory "$PROJECT_ROOT/errors" "$TARGET_DIR/errors" "错误目录"
echo ""

# 3. 能力文档
print_info "🔧 同步能力文档..."
copy_directory "$PROJECT_ROOT/capabilities" "$TARGET_DIR/capabilities" "能力文档"
echo ""

# 4. 设计资源
print_info "🎨 同步设计资源..."
copy_directory "$PROJECT_ROOT/design" "$TARGET_DIR/design" "设计资源"
echo ""

# 5. Vibe Marketing
print_info "📢 同步 Vibe Marketing..."
copy_directory "$PROJECT_ROOT/vibe-marketing" "$TARGET_DIR/vibe-marketing" "Vibe Marketing"
echo ""

# 6. 工作流
print_info "🔄 同步工作流..."
copy_directory "$PROJECT_ROOT/workflows" "$TARGET_DIR/workflows" "工作流"
echo ""

# 7. 学习资源
print_info "📚 同步学习资源..."
copy_directory "$PROJECT_ROOT/learning" "$TARGET_DIR/learning" "学习资源"
echo ""

# 8. 参考资料
print_info "📖 同步参考资料..."
copy_directory "$PROJECT_ROOT/references" "$TARGET_DIR/references" "参考资料"
echo ""

# 9. 自动化配置
print_info "⚙️ 同步自动化配置..."
copy_directory "$PROJECT_ROOT/automation" "$TARGET_DIR/automation" "自动化配置"
echo ""

# 10. 委托系统
print_info "🤝 同步委托系统..."
copy_directory "$PROJECT_ROOT/delegator" "$TARGET_DIR/delegator" "委托系统"
echo ""

# 完成
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}  Dry-run 完成！使用不带 --dry-run 参数执行实际同步${NC}"
else
    echo -e "${GREEN}  同步完成！✨${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_info "目标目录: $TARGET_DIR"
print_info "重启 Claude Code 以使更改生效"
echo ""

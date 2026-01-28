#!/bin/bash

# Claude Code 工程化框架 - 回滚脚本
# Version: 4.2.0

set -e  # 遇到错误时退出

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
CLAUDE_CONFIG_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_CONFIG_DIR/backups"

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 打印标题
print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}$1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# 列出可用的备份
list_backups() {
    print_header "可用的备份"

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR")" ]; then
        print_warning "未找到任何备份"
        return 1
    fi

    echo "备份时间戳                  | 备份路径"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    ls -1t "$BACKUP_DIR" | while read backup; do
        local timestamp=$(echo "$backup" | sed 's/backup-//')
        local path="$BACKUP_DIR/$backup"
        local file_count=$(find "$path" -type f | wc -l)
        printf "%-28s | %s (%d 文件)\n" "$timestamp" "$path" "$file_count"
    done

    echo ""
    return 0
}

# 选择备份
select_backup() {
    local backup_timestamp="$1"

    if [ -z "$backup_timestamp" ]; then
        # 交互模式
        list_backups || {
            print_error "无可用备份"
            exit 1
        }

        read -p "请输入要回滚的备份时间戳（或 'q' 退出）: " backup_timestamp

        if [ "$backup_timestamp" = "q" ]; then
            print_info "取消回滚"
            exit 0
        fi
    fi

    local backup_path="$BACKUP_DIR/backup-$backup_timestamp"

    if [ ! -d "$backup_path" ]; then
        print_error "备份不存在: $backup_path"
        exit 1
    fi

    echo "$backup_path"
}

# 验证备份完整性
verify_backup() {
    local backup_path="$1"

    print_header "验证备份完整性"

    # 检查核心文件
    local critical_files=(
        "CLAUDE.md"
    )

    local missing_files=0
    for file in "${critical_files[@]}"; do
        if [ -f "$backup_path/$file" ]; then
            print_success "$file 存在"
        else
            print_warning "$file 缺失（非关键）"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -eq ${#critical_files[@]} ]; then
        print_error "备份不完整，无法回滚"
        return 1
    fi

    print_success "备份验证通过"
    return 0
}

# 创建回滚前备份
backup_before_rollback() {
    print_header "回滚前备份"

    local pre_rollback_backup="$BACKUP_DIR/pre-rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$pre_rollback_backup"

    # 备份当前核心文件
    local files_to_backup=(
        "CLAUDE.md"
        "DECISION_TREE.md"
        "QUICK_START.md"
        "VERSION"
    )

    for file in "${files_to_backup[@]}"; do
        if [ -f "$CLAUDE_CONFIG_DIR/$file" ]; then
            cp "$CLAUDE_CONFIG_DIR/$file" "$pre_rollback_backup/"
        fi
    done

    # 备份目录
    local dirs_to_backup=(
        "capabilities"
        "design"
        "errors"
        "rules"
        "vibe-marketing"
    )

    for dir in "${dirs_to_backup[@]}"; do
        if [ -d "$CLAUDE_CONFIG_DIR/$dir" ]; then
            cp -r "$CLAUDE_CONFIG_DIR/$dir" "$pre_rollback_backup/"
        fi
    done

    print_success "当前配置已备份到: $pre_rollback_backup"
}

# 执行回滚
perform_rollback() {
    local backup_path="$1"

    print_header "执行回滚"

    # 复制核心文件
    local files=(
        "CLAUDE.md"
        "DECISION_TREE.md"
        "QUICK_START.md"
        "VERSION"
    )

    for file in "${files[@]}"; do
        if [ -f "$backup_path/$file" ]; then
            cp "$backup_path/$file" "$CLAUDE_CONFIG_DIR/"
            print_success "恢复: $file"
        fi
    done

    # 复制目录
    local dirs=(
        "capabilities"
        "design"
        "errors"
        "rules"
        "vibe-marketing"
    )

    for dir in "${dirs[@]}"; do
        if [ -d "$backup_path/$dir" ]; then
            rm -rf "$CLAUDE_CONFIG_DIR/$dir"
            cp -r "$backup_path/$dir" "$CLAUDE_CONFIG_DIR/"
            print_success "恢复: $dir/"
        fi
    done

    print_success "回滚完成"
}

# 验证回滚结果
verify_rollback() {
    print_header "验证回滚结果"

    local core_files=(
        "$CLAUDE_CONFIG_DIR/CLAUDE.md"
        "$CLAUDE_CONFIG_DIR/DECISION_TREE.md"
    )

    local missing_files=0
    for file in "${core_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$(basename "$file") 已恢复"
        else
            print_error "缺少文件: $(basename "$file")"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -eq 0 ]; then
        print_success "所有核心文件恢复成功"
        return 0
    else
        print_error "回滚不完整"
        return 1
    fi
}

# 显示回滚后步骤
show_post_rollback_steps() {
    print_header "回滚完成"

    local rollback_version="未知"
    if [ -f "$CLAUDE_CONFIG_DIR/VERSION" ]; then
        rollback_version=$(cat "$CLAUDE_CONFIG_DIR/VERSION")
    fi

    cat << EOF
$(print_success "已回滚到版本: $rollback_version")

⚠️  重要提醒：

1. 重启 Claude Code
   让回滚的配置生效

2. 验证功能
   确保回滚后一切正常

3. 如仍有问题
   可继续回滚到更早的备份

4. 查看所有备份
   bash $(dirname "$0")/rollback.sh --list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# 主函数
main() {
    clear

    cat << "EOF"
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   Claude Code 工程化框架 - 回滚工具              ║
║   Claude Code Engineering Framework - Rollback   ║
║                                                   ║
║   Version: 4.2.0                                  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

EOF

    # 处理命令行参数
    if [ "$1" = "--list" ]; then
        list_backups
        exit 0
    fi

    print_warning "⚠️  回滚操作将覆盖当前配置"
    echo ""

    # 选择备份
    local backup_path=$(select_backup "$1")

    print_info "选择的备份: $backup_path"
    echo ""

    # 验证备份
    verify_backup "$backup_path" || exit 1

    # 确认回滚
    read -p "确认回滚？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "取消回滚"
        exit 0
    fi

    # 执行回滚
    backup_before_rollback
    perform_rollback "$backup_path"

    if verify_rollback; then
        show_post_rollback_steps
        exit 0
    else
        print_error "回滚验证失败，请检查配置"
        exit 1
    fi
}

# 运行主函数
main "$@"

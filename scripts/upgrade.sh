#!/bin/bash

# Claude Code 工程化框架 - 升级脚本
# Version: 4.2.0

set -e  # 遇到错误时退出

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
REPO_URL="https://github.com/Arxchibobo/claude-Reconstruction.git"
INSTALL_DIR="$HOME/.claude-reconstruction"
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

# 获取当前版本
get_current_version() {
    if [ -f "$CLAUDE_CONFIG_DIR/VERSION" ]; then
        cat "$CLAUDE_CONFIG_DIR/VERSION"
    else
        echo "未知"
    fi
}

# 获取最新版本
get_latest_version() {
    if [ -f "$INSTALL_DIR/VERSION" ]; then
        cat "$INSTALL_DIR/VERSION"
    else
        echo "未知"
    fi
}

# 比较版本号
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# 检查是否需要升级
check_upgrade_needed() {
    local current_version="$1"
    local latest_version="$2"

    print_header "版本检查"

    print_info "当前版本: $current_version"
    print_info "最新版本: $latest_version"

    if [ "$current_version" = "未知" ]; then
        print_warning "无法检测当前版本，建议重新安装"
        return 0
    fi

    if [ "$current_version" = "$latest_version" ]; then
        print_success "已是最新版本，无需升级"
        return 1
    fi

    if version_gt "$latest_version" "$current_version"; then
        print_info "检测到新版本可用"
        return 0
    else
        print_success "当前版本已是最新"
        return 1
    fi
}

# 备份当前配置
backup_current_config() {
    print_header "备份当前配置"

    # 创建备份目录
    mkdir -p "$BACKUP_DIR"

    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="$BACKUP_DIR/backup-$backup_timestamp"

    mkdir -p "$backup_path"

    # 备份核心文件
    local files_to_backup=(
        "CLAUDE.md"
        "DECISION_TREE.md"
        "QUICK_START.md"
        "VERSION"
    )

    local backup_count=0
    for file in "${files_to_backup[@]}"; do
        if [ -f "$CLAUDE_CONFIG_DIR/$file" ]; then
            cp "$CLAUDE_CONFIG_DIR/$file" "$backup_path/"
            backup_count=$((backup_count + 1))
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
            cp -r "$CLAUDE_CONFIG_DIR/$dir" "$backup_path/"
            backup_count=$((backup_count + 1))
        fi
    done

    if [ $backup_count -gt 0 ]; then
        print_success "配置已备份到: $backup_path"
        print_info "如需回滚，运行: bash $(dirname "$0")/rollback.sh $backup_timestamp"
    else
        print_warning "未找到需要备份的文件"
    fi

    # 清理旧备份（保留最近5个）
    local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
    if [ $backup_count -gt 5 ]; then
        print_info "清理旧备份..."
        ls -1t "$BACKUP_DIR" | tail -n +6 | while read old_backup; do
            rm -rf "$BACKUP_DIR/$old_backup"
            print_info "删除旧备份: $old_backup"
        done
    fi
}

# 更新仓库
update_repository() {
    print_header "更新代码仓库"

    if [ ! -d "$INSTALL_DIR" ]; then
        print_error "未找到安装目录，请先运行 install.sh"
        exit 1
    fi

    cd "$INSTALL_DIR"

    # 保存本地修改
    if ! git diff-index --quiet HEAD --; then
        print_warning "检测到本地修改，正在暂存..."
        git stash push -m "Auto-stash before upgrade $(date +%Y%m%d-%H%M%S)"
    fi

    # 拉取最新代码
    print_info "正在拉取最新代码..."
    git fetch origin
    git reset --hard origin/main

    print_success "代码仓库已更新"
}

# 应用更新
apply_updates() {
    print_header "应用更新"

    # 复制核心文件
    print_info "更新核心规则文件..."
    cp "$INSTALL_DIR/core/CLAUDE.md" "$CLAUDE_CONFIG_DIR/"
    cp "$INSTALL_DIR/core/DECISION_TREE.md" "$CLAUDE_CONFIG_DIR/"
    cp "$INSTALL_DIR/core/QUICK_START.md" "$CLAUDE_CONFIG_DIR/"
    print_success "核心规则文件已更新"

    # 更新能力文档
    print_info "更新能力文档..."
    rm -rf "$CLAUDE_CONFIG_DIR/capabilities"
    cp -r "$INSTALL_DIR/capabilities" "$CLAUDE_CONFIG_DIR/"
    print_success "能力文档已更新"

    # 更新设计文档
    print_info "更新设计文档..."
    rm -rf "$CLAUDE_CONFIG_DIR/design"
    cp -r "$INSTALL_DIR/design" "$CLAUDE_CONFIG_DIR/"
    print_success "设计文档已更新"

    # 更新错误案例
    print_info "更新错误案例..."
    rm -rf "$CLAUDE_CONFIG_DIR/errors"
    cp -r "$INSTALL_DIR/errors" "$CLAUDE_CONFIG_DIR/"
    print_success "错误案例已更新"

    # 更新规则文档
    print_info "更新规则文档..."
    rm -rf "$CLAUDE_CONFIG_DIR/rules"
    cp -r "$INSTALL_DIR/rules" "$CLAUDE_CONFIG_DIR/"
    print_success "规则文档已更新"

    # 更新营销文档
    print_info "更新营销文档..."
    rm -rf "$CLAUDE_CONFIG_DIR/vibe-marketing"
    cp -r "$INSTALL_DIR/vibe-marketing" "$CLAUDE_CONFIG_DIR/"
    print_success "营销文档已更新"

    # 更新版本文件
    if [ -f "$INSTALL_DIR/VERSION" ]; then
        cp "$INSTALL_DIR/VERSION" "$CLAUDE_CONFIG_DIR/"
        print_success "版本文件已更新"
    fi
}

# 运行升级后测试
run_post_upgrade_tests() {
    print_header "运行升级后验证"

    # 检查核心文件
    local missing_files=0
    local core_files=(
        "$CLAUDE_CONFIG_DIR/CLAUDE.md"
        "$CLAUDE_CONFIG_DIR/DECISION_TREE.md"
        "$CLAUDE_CONFIG_DIR/VERSION"
    )

    for file in "${core_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "$(basename "$file") 存在"
        else
            print_error "缺少文件: $(basename "$file")"
            missing_files=$((missing_files + 1))
        fi
    done

    if [ $missing_files -eq 0 ]; then
        print_success "所有核心文件验证通过"
        return 0
    else
        print_error "验证失败，缺少 $missing_files 个文件"
        return 1
    fi
}

# 显示变更日志
show_changelog() {
    print_header "更新内容"

    if [ -f "$INSTALL_DIR/CHANGELOG.md" ]; then
        # 只显示最新版本的变更
        local latest_version=$(get_latest_version)
        print_info "版本 $latest_version 的变更："
        echo ""

        # 提取最新版本的变更内容（简化版本）
        sed -n "/## \[$latest_version\]/,/## \[/p" "$INSTALL_DIR/CHANGELOG.md" | head -n -1

        echo ""
        print_info "完整变更日志: $INSTALL_DIR/CHANGELOG.md"
    else
        print_warning "未找到变更日志"
    fi
}

# 显示升级后步骤
show_post_upgrade_steps() {
    print_header "升级完成"

    local new_version=$(get_latest_version)

    cat << EOF
$(print_success "Claude Code 工程化框架已成功升级到 v$new_version")

📚 建议的下一步：

1. 查看变更内容
   cat $INSTALL_DIR/CHANGELOG.md

2. 重新启动 Claude Code
   让新配置生效

3. 运行验证测试（可选）
   bash $INSTALL_DIR/validation/scripts/run-all-validations.sh

4. 查看备份（如需回滚）
   ls -la $BACKUP_DIR

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 升级成功！享受新特性！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
}

# 主函数
main() {
    clear

    cat << "EOF"
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   Claude Code 工程化框架 - 升级程序              ║
║   Claude Code Engineering Framework - Upgrader   ║
║                                                   ║
║   Version: 4.2.0                                  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

EOF

    print_info "开始升级..."
    echo ""

    # 获取版本信息
    update_repository
    local current_version=$(get_current_version)
    local latest_version=$(get_latest_version)

    # 检查是否需要升级
    if ! check_upgrade_needed "$current_version" "$latest_version"; then
        echo ""
        print_info "如需强制升级，运行: bash $0 --force"
        exit 0
    fi

    # 执行升级
    backup_current_config
    apply_updates

    if run_post_upgrade_tests; then
        show_changelog
        show_post_upgrade_steps
        exit 0
    else
        print_error "升级验证失败"
        print_warning "配置已备份，可运行 rollback.sh 回滚"
        exit 1
    fi
}

# 处理命令行参数
if [ "$1" = "--force" ]; then
    print_warning "强制升级模式"
fi

# 运行主函数
main "$@"

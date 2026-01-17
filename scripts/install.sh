#!/bin/bash
# Claude Reconstruction 安装脚本 (Unix/Linux/macOS)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Claude Reconstruction 安装程序                        ║"
echo "║         Claude Code 工程化配置系统                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    MSYS*)      MACHINE=MSYS;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${YELLOW}检测到操作系统: ${MACHINE}${NC}"

# Claude 配置目录
CLAUDE_DIR="$HOME/.claude"
CLAUDE_RULES_DIR="$CLAUDE_DIR/rules"
CLAUDE_COMMANDS_DIR="$CLAUDE_DIR/commands"

# 当前脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo -e "${YELLOW}安装源目录: ${PROJECT_DIR}${NC}"
echo -e "${YELLOW}目标目录: ${CLAUDE_DIR}${NC}"
echo ""

# 创建必要的目录
echo -e "${GREEN}[1/5] 创建目录结构...${NC}"
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_RULES_DIR"
mkdir -p "$CLAUDE_COMMANDS_DIR"
mkdir -p "$CLAUDE_DIR/logs"

# 备份现有配置
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    echo -e "${YELLOW}[备份] 备份现有 CLAUDE.md...${NC}"
    cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 复制核心配置
echo -e "${GREEN}[2/5] 安装核心配置...${NC}"
cp "$PROJECT_DIR/core/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
cp "$PROJECT_DIR/core/QUICK_START.md" "$CLAUDE_DIR/QUICK_START.md"
cp "$PROJECT_DIR/core/DECISION_TREE.md" "$CLAUDE_DIR/DECISION_TREE.md"

# 复制错误知识库
echo -e "${GREEN}[3/5] 安装错误知识库...${NC}"
mkdir -p "$CLAUDE_DIR/errors/system-errors"
mkdir -p "$CLAUDE_DIR/errors/project-errors"
mkdir -p "$CLAUDE_DIR/errors/templates"
cp -r "$PROJECT_DIR/errors/"* "$CLAUDE_DIR/errors/"

# 复制能力文档
echo -e "${GREEN}[4/5] 安装能力文档...${NC}"
mkdir -p "$CLAUDE_DIR/capabilities"
cp -r "$PROJECT_DIR/capabilities/"* "$CLAUDE_DIR/capabilities/"

# 复制其他资源
echo -e "${GREEN}[5/5] 安装其他资源...${NC}"
mkdir -p "$CLAUDE_DIR/workflows"
mkdir -p "$CLAUDE_DIR/learning"
mkdir -p "$CLAUDE_DIR/references"
mkdir -p "$CLAUDE_DIR/automation"
mkdir -p "$CLAUDE_DIR/delegator"

[ -d "$PROJECT_DIR/workflows" ] && cp -r "$PROJECT_DIR/workflows/"* "$CLAUDE_DIR/workflows/"
[ -d "$PROJECT_DIR/learning" ] && cp -r "$PROJECT_DIR/learning/"* "$CLAUDE_DIR/learning/"
[ -d "$PROJECT_DIR/references" ] && cp -r "$PROJECT_DIR/references/"* "$CLAUDE_DIR/references/"
[ -d "$PROJECT_DIR/automation" ] && cp -r "$PROJECT_DIR/automation/"* "$CLAUDE_DIR/automation/"
[ -d "$PROJECT_DIR/delegator" ] && cp -r "$PROJECT_DIR/delegator/"* "$CLAUDE_DIR/delegator/"

# 设置文件权限
echo -e "${YELLOW}设置文件权限...${NC}"
chmod -R 644 "$CLAUDE_DIR"/*.md 2>/dev/null || true
chmod -R 755 "$CLAUDE_DIR"/scripts/*.sh 2>/dev/null || true

# 验证安装
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}安装完成！${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}已安装的文件:${NC}"
echo "  - $CLAUDE_DIR/CLAUDE.md (主配置)"
echo "  - $CLAUDE_DIR/QUICK_START.md (快速启动)"
echo "  - $CLAUDE_DIR/DECISION_TREE.md (决策树)"
echo "  - $CLAUDE_DIR/errors/ (错误知识库)"
echo "  - $CLAUDE_DIR/capabilities/ (能力文档)"
echo "  - $CLAUDE_DIR/workflows/ (工作流程)"
echo "  - $CLAUDE_DIR/learning/ (学习资源)"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 启动 Claude Code"
echo "  2. 系统会自动加载配置"
echo "  3. 开始使用工程化工作流"
echo ""
echo -e "${GREEN}享受更高效的 Claude Code 体验！${NC}"

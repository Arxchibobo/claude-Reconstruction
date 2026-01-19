#!/bin/bash
# Claude Reconstruction 安装验证脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CLAUDE_DIR="$HOME/.claude"
ERRORS=0

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Claude Reconstruction 安装验证                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 验证函数
verify_file() {
    local file_path="$1"
    local description="$2"

    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description (文件不存在: $file_path)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

verify_dir() {
    local dir_path="$1"
    local description="$2"

    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description (目录不存在: $dir_path)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

verify_content() {
    local file_path="$1"
    local pattern="$2"
    local description="$3"

    if [ ! -f "$file_path" ]; then
        echo -e "${RED}✗${NC} $description (文件不存在)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    if grep -q "$pattern" "$file_path"; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description (未找到预期内容)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo -e "${YELLOW}[1/5] 验证核心配置文件...${NC}"
verify_file "$CLAUDE_DIR/CLAUDE.md" "CLAUDE.md 主配置文件"
verify_file "$CLAUDE_DIR/QUICK_START.md" "QUICK_START.md 快速启动文件"
verify_file "$CLAUDE_DIR/DECISION_TREE.md" "DECISION_TREE.md 决策树文件"
verify_content "$CLAUDE_DIR/CLAUDE.md" "Version.*4.0" "CLAUDE.md 包含版本号 4.0"
echo ""

echo -e "${YELLOW}[2/5] 验证错误知识库...${NC}"
verify_dir "$CLAUDE_DIR/errors" "errors/ 错误知识库目录"
verify_file "$CLAUDE_DIR/errors/ERROR_CATALOG.md" "ERROR_CATALOG.md 错误目录"
verify_dir "$CLAUDE_DIR/errors/system-errors" "system-errors/ 系统错误目录"

# 验证至少 5 个系统错误文件存在
SYSTEM_ERRORS=(
    "async-parallel.md"
    "timeout-polling.md"
    "error-handling.md"
    "sql-optimization.md"
    "state-management.md"
)

for error_file in "${SYSTEM_ERRORS[@]}"; do
    verify_file "$CLAUDE_DIR/errors/system-errors/$error_file" "系统错误: $error_file"
done
echo ""

echo -e "${YELLOW}[3/5] 验证能力文档...${NC}"
verify_dir "$CLAUDE_DIR/capabilities" "capabilities/ 能力文档目录"
verify_file "$CLAUDE_DIR/capabilities/mcp-servers.md" "MCP Servers 文档"
verify_file "$CLAUDE_DIR/capabilities/skills-guide.md" "Skills 指南"
verify_file "$CLAUDE_DIR/capabilities/plugins-auto.md" "Plugins 自动激活文档"
echo ""

echo -e "${YELLOW}[4/5] 验证工作流和其他资源...${NC}"
verify_dir "$CLAUDE_DIR/workflows" "workflows/ 工作流目录"
verify_file "$CLAUDE_DIR/workflows/auto-execution.md" "自动执行工作流"
verify_dir "$CLAUDE_DIR/learning" "learning/ 学习资源目录"
verify_dir "$CLAUDE_DIR/references" "references/ 参考资料目录"
echo ""

echo -e "${YELLOW}[5/5] 验证文件权限...${NC}"
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    if [ -r "$CLAUDE_DIR/CLAUDE.md" ]; then
        echo -e "${GREEN}✓${NC} CLAUDE.md 可读权限"
    else
        echo -e "${RED}✗${NC} CLAUDE.md 权限不正确"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# 输出结果
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ 验证通过！所有文件和目录都已正确安装。${NC}"
    echo ""
    echo -e "${YELLOW}配置已加载到:${NC} $CLAUDE_DIR"
    echo -e "${YELLOW}核心文件:${NC}"
    echo "  - CLAUDE.md (主配置 v4.0)"
    echo "  - QUICK_START.md (会话启动清单)"
    echo "  - DECISION_TREE.md (50+ 场景决策树)"
    echo ""
    echo -e "${GREEN}可以开始使用 Claude Code 了！${NC}"
    exit 0
else
    echo -e "${RED}✗ 验证失败！发现 $ERRORS 个错误。${NC}"
    echo ""
    echo -e "${YELLOW}建议:${NC}"
    echo "  1. 重新运行安装脚本: ./scripts/install.sh"
    echo "  2. 检查文件权限"
    echo "  3. 确保有足够的磁盘空间"
    exit 1
fi

# Claude Reconstruction 安装脚本 (Windows PowerShell)
# 使用方法: .\install.ps1

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Claude Reconstruction 安装程序                        ║" -ForegroundColor Green
Write-Host "║         Claude Code 工程化配置系统                            ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Claude 配置目录
$ClaudeDir = "$env:USERPROFILE\.claude"
$ClaudeRulesDir = "$ClaudeDir\rules"
$ClaudeCommandsDir = "$ClaudeDir\commands"

# 当前脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "安装源目录: $ProjectDir" -ForegroundColor Yellow
Write-Host "目标目录: $ClaudeDir" -ForegroundColor Yellow
Write-Host ""

# 创建必要的目录
Write-Host "[1/5] 创建目录结构..." -ForegroundColor Green
$directories = @(
    $ClaudeDir,
    $ClaudeRulesDir,
    $ClaudeCommandsDir,
    "$ClaudeDir\logs",
    "$ClaudeDir\errors\system-errors",
    "$ClaudeDir\errors\project-errors",
    "$ClaudeDir\errors\templates",
    "$ClaudeDir\capabilities",
    "$ClaudeDir\workflows",
    "$ClaudeDir\learning",
    "$ClaudeDir\references",
    "$ClaudeDir\automation",
    "$ClaudeDir\delegator"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 备份现有配置
if (Test-Path "$ClaudeDir\CLAUDE.md") {
    $backupName = "CLAUDE.md.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "[备份] 备份现有 CLAUDE.md..." -ForegroundColor Yellow
    Copy-Item "$ClaudeDir\CLAUDE.md" "$ClaudeDir\$backupName"
}

# 复制核心配置
Write-Host "[2/5] 安装核心配置..." -ForegroundColor Green
Copy-Item "$ProjectDir\core\CLAUDE.md" "$ClaudeDir\CLAUDE.md" -Force
Copy-Item "$ProjectDir\core\QUICK_START.md" "$ClaudeDir\QUICK_START.md" -Force
Copy-Item "$ProjectDir\core\DECISION_TREE.md" "$ClaudeDir\DECISION_TREE.md" -Force

# 复制错误知识库
Write-Host "[3/5] 安装错误知识库..." -ForegroundColor Green
if (Test-Path "$ProjectDir\errors") {
    Copy-Item "$ProjectDir\errors\*" "$ClaudeDir\errors\" -Recurse -Force
}

# 复制能力文档
Write-Host "[4/5] 安装能力文档..." -ForegroundColor Green
if (Test-Path "$ProjectDir\capabilities") {
    Copy-Item "$ProjectDir\capabilities\*" "$ClaudeDir\capabilities\" -Recurse -Force
}

# 复制其他资源
Write-Host "[5/5] 安装其他资源..." -ForegroundColor Green
$resourceDirs = @("workflows", "learning", "references", "automation", "delegator")
foreach ($dir in $resourceDirs) {
    if (Test-Path "$ProjectDir\$dir") {
        Copy-Item "$ProjectDir\$dir\*" "$ClaudeDir\$dir\" -Recurse -Force
    }
}

# 验证安装
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "安装完成！" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "已安装的文件:" -ForegroundColor Yellow
Write-Host "  - $ClaudeDir\CLAUDE.md (主配置)"
Write-Host "  - $ClaudeDir\QUICK_START.md (快速启动)"
Write-Host "  - $ClaudeDir\DECISION_TREE.md (决策树)"
Write-Host "  - $ClaudeDir\errors\ (错误知识库)"
Write-Host "  - $ClaudeDir\capabilities\ (能力文档)"
Write-Host "  - $ClaudeDir\workflows\ (工作流程)"
Write-Host "  - $ClaudeDir\learning\ (学习资源)"
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 启动 Claude Code"
Write-Host "  2. 系统会自动加载配置"
Write-Host "  3. 开始使用工程化工作流"
Write-Host ""
Write-Host "享受更高效的 Claude Code 体验！" -ForegroundColor Green

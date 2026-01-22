# sync-to-home.ps1
# 将 claude-reconstruction 目录同步到 ~/.claude/
#
# 用法:
#   .\scripts\sync-to-home.ps1 [-DryRun]
#
# 参数:
#   -DryRun    显示将要执行的操作，但不实际执行

param(
    [switch]$DryRun
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 获取脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TargetDir = Join-Path $env:USERPROFILE ".claude"

# 颜色函数
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ  " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠  " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
}

# 检查 dry-run 模式
if ($DryRun) {
    Write-Host ""
    Write-Warning "🔍 Dry-run 模式：仅显示将要执行的操作"
    Write-Host ""
}

# 检查目标目录
if (-not (Test-Path $TargetDir)) {
    Write-Error "目标目录 $TargetDir 不存在"
    Write-Info "请确认 Claude Code 已安装并初始化"
    exit 1
}

Write-Info "源目录: $ProjectRoot"
Write-Info "目标目录: $TargetDir"

# 备份函数
function Backup-IfExists {
    param([string]$Path)

    if ((Test-Path $Path) -and -not $DryRun) {
        $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $Backup = "$Path.backup.$Timestamp"
        Write-Warning "备份现有文件: $Path -> $Backup"
        Move-Item -Path $Path -Destination $Backup -Force
    }
}

# 复制目录函数
function Copy-Directory {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "跳过 $Label`: 源目录不存在"
        return
    }

    Write-Info "同步 $Label..."

    if ($DryRun) {
        Write-Host "  [DRY-RUN] Copy-Item -Path $Source\* -Destination $Destination\ -Recurse -Force"
    } else {
        # 确保目标目录存在
        if (-not (Test-Path $Destination)) {
            New-Item -ItemType Directory -Path $Destination -Force | Out-Null
        }

        # 复制内容
        Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force
        Write-Success "$Label 已同步"
    }
}

# 复制文件函数
function Copy-File {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (-not (Test-Path $Source)) {
        Write-Warning "跳过 $Label`: 源文件不存在"
        return
    }

    Write-Info "复制 $Label..."

    if ($DryRun) {
        Write-Host "  [DRY-RUN] Copy-Item -Path $Source -Destination $Destination -Force"
    } else {
        Copy-Item -Path $Source -Destination $Destination -Force
        Write-Success "$Label 已复制"
    }
}

# 开始同步
Write-Header "开始同步 Claude Reconstruction"

# 1. 核心配置文件
Write-Info "📋 同步核心配置文件..."
Copy-File -Source "$ProjectRoot\core\CLAUDE.md" -Destination "$TargetDir\CLAUDE.md" -Label "CLAUDE.md"
Copy-File -Source "$ProjectRoot\core\DECISION_TREE.md" -Destination "$TargetDir\DECISION_TREE.md" -Label "DECISION_TREE.md"
Copy-File -Source "$ProjectRoot\core\QUICK_START.md" -Destination "$TargetDir\QUICK_START.md" -Label "QUICK_START.md"
Write-Host ""

# 2. 错误知识库
Write-Info "🔴 同步错误知识库..."
Copy-Directory -Source "$ProjectRoot\errors" -Destination "$TargetDir\errors" -Label "错误目录"
Write-Host ""

# 3. 能力文档
Write-Info "🔧 同步能力文档..."
Copy-Directory -Source "$ProjectRoot\capabilities" -Destination "$TargetDir\capabilities" -Label "能力文档"
Write-Host ""

# 4. 设计资源
Write-Info "🎨 同步设计资源..."
Copy-Directory -Source "$ProjectRoot\design" -Destination "$TargetDir\design" -Label "设计资源"
Write-Host ""

# 5. Vibe Marketing
Write-Info "📢 同步 Vibe Marketing..."
Copy-Directory -Source "$ProjectRoot\vibe-marketing" -Destination "$TargetDir\vibe-marketing" -Label "Vibe Marketing"
Write-Host ""

# 6. 工作流
Write-Info "🔄 同步工作流..."
Copy-Directory -Source "$ProjectRoot\workflows" -Destination "$TargetDir\workflows" -Label "工作流"
Write-Host ""

# 7. 学习资源
Write-Info "📚 同步学习资源..."
Copy-Directory -Source "$ProjectRoot\learning" -Destination "$TargetDir\learning" -Label "学习资源"
Write-Host ""

# 8. 参考资料
Write-Info "📖 同步参考资料..."
Copy-Directory -Source "$ProjectRoot\references" -Destination "$TargetDir\references" -Label "参考资料"
Write-Host ""

# 9. 自动化配置
Write-Info "⚙️ 同步自动化配置..."
Copy-Directory -Source "$ProjectRoot\automation" -Destination "$TargetDir\automation" -Label "自动化配置"
Write-Host ""

# 10. 委托系统
Write-Info "🤝 同步委托系统..."
Copy-Directory -Source "$ProjectRoot\delegator" -Destination "$TargetDir\delegator" -Label "委托系统"
Write-Host ""

# 完成
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
if ($DryRun) {
    Write-Host "  Dry-run 完成！使用不带 -DryRun 参数执行实际同步" -ForegroundColor Yellow
} else {
    Write-Host "  同步完成！✨" -ForegroundColor Green
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Info "目标目录: $TargetDir"
Write-Info "重启 Claude Code 以使更改生效"
Write-Host ""

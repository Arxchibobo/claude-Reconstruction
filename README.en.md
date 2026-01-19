# Claude Reconstruction

> **Claude Code Engineering Configuration System** - Make every session efficient, stable, and reproducible

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/Arxchibobo/claude-Reconstruction)

English | [简体中文](README.md)

---

## What is This?

Claude Reconstruction is a battle-tested **Claude Code Engineering Configuration System** that includes:

- **Error Knowledge Base** - 10+ common error patterns and prevention measures
- **Decision Tree** - Tool selection guide for 50+ scenarios
- **Workflows** - Standardized task execution processes
- **Capability Documentation** - Complete MCP/Skills/Plugins reference
- **Best Practices** - Coding standards and methodologies

## Why Do You Need It?

| Problem | Solution |
|---------|----------|
| Same errors keep occurring | Error knowledge base + self-check checklists |
| Don't know which tool to use | Decision tree for quick navigation |
| Low task execution efficiency | Standardized workflows |
| Knowledge loss between sessions | Persistent configuration system |

---

## System Requirements

| Requirement | Version/Description |
|------------|-------------------|
| **Claude Code** | >= 1.0.0 |
| **Operating System** | macOS / Linux / Windows |
| **Shell** | Bash (Unix/Linux/macOS) / PowerShell (Windows) |
| **Node.js** | >= 14.0.0 (Optional, for npm installation) |

---

## Quick Start

### Installation

**Method 1: Clone and Install**

```bash
# Clone repository
git clone https://github.com/Arxchibobo/claude-Reconstruction.git
cd claude-Reconstruction

# Unix/Linux/macOS
chmod +x scripts/install.sh
./scripts/install.sh

# Windows PowerShell
.\scripts\install.ps1
```

**Method 2: Manual Installation**

1. Download the repository
2. Copy files from `core/` directory to `~/.claude/`
3. Copy other directories (errors, capabilities, etc.) to `~/.claude/`

### Verify Installation

Run verification script:

```bash
# Unix/Linux/macOS
./scripts/verify.sh

# Windows PowerShell
.\scripts\verify.ps1
```

Or start Claude Code, and you should see:
- High-frequency error reminders
- Quick decision tree
- Work mode confirmation

---

## Directory Structure

```
claude-reconstruction/
├── README.md                 # This file
├── core/                     # Core configuration
│   ├── CLAUDE.md            # Main configuration
│   ├── QUICK_START.md       # Session startup checklist
│   └── DECISION_TREE.md     # Capability decision tree
├── errors/                   # Error knowledge base
│   ├── ERROR_CATALOG.md     # Error catalog
│   ├── system-errors/       # System-level errors
│   └── project-errors/      # Project-level errors
├── capabilities/             # Capability documentation
│   ├── mcp-servers.md       # Complete MCP guide
│   ├── skills-guide.md      # Skills usage guide
│   └── plugins-auto.md      # Plugins auto-activation
├── workflows/                # Workflows
│   ├── auto-execution.md    # Auto-execution mode
│   └── data-analysis.md     # Data analysis workflow
├── learning/                 # Learning resources
│   └── AI_WORKFLOW_INSIGHTS.md
├── references/               # References
│   └── BEST_PRACTICES.md    # Best practices
├── automation/               # Automation configuration
│   └── hooks.md             # Hooks configuration
├── delegator/                # Delegation system
│   └── README.md            # Delegator documentation
└── scripts/                  # Installation scripts
    ├── install.sh           # Unix installation script
    └── install.ps1          # Windows installation script
```

---

## Core Features

### 1. Error Knowledge Base

10 high-frequency errors with prevention measures:

| ID | Error | Self-Check Question |
|----|-------|-------------------|
| E001 | Async without parallelization | Using Promise.all()? |
| E002 | Polling without timeout | Set maxAttempts? |
| E003 | Error not re-thrown | Throw in catch block? |
| E004 | SQL without CTE | Pre-filter data? |
| ... | ... | ... |

### 2. Decision Tree

```
Need external data? → MCP (database/observability/chart)
Need automation?   → Skills (/commit, /write-tests)
Need suggestions?  → Plugins (auto-activated)
```

### 3. Work Mode

```
Plan → Confirm → Execute → Verify
```

**4 Critical Blockers (Only situations where asking is allowed)**:
1. Missing critical credentials
2. Multiple conflicting approaches
3. Contradictory requirements
4. Irreversible high-risk operations

### 4. Capability Layers

| Layer | Tool | Purpose |
|-------|------|---------|
| **Layer 1** | MCP Servers | External data access |
| **Layer 2** | Skills | Automated tasks |
| **Layer 3** | Plugins | Expert advice (auto-activated)|

---

## Usage Examples

### Data Analysis

```
User: Analyze user growth last month

Claude:
1. Query user data with database MCP
2. Process data locally
3. Generate trend chart with chart MCP
4. Output analysis report
```

### Feature Development

```
User: Add user registration feature

Claude:
1. Create TodoList plan
2. Show plan and wait for confirmation
3. Execute completely (no questions)
4. Generate acceptance report
```

### Git Operations

```
User: /commit

Claude:
1. Run git status to see changes
2. Analyze change content
3. Generate commit message
4. Wait for confirmation then commit
```

---

## Custom Configuration

### Add Project-Specific Errors

Create a new file in `errors/project-errors/`:

```markdown
# my-project-errors.md

## E101: Project-Specific Error

**Description**: Error description
**Self-Check**: Self-check questions
**Solution**: Code examples
```

### Add Custom Skill

Create in `~/.claude/commands/`:

```markdown
# my-skill.md

> Describe skill purpose

## Execution Steps
1. Step one
2. Step two
```

### Configure Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "cat ~/.claude/startup.md" }
        ]
      }
    ]
  }
}
```

---

## Contributing

Contributions are welcome! Please:

1. Fork this repository
2. Create a feature branch
3. Submit your changes
4. Create a Pull Request

### Contribution Areas

- New error patterns
- Workflow optimization
- Documentation improvements
- Bug fixes

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License - See [LICENSE](LICENSE) for details

---

## Acknowledgments

Thanks to all developers who contribute to the Claude Code ecosystem.

---

**Happy Coding with Claude!** 🚀

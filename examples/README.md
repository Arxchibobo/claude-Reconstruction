# Examples

This directory contains example projects demonstrating how to use Claude Reconstruction in different scenarios.

## Available Examples

### 1. Node.js API Project (`nodejs-api/`)

Demonstrates:
- Error handling with E003 pattern (re-throwing errors)
- Async parallelization with E001 pattern (Promise.all)
- SQL optimization with E004 pattern (CTE pre-filtering)
- API integration with E006 pattern

**Use Case**: Building RESTful APIs with Express.js

### 2. React Application (`react-app/`)

Demonstrates:
- State management with E005 pattern (avoiding ID duplication)
- Polling with timeout using E002 pattern
- UI/UX workflow integration
- Component testing with Skills

**Use Case**: Building modern React web applications

### 3. Data Analysis Project (`data-analysis/`)

Demonstrates:
- Using MCP servers (database, chart, observability)
- Data analysis workflow
- Three-file pattern for long tasks
- Visualization with chart MCP

**Use Case**: Data analysis and reporting tasks

---

## How to Use Examples

Each example directory contains:

1. **README.md** - Project overview and setup instructions
2. **project-errors.md** - Project-specific error patterns
3. **workflow.md** - Recommended workflow for this project type
4. **Source code** - Example implementation

### Getting Started

1. Navigate to the example directory:
   ```bash
   cd examples/nodejs-api
   ```

2. Read the project README:
   ```bash
   cat README.md
   ```

3. Copy project-specific errors to your Claude configuration:
   ```bash
   cp project-errors.md ~/.claude/errors/project-errors/
   ```

4. Follow the workflow guide for your project type

---

## Contributing Examples

Have a great example project? We'd love to include it!

1. Create a new directory under `examples/`
2. Include all required files (README, errors, workflow, code)
3. Submit a Pull Request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

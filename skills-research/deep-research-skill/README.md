# Claude Code Deep Research Agent

A sophisticated multi-agent research framework that implements OpenAI's Deep Research and Google Gemini's Deep Research capabilities using Claude Code's native features.

## Overview

This project leverages Claude Code's Skills and Commands system to conduct comprehensive, citation-backed research through:

- **Graph of Thoughts (GoT) Framework** - Intelligent research path management with graph-based reasoning
- **7-Phase Deep Research Process** - Structured methodology for quality research
- **Multi-Agent Architecture** - Parallel research agents with specialized roles
- **Citation Validation System** - A-E source quality ratings with chain-of-verification

## Quick Start

### Prerequisites

- Claude Code CLI installed
- Active Claude Code account with API access

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd Claude-Code-Deep-Research-main
```

2. The Skills and Commands are already configured in `.claude/` directory

### Basic Usage

The simplest way to conduct deep research:

```bash
/deep-research [your research topic]
```

**Example:**
```bash
/deep-research AI applications in clinical diagnosis
```

This single command will:
1. Ask clarifying questions to refine your research needs
2. Create a structured research plan
3. Deploy multiple parallel research agents
4. Synthesize findings into a comprehensive report
5. Validate all citations
6. Output results to `RESEARCH/[topic]/` directory

## Advanced Usage

### Step-by-Step Research Workflow

For more control over the research process:

#### 1. Refine Your Question
```bash
/refine-question Should I use WebAssembly for my project?
```

The Question Refiner will ask 5-6 clarifying questions about:
- Specific focus areas
- Output format requirements
- Geographic and time scope
- Target audience
- Special requirements

#### 2. Plan Research (Optional)
```bash
/plan-research [structured prompt from step 1]
```

Creates a detailed execution plan showing:
- How the topic breaks into subtopics
- Which agents will be deployed
- Expected timeline

#### 3. Execute Research
```bash
/deep-research [your topic]
```

#### 4. Synthesize Findings (If needed)
```bash
/synthesize-findings RESEARCH/[topic]/research_notes/
```

#### 5. Validate Citations
```bash
/validate-citations RESEARCH/[topic]/full_report.md
```

## Project Structure

```
claude-code-deep-research/
├── .claude/
│   ├── skills/                    # Research skills
│   │   ├── question-refiner/      # Question refinement
│   │   ├── research-executor/     # Main research execution
│   │   ├── got-controller/        # Graph of Thoughts controller
│   │   ├── citation-validator/    # Citation validation
│   │   └── synthesizer/           # Research synthesis
│   ├── commands/                  # User commands
│   │   ├── deep-research.md       # Main research command
│   │   ├── refine-question.md     # Question refinement
│   │   ├── plan-research.md       # Research planning
│   │   ├── synthesize-findings.md # Findings synthesis
│   │   └── validate-citations.md  # Citation validation
│   └── settings.local.json        # Tool permissions
├── RESEARCH/                      # Research outputs
│   └── [topic_name]/
│       ├── README.md
│       ├── executive_summary.md
│       ├── full_report.md
│       ├── data/
│       ├── visuals/
│       ├── sources/
│       ├── research_notes/
│       └── appendices/
├── CLAUDE.md                      # Quick reference for Claude Code
├── CLAUDE2.md                     # Graph of Thoughts guide
├── PROJECT_UNDERSTANDING.md       # Architecture documentation
├── IMPLEMENTATION_GUIDE.md        # User guide with examples
└── README.md                      # This file
```

## Research Output Structure

Each research project creates a structured output:

```
RESEARCH/[topic_name]/
├── README.md                    # Overview and navigation
├── executive_summary.md         # 1-2 page key findings
├── full_report.md               # Complete analysis (20-50 pages)
├── data/
│   └── statistics.md            # Key numbers and facts
├── visuals/
│   └── descriptions.md          # Chart/graph descriptions
├── sources/
│   ├── bibliography.md          # Complete citations
│   └── source_quality_table.md  # A-E quality ratings
├── research_notes/
│   └── agent_findings_summary.md # Raw agent outputs
└── appendices/
    ├── methodology.md           # Research methods
    └── limitations.md           # Unknowns and gaps
```

## Citation Requirements

Every factual claim includes:
1. Author/Organization name
2. Publication date
3. Source title
4. Direct URL/DOI
5. Page numbers (if applicable)

**Source Quality Ratings:**
- **A**: Peer-reviewed RCTs, systematic reviews, meta-analyses
- **B**: Cohort studies, clinical guidelines, reputable analysts
- **C**: Expert opinion, case reports, mechanistic studies
- **D**: Preprints, preliminary research, blogs
- **E**: Anecdotal, theoretical, speculative

## Graph of Thoughts Framework

The GoT framework manages research as a graph with these operations:

| Operation | Purpose | Example |
|-----------|---------|---------|
| **Generate(k)** | Spawn k parallel research paths | Generate(4) from root → 4 research paths |
| **Aggregate(k)** | Merge k findings into synthesis | Aggregate(3) → 1 comprehensive report |
| **Refine(1)** | Improve existing finding | Refine(node_5) → Enhanced quality |
| **Score** | Rate quality (0-10) | Score based on citations, accuracy |
| **KeepBestN(n)** | Prune to top n nodes | KeepBestN(3) → Retain best 3 |

**Research Patterns:**
- **Balanced**: Generate(4-5) → Score best → Deepen top → Aggregate
- **Depth-first**: Generate(3) → Take best → Generate(3) from it
- **Breadth-first**: Generate(8) → KeepBestN(5) → Generate(2) each

## Documentation

| Document | Description |
|----------|-------------|
| `CLAUDE.md` | Quick reference for Claude Code instances |
| `CLAUDE2.md` | Complete Graph of Thoughts implementation |
| `PROJECT_UNDERSTANDING.md` | Detailed architecture and design |
| `IMPLEMENTATION_GUIDE.md` | User guide with examples and workflows |

## Commands Reference

| Command | Usage | Description |
|---------|-------|-------------|
| `/deep-research` | `/deep-research [topic]` | Execute complete research workflow |
| `/refine-question` | `/refine-question [question]` | Refine into structured prompt |
| `/plan-research` | `/plan-research [prompt]` | Create execution plan |
| `/synthesize-findings` | `/synthesize-findings [dir]` | Combine research outputs |
| `/validate-citations` | `/validate-citations [file]` | Verify citation quality |

## Examples

### Market Research
```bash
/deep-research AI in healthcare market, focus on clinical diagnosis,
             comprehensive report, global scope, 2022-2024 data,
             audience is healthcare executives
```

### Technical Assessment
```bash
/deep-research WebAssembly vs JavaScript performance benchmarks
```

### Academic Literature Review
```bash
/deep-research Transformer architectures in AI,
             peer-reviewed sources only, 2017-present,
             comprehensive literature review
```

## Features

- Multi-agent parallel research (3-8 agents simultaneously)
- Graph of Thoughts optimization for quality
- Automatic citation validation
- Source quality ratings (A-E scale)
- Chain-of-verification to prevent hallucinations
- Structured output with executive summaries
- Cross-source triangulation

## Performance

- **Quick research** (narrow topic): 10-15 minutes
- **Standard research** (moderate scope): 20-30 minutes
- **Comprehensive research** (broad scope): 30-60 minutes
- **Academic literature review**: 45-90 minutes

## Contributing

Contributions are welcome! To add new skills or improvements:

1. Follow the skill structure in `.claude/skills/`
2. Include `SKILL.md`, `instructions.md`, `examples.md`
3. Test with diverse research topics
4. Update documentation

## License

This project is provided as-is for educational and research purposes.

## Acknowledgments

- Graph of Thoughts framework inspired by [SPCL, ETH Zürich](https://github.com/spcl/graph-of-thoughts)
- Built with [Claude Code](https://claude.ai/code)
- 7-Phase Research Process based on deep research best practices

---

**For detailed usage instructions, see [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)**

**For architecture details, see [PROJECT_UNDERSTANDING.md](PROJECT_UNDERSTANDING.md)**

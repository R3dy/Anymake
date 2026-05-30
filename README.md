# Anymake — Agentic Build System

> Take any software idea — SaaS, CLI tool, library, API service, internal tool, static site, or hobby project — from raw concept to a finished, shipped result, guided by a structured, phase-gated methodology that adapts to what you're building, with a built-in multi-agent implementation engine.

## What It Is

**Anymake** is an AI skill for [OpenCode.ai](https://opencode.ai) that acts as your co-founder and CTO rolled into one. It takes an idea through six disciplined phases — Foundation, Discovery, Planning, Solutioning, Implementation, and Launch — producing a concrete artifact at every step, gating every transition on your approval, and auto-building your product in Phase 4 with a three-tier agent system (Orchestrator → Worker → Validator).

Anymake adapts to **what** you're building: a chosen project type (SaaS, CLI, library, API, internal tool, static site, hobby) reshapes which phases run, which questions get asked, the build order, and the quality gates. See [`PROJECT_TYPES/`](PROJECT_TYPES/).

The system defeats two failure modes:
- **Building without planning** → scope creep, rewrites, wasted sessions
- **Planning without building** → analysis paralysis, nothing shipped

## Core Philosophy

| Principle | What it means in practice |
|-----------|--------------------------|
| **You own the vision** | Every phase gate requires your explicit approval before anything moves forward |
| **Claude executes** | Research, planning, building, deploying — all handled autonomously within approved scope |
| **Artifacts are truth** | Every decision lives in a document. Conversation memory is ephemeral; documents are permanent |
| **Revenue is first-class** | Monetization is designed in Phase 2 and built in Phase 4 — never bolted on post-launch |
| **Visual quality is non-negotiable** | Phase 2 produces a polished prototype. If you wouldn't show it to a potential customer, it fails the gate |
| **One step per session** | Prevents scope creep and context thrash; every session ends with a clear artifact and a named next action |

## The Six Phases

| # | Phase | Artifact | Gate |
|---|-------|----------|------|
| 0 | **Foundation** | `PROJECT.md` — elevator pitch, scope, revenue model, success metrics | Your approval |
| 1 | **Discovery** | `docs/01-discovery.md` — market, competitors, users, risks | Your approval |
| 2 | **Planning** | PRD + UX Design + Architecture (ADRs) + Monetization plan | Your approval |
| 3 | **Solutioning** | Epics, user stories, ordered backlog, dependency graph | Your approval |
| 4 | **Implementation** | Production code, CI/CD, security reviewed, deployed to staging | Your approval |
| 5 | **Launch** | Live product, metrics dashboard, growth loop | Ongoing |

## Installation

Add Anymake to the `plugin` array in your `opencode.json`:

**Global install** (`~/.config/opencode/opencode.json`):
```json
{
  "plugin": ["anymake@git+https://github.com/R3dy/Anymake.git"]
}
```

Restart OpenCode. The plugin loads automatically — no manual activation needed.

**Verify** by asking: `"Start a new project"` — Claude should respond in Anymake mode.

For Windows troubleshooting or pinning a specific version, see [`.opencode/INSTALL.md`](.opencode/INSTALL.md).

## Quick Start

| Say this | What happens |
|----------|-------------|
| `"Start a new project"` | Creates a new project workspace, begins Phase 0 |
| `"Continue [project name]"` | Reads `PHASE_STATE.md`, resumes the last step |
| `"I have a product idea: [description]"` | Triggers Anymake, starts Phase 0 |
| `"Build an app"` | Triggers Anymake |
| `"Start a new project --yolo"` | **Autonomous mode** — runs all phases without stopping at gates |
| `"Continue [project name] --yolo"` | **Autonomous mode** — resumes and continues without gate pauses |

Every project lives in `PROJECTS/[name]/` and is **gitignored** — your product code stays in your project, the build system stays here.

## Autonomous Mode (Yolo)

Add `--yolo` to any project trigger to run the full build without pausing at phase gates. Instead of waiting for your approval at each phase transition, the system spawns a **Product Owner Proxy** sub-agent that reviews each artifact against strict, per-gate criteria and either approves it or returns a specific list of required changes.

The proxy is not a rubber stamp — it enforces the same completeness and quality bar you would:
- Checks for unfilled template placeholders in required sections
- Verifies acceptance criteria are specific and testable (not "works correctly")
- Confirms all mandatory ADRs are present and decided
- Validates that Monetization is Milestone 4 or earlier
- Runs the prototype build and checks for real content and brand color application

**The one hard exception:** Security failures in Phase 4 always halt and notify the real user regardless of mode. This override is absolute and cannot be bypassed.

The proxy is defined in `AGENTS/product-owner-proxy.md` and runs as a fresh sub-agent at each gate with no memory of prior turns.

## Project Workspace Layout

When you start a project, Anymake creates and populates this structure:

```
PROJECTS/[name]/
├── PHASE_STATE.md              # Current phase + step (the system's bookmark)
├── PARKING_LOT.md              # Future ideas that arrived mid-phase
├── PROJECT.md                  # Phase 0 artifact: vision, scope, revenue model
├── BOARD.md                    # Phase 4 live agile board (updated by agents)
├── docs/
│   ├── 01-discovery.md         # Phase 1: market research
│   ├── 02-planning/
│   │   ├── prd.md              # Product requirements
│   │   ├── ux-design.md        # Design system, components, prototypes
│   │   ├── architecture/       # ADRs — one per major technical decision
│   │   └── monetization.md     # Revenue model and pricing strategy
│   └── 03-solutioning/
│       ├── epics.md            # Epics with acceptance criteria
│       ├── backlog.md          # Ordered milestone task list
│       └── dependency-graph.md # What blocks what
└── environment.md              # Dev environment setup (required by Phase 4)
```

## Phase 4: Multi-Agent Build Loop

Phase 4, Step 4.3 runs an autonomous three-tier agent system that builds your entire backlog without you having to manage individual tasks:

```
Orchestrator
  ├── reads backlog + dependency graph
  ├── manages BOARD.md (live status for every story)
  ├── dispatches Worker agents (one story at a time)
  ├── dispatches Validator agents after each PR
  └── escalates to you only when blocked

Worker (per story)
  ├── implements in strict order: Schema → Migration → API → Frontend
  ├── commits each layer separately (one commit per layer)
  └── opens a PR when the story is complete

Validator (per PR)
  ├── checks every acceptance criterion against the implementation
  ├── runs security checklist
  └── returns PASS / FAIL / ESCALATE
```

**PR review policy:**
- PRs #1–3 always require your review
- Any PR touching webhooks or payment flows requires your review
- All other PRs: Orchestrator merges on Validator PASS

**Board visibility:** `PROJECTS/[name]/BOARD.md` is updated after every agent action. You can see every story's status, the full run log, and any escalations at a glance.

## Repository Layout

```
.opencode/
├── INSTALL.md              # Detailed installation instructions
└── plugins/anymake.js # OpenCode plugin bootstrap

AGENTS/
├── orchestrator.md         # Orchestrator agent instructions
├── worker.md               # Worker agent instructions
├── validator.md            # Validator agent instructions
└── policies.md             # Retry matrix, escalation rules, failure classification

PHASE_GUIDES/
├── phase-0.md              # Foundation step-by-step guide
├── phase-1.md              # Discovery step-by-step guide
├── phase-2.md              # Planning step-by-step guide
├── phase-3.md              # Solutioning step-by-step guide
├── phase-4.md              # Implementation step-by-step guide
└── phase-5.md              # Launch step-by-step guide

TEMPLATES/
├── project.md              # Phase 0 artifact template
├── discovery.md            # Phase 1 artifact template
├── prd.md                  # Phase 2: PRD template
├── ux-design.md            # Phase 2: UX design system template
├── adr.md                  # Phase 2: Architecture decision record template
├── monetization.md         # Phase 2: Revenue model template
├── epic.md                 # Phase 3: Epic template
├── story.md                # Phase 3: User story template
├── task-brief.md           # Phase 4: Worker task spec template
├── BOARD.md                # Phase 4: Agile board template
├── validation-report.md    # Phase 4: Validator report template
├── phase-state.md          # PHASE_STATE.md template
├── launch-checklist.md     # Phase 5: Pre-launch checklist template
├── metrics-dashboard.md    # Phase 5: Metrics dashboard template
└── commit-message.md       # Conventional commit guidelines

SKILL.md                    # Main skill definition (loaded by OpenCode plugin)
package.json                # npm metadata
```

## Design Decisions

**Build order is invariant.** Workers always implement in this order: Schema → Migration → API → Component → Page → Integration → Test. Skipping layers is not allowed — it creates hidden dependencies that cause silent failures later.

**Scope is a hard boundary.** Anything that arrives mid-phase goes to `PARKING_LOT.md`. Nothing gets built outside the approved scope without a new phase gate. This prevents the most common AI-assisted dev failure: the "while I'm in here..." spiral.

**One artifact per session.** Finishing one document cleanly is worth more than starting three. The constraint forces prioritization and keeps PHASE_STATE.md trustworthy.

**Escalation over assumption.** Workers and validators execute only. If they hit something ambiguous, they escalate — they never make product or design decisions autonomously.

## Acknowledgements

Anymake began as an exploration of the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method for Agile AI-Driven Development) and owes that project a debt for the original spark — agentic, agile, phase-driven building. It has since grown into its own system with a distinct architecture (the 0–5 phase gates, the project-type engine, the Orchestrator → Worker → Validator loop, and the autonomous Product Owner Proxy). Credit to BMAD-METHOD as the inspiration; Anymake is an independent project.

## License

MIT — see [package.json](package.json).

## Issues & Contributions

Report issues at [github.com/R3dy/Anymake/issues](https://github.com/R3dy/Anymake/issues).

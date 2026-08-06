# Anymake — Agentic Build System

> Take any software idea — SaaS, CLI tool, library, API service, internal tool, static site, or hobby project — from raw concept to a finished, shipped result, guided by a structured, phase-gated methodology that adapts to what you're building, with a built-in multi-agent implementation engine.

## What It Is

**Anymake** is an AI skill for [OpenCode.ai](https://opencode.ai) that acts as your co-founder and CTO rolled into one. It takes an idea through six disciplined phases — Foundation, Discovery, Planning, Solutioning, Implementation, and Launch — producing a concrete artifact at every step, gating every transition on your approval, and auto-building your product in Phase 4 with a four-stage agent system (Orchestrator → Planner → Worker → Validator).

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

Phase 4, Step 4.3 runs an autonomous four-stage agent system that builds your entire backlog without you having to manage individual tasks:

```
Orchestrator
  ├── reads backlog + dependency graph
  ├── manages BOARD.md (live status for every story)
  ├── dispatches a Planner agent per story and approves the brief for completeness
  ├── dispatches Worker agents from the approved brief
  ├── dispatches Validator agents after each PR
  └── escalates to you only when blocked

Planner (per story)
  ├── translates the approved story + ADRs + intent layer + CONVENTIONS.md
  │   into a self-contained task brief — the Orchestrator never authors this itself
  └── never writes code or opens a PR

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
- Any PR touching an Active Decision (ADR) requires your review, regardless of PR count
- All other PRs: Orchestrator merges on Validator PASS

**Board visibility:** `PROJECTS/[name]/BOARD.md` is updated after every agent action. You can see every story's status, the full run log, and any escalations at a glance.

**Model tiers (optional):** every spawned agent — Planner, Worker, Validator, and the post-launch agile agents too — carries a fixed importance tier (`tier: 1|2|3`) right in its own `AGENTS/*.md` frontmatter: Tier 1 for judgment calls (Product Owner Proxy, Plan Reviewer), Tier 2 for translation and review work that has to get the details right (Planner, Validator, Solution Architect, Cartographer), Tier 3 for the highest-volume, narrowly-scoped role (Worker). Point each tier at a model either per-agent in your own `opencode.json` (`agent.<name>.model` — schema-safe, no shell setup) or with three environment variables (`ANYMAKE_MODEL_TIER1/2/3`, applies to a whole tier at once); unset either and that agent just runs on your primary session's model. See `AGENTS/arbiter.md` → **Model Tier Policy** for the full table and `.opencode/INSTALL.md` for setup.

## Post-Launch Agile Workflow

Once a product is built, "the save button isn't working" should never trigger an
ad-hoc fix. The `anymake-agile` skill runs the process a real dev team would:

```
1. Intake      — clarify + reproduce; restate the issue in system terms; reporter confirms
2. Track       — labeled GitHub issue in the product repo (type / severity / status lifecycle)
3. Solution    — Solution Architect agent reviews the whole project and writes a
                 Development Plan: verified root cause, design, alternatives, intent
                 constraints, design consistency, blast radius, stories, tests, rollback
4. Review      — a fresh Plan Reviewer agent adversarially checks the plan against the
                 PRD, design system, intent layer, and the actual code; the architect
                 revises until APPROVED (max 3 rounds, then it escalates to you)
5. Approve     — you sign off (or the Product Owner Proxy in autonomous mode;
                 security-touching plans always come to you)
6. Execute     — stories run through the standard build loop on branch issue/N-slug;
                 every commit references the issue; merge SHA + tag + revert command
                 are recorded on the issue
7. Verify      — the original repro is re-tested, UI changes pass the design-system
                 audit, and the reporter confirms before the issue closes
```

The design/review split mirrors Worker/Validator: the agent that writes the plan
(`AGENTS/solution-architect.md`) is never the agent that approves it
(`AGENTS/plan-reviewer.md`). No code is written until the plan clears review —
so the fix fixes what you reported, breaks nothing around it, looks designed-in,
and reverts with one recorded command if you ever need to undo it.

## The Skill Suite

Anymake is a plugin that ships a **hub** skill plus focused **companion** skills.
The hub owns the phased methodology and routes to companions at the right step;
each companion is also useful on its own. See `skills/README.md` for the full map.

| Skill | What it owns | Invoked at |
|-------|--------------|------------|
| `anymake` | Methodology, state machine, gates, routing (auto-loaded) | Always |
| `anymake-build-loop` | Four-stage Orchestrator → Planner → Worker → Validator build engine | Phase 4.3 |
| `anymake-design-system` | Design system + Prototype Sprint + prototype gate | Phase 2.2b |
| `anymake-security-review` | Per-PR + full + pre-launch security checklists | Phase 4.5, pre-launch |
| `anymake-deploy` | Staging + production deploy, env/secrets, monitoring, rollback | Phase 4 staging, 5.2 |
| `anymake-brownfield` | Reverse-engineer Phase 0–3 artifacts from existing code | In place of Phase 0 |
| `anymake-iterate` | Post-launch loop: triage, metrics→epics, releases | Phase 5.6 onward |
| `anymake-agile` | The single post-launch pipeline for bugs & feature/change requests: intake → GitHub issue → architect plan (intent-layer checked) → independent plan review → traceable build → reporter verification | "X isn't working" / any add/change/remove on a built product |
| `anymake-new-type` | Scaffold a new project-type profile | Extending the system |

## Repository Layout

```
.opencode/
├── INSTALL.md              # Detailed installation instructions
└── plugins/anymake.js # OpenCode plugin bootstrap

AGENTS/
├── orchestrator.md         # Orchestrator agent instructions
├── planner.md              # Planner agent instructions (story → self-contained task brief)
├── worker.md               # Worker agent instructions
├── validator.md            # Validator agent instructions (incl. intent-consistency check)
├── cartographer.md         # Read-only agent that maps code→intent (intent layer)
├── solution-architect.md   # Agile flow: writes the Development Plan for a tracked issue
├── plan-reviewer.md        # Agile flow: fresh-context adversarial plan review
└── arbiter.md             # Retry matrix, escalation rules, failure classification, agile review policy

skills/                     # The skill suite (registered with OpenCode)
├── README.md               # Suite map: hub + companions
├── anymake/SKILL.md        # Hub skill — methodology + router (auto-loaded)
├── anymake-build-loop/     # Phase 4.3 four-stage build engine
├── anymake-brownfield/     # Onboard an existing codebase
├── anymake-design-system/  # Phase 2.2b design system + prototype
├── anymake-security-review/ # Security checklists + gate (4.5, pre-launch)
├── anymake-deploy/         # Staging + production deployment
├── anymake-iterate/        # Post-launch loop ("Phase 6")
├── anymake-agile/          # Post-launch change pipeline: intake → issue → plan → review → build
└── anymake-new-type/       # Author a new project type

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
├── task-brief.md           # Phase 4: Worker task spec template (filled by the Planner)
├── conventions.md          # Phase 4: CONVENTIONS.md template — patterns Workers establish, Planners reuse
├── BOARD.md                # Phase 4: Agile board template
├── validation-report.md    # Phase 4: Validator report template
├── phase-state.md          # PHASE_STATE.md template
├── launch-checklist.md     # Phase 5: Pre-launch checklist template
├── metrics-dashboard.md    # Phase 5: Metrics dashboard template
├── issue.md                # Agile flow: GitHub issue body (bug/feature, labels, traceability)
├── dev-plan.md             # Agile flow: Development Plan (Solution Architect)
├── plan-review.md          # Agile flow: per-round review report (Plan Reviewer)
├── system-map.md           # Intent layer: as-built system map (Cartographer)
├── decisions.md            # Intent layer: living decision index (Cartographer)
├── invariants.md           # Intent layer: non-negotiable behaviors (Cartographer)
└── commit-message.md       # Conventional commit guidelines

skills/anymake/SKILL.md     # Main skill definition (loaded by OpenCode plugin)
package.json                # npm metadata
```

## Design Decisions

**Build order is invariant.** Workers always implement in this order: Schema → Migration → API → Component → Page → Integration → Test. Skipping layers is not allowed — it creates hidden dependencies that cause silent failures later.

**Scope is a hard boundary.** Anything that arrives mid-phase goes to `PARKING_LOT.md`. Nothing gets built outside the approved scope without a new phase gate. This prevents the most common AI-assisted dev failure: the "while I'm in here..." spiral.

**One artifact per session.** Finishing one document cleanly is worth more than starting three. The constraint forces prioritization and keeps PHASE_STATE.md trustworthy.

**Escalation over assumption.** Workers and validators execute only. If they hit something ambiguous, they escalate — they never make product or design decisions autonomously.

## Acknowledgements

Anymake began as an exploration of the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method for Agile AI-Driven Development) and owes that project a debt for the original spark — agentic, agile, phase-driven building. It has since grown into its own system with a distinct architecture (the 0–5 phase gates, the project-type engine, the Orchestrator → Planner → Worker → Validator loop, and the autonomous Product Owner Proxy). Credit to BMAD-METHOD as the inspiration; Anymake is an independent project.

## License

MIT — see [package.json](package.json).

## Issues & Contributions

Report issues at [github.com/R3dy/Anymake/issues](https://github.com/R3dy/Anymake/issues).

# Anymake — Agentic Build System

> Take any software idea — SaaS, CLI tool, library, API service, internal tool, static site, or hobby project — from raw concept to a finished, shipped result, guided by a structured, phase-gated methodology that adapts to what you're building, with a built-in multi-agent implementation engine.

## What It Is

**Anymake** is an AI skill for [OpenCode.ai](https://opencode.ai) that acts as your co-founder and CTO rolled into one. It takes an idea through six disciplined phases — Foundation, Discovery, Planning, Solutioning, Implementation, and Launch — producing a concrete artifact at every step, gating every transition on your approval, and auto-building your product in Phase 4 with a five-stage agent system (Orchestrator → Planner → Worker → Validator → Experience Runner) that ships nothing without actually driving it first.

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
| **"Done" means actually driven** | Every user-observable story ships with a literal Experience Script — the Experience Runner launches the real app and clicks, types, or runs commands through it before a story counts as done. A green test suite is never treated as proof someone tried it |
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

Phase 4, Step 4.3 runs an autonomous five-stage agent system that builds your entire backlog without you having to manage individual tasks.

**Stories run in parallel; stages within a story do not.** The Orchestrator works
like an agile team lead — dispatching every ready, non-conflicting story up to
`concurrency.max` (default 3), watching for stalls, re-dispatching on failure,
escalating when blocked. Each story's own pipeline (Planner → Worker → Validator
→ Experience Runner) stays strictly sequential, and each story builds in its own
**git worktree** so concurrent work never collides on a shared checkout. Set
`concurrency.max: 1` for the older one-at-a-time behavior.

```
Orchestrator  (team lead)
  ├── reconciles .anymake/board-state.json — the structured taskboard spine
  ├── renders BOARD.md from it (the markdown is a projection, not the source)
  ├── dispatches ready, non-conflicting stories concurrently (up to concurrency.max)
  ├── dispatches a Planner per story and approves the brief for completeness
  ├── dispatches a Worker into that story's own git worktree
  ├── dispatches a Validator after each PR
  ├── dispatches an Experience Runner after each Validator PASS
  └── escalates to you only when blocked

  Every one of those dispatches goes through the anymake-dispatch skill
  (INV-018) — never a raw Agent/Task call. The skill adds the pre-dispatch
  prompt, a mandatory deliverable check, structured retry context, and a
  dispatch log line. It is also the one place the host runtime is named, so
  porting Anymake to another harness is a single-section change.

Planner (per story)
  ├── translates the approved story + ADRs + intent layer + CONVENTIONS.md
  │   into a self-contained task brief, including a literal Experience Script —
  │   the Orchestrator never authors this itself
  └── never writes code or opens a PR

Worker (per story, in its own worktree)
  ├── implements in the strict layer order from its brief (manifest-derived;
  │   SaaS default: Schema → Migration → API → Component → Page → Integration → Test)
  ├── commits each layer separately (one commit per layer)
  └── opens a PR when the story is complete

Validator (per PR)
  ├── checks every acceptance criterion against the implementation
  ├── runs security checklist
  ├── defers Human-Only criteria with Experience Script coverage to the next stage
  └── returns PASS / FAIL / ESCALATE

Experience Runner (per Validator PASS)
  ├── launches the real application on the story's branch
  ├── drives it exactly as scripted — clicking, typing, running commands, sending requests
  ├── compares the actual observed result to the scripted expectation, step by step
  └── returns PASS / FAIL / ESCALATE — never edits code, only observes and diagnoses
```

A Validator `PASS` alone does not clear a story for PR review — see
**[The Experience Harness](#the-experience-harness)** below.

**PR review policy:**
- PRs #1–3 always require your review
- Any PR implementing an **inbound third-party callback** requires your review — webhooks, OAuth/SSO redirects, payment return URLs, push receivers, external queue subscribers. The test is the trust boundary (does this run in response to a request you didn't originate, carrying data you didn't author?), not the word "webhook"
- Any PR touching an Active Decision (ADR) requires your review, regardless of PR count
- Any story matching `PROJECT.md`'s **"Never Building"** list fails the gate outright — that boundary can only be changed by a Phase 0 scope amendment you approve
- All other PRs: Orchestrator merges on Validator PASS **and** Experience Runner PASS

**Board visibility:** `PROJECTS/[name]/BOARD.md` is updated after every agent action.

You can see every story's status, the full run log, gate decisions, and any escalations at a glance. For a live view, `dashboard/kanban.sh` serves a zero-build kanban board that reads `board-state.json` directly — one column per story status, plus a session-activity panel.

**Gate honesty:** when an autonomous gate approves while knowing it couldn't check something — visual polish, a subjective judgment — it must say so in the verdict as a `LIMITATION:` line, and that line is logged permanently to BOARD.md's Gate Decisions table. An approval that hides what it couldn't check is treated as malformed.

**Model tiers (optional):** every spawned agent — Planner, Worker, Validator, Experience Runner, and the post-launch agile agents too — carries a fixed importance tier (`tier: 1|2|3`) right in its own `AGENTS/*.md` frontmatter: Tier 1 for judgment calls (Product Owner Proxy, Plan Reviewer), Tier 2 for translation and review work that has to get the details right (Planner, Validator, Experience Runner, Solution Architect, Cartographer), Tier 3 for the highest-volume, narrowly-scoped role (Worker). Point each tier at a model either per-agent in your own `opencode.json` (`agent.<name>.model` — schema-safe, no shell setup) or with three environment variables (`ANYMAKE_MODEL_TIER1/2/3`, applies to a whole tier at once); unset either and that agent just runs on your primary session's model. See `AGENTS/arbiter.md` → **Model Tier Policy** for the full table and `.opencode/INSTALL.md` for setup.

## The Experience Harness

The most common failure Anymake is built to prevent: an agent reports a story
done, the acceptance criteria read as satisfied, the test suite is green — and
then a real person clicks through it and it doesn't work. That gap exists
because reading code and running unit tests can't confirm what a person
actually experiences: that a button really redirects where it should, that a
CLI's output really reads the way the spec promised, that an API really returns
what the docs say. Those criteria used to be called "Human-Only" — they either
waited for a real human to click through manually, or, in autonomous mode, got
waived because the relevant code merely existed.

The Experience Harness closes that gap with three additions woven through the
whole system, not a bolt-on feature:

1. **The Experience Script** — every story's acceptance criteria (Phase 3) are
   paired with a literal walkthrough: a table of concrete actions (click, type,
   run a command, send a request) and the exact, checkable result each should
   produce — not "works correctly," but "returns HTTP 201 with an `id` field"
   or "redirects to `/dashboard` and shows 'Welcome, Jane'." Format:
   `TEMPLATES/experience-script.md`.
2. **The Experience Runner** (`AGENTS/experience-runner.md`) — a new agent in
   the Phase 4 build loop that actually launches the built application (per
   `docs/environment.md`) on the story's branch and drives it: real browser
   interaction for a web app, real terminal commands for a CLI, real HTTP
   requests for an API, a real imported call for a library. It compares what
   actually happened to what the script promised, and diagnoses any divergence
   with a file:line pointer — it never fixes the code itself; a failure feeds
   the same Worker retry loop a Validator failure does.
3. **A gate that can no longer be waived by inspection alone** — the Product
   Owner Proxy, the autonomous stand-in for a human at every gate, used to be
   able to approve a Human-Only criterion because the relevant code existed on
   the branch. It can't anymore: `phase4-pr-review` now hard-requires an
   Experience Runner `PASS` (or an explicit "no user-observable behavior")
   before a PR clears review, in every mode, and the one legitimate waiver left
   — a criterion too subjective to script at all — has to be written out loud
   on the board, not silently assumed.

This doesn't replace the code-level Validator, the automated test suite, or
your own review — it adds the one check none of those can do: that someone,
human or agent, actually watched the feature work. It runs in Phase 4's build
loop for every new story and again in the post-launch `anymake-agile` flow,
where a bug's reproduction steps become the Experience Script the fix is
verified against — the same scenario the reporter would have manually replayed
is what closes the issue.

**Two companion skills split building the harness from using it**, the same
author/execute separation the rest of the system enforces everywhere:

- **`anymake-experience-setup`** — builds it: authors Experience Scripts for
  every story in a backlog (Phase 3, Step 3.2b), audits an existing project for
  coverage gaps, and keeps `docs/environment.md` accurate. Also what
  `anymake-brownfield` runs to retrofit scripts onto a backlog reverse-engineered
  from existing code, since those stories never went through Phase 3.
- **`anymake-experience-check`** — uses it: runs the Experience Runner on
  demand, outside the automated build loop, against a story, a PR, or a live
  staging/production URL. This is the direct answer to "is this *actually*
  done?" any time you want it — not just inside the loop — and it's what
  narrows the Phase 4.6 staging review's old "requires a human" limitation down
  to only what's genuinely unscriptable.

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
6. Execute     — stories run through the standard build loop (five stages, including
                 the Experience Runner) on branch issue/N-slug; every commit references
                 the issue; merge SHA + tag + revert command are recorded on the issue
7. Verify      — the original repro, rewritten as an Experience Script, is replayed
                 live against the running app; UI changes pass the design-system audit;
                 the reporter reviews that passing evidence before the issue closes
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
| `anymake-build-loop` | Five-stage Orchestrator → Planner → Worker → Validator → Experience Runner build engine | Phase 4.3 |
| `anymake-experience-setup` | Builds the testing harness: Experience Scripts across a backlog, coverage audit, `docs/environment.md` | Phase 3.2b, brownfield retrofit |
| `anymake-experience-check` | Uses the testing harness on demand: drive a story, PR, or staging/production URL outside the build loop | Phase 4.6, agile Verify, on demand |
| `anymake-design-system` | Design system + Prototype Sprint + prototype gate | Phase 2.2b |
| `anymake-security-review` | Per-PR + full + pre-launch security checklists | Phase 4.5, pre-launch |
| `anymake-deploy` | Staging + production deploy, env/secrets, monitoring, rollback | Phase 4 staging, 5.2 |
| `anymake-brownfield` | Reverse-engineer Phase 0–3 artifacts from existing code | In place of Phase 0 |
| `anymake-iterate` | Post-launch loop: triage, metrics→epics, releases | Phase 5.6 onward |
| `anymake-agile` | The single post-launch pipeline for bugs & feature/change requests: intake → GitHub issue → architect plan (intent-layer checked) → independent plan review → traceable build → reporter verification | "X isn't working" / any add/change/remove on a built product |
| `anymake-dispatch` | The single chokepoint for **all** sub-agent dispatch (INV-018): pre-dispatch prompt assembly, mandatory deliverable verification, canonical retry context, dispatch logging — and the one place the host runtime is named | Whenever any agent spawns another |
| `anymake-new-type` | Scaffold a new project-type profile | Extending the system |

## Repository Layout

```
.github/workflows/
└── verify.yml              # CI: runs the regression harness on every push and PR

.opencode/
├── INSTALL.md              # Detailed installation instructions
├── plugins/anymake.js      # OpenCode plugin bootstrap
├── verify-plugin.mjs       # The regression harness (npm run verify) — 24 check groups
├── validate-board-state.mjs # Validates a board-state.json against the schema
└── fixtures/               # Fixtures the harness asserts against (board states,
                            #   PROJECT.md variants, build-loop deliverables)

dashboard/
├── kanban.html             # Zero-build live board — reads board-state.json directly
├── kanban.sh               # Per-project launcher (localhost-only)
└── README.md               # Launch instructions

AGENTS/
├── orchestrator.md         # Orchestrator agent instructions
├── planner.md              # Planner agent instructions (story → self-contained task brief)
├── worker.md               # Worker agent instructions
├── validator.md            # Validator agent instructions (incl. intent-consistency check)
├── experience-runner.md    # Launches and drives the real app against a story's Experience Script
├── cartographer.md         # Read-only agent that maps code→intent (intent layer)
├── solution-architect.md   # Agile flow: writes the Development Plan for a tracked issue
├── plan-reviewer.md        # Agile flow: fresh-context adversarial plan review
├── product-owner-proxy.md  # Autonomous-mode gate evaluator (every phase gate + Phase 4 pause points)
└── arbiter.md              # The shared rulebook: retry matrix, PR review policy, escalation
                            #   lexicon, failure classification, intent-conflict policy, model
                            #   tiers, INV-018 dispatch scope, the security-baseline definition,
                            #   and the project-type / "Never Building" scope guardrails

skills/                     # The skill suite (registered with OpenCode)
├── README.md               # Suite map: hub + companions
├── anymake/SKILL.md        # Hub skill — methodology + router (auto-loaded)
├── anymake-build-loop/     # Phase 4.3 five-stage build engine
├── anymake-dispatch/       # The single chokepoint for all sub-agent dispatch (INV-018)
├── anymake-brownfield/     # Onboard an existing codebase
├── anymake-experience-setup/ # Builds the testing harness: Experience Scripts + docs/environment.md (3.2b)
├── anymake-experience-check/ # Uses the testing harness on demand: drives a story/PR/staging URL
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
├── task-brief.md           # Phase 4: Worker task spec template (filled by the Planner; §3a is the Experience Script)
├── experience-script.md    # Phase 3/4: literal interaction-script format (clicks, keystrokes, commands, requests)
├── experience-report.md    # Phase 4: Experience Runner report template
├── environment.md          # Phase 4: docs/environment.md template — incl. "How to Run It Locally"
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
├── board-state.schema.json # Phase 4: the taskboard spine's schema (BOARD.md projects from it)
└── commit-message.md       # Conventional commit guidelines

docs/audits/                # Point-in-time audits and their remediation plans

AGENTS.md                   # The agent contract (summary; detailed AGENTS/*.md files win)
CHANGELOG.md                # What changed in each version, and why
RELEASE.md                  # Getting a merge to main into running sessions
package.json                # npm metadata + `npm run verify` / `npm run validate-board`
```

## Design Decisions

**Build order is manifest-derived, and skipping a layer is not allowed.** Each project type's `manifest.md` sets its own Phase 4 build order; the SaaS default is Schema → Migration → API → Component → Page → Integration → Test. What is invariant is that the Worker follows the order in its brief and skips no layer that applies — skipping creates hidden dependencies that fail silently later. A `library` or `cli` project has a different order, not a violated one.

**Markdown is the source of truth — so markdown gets a test suite.** There is no build step and no runtime (ADR-008): the instruction files *are* the system. That makes an instruction bug indistinguishable from a code bug in impact and much easier to miss, so `npm run verify` is the regression suite — 24 check groups, ~190 assertions, zero dependencies, run in CI on every push. It executes each dispatch verification command against the real template it targets, enforces the dispatch chokepoint, checks the summary contract against the specs it summarizes, and dry-runs the build loop against fixture deliverables. **Every instruction fix ships with the assertion that would have caught it.**

**Enforcement stays inside the no-runtime constraint.** Where a rule needed teeth, it got a schema constraint plus an on-demand check an agent is told to run (`validate-board-state.mjs`) — never a lock, a daemon, or a database. Real file locking on the taskboard was considered and rejected: it would make the board a runtime dependency.

**Scope is a hard boundary.** Anything that arrives mid-phase goes to `PARKING_LOT.md`. Nothing gets built outside the approved scope without a new phase gate. This prevents the most common AI-assisted dev failure: the "while I'm in here..." spiral.

**One artifact per session.** Finishing one document cleanly is worth more than starting three. The constraint forces prioritization and keeps PHASE_STATE.md trustworthy.

**Escalation over assumption.** Workers and validators execute only. If they hit something ambiguous, they escalate — they never make product or design decisions autonomously.

## Acknowledgements

Anymake began as an exploration of the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method for Agile AI-Driven Development) and owes that project a debt for the original spark — agentic, agile, phase-driven building. It has since grown into its own system with a distinct architecture (the 0–5 phase gates, the project-type engine, the Orchestrator → Planner → Worker → Validator loop, and the autonomous Product Owner Proxy). Credit to BMAD-METHOD as the inspiration; Anymake is an independent project.

## License

MIT — see [package.json](package.json).

## Contributing

This repo is instructions, not code — but the instructions have a test suite,
and it runs in CI on every push and PR.

```bash
npm run verify           # the regression harness — must print ALL CHECKS PASSED
npm run validate-board   # validate a board-state.json against the schema
node .opencode/validate-board-state.mjs PROJECTS/<name>/.anymake/board-state.json
```

`npm run verify` is zero-dependency Node (no install step). It checks skill and
agent discovery, plugin hooks and model tiers, that every path reference
resolves, that every dispatch verification command actually matches the template
it targets, that no file instructs a raw sub-agent spawn outside the dispatch
chokepoint, that root `AGENTS.md` doesn't contradict the specs it summarizes,
that the dashboard has a column for every schema status, and more.

Two conventions matter when changing anything here:

1. **Every instruction fix ships with the assertion that would have caught it.**
   Markdown is the source of truth, so a broken instruction is a broken build —
   add the check to `.opencode/verify-plugin.mjs` in the same change.
2. **Wherever `AGENTS.md` and a detailed `AGENTS/*.md` file disagree, the
   detailed file wins.** Update both, or update the detailed one — never only
   the summary. Check [19] flags summary rules that don't trace to a spec.

Behavior changes (a gate that starts asking questions, a check that starts
finding more) belong in `CHANGELOG.md` as behavior changes, not as fixes.
`RELEASE.md` covers getting a merge to `main` into running sessions.

## Issues & Contributions

Report issues at [github.com/R3dy/Anymake/issues](https://github.com/R3dy/Anymake/issues).

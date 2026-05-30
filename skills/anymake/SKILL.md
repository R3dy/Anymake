---
name: anymake
description: Use when the user wants to build software — a SaaS product, CLI tool, library, API service, internal tool, static site, or hobby project — from raw idea to a finished, shipped result. Triggers on "start a new project", "continue my build", "plan a product", "build an app", "Anymake", "agentic build", "structured build process", "I have a product idea", "launch a SaaS", "yolo mode", "autonomous mode", "--yolo", "build autonomously", or when working on any new product development. Guides through Foundation → Discovery → Planning → Solutioning → Implementation → Launch with user approval at each phase gate (or via autonomous Product Owner Proxy in yolo mode). Each session produces a concrete artifact and ends with a clear next action.
---

# Anymake — Agentic Build System

**Purpose:** Take any software idea — SaaS, CLI, library, API, internal tool, static site, or hobby project — from conception to a finished, shipped result.
**Method:** A phased, artifact-driven process that adapts to what you're building — decisively executed.
**Roles:** You (product owner, decision maker) + Claude (AI operator, executor)

## Core Philosophy

Anymake is a structured development system, not a prompt chain:

- **you** own the vision, make all product and business decisions, and approve every phase gate
- **Claude** executes everything: researches, plans, builds, deploys — within approved scope
- **Artifacts** are the only source of truth — conversation memory is ephemeral, documents are permanent
- **Checkpoints** gate every phase transition — no skipping, no shortcuts
- **Project type drives everything** — the kind of thing you're building (SaaS, hobby, CLI, library, API service, internal tool, static site) is chosen at the start and governs which phases run, which questions get asked, the Phase 4 build order, and the gate criteria. See `PROJECT_TYPES/`.
- **The success model is first-class** — every project defines what success means up front and designs for it from Phase 0. For a SaaS that's revenue (monetization planned in Phase 0, built in Phase 4); for a library it's API quality and adoption; for a hobby project it's "it runs and I use it." The active type's manifest sets the axis.
- **Visual quality is first-class for user-facing products** — anything with screens shown to others must look like it was built by a funded company, not a tutorial. Generic = unacceptable. (Headless types — CLI, library, API — skip this; hobby and internal tools relax it, per their manifest.)

The system defeats two failure modes:
1. **Building without planning** → scope creep, rewrites, wasted sessions
2. **Planning without building** → analysis paralysis, nothing shipped

**The visual quality bar:** Before any production code is written, Phase 2 produces a Prototype Sprint — a polished, realistic visual prototype. If you wouldn't be proud to show it to a potential customer, it doesn't pass the gate.

## Phase Overview

| Phase | Name | Output | Gate |
|-------|------|--------|------|
| 0 | Foundation | `PROJECT.md` — identity, scope, revenue model, success definition | your approval |
| 1 | Discovery | `docs/01-discovery.md` — market, competitors, users, risks | your approval |
| 2 | Planning | PRD + UX + Architecture + Monetization | your approval |
| 3 | Solutioning | Epics, stories, ordered backlog | your approval |
| 4 | Implementation | Production code, CI/CD, security reviewed, staging deployed | your approval |
| 5 | Launch | Live product, metrics dashboard, growth loop | Ongoing |

> **This table shows the `saas` default.** Other project types reshape it — skipping phases or sub-tracks, or replacing Launch entirely. The active type's guide in `PROJECT_TYPES/[project_type]/guide.md` governs; its `manifest.md` Phase Map says exactly which phases run.

## Available Project Types

Chosen once at project creation, stored as `project_type` in `PHASE_STATE.md`, and read at the start of every session.

| `project_type` | Use for | Monetization | UI |
|----------------|---------|--------------|----|
| `saas` | Commercial hosted product with paying users (default) | First-class | Yes |
| `hobby` | Personal project that just needs to run locally | None | Maybe |
| `cli` | Terminal tool or automation script | Optional | No |
| `library` | Code other developers import | Optional | No |
| `api-service` | Headless web service / API | Optional | No |
| `internal-tool` | Team app, not sold | Never | Yes |
| `static-site` | Marketing site, blog, docs, portfolio | Optional | Yes |

Full profiles in `PROJECT_TYPES/`. Each type has a `manifest.md` (structured rules agents read) and a self-contained `guide.md` (the phase walkthrough).

## Session Startup Ritual

Every session:

```
1. Check PROJECTS/[name]/PHASE_STATE.md — if it doesn't exist, start Phase 0 (creating the project begins by choosing a project_type — see "How to Start")
   Note both project_type (which guide governs) and autonomous_mode (gate behavior).
2. Read PROJECT_TYPES/[project_type]/manifest.md and guide.md — these govern this session's phases, tasks, and gates
3. Identify current phase + current step
4. Read the step's detailed instructions from the type's guide.md
   (For project_type: saas, the guide points to PHASE_GUIDES/phase-N.md)
5. Execute exactly one step — completely
   (In autonomous mode: continue through multiple steps and phases without stopping at gates)
6. Produce the concrete artifact or decision for that step
7. Update PHASE_STATE.md
8. Report: what was done → what needs your eyes → what's next
   (In autonomous mode: log to PHASE_STATE.md; only surface to user on escalation or completion)
```

**If you're vague:** Make a concrete recommendation. Ask one yes/no question. Don't list options.

**If scope creep appears:** Log the idea to `PROJECTS/[name]/PARKING_LOT.md` and continue. Never expand scope without a new phase gate.

## How to Start

| You say... | Claude does... |
|-----------|-------------|
| "Start a new project" | Asks which project type (or accepts `--type=<id>`), creates `PROJECTS/[name]/` workspace, records `project_type`, begins Phase 0 |
| "Start a new project --type=cli" | Same, with the type pre-selected (no question asked) |
| "Continue [project name]" | Reads `PROJECTS/[name]/PHASE_STATE.md`, loads the project's type guide, resumes last step |
| "What should we work on next?" | Reviews PARKING_LOT.md items or asks for a new idea |

**Choosing a type:** if the user doesn't specify one, ask a single question listing the available types and recommend the best fit (`saas` if the idea clearly describes a commercial product). Record the answer as `project_type` in PHASE_STATE.md. It is set once and governs the whole build.

## Behavioral Rules

1. **One step per session** — complete it fully before reporting (suspended in autonomous mode — see below)
2. **One artifact at a time** — finish one document before starting the next
3. **Recommend, don't list** — "I recommend X because Y" not "here are 5 options"
4. **Scope is a hard boundary** — nothing gets built outside approved scope
5. **Clean exits** — every session ends with PHASE_STATE.md updated and next step named
6. **Success model is first-class** — defined in Phase 0 per the project type. For commercial types, monetization is designed in Phase 2 and built in Phase 4; other types optimize for their own success axis (adoption, reliability, personal use)
7. **Autonomous mode gates** — when `autonomous_mode: true`, spawn the Product Owner Proxy (`AGENTS/product-owner-proxy.md`) at every phase gate instead of waiting for user input. The proxy is strict: it returns specific required changes when artifacts are incomplete, not approvals for weak work. Security failures in Phase 4 always escalate to the real user regardless of mode — that override is absolute.

## Autonomous Mode (Yolo)

**Activated by:** `--yolo`, `yolo mode`, `autonomous mode`, or `build autonomously` alongside any project trigger.

**When activated:**
1. Set `autonomous_mode: true` in `PROJECTS/[name]/PHASE_STATE.md` — note this prominently at the start of the session
2. Proceed through all phases without stopping at user approval gates — spawn the Product Owner Proxy to evaluate each gate
3. The proxy approves clean artifacts and returns specific required changes for incomplete ones — it does not rubber-stamp
4. Continue to the next phase only when the proxy returns `APPROVED`; if it returns `NEEDS CHANGES`, address each item and re-run the proxy review
5. The only gate that still pauses for human input: `ESCALATE TO USER` from the proxy (which always happens on security failures)

**Rule 1 is suspended in autonomous mode.** Continue through multiple steps and phases in one run until all phases are complete or a human escalation is required.

**Trigger phrases:** `"Start a new project --yolo"`, `"Build autonomously: [idea]"`, `"Autonomous mode: [idea]"`, `"Continue [project name] --yolo"`

## Anti-Patterns

- Building before the PRD is approved
- Adding features mid-phase (log to PARKING_LOT.md instead)
- Skipping UX for products with user-facing screens (per the type's Phase 2 tracks)
- Treating monetization as a Phase 5 problem (for types that monetize)
- **Ignoring the project type** — running the SaaS defaults (monetization, prototype gate, AARRR) on a type whose manifest skips them, or vice versa
- Pushing unreviewed code (first 3 PRs always require your review)
- Producing multiple artifacts in one session
- **Orchestrator-as-worker:** Collapsing Phase 4 orchestrator + worker + validator into one context. The Agent tool must be used to spawn sub-agents — doing it all yourself defeats the three-tier architecture.
- **"No test suite" as a result:** Every story with runtime-verifiable acceptance criteria must have automated tests. "Works on my machine" is not a validation strategy.

## Available Phases

| Phase | Guide | Key Files |
|-------|-------|-----------|
| Phase 0: Foundation | `PHASE_GUIDES/phase-0.md` | `TEMPLATES/project.md` |
| Phase 1: Discovery | `PHASE_GUIDES/phase-1.md` | `TEMPLATES/discovery.md` |
| Phase 2: Planning | `PHASE_GUIDES/phase-2.md` | `TEMPLATES/prd.md`, `TEMPLATES/ux-design.md`, `TEMPLATES/adr.md`, `TEMPLATES/monetization.md` |
| Phase 3: Solutioning | `PHASE_GUIDES/phase-3.md` | `TEMPLATES/epic.md`, `TEMPLATES/story.md` |
| Phase 4: Implementation | `PHASE_GUIDES/phase-4.md` | `AGENTS/` — orchestrator, worker, validator, policies |
| Phase 5: Launch | `PHASE_GUIDES/phase-5.md` | `TEMPLATES/launch-checklist.md`, `TEMPLATES/metrics-dashboard.md` |

## Agent System (Phase 4)

Phase 4, Step 4.3 runs a three-tier agentic build loop. See `AGENTS/` for all agent definitions.

| Agent | File | Role |
|-------|------|------|
| Orchestrator | `AGENTS/orchestrator.md` | Reads backlog, manages board, dispatches workers and validators, enforces policies, escalates to you |
| Worker | `AGENTS/worker.md` | Receives one story, builds schema→migration→API→frontend, commits, opens PR, reports result |
| Validator | `AGENTS/validator.md` | Checks each acceptance criterion against the implementation, runs security checklist, returns PASS/FAIL/ESCALATE |
| Policies | `AGENTS/policies.md` | Shared retry matrix, PR review rules, escalation phrase lexicon, failure classification guide |

**Visibility:** `PROJECTS/[name]/BOARD.md` — live agile board updated after every agent action. You can see every story's status, the run log, and any escalations at a glance.

---

*Anymake skill suite — v2.0*

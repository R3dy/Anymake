---
name: bmad-builder
description: Use when the user wants to build a SaaS product — from raw idea to live, revenue-generating product. Triggers on "start a new project", "continue my build", "plan a product", "build an app", "BMad", "agentic build", "structured build process", "I have a product idea", "launch a SaaS", "yolo mode", "autonomous mode", "--yolo", "build autonomously", or when working on any new product development. Guides through Foundation → Discovery → Planning → Solutioning → Implementation → Launch with user approval at each phase gate (or via autonomous Product Owner Proxy in yolo mode). Each session produces a concrete artifact and ends with a clear next action.
---

# BMad Builder — Agentic SaaS Build System

**Purpose:** Take any SaaS product idea from conception to live, revenue-generating product.
**Method:** BMad (Business-model Artificial intelligence Developer) — phased, artifact-driven, decisively executed
**Roles:** You (product owner, decision maker) + Claude (AI operator, executor)

## Core Philosophy

BMad is a structured development system, not a prompt chain:

- **you** own the vision, make all product and business decisions, and approve every phase gate
- **Claude** executes everything: researches, plans, builds, deploys — within approved scope
- **Artifacts** are the only source of truth — conversation memory is ephemeral, documents are permanent
- **Checkpoints** gate every phase transition — no skipping, no shortcuts
- **Revenue is first-class** — monetization is planned in Phase 0, built in Phase 4, not bolted on post-launch
- **Visual quality is first-class** — every user-facing product must look and feel like it was built by a funded SaaS company, not a tutorial. Generic = unacceptable.

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

## Session Startup Ritual

Every session:

```
1. Check PROJECTS/[name]/PHASE_STATE.md — if it doesn't exist, start Phase 0
   Also check: is autonomous_mode: true set? This determines gate behavior for the session.
2. Identify current phase + current step
3. Read PHASE_GUIDES/phase-N.md for the detailed instructions for that step
4. Execute exactly one step — completely
   (In autonomous mode: continue through multiple steps and phases without stopping at gates)
5. Produce the concrete artifact or decision for that step
6. Update PHASE_STATE.md
7. Report: what was done → what needs your eyes → what's next
   (In autonomous mode: log to PHASE_STATE.md; only surface to user on escalation or completion)
```

**If you're vague:** Make a concrete recommendation. Ask one yes/no question. Don't list options.

**If scope creep appears:** Log the idea to `PROJECTS/[name]/PARKING_LOT.md` and continue. Never expand scope without a new phase gate.

## How to Start

| You say... | Claude does... |
|-----------|-------------|
| "Start a new project" | Creates `PROJECTS/[name]/` workspace, begins Phase 0 |
| "Continue [project name]" | Reads `PROJECTS/[name]/PHASE_STATE.md`, resumes last step |
| "What should we work on next?" | Reviews PARKING_LOT.md items or asks for a new idea |

## Behavioral Rules

1. **One step per session** — complete it fully before reporting (suspended in autonomous mode — see below)
2. **One artifact at a time** — finish one document before starting the next
3. **Recommend, don't list** — "I recommend X because Y" not "here are 5 options"
4. **Scope is a hard boundary** — nothing gets built outside approved scope
5. **Clean exits** — every session ends with PHASE_STATE.md updated and next step named
6. **Revenue is first-class** — monetization is designed in Phase 2, built in Phase 4
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
- Skipping UX for products with user-facing screens
- Treating monetization as a Phase 5 problem
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

*BMad Builder skill suite — v2.0*

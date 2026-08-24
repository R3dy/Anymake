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
| `agentic-harness` | Multi-stage pipeline of sandboxed LLM agents (canonical handoffs, pluggable backend, tracing, control dashboard) | Rare | Thin (control/observability only) |

Full profiles in `PROJECT_TYPES/`. Each type has a `manifest.md` (structured rules agents read) and a self-contained `guide.md` (the phase walkthrough).

## Session Startup Ritual

Every session:

```
0. BOARD-WRITE (ADR-013 — session-wide communication channel):
   On session start, before step 1:
   a. Generate a session ID (ISO timestamp + short random suffix, e.g.
      "2026-08-24T14:32-s4k9").
   b. Append a session_start event to PROJECTS/[name]/.anymake/session-log.jsonl
      (create the file if absent — pure append, one JSON line, no
      read-modify-write):
      {"ts":"<ISO>","story":null,"agent":"hub","type":"session_start",
       "session":"<id>","detail":"Session started on <project>"}
   c. Read PROJECTS/[name]/.anymake/board-state.json (create it from
      TEMPLATES/board-state.schema.json if absent — initialize project, run_id,
      concurrency {max:3,current:0}, in_flight:[], stories:[], events:[]).
      Perform a SINGLE read-modify-write to set the top-level `session` object:
      {"id":"<id>","started":"<ISO>","phase":null,"step":null}
      (The hub writes ONLY the `session` object on board-state.json — NEVER
      appends to events[]. The orchestrator owns events[] exclusively during
      Phase 4. See ADR-013 writer split — eliminates the concurrent-writer
      race.)
   After step 5 (execute one step): append a phase_step event to
   session-log.jsonl:
      {"ts":"<ISO>","story":null,"agent":"hub","type":"phase_step",
       "session":"<id>","detail":"Phase N Step M — <step name>"}
   Optionally update board-state.json's session.phase/session.step in place.
   After step 6 (produce artifact): append an artifact event:
      {"ts":"<ISO>","story":null,"agent":"hub","type":"artifact",
       "session":"<id>","artifact":"<path>","detail":"<artifact name>"}
   On checkpoint write (autonomous mode): append a checkpoint event.
   On escalation: append an escalation event.
   On session end (step 8 report): append a session_end event.
   The hub NEVER writes board-state.json events[] — only session-log.jsonl
   (append-only) + the session object (once at start, updated in place on
   phase/step advance).
1. Check PROJECTS/[name]/PHASE_STATE.md — if it doesn't exist, start Phase 0 (creating the project begins by choosing a project_type — see "How to Start")
   Note both project_type (which guide governs) and autonomous_mode (gate behavior).
2. Read PROJECT_TYPES/[project_type]/manifest.md and guide.md — these govern this session's phases, tasks, and gates
3. Identify current phase + current step
4. Read the step's detailed instructions from the type's guide.md
   (For project_type: saas, the guide points to PHASE_GUIDES/phase-N.md)
5. Execute exactly one step — completely
   (In autonomous mode: continue through multiple steps and phases without stopping at gates)
   (If the current step has a companion skill — see "Companion Skills" — invoke it via the `Skill` tool to do that step's work, then continue)
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
| "Adopt Anymake in this repo" / "I already have code" | Invokes the `anymake-brownfield` skill to reverse-engineer the Phase 0–3 artifacts from the existing codebase, then resumes the normal flow |
| "Continue [project name]" | Reads `PROJECTS/[name]/PHASE_STATE.md`, loads the project's type guide, resumes last step (if already launched, invokes `anymake-iterate`) |
| "What should we work on next?" | Reviews PARKING_LOT.md items or asks for a new idea (post-launch, invokes `anymake-iterate`) |
| "[X] isn't working" / "I found a bug" / "Add/change/remove [feature]" on a built project | Invokes `anymake-agile` — the single post-launch front door: confirmed intake → tracked GitHub issue → Solution Architect plan (checked against the engineering-intent layer, contradictions gated behind a superseding decision) → independent Plan Reviewer approval → build via `anymake-build-loop` → reporter verification. Never jumps straight to troubleshooting |

**Choosing a type:** if the user doesn't specify one, ask a single question listing the available types and recommend the best fit (`saas` if the idea clearly describes a commercial product). Record the answer as `project_type` in PHASE_STATE.md. It is set once and governs the whole build.

## Behavioral Rules

1. **One step per session** — complete it fully before reporting (suspended in autonomous mode — see below)
2. **One artifact at a time** — finish one document before starting the next
3. **Recommend, don't list** — "I recommend X because Y" not "here are 5 options"
4. **Scope is a hard boundary** — nothing gets built outside approved scope
5. **Clean exits** — every session ends with PHASE_STATE.md updated and next step named
6. **Success model is first-class** — defined in Phase 0 per the project type. For commercial types, monetization is designed in Phase 2 and built in Phase 4; other types optimize for their own success axis (adoption, reliability, personal use)
7. **Autonomous mode gates** — when `autonomous_mode: true`, dispatch the Product Owner Proxy (`AGENTS/product-owner-proxy.md`) via the `anymake-dispatch` skill at every phase gate instead of waiting for user input. The proxy is strict: it returns specific required changes when artifacts are incomplete, not approvals for weak work. Security failures in Phase 4 always escalate to the real user regardless of mode — that override is absolute.

## Autonomous Mode (Yolo)

**Activated by:** `--yolo`, `yolo mode`, `autonomous mode`, or `build autonomously` alongside any project trigger.

**When activated:**
1. Set `autonomous_mode: true` in `PROJECTS/[name]/PHASE_STATE.md` — note this prominently at the start of the session
2. Proceed through all phases without stopping at user approval gates — dispatch the Product Owner Proxy via `anymake-dispatch` to evaluate each gate
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
- **Orchestrator-as-worker:** Collapsing Phase 4 orchestrator + planner + worker + validator + experience runner into one context. Sub-agents must be dispatched via the `anymake-dispatch` skill (INV-018) — doing it all yourself defeats the five-stage architecture.
- **"No test suite" as a result:** Every story with runtime-verifiable acceptance criteria must have automated tests. "Works on my machine" is not a validation strategy.
- **"Validator PASS" as the finish line:** A story is not done until it also has an Experience Runner PASS (or an explicit §3a: N/A) — someone, human or agent, has to have actually driven it.

## Available Phases

| Phase | Guide | Key Files | Companion skill |
|-------|-------|-----------|-----------------|
| Phase 0: Foundation | `PHASE_GUIDES/phase-0.md` | `TEMPLATES/project.md` | `anymake-brownfield` (existing-code path) |
| Phase 1: Discovery | `PHASE_GUIDES/phase-1.md` | `TEMPLATES/discovery.md` | — |
| Phase 2: Planning | `PHASE_GUIDES/phase-2.md` | `TEMPLATES/prd.md`, `TEMPLATES/ux-design.md`, `TEMPLATES/adr.md`, `TEMPLATES/monetization.md` | `anymake-design-system` (Step 2.2b) |
| Phase 3: Solutioning | `PHASE_GUIDES/phase-3.md` | `TEMPLATES/epic.md`, `TEMPLATES/story.md`, `TEMPLATES/experience-script.md` | `anymake-experience-setup` (3.2b) |
| Phase 4: Implementation | `PHASE_GUIDES/phase-4.md` | `AGENTS/` — orchestrator, planner, worker, validator, experience-runner, arbiter | `anymake-build-loop` (4.3), `anymake-security-review` (4.5), `anymake-deploy` (staging), `anymake-experience-check` (4.6) |
| Phase 5: Launch | `PHASE_GUIDES/phase-5.md` | `TEMPLATES/launch-checklist.md`, `TEMPLATES/metrics-dashboard.md` | `anymake-deploy` (5.2), `anymake-iterate` (5.6) |

## Agent System (Phase 4)

Phase 4, Step 4.3 runs a five-stage agentic build loop. See `AGENTS/` for all agent definitions.

| Agent | File | Role |
|-------|------|------|
| Orchestrator | `AGENTS/orchestrator.md` | Reads backlog, manages board, dispatches planners, workers, validators, and experience runners, enforces policies, escalates to you |
| Planner | `AGENTS/planner.md` | Receives one story ID, translates it (+ ADRs, intent layer, `CONVENTIONS.md`, `docs/environment.md`) into a self-contained task brief including a literal Experience Script (§3a); never codes |
| Worker | `AGENTS/worker.md` | Receives the approved brief, builds schema→migration→API→frontend, commits, opens PR, reports result, records any new pattern to `CONVENTIONS.md` |
| Validator | `AGENTS/validator.md` | Checks each acceptance criterion against the implementation, runs security checklist, defers Human-Only criteria with §3a coverage to the Experience Runner, returns PASS/FAIL/ESCALATE |
| Experience Runner | `AGENTS/experience-runner.md` | Launches the real application on the story's branch and drives it exactly as scripted in §3a — clicking, typing, running commands, sending requests — comparing actual results to the scripted expectation; never edits code |
| Arbiter | `AGENTS/arbiter.md` | The shared rulebook (read, never spawned): retry matrix, PR review rules (incl. ADR-touching and experience-gate overrides), escalation phrase lexicon, failure classification, intent conflict + agile plan review policies |

**Visibility:** `PROJECTS/[name]/BOARD.md` — live agile board updated after every agent action. You can see every story's status, the run log, and any escalations at a glance.

**Post-launch agents:** the **Cartographer** (`AGENTS/cartographer.md`) is a read-only mapping agent used by `anymake-agile` to build and refresh the engineering-intent layer (`docs/SYSTEM_MAP.md`, `DECISIONS.md`, `INVARIANTS.md`) so later changes don't contradict the original design. The **Solution Architect** (`AGENTS/solution-architect.md`) and **Plan Reviewer** (`AGENTS/plan-reviewer.md`) are the design/review pair behind `anymake-agile` — the architect writes a full development plan for a tracked issue, the reviewer independently approves or rejects it before any code is written.

## Companion Skills

Anymake is a **skill suite**: this hub owns the methodology and the state machine,
and delegates self-contained capabilities to companion skills. They are
discovered natively (the plugin registers the `skills/` directory) and invoked
via the `Skill` tool — either by the hub at the step noted below, or directly
when the user's request matches the companion's own triggers. Each companion
reads the same `PROJECT_TYPES/<id>/manifest.md`, `PHASE_STATE.md`, and templates,
so state and conventions never fork. See `skills/README.md` for the full map.

| Companion skill | Owns | Hub invokes it at… |
|-----------------|------|--------------------|
| `anymake-build-loop` | The five-stage agentic build engine (Orchestrator → Planner → Worker → Validator → Experience Runner) over a backlog — the last stage actually launches and drives the built app before a story counts as done | **Phase 4, Step 4.3** |
| `anymake-experience-setup` | Builds the testing harness: authors Experience Scripts across a backlog, audits coverage, sets up `docs/environment.md` | **Phase 3, Step 3.2b** (and retrofit mode inside `anymake-brownfield`) |
| `anymake-experience-check` | Uses the testing harness on demand: launches and drives the app against a story, PR, or a staging/production URL, outside the automated loop | **Phase 4, Step 4.6** (staging review) and the `anymake-agile` Verify step |
| `anymake-design-system` | The visual-quality bar: design system + Prototype Sprint + prototype-gate audit | **Phase 2, Step 2.2b** (UX-active types) |
| `anymake-security-review` | The per-PR checklist, the full security pass, and the pre-launch security gate | **Phase 4, Step 4.5** (and inside the Validator; pre-launch) |
| `anymake-deploy` | Deployment & infrastructure — staging, production, env/secrets, monitoring, rollback | **Phase 4** staging and **Phase 5, Step 5.2** (production) |
| `anymake-brownfield` | Onboarding an existing codebase — reverse-engineers Phase 0–3 artifacts | **Instead of Phase 0** when the user points at existing code |
| `anymake-iterate` | The post-launch loop ("Phase 6") — triage, metrics→epics, release planning | **Phase 5, Step 5.6** onward, or on "Continue" when already launched |
| `anymake-agile` | The single post-launch pipeline for changing a built product — confirmed intake, labeled GitHub issue, Solution Architect development plan (intent-layer checked, contradictions gated behind a superseding decision), independent Plan Reviewer approval loop, traceable build via `anymake-build-loop`, reporter verification | When the **user reports a bug or requests any add/change/remove** on a built project, or when **`anymake-iterate` picks an increment to build** |
| `anymake-new-type` | Authoring a new project type (`manifest.md` + `guide.md`) | When **extending the type system** |
| `anymake-dispatch` | Hardened, host-agnostic sub-agent dispatch — the single chokepoint for spawning any agent (Planner, Worker, Validator, Experience Runner, Proxy, Cartographer, Architect, Reviewer). Wraps the host's `Agent`/`Task` primitive with pre-dispatch prompt assembly (WRITE THE FILE FIRST), mandatory post-dispatch deliverable verification, structured RETRY CONTEXT, and a dispatch log to `BOARD.md`. Never call the host's dispatch primitive directly | Whenever **any agent needs to spawn another** — Phase 4 build loop, agile flow, phase-gate proxy spawns |

**How to delegate:** at a delegating step, invoke the named companion via the
`Skill` tool, let it complete its one job (it reads/updates the same project
state), then continue the phase. The hub never re-implements what a companion
owns; companions never re-run the phase machine.

---

*Anymake skill suite — v3.0*

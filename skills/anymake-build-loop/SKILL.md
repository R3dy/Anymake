---
name: anymake-build-loop
description: Use to run the five-stage agentic build loop — an Orchestrator that dispatches Planners (one story brief each), Workers (one story each), Validators (one PR each), and Experience Runners (one live app drive-through each) over an ordered backlog until it is done. Triggers on "run the build loop", "implement my backlog", "build these stories", "agentic build", "start the worker/validator loop", or Anymake Phase 4 Step 4.3. Works standalone on any repo that has an ordered backlog of stories with acceptance criteria — not only inside a full Anymake project.
---

# Anymake Build Loop — Five-Stage Agentic Implementation Engine

The autonomous build engine. Given an **ordered backlog of stories** (each with
acceptance criteria), it builds them one at a time through a strict
Orchestrator → Planner → Worker → Validator → Experience Runner loop, opening a
PR per story and tracking everything on a live board. A Validator PASS checks
the code against the contract; the Experience Runner then actually launches the
app and drives it — clicking, typing, running commands, sending requests — to
confirm the story behaves the way a person would experience it, not just the
way the code reads. Neither stage substitutes for the other.

This is Anymake **Phase 4, Step 4.3** extracted as a reusable skill. It assumes
scaffolding, auth, and the base data layer already exist (Phase 4 Steps 4.1–4.2,
or an existing repo). It does **not** run the phase machine — it builds a backlog.

## When to use

- The hub invokes this at **Phase 4, Step 4.3** once the backlog from Phase 3 is approved.
- Directly, on any repo that already has: a runnable dev environment, and an
  ordered list of stories with testable acceptance criteria.

## Inputs it reads

| Input | Where | Purpose |
|-------|-------|---------|
| Ordered backlog + dependency graph | `PROJECTS/[name]/` (Phase 3 output) or a backlog file you point it at | What to build and in what order |
| `project_type` manifest | `PROJECT_TYPES/<id>/manifest.md` | Phase 4 **Build Order** (overrides the SaaS default), gate deltas, **Experience Harness** interaction mode |
| `docs/environment.md` | Phase 4 Step 4.1 output | Exact launch command, ready signal, base URL/entry point, test account — what the Experience Runner uses to actually start the app |
| Agent definitions | `AGENTS/orchestrator.md`, `AGENTS/planner.md`, `AGENTS/worker.md`, `AGENTS/validator.md`, `AGENTS/experience-runner.md`, `AGENTS/arbiter.md` | The full instructions for each stage |
| Templates | `TEMPLATES/task-brief.md`, `TEMPLATES/conventions.md`, `TEMPLATES/BOARD.md`, `TEMPLATES/validation-report.md`, `TEMPLATES/experience-script.md`, `TEMPLATES/experience-report.md` | Worker task spec, the accumulated-patterns file, the board, validator reports, the interaction-script format, experience reports |

## The five stages

| Stage | Definition | Role |
|-------|------------|------|
| **Orchestrator** | `AGENTS/orchestrator.md` | Reads backlog + dependency graph, maintains `BOARD.md`, dispatches one Planner per ready story, approves the brief for completeness, dispatches one Worker per approved brief, one Validator per PR, and one Experience Runner per Validator PASS, enforces policies, escalates. Never writes feature code or task brief content. |
| **Planner** | `AGENTS/planner.md` | Receives ONE story ID, translates it — plus ADRs, the intent layer, `CONVENTIONS.md`, and `docs/environment.md` — into a self-contained task brief (`TEMPLATES/task-brief.md`), including §3a Experience Script. Copies acceptance criteria verbatim; never invents scope. Never writes code. |
| **Worker** | `AGENTS/worker.md` | Receives the approved task brief, implements in strict layer order (the type's manifest Build Order; SaaS default Schema → Migration → API → Component → Page → Integration → Test), commits each layer, opens a PR, reports, and appends any new reusable pattern to `CONVENTIONS.md`. |
| **Validator** | `AGENTS/validator.md` | Checks every acceptance criterion against the implementation, runs the security checklist, defers Human-Only criteria with §3a coverage to the Experience Runner rather than escalating them, returns PASS / FAIL / ESCALATE. |
| **Experience Runner** | `AGENTS/experience-runner.md` | Checks out the branch, launches the real app per `docs/environment.md`, and executes every scenario in the task brief's §3a — clicking, typing, running commands, sending requests — comparing the actual observed result to the scripted expectation. Diagnoses failures with a file:line pointer; never edits code. Returns PASS / FAIL / ESCALATE. |

**Each stage MUST be a separate sub-agent (the `Agent`/subagent tool).** Collapsing
orchestrator + planner + worker + validator + experience runner into one context
defeats the architecture — this is the cardinal anti-pattern.

## How to run it

1. **Set up the board.** Copy `TEMPLATES/BOARD.md` to `PROJECTS/[name]/BOARD.md`
   with every story as a card in `Backlog`. (Skip if it already exists.)
2. **Become the Orchestrator.** Load `AGENTS/orchestrator.md` and follow it.
3. **Per ready story:** spawn a Planner sub-agent to write the task brief
   (`TEMPLATES/task-brief.md` — story + acceptance criteria + the type's build
   order + patterns from `CONVENTIONS.md` + §3a Experience Script from
   `docs/environment.md`); check the brief for completeness, then spawn a
   Worker sub-agent from it.
4. **Per PR:** spawn a Validator sub-agent; it returns PASS / FAIL / ESCALATE
   using `TEMPLATES/validation-report.md`.
5. **Per Validator PASS (unless §3a is `N/A`):** spawn an Experience Runner
   sub-agent; it launches the app and drives it through every §3a scenario,
   returning PASS / FAIL / ESCALATE using `TEMPLATES/experience-report.md`. A
   story is not done on a Validator PASS alone.
6. **Apply policies** (`AGENTS/arbiter.md`): retry matrix (max 2 environment
   re-dispatches; a validation or experience FAIL retries once — straight back
   to the Worker, no Planner re-run — then escalate; implementation failures
   escalate immediately); PR review rules (PRs #1–3, any webhook PR, and any PR
   touching an ADR always require human review; others merge on Validator PASS
   **and** Experience Runner PASS); escalation lexicon.
7. **Update `BOARD.md` after every agent action.** It is the single visibility surface.
8. **Loop** until the backlog is empty or an `ESCALATE TO USER` blocks progress.

## Escalation & autonomous mode

- Security-sensitive work (auth, payments, webhooks) or unresolved ambiguity →
  `ESCALATE TO USER`, which pauses for a human **regardless of mode**.
- In `autonomous_mode: true`, non-security gate decisions route to the Product
  Owner Proxy (`AGENTS/product-owner-proxy.md`) instead of stopping; security
  escalations still go to the real user.

## Done when

Every story is `Done` on the board, every merged PR passed validation **and**
its Experience Runner check (or was explicitly N/A), and the run log + any
escalations are recorded in `BOARD.md`. Hand back to the hub for Phase 4
Step 4.5 (security review) and 4.6 (staging review).

## Anti-patterns

- Orchestrator-as-worker (one context doing all five stages, including authoring the task brief itself).
- Skipping layers in the build order (creates hidden dependencies).
- Merging a PR on a Validator PASS alone, without a matching Experience Runner PASS (or an explicit §3a: N/A) — a passing test suite is not the same claim as "a person clicked through it and it worked."
- Waiving a Human-Only criterion because the relevant code exists, without an Experience Runner (or, for the narrow genuinely-unscriptable case, a documented human waiver) ever actually driving it.
- Merging a PR without a Validator PASS, or merging PRs #1–3 (or any ADR-touching PR) without human review.
- Letting the board drift from reality.
- "No test suite" — every story with runtime-verifiable criteria gets automated tests.

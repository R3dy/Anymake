---
name: anymake-build-loop
description: Use to run the three-tier agentic build loop — an Orchestrator that dispatches Workers (one story each) and Validators (one PR each) over an ordered backlog until it is done. Triggers on "run the build loop", "implement my backlog", "build these stories", "agentic build", "start the worker/validator loop", or Anymake Phase 4 Step 4.3. Works standalone on any repo that has an ordered backlog of stories with acceptance criteria — not only inside a full Anymake project.
---

# Anymake Build Loop — Three-Tier Agentic Implementation Engine

The autonomous build engine. Given an **ordered backlog of stories** (each with
acceptance criteria), it builds them one at a time through a strict
Orchestrator → Worker → Validator loop, opening a PR per story and tracking
everything on a live board.

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
| `project_type` manifest | `PROJECT_TYPES/<id>/manifest.md` | Phase 4 **Build Order** (overrides the SaaS default), gate deltas |
| Agent definitions | `AGENTS/orchestrator.md`, `AGENTS/worker.md`, `AGENTS/validator.md`, `AGENTS/policies.md` | The full instructions for each tier |
| Templates | `TEMPLATES/task-brief.md`, `TEMPLATES/BOARD.md`, `TEMPLATES/validation-report.md` | Worker task spec, the board, validator reports |

## The three tiers

| Tier | Definition | Role |
|------|------------|------|
| **Orchestrator** | `AGENTS/orchestrator.md` | Reads backlog + dependency graph, maintains `BOARD.md`, dispatches one Worker per ready story and one Validator per PR, enforces policies, escalates. Never writes feature code. |
| **Worker** | `AGENTS/worker.md` | Receives ONE story via a task brief, implements in strict layer order (the type's manifest Build Order; SaaS default Schema → Migration → API → Component → Page → Integration → Test), commits each layer, opens a PR, reports. |
| **Validator** | `AGENTS/validator.md` | Checks every acceptance criterion against the implementation, runs the security checklist, returns PASS / FAIL / ESCALATE. |

**Each tier MUST be a separate sub-agent (the `Agent`/subagent tool).** Collapsing
orchestrator + worker + validator into one context defeats the architecture —
this is the cardinal anti-pattern.

## How to run it

1. **Set up the board.** Copy `TEMPLATES/BOARD.md` to `PROJECTS/[name]/BOARD.md`
   with every story as a card in `Backlog`. (Skip if it already exists.)
2. **Become the Orchestrator.** Load `AGENTS/orchestrator.md` and follow it.
3. **Per ready story:** spawn a Worker sub-agent with a task brief built from
   `TEMPLATES/task-brief.md` (story + acceptance criteria + the type's build order).
4. **Per PR:** spawn a Validator sub-agent; it returns PASS / FAIL / ESCALATE
   using `TEMPLATES/validation-report.md`.
5. **Apply policies** (`AGENTS/policies.md`): retry matrix (max 2 environment
   re-dispatches; a validation FAIL retries once, then escalate; implementation
   failures escalate immediately); PR review rules (PRs #1–3 and any webhook PR
   always require human review; others merge on Validator PASS); escalation lexicon.
6. **Update `BOARD.md` after every agent action.** It is the single visibility surface.
7. **Loop** until the backlog is empty or an `ESCALATE TO USER` blocks progress.

## Escalation & autonomous mode

- Security-sensitive work (auth, payments, webhooks) or unresolved ambiguity →
  `ESCALATE TO USER`, which pauses for a human **regardless of mode**.
- In `autonomous_mode: true`, non-security gate decisions route to the Product
  Owner Proxy (`AGENTS/product-owner-proxy.md`) instead of stopping; security
  escalations still go to the real user.

## Done when

Every story is `Done` on the board, every merged PR passed validation, and the
run log + any escalations are recorded in `BOARD.md`. Hand back to the hub for
Phase 4 Step 4.5 (security review) and 4.6 (staging review).

## Anti-patterns

- Orchestrator-as-worker (one context doing all three tiers).
- Skipping layers in the build order (creates hidden dependencies).
- Merging a PR without a Validator PASS, or merging PRs #1–3 without human review.
- Letting the board drift from reality.
- "No test suite" — every story with runtime-verifiable criteria gets automated tests.

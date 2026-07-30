---
name: anymake-agile
description: Use when the user reports a bug or requests a feature on a project Anymake has already built — "the save button isn't working", "X is broken", "I found a bug", "it should also do Y", "feature request", "log an issue". Runs the full agile pipeline instead of ad-hoc troubleshooting - first understands and confirms the exact issue, tracks it as a labeled GitHub issue, has a Solution Architect design a reviewed development plan, has an independent Plan Reviewer approve it, and only then builds — with full traceability so any change can be reverted. This is the front door for manual-testing feedback; anymake-evolve is the execution machinery it invokes.
---

# Anymake Agile — From "This Button Isn't Working" to a Reviewed, Reverted-able Fix

When a user reports a bug from manual testing, the ad-hoc failure mode is to
jump straight to troubleshooting: guess a cause, push a fix, hope. Maybe it
works; maybe it breaks two other things. This skill replaces that with the
process a real dev team runs: **understand → track → design → review → approve
→ build → verify** — where nothing is coded until an independently reviewed
plan exists, and everything is tagged so a bad change reverts in one command.

The four promises this pipeline exists to keep:

1. The shipped change **fixes the reported issue / delivers the requested feature** — not an adjacent guess
2. It **breaks nothing else** — blast radius mapped and regression-tested before build
3. New UI **looks designed-in from day one** — checked against the design system, never bolted on
4. Everything is **traceable and revertible** — issue ↔ plan ↔ branch ↔ merge SHA ↔ revert command

## When to use

- The user reports something broken on a built project: "such-and-such button
  isn't working correctly", "I'm seeing an error when…"
- The user requests a feature and wants it properly tracked and planned
- Directly: "log an issue", "report a bug", "run the agile flow on this"

> **Not this skill if:** the question is "what should we build next?" (that's
> `anymake-iterate` — prioritization), or the repo has no Anymake workspace
> (that's `anymake-brownfield` first). This skill *invokes* `anymake-evolve`'s
> intent machinery and `anymake-build-loop` at execution time — it doesn't
> replace them.

## The cast

| Role | Definition | Owns |
|------|------------|------|
| Main agent (you) | this skill | Intake with the reporter, issue tracking, orchestration of the stages, state |
| **Solution Architect** | `AGENTS/solution-architect.md` | Full-project review + the Development Plan (`TEMPLATES/dev-plan.md`). Never touches code |
| **Plan Reviewer** | `AGENTS/plan-reviewer.md` | Adversarial review of the plan (`TEMPLATES/plan-review.md`). Fresh context each round; never edits the plan |
| Cartographer | `AGENTS/cartographer.md` | Refreshing the intent layer before design, and after merge |
| Build engine | `anymake-build-loop` (Orchestrator → Worker → Validator) | Building the approved stories |

Architect and Reviewer **must be separate sub-agents** — the thing that designs
is never the thing that approves. Same law as Phase 4's Worker/Validator split;
collapsing them is the cardinal anti-pattern.

## Per-issue workspace

```
PROJECTS/[name]/docs/06-agile/
├── ISSUES.md                # local ledger — mirror of issue index (or primary tracker if no GitHub remote)
└── issue-[N]/
    ├── plan.md              # the Development Plan (TEMPLATES/dev-plan.md)
    ├── review-round-1.md    # Plan Reviewer reports (TEMPLATES/plan-review.md)
    └── review-round-K.md
```

## The pipeline

### 1. Intake — understand before anything

Do **not** open the code to troubleshoot. First get the report exactly right:

- Capture the reporter's words verbatim (they go in the issue unedited)
- Ask the minimum questions that pin it down: steps, expected vs actual, which
  screen/command, environment. For features: the problem behind the ask
- Attempt to reproduce (or state why you couldn't)
- **Restate the issue in system terms** (modules/flows from `docs/SYSTEM_MAP.md`)
  and get the reporter's explicit confirmation: "Is this exactly it?"

Intake gate: no confirmation, no issue. This gate is always the real reporter —
they're in the conversation — in every mode.

### 2. Track — a labeled issue in the project's repo

Create a GitHub issue in the **product repo** using `TEMPLATES/issue.md` and
`gh issue create`, with labels (create labels idempotently on first use):

| Dimension | Labels |
|-----------|--------|
| Type | `type:bug` / `type:feature` / `type:chore` |
| Severity (bugs) | `severity:critical` / `severity:major` / `severity:minor` |
| Status lifecycle | `status:intake` → `status:planning` → `status:plan-review` → `status:approved` → `status:in-progress` → `status:verifying` → closed (or `status:escalated`) |

Advance the status label at every stage transition; mirror a one-line entry in
`docs/06-agile/ISSUES.md`. No GitHub remote → the ledger is the tracker and
"issue #N" is its row number; everything else is identical.

### 3. Solution — spawn the Solution Architect

First ensure the intent layer is fresh (spawn the **Cartographer** if
`SYSTEM_MAP.md` is missing or `Last mapped` predates recent merges). Then spawn
the **Solution Architect** with: issue link, project root, plan output path.
It reviews the whole project and writes `issue-[N]/plan.md`.

- If it reports an **intent conflict** (plan would contradict an ADR/invariant):
  run the `anymake-evolve` conflict gate before proceeding — user decision, or
  Product Owner Proxy with gate type `evolve-intent-conflict` in autonomous
  mode. Security-related conflicts always go to the real user
- Comment the plan's path/link on the issue; set `status:plan-review`

### 4. Review loop — independent approval or specific objections

Spawn a **fresh Plan Reviewer**; it writes `review-round-K.md` and returns:

- `NEEDS CHANGES` → re-spawn the Architect with the review report; it resolves
  every numbered comment (fix or reasoned push-back in the plan's Review Log)
  and resubmits; spawn a fresh Reviewer for the next round
- `ESCALATE` → straight to the user, always
- `APPROVED` → proceed to the gate

Round limit (see `AGENTS/policies.md`): after the 3rd `NEEDS CHANGES`, stop
and escalate to the user with the plan and the unresolved comments. The
reviewer never lowers the bar to end the loop.

### 5. Approval gate — the product owner clears it

Reviewer approval is engineering sign-off; the gate is product sign-off:

- **Normal mode:** present the user a tight summary — issue, root cause, chosen
  design, stories, risk, rollback — and wait for `"approve plan"` /
  `"revise plan: [notes]"` / `"reject issue"`
- **Autonomous mode:** spawn the Product Owner Proxy with gate type
  `agile-plan-approval`. **Security-relevant plans always go to the real user**
- On approval: set `status:approved`, plan `Status: Approved`, comment the
  verdict on the issue

### 6. Execute — through the engine, with traceability

Never hand-edit the fix. Feed the plan's stories to **`anymake-build-loop`**,
with each task brief's §6a Intent Constraints and design-consistency criteria
filled from plan §6–§7. Traceability rules (also in `AGENTS/policies.md`):

- Branch `issue/[N]-[slug]` (multi-story: story branches off it, one PR into it,
  one PR from it to main — or story PRs straight to main, each referencing the issue)
- Every commit footer references `#[N]`; PR body says `Closes #[N]`
- **Before merge:** record base `main` SHA in the issue's Tracking table
- **After merge:** record the merge SHA, tag it `issue-[N]`, and post the exact
  revert command (plus migration-down steps from plan §11) as an issue comment
- Validator runs as always — acceptance criteria, security, intent-consistency,
  and the plan's design-consistency criteria

### 7. Verify & close — the reporter confirms

- Run the plan §10 verification: the original repro against the built change
  (on staging via `anymake-deploy` where applicable); for UI-touching changes,
  run the `anymake-design-system` audit on the changed screens
- Set `status:verifying` and ask the reporter to re-test their original repro —
  the person who saw the bug confirms its death (autonomous mode: proxy may
  waive per its human-only rules; note the waiver on the issue)
- Close the issue with: what shipped, merge SHA, tag, revert command
- Spawn the **Cartographer** to refresh the intent layer; record the increment
  in `PHASE_STATE.md`

## Guardrails

- **No code before an approved plan.** Not for "obvious" one-liners either —
  the obvious fix that skipped review is exactly how regressions ship. (True
  emergencies: the user can explicitly invoke `anymake-iterate`'s fast path;
  this skill never downgrades on its own.)
- **Architect ≠ Reviewer, ever.** Separate sub-agent contexts each round.
- **The issue is the scope.** Adjacent ideas surfacing mid-flow go to
  `PARKING_LOT.md` or a new issue — never into this change.
- **Security always reaches the real user** — in intake, review, gate, or
  build. No mode bypasses this.
- **The paper trail is the product.** Issue, plan, reviews, SHAs, tag, revert
  command — a stranger should be able to audit or undo the change from the
  issue alone.

## Done when

The issue is closed with reporter (or proxy) verification, the merge SHA + tag
+ revert command are on the issue, the intent layer is refreshed, and
`PHASE_STATE.md` records the increment.

---
name: anymake-agile
description: Use for any change to a project Anymake has already built — bug reports from manual testing ("the save button isn't working", "X is broken", "I found a bug") and feature or change requests ("add a feature", "change how X works", "remove Y", "now I want it to…", "feature request", "log an issue"). Runs the full agile pipeline instead of ad-hoc troubleshooting - first understands and confirms the exact issue, tracks it as a labeled GitHub issue, has a Solution Architect design a plan that respects the engineering-intent layer (gating any contradiction behind a superseding decision), has an independent Plan Reviewer approve it, and only then builds via anymake-build-loop — with full traceability so any change can be reverted. The single post-launch front door for changing the product.
---

# Anymake Agile — From "This Button Isn't Working" to a Reviewed, Reverted-able Fix

When a user reports a bug from manual testing, the ad-hoc failure mode is to
jump straight to troubleshooting: guess a cause, push a fix, hope. Maybe it
works; maybe it breaks two other things. This skill replaces that with the
process a real dev team runs: **understand → track → design → review → approve
→ build → verify** — where nothing is coded until an independently reviewed
plan exists, and everything is tagged so a bad change reverts in one command.

The four promises this pipeline exists to keep:

1. The shipped change **fixes the reported issue / delivers the requested feature, actually driven and confirmed** — not an adjacent guess, and not "the code looks right" standing in for someone having run it
2. It **breaks nothing else** — blast radius mapped and regression-tested before build
3. New UI **looks designed-in from day one** — checked against the design system, never bolted on
4. Everything is **traceable and revertible** — issue ↔ plan ↔ branch ↔ merge SHA ↔ revert command

## When to use

- The user reports something broken on a built project: "such-and-such button
  isn't working correctly", "I'm seeing an error when…"
- The user requests a feature or change: "add SSO", "change the export format",
  "remove the trial banner", "now I want it to also…"
- `anymake-iterate` has picked the next increment and it's time to define and
  build it
- Directly: "log an issue", "report a bug", "run the agile flow on this"

> **Not this skill if:** the question is "what should we build next?" (that's
> `anymake-iterate` — prioritization), or the repo has no Anymake workspace
> (that's `anymake-brownfield` first). Execution runs through
> `anymake-build-loop` — this skill defines and gates the work; the engine
> builds it.

## The cast

| Role | Definition | Owns |
|------|------------|------|
| Main agent (you) | this skill | Intake with the reporter, issue tracking, orchestration of the stages, state |
| **Solution Architect** | `AGENTS/solution-architect.md` | Full-project review + the Development Plan (`TEMPLATES/dev-plan.md`). Never touches code |
| **Plan Reviewer** | `AGENTS/plan-reviewer.md` | Adversarial review of the plan (`TEMPLATES/plan-review.md`). Fresh context each round; never edits the plan |
| Cartographer | `AGENTS/cartographer.md` | Refreshing the intent layer before design, and after merge |
| Build engine | `anymake-build-loop` (Orchestrator → Planner → Worker → Validator → Experience Runner) | Building the approved stories — and actually driving the fix/feature against the running app before it counts as built |

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

First ensure the intent layer is fresh (spawn the **Cartographer** — registered
agent `anymake-cartographer`, Tier 2 — if `SYSTEM_MAP.md` is missing or `Last
mapped` predates recent merges). Then spawn the **Solution Architect**
(`anymake-solution-architect`, Tier 2) with: issue link, project root, plan
output path. It reviews the whole project and writes `issue-[N]/plan.md`,
including the issue's "Repro as Experience Script" (bugs) or a new literal
walkthrough (features) carried into plan §9's story breakdown — this is the
same scenario the Experience Runner replays at build time and at Verify (§7).

- If it reports an **intent conflict** (plan would contradict an ADR/invariant):
  run the intent conflict gate (`AGENTS/arbiter.md` → Intent Conflict Policy)
  before proceeding — user decision, or Product Owner Proxy with gate type
  `intent-conflict` in autonomous mode. An approved override writes the
  superseding ADR first. Security-related conflicts always go to the real user
- Comment the plan's path/link on the issue; set `status:plan-review`

### 4. Review loop — independent approval or specific objections

Spawn a **fresh Plan Reviewer** (`anymake-plan-reviewer`, Tier 1 — see
`AGENTS/arbiter.md` → Model Tier Policy); it writes `review-round-K.md` and returns:

- `NEEDS CHANGES` → re-spawn the Architect with the review report; it resolves
  every numbered comment (fix or reasoned push-back in the plan's Review Log)
  and resubmits; spawn a fresh Reviewer for the next round
- `ESCALATE` → straight to the user, always
- `APPROVED` → proceed to the gate

Round limit (see `AGENTS/arbiter.md`): after the 3rd `NEEDS CHANGES`, stop
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
filled from plan §6–§7. Traceability rules (also in `AGENTS/arbiter.md`):

- Branch `issue/[N]-[slug]` (multi-story: story branches off it, one PR into it,
  one PR from it to main — or story PRs straight to main, each referencing the issue)
- Every commit footer references `#[N]`; PR body says `Closes #[N]`
- **Before merge:** record base `main` SHA in the issue's Tracking table
- **After merge:** record the merge SHA, tag it `issue-[N]`, and post the exact
  revert command (plus migration-down steps from plan §11) as an issue comment
- Validator runs as always — acceptance criteria, security, intent-consistency,
  and the plan's design-consistency criteria

### 7. Verify & close — driven live, then the reporter confirms

- Run the plan §10 verification: the build loop's own Experience Runner pass
  already replayed the repro/flow scenario against the real running app as
  part of Execute (step 6) — that experience report is the primary evidence,
  not a separate manual pass. If verifying on staging rather than the branch
  environment, invoke **`anymake-experience-check`** against the staging URL
  (`anymake-deploy` provides it) — pass it the plan's Experience Script (the
  same one used in Execute, not a fresh one) — before asking the reporter to
  look at anything
- For UI-touching changes, run the `anymake-design-system` audit on the changed screens
- Set `status:verifying` and ask the reporter to confirm — point them at the
  passing experience report first; they may still re-click through it
  themselves if they want to. The person who saw the bug confirms its death,
  but confirmation is no longer the *only* evidence it's dead (autonomous mode:
  proxy may waive the reporter's own re-click per its human-only rules — see
  `AGENTS/product-owner-proxy.md` `phase4-escalation-human-only` — but never
  waives the Experience Runner pass itself; note any waiver on the issue)
- Close the issue with: what shipped, merge SHA, tag, revert command, and the
  experience report path
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

# [Project Name] — Agile Board

**Phase 4 — Implementation | Step 4.3 — Epic Build Loop**
**Last updated:** [ISO datetime]
**Orchestrator run:** run-001
**Total progress:** 0 / [N] stories complete

> **Taskboard reconciliation contract (INV-004):** This file is a **rendered
> projection** of `PROJECTS/[name]/.anymake/board-state.json` — the structured
> spine. Agents append events to `board-state.json`'s `events[]` (append-only;
> never edit the snapshot directly). The orchestrator is the sole writer of the
> snapshot (`stories[]`, `in_flight`, `concurrency`, `updated`) and renders this
> markdown from it. One source of truth, two views. The kanban UI reads the
> JSON directly. See `TEMPLATES/board-state.schema.json` for the schema.

---

## Status Legend

| Symbol | Status | Meaning |
|--------|--------|---------|
| ⬜ | Backlog | Not started — dependencies not yet satisfied |
| 🟡 | Ready | Not started — all dependencies satisfied, next in queue |
| 🔵 | In Progress | Worker agent actively building |
| 🟠 | In Validation | Validator agent checking against acceptance criteria |
| 🧪 | Experience Check | Experience Runner agent driving the real app against the story's Experience Script |
| 👁 | Awaiting Review | PR open — waiting for you to approve and merge |
| ✅ | Done | Merged to main |
| 🚫 | Blocked | Escalated to you — awaiting decision |

---

## Milestone 1: Scaffold
> Pre-orchestrated — completed before this board was initialized

| Story | Title | Status | PR | Notes |
|-------|-------|--------|----|-------|
| 1.1 | Initialize repo | ✅ Done | — | Pre-orchestrated |
| 1.2 | CI/CD setup | ✅ Done | — | Pre-orchestrated |
| 1.3 | Staging deploy | ✅ Done | — | Pre-orchestrated |

## Milestone 2: Auth
> Pre-orchestrated — completed before this board was initialized

| Story | Title | Status | PR | Notes |
|-------|-------|--------|----|-------|
| 2.1 | [Auth story] | ✅ Done | — | Pre-orchestrated |
| 2.2 | [Auth story] | ✅ Done | — | Pre-orchestrated |

## Milestone 3: [Core Feature Name]

| Story | Title | Status | PR | Retries | Updated |
|-------|-------|--------|----|---------|---------|
| 3.1 | [Story name] | 🟡 Ready | — | 0 | — |
| 3.2 | [Story name] | ⬜ Backlog | — | 0 | — |
| 3.3 | [Story name] | ⬜ Backlog | — | 0 | — |

## Milestone 4: Monetization

| Story | Title | Status | PR | Retries | Updated |
|-------|-------|--------|----|---------|---------|
| 4.1 | [Story name] | ⬜ Backlog | — | 0 | — |
| 4.2 | [Story name] | ⬜ Backlog | — | 0 | — |
| 4.3 | Stripe webhook handlers | ⬜ Backlog | — | 0 | — |

## Milestone 5: [Supporting Features]

| Story | Title | Status | PR | Retries | Updated |
|-------|-------|--------|----|---------|---------|
| 5.1 | [Story name] | ⬜ Backlog | — | 0 | — |

## Milestone 6: Polish

| Story | Title | Status | PR | Retries | Updated |
|-------|-------|--------|----|---------|---------|
| 6.1 | Error states | ⬜ Backlog | — | 0 | — |
| 6.2 | Empty states | ⬜ Backlog | — | 0 | — |
| 6.3 | Mobile pass | ⬜ Backlog | — | 0 | — |

---

## Active Story

**Story:** —
**Status:** —
**Worker branch:** —
**Started:** —
**Validation attempt:** —
**Experience attempt:** —
**Task brief:** —
**Validation report:** —
**Experience report:** —

---

## Gate Decisions

Every phase gate and PR review decided by the Product Owner Proxy (autonomous
mode) or by the real user is recorded here, verbatim. This is the durable
record the `anymake-dispatch` post-dispatch `output_check` verifies: the check
confirms **a real, structured verdict landed** — it does *not* confirm the
verdict was favorable. The caller still reads the verdict text and branches on
it (`APPROVED` → proceed; `NEEDS CHANGES` → send back; `ESCALATE TO USER` →
stop and surface to the real user).

| Time | Gate | Decided by | Verdict | Note |
|------|------|-----------|---------|------|
| [time] | phase-0-approval | proxy | VERDICT: APPROVED | — |
| [time] | phase-2-prototype-review | proxy | VERDICT: APPROVED | LIMITATION: visual polish not verified — code-level checks only |
| [time] | phase4-pr-review — Story 3.1 | proxy | PHRASE: approved | — |
| [time] | phase-3-approval | proxy | VERDICT: NEEDS CHANGES | Backlog story 5.2 matches PROJECT.md "Never building" |
| [time] | phase4-escalation-intent-conflict — Story 4.3 | proxy | VERDICT: ESCALATE TO USER | Security surface — real user required |

> Rows above are format examples — replace them with real decisions. Every row
> must carry a full `VERDICT: ...` or `PHRASE: ...` token exactly as the proxy
> returned it. A bare mention of the word "proxy" is not a decision record.
>
> **Waiver and limitation notes are mandatory and permanent.** If a gate
> approved while waiving a judgment it could not make (visual polish, a
> subjective staging call, a human-only criterion satisfied by reading code),
> the Note column must name the specific judgment waived. That note stays on
> this board for the life of the project — it is the only surface where a real
> human can later see what was never actually checked.

---

## Escalations

*(No active escalations)*

<!-- When an escalation occurs, replace the line above with:

### [ISO datetime] — Story [N.N] — [escalation type]

**What happened:** [Plain language description of what went wrong]

**What was tried:**
- [Attempt 1 — what happened]
- [Attempt 2 — what happened, if applicable]

**Decision needed:** [Specific question for you — one yes/no or choose-one]

**Relevant files:**
- Task brief: `docs/04-implementation/task-briefs/story-N.N.md`
- Validation report: `docs/04-implementation/validation-reports/story-N.N.md` (if applicable)
- Experience report: `docs/04-implementation/experience-reports/story-N.N.md` (if applicable)
- PR: [URL] (if applicable)

**To unblock, say one of:**
- `"approved"` — if this was a PR review pause
- `"changes needed: [your notes]"` — to send specific fixes back to worker
- `"skip story N.N"` — to skip and continue
- `"retry story N.N"` — to retry from scratch
- `"blocked — stop"` — to halt orchestration entirely
- `"resume"` — after manually verifying a human-only acceptance criterion (or accepting a documented, genuinely-unscriptable waiver)
- `"fix and retry"` — after providing a fix for an escalated implementation or experience failure

-->

---

## Milestone Progress

| Milestone | Stories | Done | Status |
|-----------|---------|------|--------|
| 1: Scaffold | [N] | [N] | ✅ Complete |
| 2: Auth | [N] | [N] | ✅ Complete |
| 3: [Core Feature] | [N] | 0 | ⬜ Not started |
| 4: Monetization | [N] | 0 | ⬜ Not started |
| 5: [Supporting] | [N] | 0 | ⬜ Not started |
| 6: Polish | [N] | 0 | ⬜ Not started |

---

## Run Log

| Time | Event |
|------|-------|
| [time] | Orchestrator started — run-001 |
| [time] | Board initialized — [N] stories across [N] milestones (Milestones 1-2 pre-complete) |

<!-- Run Log entries follow the structured format from anymake-dispatch:
     [time] DISPATCH <OK|FAIL|RETRY> — <agent> — <board_ref> — purpose: <purpose> — artifact: <path> — attempt: <N>
     Non-dispatch events (board state changes, pauses, escalations) use free-text.
--> |

---

## Completed This Run

| Story | Title | PR | Merged | Validation attempts |
|-------|-------|----|--------|-------------------|
| *(none yet)* | | | | |

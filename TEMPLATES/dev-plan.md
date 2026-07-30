# Development Plan — Issue #[N]: [title]

**Author:** Anymake Solution Architect
**Project:** [name] — `project_type: [type]`
**Issue:** [GitHub issue link] — `type:[bug|feature]`
**Code state analyzed:** [commit SHA of main at analysis time]
**Status:** Draft | In Review (round [K]) | **Approved** | Superseded
**Location:** `PROJECTS/[name]/docs/06-agile/issue-[N]/plan.md`

---

## 1. Problem Statement

[The confirmed restatement from the issue, in system terms. One paragraph.
Link back to the issue — the issue is the requirement; this plan is the solution.]

---

## 2. Root Cause / Motivation

**For bugs — root cause with evidence.** Name the exact mechanism that produces
the reported symptom, with file:line references the reviewer can verify:

- [`src/path/file.ts:123`] — [what this code does and how it produces the symptom]
- [Trace: user action → handler → state → rendered wrong thing]

A plan that says "likely caused by" without a verified trace is not ready for review.

**For features — motivation.** The user need this serves, and why now
(reference the success model from `PROJECT_TYPES/[type]/manifest.md` if relevant).

---

## 3. Current-State Review

What the affected part of the system looks like today, from `docs/SYSTEM_MAP.md`
plus direct reading:

| Touched | Details |
|---------|---------|
| Modules | [SYSTEM_MAP modules this change enters] |
| Data model | [tables/types affected — or "none"] |
| Flows | [user/data flows affected] |
| Integrations | [third-party services in the path — or "none"] |

**Intent-layer freshness:** SYSTEM_MAP last mapped [date/SHA] — [current / refreshed by Cartographer on [date]]

---

## 4. Solution Design

The chosen approach, end to end — what changes, where, and how the pieces fit.
Written so a Worker who has never seen this conversation could build it.

[Design. Name real files. For each change: what exists now → what it becomes.]

---

## 5. Alternatives Considered

At least one real alternative, with the reason it lost. "No alternative exists"
requires justification.

| Option | Why not chosen |
|--------|----------------|
| [alternative A] | [specific tradeoff] |
| [alternative B] | [specific tradeoff] |

---

## 6. Intent Constraints

Classification against the intent layer (`docs/DECISIONS.md`, `docs/INVARIANTS.md`)
per the Intent Conflict Policy (`AGENTS/arbiter.md`):

**Classification:** Additive | Modifying | Contradicting

- ADR-[N]: [decision touched + how this plan respects it — or "none touched"]
- INV-[N]: [invariant in the blast radius + how it is preserved]

**If Contradicting:** conflict-gate outcome — [superseding ADR-[M] approved on
[date] via [user / proxy] | plan reshaped to fit intent]. A contradicting plan
with no resolved conflict gate cannot enter review.

---

## 7. Design Consistency *(required for any UI-touching change; otherwise "N/A — no UI")*

New or changed UI must look like it was designed with the product from day one.
Reference `docs/02-planning/ux-design.md` (Design DNA + component inventory):

| Question | Answer |
|----------|--------|
| Existing components reused | [names — reuse is the default] |
| New components introduced | [names + why no existing component fits — or "none"] |
| Design DNA mapping | [colors/type/spacing/state patterns each new element uses] |
| New visual patterns | none — **or** [pattern + the ux-design.md update this plan includes] |

Rule: no new visual pattern ships without a corresponding update to
`ux-design.md` in this plan's scope. Frankenstein UI fails plan review.

---

## 8. Blast Radius & Regression Risk

What else could break, and how we know it won't:

| At risk | Why it's in the blast radius | Protection |
|---------|------------------------------|------------|
| [feature/flow] | [shared code path / data / state] | [existing test file, or new regression test in §10] |

**Migrations:** [none | reversible — down function specified in §11]

---

## 9. Story Breakdown

The stories that implement this plan, in build order. Each becomes a task brief
(`TEMPLATES/task-brief.md`) with §6a Intent Constraints filled from §6 above and
design-consistency criteria from §7.

### Story A[N].1 — [title]
**As a** [user] **I want** [action] **so that** [outcome]
**Acceptance criteria:**
- [ ] [specific, testable]
- [ ] *(bugs — always include:)* The original repro from issue #[N] no longer reproduces: [restate steps + now-expected behavior]
- [ ] *(UI-touching:)* [element] uses [existing component / Design DNA token] per §7

### Story A[N].2 — [title] *(if needed — most fixes are 1–2 stories)*
[...]

---

## 10. Test & Verification Plan

- **Automated:** [test file + name per runtime-verifiable criterion — the bug's repro becomes a permanent regression test]
- **Regression:** [tests protecting the §8 blast radius — run, not just written]
- **Manual:** [what the reporter verifies before the issue closes — the original repro, on staging]

---

## 11. Rollback Plan

Filled before execution so reverting never requires archaeology:

- **Branch:** `issue/[N]-[slug]` — all commits reference `#[N]`
- **Merge:** single merge (or squash) commit per PR; SHA recorded in the issue Tracking table
- **Revert:** `git revert -m 1 [merge SHA]` *(or `git revert [squash SHA]`)*
- **Migrations:** [none | run `[down migration]` before revert — data implications: ...]
- **Deploy rollback:** [per `anymake-deploy` — previous release identifier]

---

## 12. Review Log

Appended each round — never deleted. Review files live beside this plan.

| Round | Date | Reviewer verdict | Report | Resolution |
|-------|------|------------------|--------|------------|
| 1 | [date] | [NEEDS CHANGES / APPROVED / ESCALATE] | `review-round-1.md` | [per-comment: fixed in §X / pushed back — see report] |

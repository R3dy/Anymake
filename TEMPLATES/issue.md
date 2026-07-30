# Issue — [short title in the reporter's words]

Used by the `anymake-agile` intake stage as the body of the GitHub issue (or the
entry in `docs/06-agile/ISSUES.md` when the project has no GitHub remote).
Keep the Bug or Feature section that applies; delete the other.

**Title convention:** `[Bug] <symptom>` or `[Feature] <capability>` — the symptom or
capability, not the suspected cause or solution.

**Labels applied at creation:**

| Label | Values |
|-------|--------|
| Type | `type:bug` \| `type:feature` \| `type:chore` |
| Severity (bugs) | `severity:critical` \| `severity:major` \| `severity:minor` |
| Status | starts at `status:intake` — see lifecycle in `skills/anymake-agile/SKILL.md` |

---

## Report (reporter's words — verbatim)

> [Exactly what the reporter said. Do not paraphrase here — this preserves the
> original signal even if the restatement below turns out to be wrong.]

---

## Bug

**Steps to reproduce:**
1. [step]
2. [step]

**Expected:** [what should have happened]
**Actual:** [what happened instead — include exact error text / screenshot reference]
**Where:** [screen / component / route / command]
**Environment:** [browser + OS / app version / staging or production]
**Reproduced by agent:** yes — [how] | no — [why not, and what evidence stands in for a repro]
**Severity rationale:** [why this severity — who is blocked and how badly]

## Feature

**Problem it solves:** [the underlying need, not the proposed mechanism]
**Requested behavior:** [what the reporter wants to be able to do]
**Where it lives:** [screen / flow / command it extends — or "new surface"]

---

## Restated Understanding (confirmed by reporter)

The issue restated in the system's own terms — modules, data, flows from
`docs/SYSTEM_MAP.md`. Intake is not complete until the reporter has confirmed
this restatement.

[Restatement]

**Reporter confirmed:** [date / "yes, that's it" quote]

---

## Tracking

| Field | Value |
|-------|-------|
| Development plan | `docs/06-agile/issue-[N]/plan.md` — [link to file on the issue branch] |
| Plan review verdict | [pending → APPROVED (round K)] |
| Branch | `issue/[N]-[slug]` |
| PR(s) | [links — added at execution] |
| Base SHA before merge | [recorded at execution] |
| Merge SHA | [recorded at merge] |
| Revert command | `git revert -m 1 [merge SHA]` [+ migration down steps if any] |

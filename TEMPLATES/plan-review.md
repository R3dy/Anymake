# Plan Review — Issue #[N], Round [K]

**Reviewer:** Anymake Plan Reviewer (fresh context — round [K])
**Plan:** `docs/06-agile/issue-[N]/plan.md` @ [plan Status field / date]
**Issue:** [link]
**Code state checked:** [commit SHA the reviewer verified evidence against]
**Location:** `PROJECTS/[name]/docs/06-agile/issue-[N]/review-round-[K].md`

---

## Checklist

Every dimension gets a result. FAIL requires a numbered comment below.

| # | Dimension | Result | Evidence |
|---|-----------|--------|----------|
| 1 | **Root cause verified** — the file:line trace in plan §2 was checked against the actual code and genuinely produces the reported symptom (bugs) / motivation is real (features) | PASS / FAIL | [what was checked] |
| 2 | **Solves the reported issue** — plan §4 demonstrably resolves the §1 problem statement, not an adjacent one | PASS / FAIL | |
| 3 | **Scope matches the issue** — nothing built beyond what the issue needs; no "while we're in here" | PASS / FAIL | |
| 4 | **Intent consistency** — §6 classification is correct; no Active Decision (`docs/DECISIONS.md`) or invariant (`docs/INVARIANTS.md`) contradicted without a resolved conflict gate | PASS / FAIL / ESCALATE | |
| 5 | **Design consistency** — §7 complete for UI-touching changes; reuses existing components; any new pattern updates `ux-design.md` | PASS / FAIL / N/A | |
| 6 | **Blast radius honest** — §8 names the real shared paths (spot-checked against SYSTEM_MAP and code); protections exist | PASS / FAIL | |
| 7 | **Stories buildable** — §9 criteria are specific and testable; bug repro is an acceptance criterion; a Worker could build from these + the plan alone | PASS / FAIL | |
| 7a | **Experience Script present** — every story in §9 has a literal Experience Script scenario (or explicit N/A justification); for a bug, the scenario is the repro rewritten as action/expected-result steps, not a restatement of the acceptance criteria | PASS / FAIL | |
| 8 | **Test plan sufficient** — repro becomes a regression test; the Experience Script scenario is named in §10 as what the Experience Runner replays; blast-radius tests named; no "works correctly" language | PASS / FAIL | |
| 9 | **Rollback complete** — §11 has real branch/revert/migration-down steps, not placeholders | PASS / FAIL | |
| 10 | **Security** — no auth/authz/tenant-isolation/secret/payment surface weakened; security-relevant plans flagged for real-user approval | PASS / ESCALATE | |

---

## Comments *(required for every FAIL — each specific and actionable)*

### [K]-C1 — [short title]
**Plan section:** §[X]
**Problem:** [what is wrong or missing — with evidence, e.g. "§2 cites `api/orders.ts:88` but that line is input validation; the symptom actually originates in..."]
**Required change:** [exactly what the architect must add/fix for this comment to clear]

### [K]-C2 — [...]

---

## Verdict

**VERDICT: APPROVED** — all dimensions PASS; near-certainty this plan (1) resolves
the reported issue, (2) breaks nothing in the blast radius, (3) keeps the UI
coherent with the design system, (4) is cleanly revertible.

*or* **VERDICT: NEEDS CHANGES** — comments [K]-C1…[K]-Cn must be resolved;
architect revises and resubmits for round [K+1].

*or* **VERDICT: ESCALATE** — [reason human judgment is required: security surface,
intent conflict with no gate outcome, or the issue itself needs a product decision].

**Summary:** [one or two sentences]

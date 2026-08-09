# Experience Report — [Story N.N: Story Name]

**Created by:** Anymake Experience Runner
**Created at:** [ISO datetime]
**Story:** N.N — [Title]
**Branch:** story/N.N-[slug]
**PR:** #[N]
**Experience attempt:** [1 | 2]
**Interaction mode:** Browser | Terminal | HTTP | Snippet

---

## Launch Log

**Launch command:** [exact command run]
**Started at:** [time] — **Ready at:** [time, or "never became ready"]
**Teardown:** [clean | forcefully killed | left running — explain why]

If the app never reached the ready signal, stop here — do not attempt any
scenario steps against a dead app. Set verdict to `ESCALATE` (environment-failure)
and skip straight to the Escalation Reason section.

---

## VERDICT: [PASS | FAIL | ESCALATE]

---

## Scenario Results

| Scenario | Step # | Action | Expected | Actual | Result |
|----------|--------|--------|----------|--------|--------|
| 1 | 1 | Navigate to `/signup` | Heading "Create your account" | Heading read "Create your account" | PASS |
| 1 | 2 | Click "Create account" (valid input) | Redirect to `/dashboard`, "Welcome, Jane" shown | Redirected to `/login`, no welcome banner | FAIL |
| 1 | 3 | *(depends on step 2's redirect)* | — | — | BLOCKED |

**Evidence per step:** screenshot path (`docs/04-implementation/experience-evidence/story-N.N/scenario-1-step-2.png`), terminal transcript excerpt, or captured HTTP response/body — attach or inline for every `FAIL`.

**Result key:**
- `PASS` — actual result matched expected result exactly (or within a stated, literal tolerance)
- `FAIL` — actual result diverged from expected — evidence required
- `BLOCKED` — a prior step in the same scenario failed and this step depends on that state; not independently evaluated
- `SKIP (environment)` — the step depends on a real external dependency this environment cannot simulate — contributes to an `ESCALATE` verdict

---

## Failure Diagnosis *(required for every FAIL)*

### Scenario [N] Step [N]: [action]

**What was expected:** [from the script]
**What actually happened:** [observed, with an evidence reference]
**Likely cause:** [`file:line` pointer into the branch's diff — a diagnostic note, never a fix. e.g. "Handler at `src/app/api/auth/signup/route.ts:41` redirects to `/login` on success; the brief specifies `/dashboard`."]

This section is what makes the Worker's retry fast — specific enough that
`RETRY CONTEXT` can be built directly from it without re-investigating.

---

## Escalation Reason *(required when VERDICT: ESCALATE)*

**Escalation type:** `environment-failure` (app wouldn't launch, or a step needs a real external dependency) | `unscriptable-criterion` (a scenario step in §3a has no literal, checkable action/expected-result pair)

**Specific reason:** [exact description]
**What needs to happen:** [e.g. "docs/environment.md's launch command is stale — `npm run dev` now requires `DATABASE_URL` which isn't documented" or "§3a Scenario 2 Step 3 says 'user is satisfied' — not a checkable result; the Planner must rewrite it"]

---

## Summary

**Scenarios run:** [N] **Steps executed:** [N] **Passed:** [N] **Failed:** [N] **Blocked:** [N] **Skipped:** [N]
**Notes:** [anything the orchestrator should know]

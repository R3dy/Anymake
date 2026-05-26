# Validation Report — [Story N.N: Story Name]

**Created by:** BMad Validator
**Created at:** [ISO datetime]
**Story:** N.N — [Title]
**Branch:** story/N.N-[slug]
**PR:** #[N]
**Validation attempt:** [1 | 2]

---

## Verdict Decision Tree

Work through this in order. Stop at the first matching rule. The result is your verdict.

```
1. Any security check = FAIL?          → verdict = ESCALATE
2. Any criterion = Human-Only (SKIP)?  → verdict = ESCALATE
3. Any criterion = SKIP (environment)? → verdict = ESCALATE
4. Any criterion = FAIL?               → verdict = FAIL
5. All criteria = PASS or N/A?         → verdict = PASS
```

---

## VERDICT: [PASS | FAIL | ESCALATE]

---

## Acceptance Criteria Results

| # | Criterion | Type | Result | Evidence |
|---|-----------|------|--------|---------|
| 1 | [criterion text] | Code | PASS | `src/api/users/route.ts:12` — auth middleware applied |
| 2 | [criterion text] | Runtime | PASS | Test: "creates user on OAuth callback" — passed |
| 3 | [criterion text] | Human-Only | SKIP | Requires visual browser verification |
| 4 | [criterion text] | Code | FAIL | `src/api/data/route.ts:28` — no authorization check on user data |

**Type key:**
- `Code` — verified statically against the branch
- `Runtime` — verified by running tests or a local server
- `Human-Only` — requires visual/manual verification; always SKIP

**Result key:**
- `PASS` — criterion satisfied with evidence
- `FAIL` — criterion not satisfied; specific evidence of failure provided
- `SKIP (human-only)` — cannot be mechanically verified; always triggers ESCALATE
- `SKIP (environment)` — could not verify due to build/environment failure; always triggers ESCALATE
- `N/A` — criterion does not apply to this story (explain why)

---

## Security Checklist Results

| Check | Result | Evidence |
|-------|--------|---------|
| Non-public endpoints require authentication | PASS/FAIL/N/A | [evidence] |
| User data access has authorization checks | PASS/FAIL/N/A | [evidence] |
| User input validated and sanitized | PASS/FAIL/N/A | [evidence] |
| Database queries use parameterized queries | PASS/FAIL/N/A | [evidence] |
| File upload validation (if applicable) | PASS/FAIL/N/A | [evidence] |
| No secrets in committed code | PASS/FAIL/N/A | [evidence] |
| API responses don't expose internal fields | PASS/FAIL/N/A | [evidence] |

---

## Failures (if FAIL verdict)

List every failed criterion with specific, actionable feedback for the worker.

### Failed Criterion [N]: [criterion text]

**What was found:**
[Specific description — file path, line number, actual behavior vs expected behavior]

**What needs to change:**
[Specific instruction — not "fix auth" but "add `requireAuth` middleware to the route at src/app/api/data/route.ts, same pattern as src/app/api/users/route.ts:8"]

---

## Escalation Reason (if ESCALATE verdict)

Fill this section only when verdict is ESCALATE.

**Escalation type:** security-failure | human-only-criterion | environment-failure

**Specific reason:**
[Exact description of why this cannot be resolved autonomously]

**What you needs to do:**
[Specific action — "Review PR #N for the security vulnerability at src/api/data/route.ts:28" or "Open the staging URL and verify the upgrade prompt appears after creating the 4th project"]

**Files to review:**
- Task brief: `docs/04-implementation/task-briefs/story-N.N.md`
- Branch: `story/N.N-[slug]`
- PR: #[N]

---

## Environment / Test Run Summary

**Test suite result:** [passed N/N tests | failed N tests | not run — reason]
**Lint result:** [clean | N issues — describe]
**Build result:** [success | failed — describe]
**Notes:** [Any environment observations relevant to the orchestrator]

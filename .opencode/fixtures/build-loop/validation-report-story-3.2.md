# Validation Report — Story 3.2: Rename a project

<!-- Fixture: deliberately a FAIL, to exercise the retry path. -->

## VERDICT: FAIL

## Acceptance Criteria Results
| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Owner can rename a project inline | PASS | `src/app/projects/[id]/page.tsx:88` |
| 2 | Name is trimmed and 1–80 chars enforced server-side | FAIL | `src/api/projects/rename.ts:23` validates client-side only; a 400-char name persists |
| 3 | Renaming updates the project's slug | FAIL | No slug regeneration anywhere in the diff |

## Failures
- Criterion 2: server accepts any length. Add schema validation in `rename.ts` before persisting.
- Criterion 3: not implemented.

## Security Checklist
| Check | Result |
|-------|--------|
| Non-public endpoints require authentication | PASS |
| Authorization checks on user data access | PASS |
| Input validated before processing | FAIL — see criterion 2 |
| Parameterized queries | PASS |
| No secrets in committed code | PASS |
| No stack traces in responses | PASS |

Note: the input-validation failure is a correctness defect on a criterion, not a
security escalation — the route is authenticated and ownership-checked. Verdict
stays FAIL (1st), so this returns to the Worker with RETRY CONTEXT.

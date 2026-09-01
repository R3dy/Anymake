# Validation Report — Story 3.3: Add a public share link

<!-- Fixture: deliberately an intent conflict, to exercise the ESCALATE path. -->

## VERDICT: ESCALATE

**Escalation type:** intent-conflict

## Acceptance Criteria Results
| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Owner can generate a share link | PASS | `src/api/projects/share.ts:14` |
| 2 | Anyone with the link can view the project | PASS | `src/app/share/[token]/page.tsx:9` |

## Intent-Consistency Check
Criterion 2 is met as written, and that is the problem.

- **INV-003** ("no endpoint returns another tenant's data under any condition")
  is contradicted by `src/app/share/[token]/page.tsx:9`, which serves project
  data to an unauthenticated request holding only a token.
- **ADR-004** (tenant isolation) is Active and has no superseding ADR.

This was not listed in the brief's §6a — found by checking the diff against the
whole intent layer, per the Validator's intent-check scope. Recording it as a
brief-quality signal for the Planner as well as an escalation.

A contradiction with no superseding decision is an automatic ESCALATE, never a
FAIL and never a retry: changing a decision requires a superseding ADR through
the intent conflict gate. Because the contradicted invariant is a tenant-
isolation boundary, this follows the security override — the real user, in
every mode.

# User Story — Template

Individual story file for stories too large for `epics.md`. Most stories live in epics.md.

---

# Story [N.N]: [Story Name]

**Epic:** [Epic N: Name]
**Priority:** Must Have | Should Have | Nice to Have
**Size:** S — 1 session | M — 2-3 sessions | L — needs decomposition

---

## User Story

**As a** [user type]
**I want to** [specific action]
**So that** [outcome / value received]

---

## Context

[Why does this story exist? What problem does it solve? What would break if we skipped it?]

---

## Acceptance Criteria

Positive paths:
- [ ] [Specific, testable — "User clicks X and sees Y"]
- [ ] [Specific, testable]

Error paths:
- [ ] Error: When [condition], user sees [specific message]
- [ ] Error: When [invalid input], [specific validation behavior]

Edge cases:
- [ ] Edge: When [boundary], [expected behavior]
- [ ] Edge: When [empty state], user sees [specific empty state]

---

## Experience Script

The literal walkthrough that proves this story works — see
`TEMPLATES/experience-script.md` for the format and the full Action Vocabulary.
Every criterion above that requires visual inspection, browser testing, terminal
output, or UX judgment ("user sees...", "looks right", "mobile/responsive")
needs a scenario here: a concrete action → expected-result table the
**Experience Runner** (`AGENTS/experience-runner.md`) can actually execute
against the running app in Phase 4, instead of a human having to click through
it — or, worse, an autonomous run waiving it on the strength of code merely
existing.

For a story with no user-observable behavior at all (pure schema/internal
refactor), write `N/A — no user-observable behavior` instead. This is a genuine
judgment call, not a default — most stories have at least one scenario.

```
## Scenario 1: [name]
**Verifies acceptance criteria:** [which ones above]
| # | Action | Target | Input | Expected Result |
|---|--------|--------|-------|-----------------|
| 1 | [Navigate/Click/Type/Run/Request/...] | [...] | [...] | [exact, checkable] |
```

This is authored here, at the same time as the acceptance criteria, so the
Planner has it to copy into the task brief's §3a rather than reconstructing it
from scratch per story.

---

## Definition of Done

- [ ] All acceptance criteria passing
- [ ] Experience Script scenarios all PASS (Experience Runner report — replaces "manual smoke test" as the mechanism, not the intent)
- [ ] Mobile/responsive verified (if UI)
- [ ] No browser console errors or warnings
- [ ] Error states tested and working
- [ ] Code reviewed (you for first 3 PRs)
- [ ] PR description written with screenshots

---

## Technical Tasks

- [ ] Schema: [table/column changes — or "none"]
- [ ] Migration: [migration file — or "none"]
- [ ] API: [endpoint(s) needed]
- [ ] Component: [frontend component(s)]
- [ ] Page: [route/page — or "existing page update"]
- [ ] Integration: [third-party service connection — or "none"]
- [ ] Test: [what to test automatically]

---

## Security Checklist

- [ ] Endpoint requires authentication (or is intentionally public)
- [ ] User can only access their own data (authorization check)
- [ ] User input validated and sanitized
- [ ] No sensitive data leaked in API response

---

## Dependencies

**Blocked by:** [Story N.N — specific reason] or "none"
**Unblocks:** [Story N.N — specific reason] or "none"

---

## Design Reference

See `docs/02-planning/ux-design.md` → [section name or flow number]

---

*Stories sized L must be decomposed into smaller stories before work begins.*

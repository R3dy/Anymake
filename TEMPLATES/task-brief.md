# Task Brief — [Story N.N: Story Name]

**Created by:** BMad Orchestrator
**Created at:** [ISO datetime]
**Project:** [Project name]
**Project root:** [absolute path]

---

## 1. Story Identity

**Story ID:** N.N
**Story title:** [Title]
**Epic:** Epic N — [Epic name]
**Milestone:** Milestone N — [Milestone name]
**Priority:** Must Have | Should Have | Nice to Have
**This is PR #:** [cumulative PR count in Phase 4 — determines review requirement]

---

## 2. User Story

**As a** [user type]
**I want to** [action]
**So that** [outcome]

---

## 3. Acceptance Criteria

This is your contract. Every criterion must be satisfied before you write `result: success`.

**Positive paths:**
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

**Error paths:**
- [ ] Error: When [condition], [specific expected behavior]
- [ ] Error: When [invalid input], [specific validation behavior]

**Edge cases:**
- [ ] Edge: When [boundary condition], [expected behavior]

---

## 4. Technical Tasks

Build in this exact order. Each task gets its own commit.

- [ ] Schema: [table/column changes — or "none"]
- [ ] Migration: [migration file to create — or "none"]
- [ ] API: [endpoint(s) to build — method, path, request shape, response shape]
- [ ] Component: [frontend component(s) to build]
- [ ] Page: [route/page to build — or "existing page update"]
- [ ] Integration: [third-party service connection — or "none"]
- [ ] Test: [what to test — integration test, e2e, or "none"]

---

## 5. Build Order Constraint

[Explicit statement of what must exist before this story can be built — e.g., "Users table must exist (Story 2.1 — complete). Auth middleware must be set up (Story 2.3 — complete)."]

---

## 6. Technical Context

Use these for patterns and consistency — do not reinvent what's already built.

**Stack (from ADRs):**
- Frontend: [framework + version]
- Backend: [framework + version]
- Database: [database + ORM/client]
- Auth: [auth provider + library]
- Styling: [CSS approach + component library]

**Existing patterns to follow:**

Database queries:
```
See: [file path] for the established query pattern
```

API endpoint structure:
```
See: [file path] for the established endpoint pattern
```

Auth middleware:
```
See: [file path] — apply the same middleware pattern to all protected endpoints in this story
```

Frontend data fetching:
```
See: [file path] for the established fetch/mutation pattern
```

**Current schema (tables relevant to this story):**
```sql
-- [table name]
[columns and types]

-- [table name]
[columns and types]
```

**Related files (read these for context before writing code):**
- `[file path]` — [why it's relevant]
- `[file path]` — [why it's relevant]

---

## 7. Security Requirements

Check every item before writing `result: success`. An unchecked item is a validation failure.

- [ ] All non-public endpoints in this story require authentication middleware
- [ ] User data access has authorization checks (users can only access their own data)
- [ ] All user input is validated and sanitized before processing or storage
- [ ] Database queries use parameterized queries — no string interpolation with user input
- [ ] File uploads (if any) validated for type and size before storage
- [ ] No secrets, API keys, or connection strings in committed code
- [ ] API responses do not expose stack traces or internal system fields

Story-specific security notes:
[Any additional security requirement specific to this story — or "none beyond the standard checklist"]

---

## 8. PR Instructions

**Branch name:** `story/N.N-[slug]`
**PR title:** `Story N.N: [Story Name]`
**Base branch:** `main`
**PR description:** Use `TEMPLATES/commit-message.md` format
**Review requirement:** [Royce review required (PR #1/2/3 or webhook) | Autonomous merge after CI passes]

Screenshots are required in the PR description for any story that produces UI changes.

---

## 9. Constraints

- Do not modify files outside `src/` unless a specific config file is named in the technical tasks
- Do not modify existing migration files — create new migrations only
- Do not add npm/pip/cargo dependencies without noting them in your RESULT notes
- Do not implement functionality not described in the acceptance criteria
- Do not push to `main` directly — use your story branch and open a PR
- Stop and write a `failed/implementation` result rather than guessing at ambiguous product requirements

---

<!-- ORCHESTRATOR: Fill above sections before dispatch. Leave section 10 blank. -->
<!-- WORKER: Fill section 10 when complete. Do not modify sections 1-9. -->

---

## 10. RESULT

<!-- Worker fills this section. Append below the line — do not delete existing content. -->

**result:** success | failed
**failure_type:** environment | implementation *(omit if success)*
**classification_uncertain:** true *(omit if certain)*
**failure_description:** *(if failed — specific, not vague)*
**pr_url:**
**pr_number:**
**branch:**
**commits:**
- [SHA] [conventional commit message]
- [SHA] [conventional commit message]
**test_output:** passed ([N] tests) | failed ([N] tests) | no test suite
**lint_output:** clean | [N] warnings fixed
**notes:** *(optional — anything the orchestrator should know)*

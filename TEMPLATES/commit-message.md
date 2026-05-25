# Commit Message Format

Use conventional commits for all commits in this project.

---

## Format

```
type(scope): subject line

body (optional — explain WHY, not what)
```

---

## Types

| Type | Use for |
|------|--------|
| `feat` | New feature or user-facing change |
| `fix` | Bug fix |
| `chore` | Maintenance, deps update, config (no production change) |
| `refactor` | Code restructure with no behavior change |
| `test` | Tests only |
| `docs` | Documentation only |
| `perf` | Performance improvement |
| `style` | Formatting only — no logic change |
| `ci` | CI/CD pipeline changes |
| `revert` | Revert a previous commit |

---

## Scope (optional)

Component, feature, or area being changed:
- `auth`
- `dashboard`
- `payments`
- `api`
- `db`
- `ui`
- `deploy`

---

## Rules

- Subject line: max 72 characters
- Subject line: imperative mood — "add feature" not "added" or "adds"
- Subject line: no period at the end
- Body: explain WHY, not what — the diff shows what
- Body: wrap at 72 characters
- Reference issue/story number if applicable: "Resolves Story 2.3"

---

## Examples

```
feat(auth): add GitHub OAuth sign-in

fix(payments): handle webhook delivery failures gracefully

Previously, a failed webhook would throw an unhandled exception
and not update the subscription status. Now we catch Stripe errors
and retry with exponential backoff.

chore: update dependencies to address security audit

feat(dashboard): add empty state when no projects exist

fix: prevent double-submit on payment form

perf(api): add database index on user_id to fix N+1 query

refactor(auth): extract session validation into middleware

test(payments): add webhook handler integration tests
```

---

## PR Description Format

Every PR needs a description. No exceptions for UI changes.

```markdown
## What
[One paragraph: what was built or changed]

## Why
[Which user story or bug this addresses — reference Epic N.N or issue #N]

## Testing
- [x] Manual smoke test: [describe what you tested and how]
- [x] Error states verified: [which error paths were tested]
- [ ] Automated test added: [description, or "N/A — covered by existing tests"]

## Screenshots
[Required for all UI changes — before/after if fixing a bug]
```

---

*Consistent commit history = easier debugging, cleaner blame, better changelogs.*

# Experience Report — Story 3.1: Export a project as CSV

## VERDICT: PASS

## Launch Log
| Step | Result |
|------|--------|
| Checked out `story/3.1-export-csv` in `.anymake/worktrees/story-3.1` | ok |
| `npm run dev` per `docs/environment.md` | ready on :3000 in 4.1s |
| Seeded fixture users and project "Q3 Planning" (3 items) | ok |
| Teardown — dev server stopped | ok, no orphan process |

## Scenario Results

### Scenario 1 — Owner exports a project with items
| # | Action | Expected | Actual | Result |
|---|--------|----------|--------|--------|
| 1 | Sign in as `owner@fixture.test` | Lands on `/dashboard` | Landed on `/dashboard` | PASS |
| 2 | Open project "Q3 Planning" | 3 items shown | 3 items shown | PASS |
| 3 | Click "Export CSV" | `q3-planning.csv` downloads | `q3-planning.csv` downloaded (218 bytes) | PASS |
| 4 | Open the downloaded file | 1 header + 3 rows | 1 header + 3 rows | PASS |

### Scenario 2 — Non-owner is refused
| # | Action | Expected | Actual | Result |
|---|--------|----------|--------|--------|
| 1 | Sign in as `other@fixture.test` | Lands on `/dashboard` | Landed on `/dashboard` | PASS |
| 2 | Request `/api/projects/1/export` | HTTP 403, no body | HTTP 403, empty body | PASS |

Every step was executed against the running app. No step was skipped.

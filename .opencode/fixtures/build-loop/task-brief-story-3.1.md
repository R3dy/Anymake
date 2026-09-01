# Task Brief — Story 3.1: Export a project as CSV

<!-- Fixture deliverable for the Phase 8 dry-run. This is a REAL brief shape,
     not the template — the point is that the corrected output_check greps match
     what an agent actually writes, not only what TEMPLATES/ contains. -->

## 1. Story
As a project owner, I want to export a project's items as CSV so I can work on them in a spreadsheet.

## 2. Acceptance Criteria
1. A signed-in owner sees an "Export CSV" button on the project page.
2. Clicking it downloads `<project-slug>.csv` containing one row per item.
3. A user who does not own the project gets a 403 and no file.

## 3. Technical Tasks
- Add `GET /api/projects/:id/export` with an ownership check
- Add the Export CSV button to the project page
- Tests for owner, non-owner, and empty-project cases

## 3a. Experience Script

### Scenario 1 — Owner exports a project with items
| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as `owner@fixture.test` | Lands on `/dashboard` |
| 2 | Open project "Q3 Planning" | Project page shows 3 items |
| 3 | Click "Export CSV" | A file `q3-planning.csv` downloads |
| 4 | Open the downloaded file | 1 header row + 3 item rows |

### Scenario 2 — Non-owner is refused
| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as `other@fixture.test` | Lands on `/dashboard` |
| 2 | Request `/api/projects/1/export` | HTTP 403, no file body |

## 6a. Intent Constraints
- ADR-004 (tenant isolation): every project-scoped route checks ownership.
- INV-003: no endpoint returns another tenant's data under any condition.

## 8. Review Requirement
The real user's review is required — §6a lists an Active Decision (ADR-004).

## Context
touches_files: ["src/api/projects/export.ts", "src/app/projects/[id]/page.tsx", "tests/api/export.test.ts"]

---

## 10. RESULT

**result:** success
**pr_url:** https://github.com/fixture/example/pull/7
**pr_number:** 7
**branch:** story/3.1-export-csv
**commits:**
  - a1b2c3d feat(api): add project CSV export route with ownership check
  - d4e5f6a feat(ui): add Export CSV button to project page
  - 7b8c9d0 test(api): cover owner, non-owner, and empty-project export
**test_output:** passed (6 tests)
**lint_output:** clean
**notes:** No new dependencies. CSV assembled with the standard library.

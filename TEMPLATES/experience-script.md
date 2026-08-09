# Experience Script — [Story N.N: Story Name]

The literal walkthrough a real person would perform to see this story work
exactly as promised — not another restatement of the acceptance criteria, but
the concrete sequence of clicks, keystrokes, commands, or requests that proves
them, and the exact observable result at each step. This is what the
**Experience Runner** (`AGENTS/experience-runner.md`) executes against the real
running application. It lives inside `TEMPLATES/task-brief.md` §3a, filled by
the Planner; this file documents the format.

Required for any story with user-observable behavior (UI, CLI, API, or a
library's public call surface). A story that is purely internal — schema-only,
an invisible refactor with zero observable behavior change — may write
`§3a: N/A — no user-observable behavior` instead. That verdict is a judgment
call the Planner makes and the Orchestrator can question at brief-approval —
it is not a default to reach for when a scenario is merely inconvenient to write.

**Every Human-Only acceptance criterion in the story (anything requiring visual
inspection, browser testing, terminal output inspection, or UX judgment) MUST
have a corresponding scenario here.** That correspondence is what lets the
Experience Runner verify it instead of the Validator escalating it to a human.

---

**Story:** N.N — [Title]
**Interaction mode:** Browser | Terminal | HTTP | Snippet *(from the project type's manifest → Experience Harness section)*

---

## Preconditions

**Launch command:** [from `docs/environment.md` → "How to Run It Locally" — e.g. `npm run dev`]
**Ready signal:** [what proves it's up — health check URL, or a stdout marker]
**Base URL / entry point:** [`http://localhost:3000` — or the CLI binary/command prefix — or the package import path]
**Seed data / test account:** [specific — e.g. "test user jane@example.com / Test1234!, seeded by `npm run seed`" — or "none required"]
**Starting state:** [logged out | logged in as [role] | empty database | fixture X loaded]

---

## Scenario 1: [name — matches the positive-path acceptance criterion verbatim]

**Verifies acceptance criteria:** [criterion number/text from the story]

| # | Action | Target | Input | Expected Result |
|---|--------|--------|-------|-----------------|
| 1 | Navigate | `/signup` | — | Page loads; heading reads "Create your account" |
| 2 | Type | Email field | `jane@example.com` | Field shows the typed value |
| 3 | Click | "Create account" button | — | Redirected to `/dashboard`; page shows "Welcome, Jane" |

## Scenario 2: [error path — same table format]

**Verifies acceptance criteria:** [criterion number/text]

| # | Action | Target | Input | Expected Result |
|---|--------|--------|-------|-----------------|
| 1 | Run | `mytool init --name ""` | — | Exit code 1; stderr contains `error: --name cannot be empty` |

## Scenario 3: [edge case — same table format]

...

---

## Action Vocabulary

| Action | Mode | Meaning |
|--------|------|---------|
| `Navigate` | Browser | Load a URL and wait for it to settle |
| `Click` | Browser | Click a real, visible element |
| `Type` | Browser | Enter text into a real field |
| `Select` | Browser | Choose an option from a dropdown/select |
| `Run` | Terminal | Execute a command; capture stdout, stderr, exit code |
| `Request` | HTTP | Send a request; capture status, body, relevant headers |
| `Import/Call` | Snippet | Import the package and call a function; capture the return value or thrown error |
| `Wait` | Any | Wait for a specific condition before the next step (element visible, process exited, response received) |

**Expected Result rules:** must be a literal, checkable fact — visible text (verbatim or a specific substring), a URL after redirect, an HTTP status code, an exit code, a specific stdout/stderr substring, a specific return value. Never "works correctly," "looks right," "behaves as expected," or any other judgment phrase the Experience Runner would have to interpret rather than check.

*One scenario per acceptance-criteria group (positive path, each error path, each edge case) is normal for a Should/Must Have story. Keep scenarios short — 2–6 steps each is typical; a scenario needing more is usually two scenarios.*

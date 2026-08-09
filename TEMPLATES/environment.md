# Environment — [Project Name]

Documents everything needed to run this project locally and in each deployed
environment. Created in Phase 4, Step 4.1 (Scaffold). Required by the
Orchestrator's startup verification before Phase 4.3 can begin, and read
directly by the **Experience Runner** (`AGENTS/experience-runner.md`) to
actually launch the app for every story's experience check — so the
"How to Run It Locally" section below has to be exact, not aspirational. If a
command in it doesn't work on a clean checkout, every story's experience check
fails on environment grounds, not just the first one that tries it.

---

## Required Environment Variables

| Variable | Purpose | Example / format |
|----------|---------|-------------------|
| `DATABASE_URL` | Postgres connection string | `postgres://user:pass@host:5432/db` |
| *[VAR_NAME]* | *[purpose]* | *[example]* |

---

## How to Run It Locally

**Interaction mode:** Browser | Terminal | HTTP | Snippet *(matches the project type's manifest → Experience Harness section)*

**Install:** `[exact command — e.g. npm install]`
**Seed / migrate:** `[exact command(s) — e.g. npm run db:migrate && npm run db:seed — or "none"]`
**Launch command:** `[exact command — e.g. npm run dev]`
**Ready signal:** `[what proves it's up — e.g. "GET http://localhost:3000/api/health returns 200" or "stdout prints 'Server ready'"]`
**Base URL / entry point:** `[http://localhost:3000 — or the CLI binary path, e.g. ./bin/mytool — or the package import path for a library]`
**Test account / seed data:** `[specific credentials or fixture the Experience Runner can log in with or invoke against — or "none required"]`
**Teardown:** `[how to stop it cleanly — usually "SIGTERM the process," note here only if it's not that simple]`

Keep this section current as the stack changes — a Worker who changes the dev
command (adds a required flag, a new prerequisite service) updates this file in
the same PR, the same discipline as updating `CONVENTIONS.md`.

---

## Deployed Environments

| Environment | URL | Notes |
|-------------|-----|-------|
| Staging | [url] | [access notes] |
| Production | [url] | [access notes] |

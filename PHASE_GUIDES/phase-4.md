# Phase 4 — Implementation

**Goal:** Build the product. Professional team output.

**Duration:** 3-10 sessions depending on scope

## Principles

1. **Scaffold first** — tooling, repo structure, CI, deployment pipeline
2. **One epic at a time** — no parallel feature development
3. **Code review per PR** — Royce reviews first few PRs, then trusts
4. **Test at boundaries** — integration tests, not full coverage
5. **Commit clean** — one logical change per commit, good messages

## Steps

### Step 4.1 — Project Scaffold

Set up:
- Repository (GitHub)
- CI/CD (GitHub Actions)
- Hosting (Vercel)
- Domain and SSL
- Environment variables and secrets

### Step 4.2 — Database & Auth

First real code:
- Database schema
- Migration system
- Auth (GitHub OAuth or similar)
- Session management

### Step 4.3 — Epic Build

For each epic:
1. Review stories and acceptance criteria
2. Build backend (API endpoints, data layer)
3. Build frontend (components, pages)
4. Test manually (smoke test all paths)
5. PR with description of what was built

### Step 4.4 — Integration

After all epics done:
- End-to-end smoke test
- Performance check (does it load fast enough?)
- Security review (are secrets protected? Is auth enforced?)
- Error handling review (what happens when things fail?)

### Step 4.5 — Review & Refine

- Address tech debt from MVP
- Polish known rough edges
- Performance optimization if needed

## Output

- `src/` — production-ready code
- `docs/deployment.md` — how to deploy
- `docs/environment.md` — required env vars
- All PRs reviewed and merged

## Gate

Royce reviews the live product. When Royce says "launch it" — we proceed.

## Templates

See `../TEMPLATES/commit-message.md`
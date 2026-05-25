# Phase 3 — Solutioning

**Goal:** Break the approved plan into buildable, testable units.

**Duration:** 1-2 sessions

## Steps

### Step 3.1 — Epic Definition

Break MVP scope into **epics** — large, user-facing deliverables:
- Epic 1: User authentication and profile
- Epic 2: Build submission and browsing
- Epic 3: Benchmark voting and comments
- Epic 4: Deployment and monitoring

### Step 3.2 — User Story Mapping

For each epic, define user stories with acceptance criteria:

```markdown
## Epic 1: User Authentication

### Story 1.1: Sign up with GitHub
**As a** visitor  
**I want to** sign up with GitHub OAuth  
**So that** I can submit builds and vote

**Acceptance:**
- [ ] GitHub OAuth flow completes successfully
- [ ] User account created in database
- [ ] User redirected to builds page after sign up
- [ ] Error shown if OAuth fails

### Story 1.2: Log out
**As a** logged-in user  
**I want to** log out  
**So that** I can switch accounts

**Acceptance:**
- [ ] Session cleared
- [ ] Redirected to home page
- [ ] Build submission disabled without auth
```

### Step 3.3 — Technical Task Breakdown

Each user story breaks into technical tasks:
- Database migration
- API endpoint
- Frontend component
- Integration point

### Step 3.4 — Dependency Mapping

What's dependent on what:
- Frontend depends on API design
- API depends on database schema
- Deployment depends on infrastructure

Build a simple dependency graph so we don't hit blockers.

### Step 3.5 — Build Order

Define the order we build epics:
1. Scaffold (tooling, repo setup, CI)
2. Auth (everything else depends on this)
3. Core feature (highest priority epic)
4. Supporting features
5. Polish and launch prep

## Output

- `docs/03-solutioning/epics.md` — all epics with stories
- `docs/03-solutioning/backlog.md` — all tasks in build order
- `docs/03-solutioning/dependency-graph.md` — what blocks what

## Gate

Royce reviews epics and backlog. When Royce says "solutioning complete, start building" — we proceed.

## Templates

See `../TEMPLATES/epic.md`, `../TEMPLATES/story.md`
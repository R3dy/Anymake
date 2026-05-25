# Phase 2 — Planning

**Goal:** Define what we're building before writing any code. Three sub-tracks run in parallel.

**Duration:** 2-4 sessions

## Sub-Track A: PRD

Full product requirements document:
- Feature list with priorities
- User stories (updated from discovery)
- Edge cases and error states
- Non-functional requirements (performance, scale, security)

## Sub-Track B: UX Design

For products with user-facing screens:
- User flow diagrams (how does a user accomplish each major task?)
- Wireframes or mockups (low-fidelity)
- Information architecture (how is content organized?)
- Prototype if useful (Figma, or even HTML click-through)

For API-only products: skip UX track, focus on API design.

## Sub-Track C: Architecture

Technical decisions:
- Frontend stack (React? Next? Svelte?)
- Backend stack (Node? Python? Edge functions?)
- Database (SQLite? Postgres? DynamoDB?)
- Hosting (Vercel? Railway? Self-hosted?)
- Authentication approach
- Third-party services and dependencies

Each decision recorded as an **ADR (Architecture Decision Record)**:
```markdown
# ADR-001: Database choice

**Context:** We need a database that requires minimal ops, works with React frontend.

**Options considered:**
- SQLite (simple, file-based, limited scale)
- Postgres (robust, requires hosting)
- Supabase (managed Postgres + auth)

**Decision:** SQLite for MVP, migrate to Postgres when needed.

**Consequences:** Scale limit of ~10K rows. No real-time subscriptions.
```

## Steps

### Step 2.1 — PRD Draft

Write comprehensive PRD covering all features.

### Step 2.2 — UX Wireframes

Create low-fidelity wireframes for primary user flows.

### Step 2.3 — Architecture Decisions

Make and document key technical decisions.

### Step 2.4 — Integration Review

Bring all three sub-tracks together:
- Does PRD depend on architecture decisions that weren't made?
- Does UX reveal features missing from PRD?
- Are there conflicts between sub-tracks?

### Step 2.5 — MVP Scope Lock

Finalize what's in MVP vs future phases. Nothing gets built that isn't in approved MVP scope.

## Output

- `docs/02-planning/prd.md` — full product requirements
- `docs/02-planning/ux-design.md` — wireframes + user flows
- `docs/02-planning/architecture/` — ADRs
- `docs/02-planning/MVP_SCOPE.md` — locked MVP feature list

## Gate

Royce reviews all three outputs. When Royce says "planning complete, start solutioning" — we proceed.

## Templates

See `../TEMPLATES/prd.md`, `../TEMPLATES/ux-design.md`, `../TEMPLATES/adr.md`
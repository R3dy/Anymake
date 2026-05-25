# Phase 3 — Solutioning

**Goal:** Break the approved plan into buildable, testable units in the correct build order.

**Duration:** 1-2 sessions

## Steps

### Step 3.1 — Epic Definition

Break MVP scope into epics — large, user-facing deliverables that can be built and tested independently.

**Epic sizing:**
| Size | Estimate | When to use |
|------|---------|-------------|
| S | 1 session | Single flow, well-defined scope |
| M | 2-3 sessions | Multiple flows, moderate complexity |
| L | 4-6 sessions | Complex feature, consider decomposing |
| XL | Must decompose | Too large — split before proceeding |

**Standard epic order (adjust for product specifics):**

1. **Scaffold** — repo, CI/CD, hosting, environment config, "hello world" deployed
2. **Auth** — sign up, log in, session management (everything else depends on this)
3. **Core feature** — the primary user value, the reason the product exists
4. **Monetization** — payment integration, upgrade flows, subscription management, feature gating
5. **Supporting features** — secondary user flows, utility pages
6. **Polish** — error states, empty states, loading states, mobile, performance

Monetization must be Epic 4 or earlier. It cannot be last.

### Step 3.2 — User Story Mapping

For each epic, define all user stories with complete acceptance criteria.

**Story format:**

```markdown
## Epic N: [Name] — Size: S/M/L

**Value delivered:** What the user can do after this epic ships that they couldn't before.

### Story N.1: [Name]
**As a** [user type]
**I want to** [action]
**So that** [outcome/value]

**Acceptance criteria:**
- [ ] [Specific, testable — positive path]
- [ ] [Specific, testable — positive path]
- [ ] Error: [What happens when X fails]
- [ ] Error: [What happens when Y is invalid]
- [ ] Edge: [What happens at limits or boundaries]

**Definition of Done:**
- [ ] All acceptance criteria passing
- [ ] Manual smoke test completed
- [ ] Mobile/responsive check (if UI)
- [ ] No console errors or warnings
- [ ] Error states work
- [ ] PR description written with screenshots
```

Every acceptance criterion must be verifiable without ambiguity. "Works correctly" is not a criterion. "User sees [specific message] when [specific condition]" is a criterion.

### Step 3.3 — Technical Task Breakdown

Each user story breaks into discrete technical tasks. Each task should be doable in a single focused commit.

**Task categories:**
- **Schema:** Database table or column changes
- **Migration:** Database migration file
- **API:** Backend endpoint, server action, or function
- **Component:** Reusable frontend component
- **Page:** Full page or route
- **Integration:** Third-party service connection
- **Config:** Environment, hosting, or tooling configuration
- **Test:** Integration or end-to-end test

If a task feels too large for one commit, decompose it further.

### Step 3.4 — Dependency Mapping

Map what blocks what to ensure there are no surprises during Phase 4.

**Example dependency chain:**
```
Scaffold
  └─ Auth (needs: database from scaffold, session store)
      └─ Core Feature (needs: authenticated user from auth)
          └─ Monetization (needs: user accounts + core feature to gate)
              └─ Supporting Features (needs: subscription tiers from monetization)
                  └─ Polish (needs: all features complete to polish)
```

**Document for each epic:**
- Blocked by: [Epic N — specific reason]
- Unblocks: [Epic N — specific reason]

Hard dependencies (cannot start until predecessor is done) must be explicit. No surprises mid-build.

### Step 3.5 — Build Order and Backlog

Produce the final ordered backlog in milestone format. This is what Phase 4 executes against.

```markdown
## Backlog

### Milestone 1: Scaffold
- [ ] Initialize repo with chosen stack
- [ ] Configure linting, formatting, TypeScript
- [ ] Set up CI/CD (GitHub Actions — lint + test + deploy)
- [ ] Configure hosting (Vercel/Railway — connect repo)
- [ ] Set up environment variable management
- [ ] Deploy hello world to staging URL
- [ ] Verify staging deploy passes CI

### Milestone 2: Auth
- [ ] Database schema — users table
- [ ] Migration file
- [ ] Auth provider configuration
- [ ] Sign up flow (UI + API)
- [ ] Sign in flow
- [ ] Sign out
- [ ] Session middleware (protect routes)
- [ ] Auth state in frontend (loading → unauthed → authed)

### Milestone 3: [Core Feature]
- [ ] [Task 1]
- [ ] [Task 2]
...

### Milestone 4: Monetization
- [ ] Stripe products + prices created in dashboard
- [ ] Pricing page (UI)
- [ ] Stripe Checkout or Payment Element integration
- [ ] Webhook endpoint + handler
- [ ] Subscription status stored in database
- [ ] Feature gating by tier
- [ ] Upgrade prompt UX for free users
- [ ] Stripe Customer Portal link in settings
- [ ] Payment failure + grace period handling

### Milestone 5: [Supporting Features]
...

### Milestone 6: Polish
- [ ] Error states — all critical paths
- [ ] Empty states — all data views
- [ ] Loading states — all async operations
- [ ] Mobile responsiveness check
- [ ] Core Web Vitals check (LCP, CLS, FID)
- [ ] Accessibility check (keyboard nav, contrast)
```

## Output

- `docs/03-solutioning/epics.md` — all epics with sized, complete user stories
- `docs/03-solutioning/backlog.md` — ordered task list by milestone
- `docs/03-solutioning/dependency-graph.md` — what blocks what

## Gate

Royce reviews epics and backlog. Key questions:
- Are the epics in the right build order?
- Is the backlog complete? Any obvious missing tasks?
- Are acceptance criteria specific enough to verify?
- Is Monetization in Milestone 4 or earlier?

Royce says "solutioning complete, start building" → proceed to Phase 4.

## Templates

See `../TEMPLATES/epic.md`, `../TEMPLATES/story.md`

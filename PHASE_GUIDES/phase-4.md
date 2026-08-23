# Phase 4 — Implementation

**Goal:** Build the approved backlog to production quality. Every milestone is a shippable increment.

**Duration:** 3-10 sessions depending on product scope

## Principles

1. **Scaffold first** — nothing starts until the scaffold deploys successfully to staging
2. **One milestone at a time** — complete Milestone 1 before starting Milestone 2
3. **Security built in** — security checks happen during build, not after
4. **Test at boundaries** — integration tests on critical paths, not full unit coverage
5. **Code review per PR** — you review the first 3 PRs; after that Claude merges unless you ask to review
6. **Commit clean** — one logical change per commit, conventional commit messages
7. **Prototype is the visual contract** — the approved prototype from Phase 2 (Step 2.2b) defines the visual quality bar. Every frontend story must match or exceed it. Generic ≠ acceptable.

## Step 4.1 — Project Scaffold

Build the complete foundation before writing a single feature line.

**Repository:**
- [ ] Create GitHub repository
- [ ] Initialize with chosen stack (from ADRs)
- [ ] Configure `.gitignore`, `README.md`, `LICENSE`
- [ ] Set up linting (ESLint / Ruff) and formatting (Prettier / Black)
- [ ] Configure TypeScript (if using TS)
- [ ] Set up branch protection: require PR + CI passing before merge

**Test framework:**
- [ ] Integration test runner configured (`vitest` or `jest`) — `npm test` runs all tests
- [ ] E2E test runner configured (`playwright`) — `npm run test:e2e` runs all e2e tests
- [ ] Tests directory established: `tests/` with `tests/integration/` and `tests/e2e/`
- [ ] Both runners return exit code 1 on failure (CI must catch test failures)
- [ ] Verify: `npm test` runs and exits cleanly (even with 0 tests initially — no syntax errors)

**CI/CD (GitHub Actions):**
- [ ] Lint check runs on every PR
- [ ] Type check runs on every PR (if TypeScript)
- [ ] Test suite (`npm test`) runs on every PR — **PR cannot merge if test suite is missing or fails**
- [ ] Staging deploy triggers on merge to main
- [ ] Production deploy triggers on release tag (or manual approval)

**Hosting:**
- [ ] Create project on Vercel / Railway / Fly.io (from ADRs)
- [ ] Connect GitHub repository
- [ ] Configure staging and production environments
- [ ] Set all environment variables in hosting dashboard

**Environment documentation (`docs/environment.md`):**

Use `TEMPLATES/environment.md`. Document every required environment variable:
```
DATABASE_URL           — Postgres connection string
NEXTAUTH_SECRET        — Random 32+ character string
NEXTAUTH_URL           — https://your-domain.com
GITHUB_ID              — GitHub OAuth App client ID
GITHUB_SECRET          — GitHub OAuth App client secret
STRIPE_SECRET_KEY      — Stripe secret key (sk_live_...)
STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret (whsec_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — Stripe publishable key (pk_live_...)
RESEND_API_KEY         — Resend API key for transactional email
SENTRY_DSN             — Sentry project DSN (if using Sentry)
```

**And, just as required, "How to Run It Locally"** — the exact install/seed/launch
commands, the ready signal, the base URL or entry point, and a test account or
seed fixture. This is not optional documentation: the **Experience Runner**
(Step 4.3, and every `anymake-agile` build) reads this section verbatim to
actually launch the app for every story's experience check. A vague or stale
launch command here fails every story's experience check on environment
grounds, not just the first one that hits it — verify it works from a clean
checkout before moving on. Once the scaffold is up, run the
**`anymake-experience-setup`** skill against it to validate this section for
real rather than leaving it aspirational.

**Scaffold complete when:**
- [ ] `git push` to main triggers CI successfully
- [ ] CI passes and deploys to staging
- [ ] Staging URL is live and returns a page
- [ ] No secrets exist in the codebase

## Step 4.2 — Database and Auth

First real product code. Everything else depends on this being correct.

**Database:**
- [ ] Schema migration files created (never direct DB edits — always migrations)
- [ ] Users table with all required columns
- [ ] Indexes on foreign keys and frequently queried fields
- [ ] Migration runs cleanly from a clean database
- [ ] Rollback migration exists

**Authentication:**
- [ ] Auth provider configured (NextAuth / Supabase Auth / Clerk)
- [ ] Sign up flow complete (email+password or OAuth)
- [ ] Sign in flow complete
- [ ] Sign out works
- [ ] Session management correct
- [ ] Protected route middleware blocks unauthenticated access
- [ ] Frontend auth state handles all states: loading → unauthenticated → authenticated

**Auth security checklist:**
- [ ] Passwords hashed with bcrypt or Argon2 (never MD5 or SHA1 or raw SHA256)
- [ ] Sessions have expiry (and refresh if needed)
- [ ] CSRF protection in place for all state-changing endpoints
- [ ] Rate limiting on auth endpoints (prevent brute force — 5 attempts per minute)
- [ ] OAuth redirect URIs are allowlisted
- [ ] JWT secrets are long random strings, not predictable values

## Step 4.3 — Epic Build Loop (Agentic)

Step 4.3 is executed by the **Anymake Orchestration System** — a five-stage agent loop (Orchestrator, Planner, Worker, Validator, Experience Runner) that builds every story in the approved backlog autonomously — and actually drives each one before calling it done — with your visibility into all progress via the agile board.

> **Delegate to the `anymake-build-loop` skill** to run this step — it owns the Orchestrator → Planner → Worker → Validator engine over the backlog. Invoke it via the `Skill` tool. The detail below is its source spec.

### How to Start the Orchestration Loop

Invoke the orchestrator (Claude runs it as an Agent with `AGENTS/orchestrator.md` as its instructions):

```
"Start the Phase 4 build loop for [project name]"
```

The orchestrator will:
1. Verify that Steps 4.1 and 4.2 are complete (scaffold + auth)
2. Initialize `PROJECTS/[name]/BOARD.md` — the live agile board
3. Begin dispatching planner, worker, and validator agents story by story

### How to Follow Along: The Agile Board

The board at `PROJECTS/[name]/BOARD.md` is your live visibility into the entire build. It updates after every agent action.

**Board columns:**

| Symbol | Status | What's happening |
|--------|--------|-----------------|
| ⬜ | Backlog | Not started, waiting on dependencies |
| 🟡 | Ready | Next in queue, all dependencies done |
| 🔵 | In Progress | Worker agent is building this story |
| 🟠 | In Validation | Validator is checking acceptance criteria |
| 👁 | Awaiting Review | PR is open — you need to review |
| ✅ | Done | Merged to main |
| 🚫 | Blocked | Escalated to you — needs a decision |

The board also shows the Run Log (every event timestamped) and the Escalations section (any decision that needs you).

### How the Agent System Works

```
Orchestrator
  ├── reads the backlog and board
  ├── selects the next ready story
  ├── spawns Planner agent
  │     └── Planner: reads the story + ADRs + intent layer + CONVENTIONS.md
  │                  + docs/environment.md, writes a self-contained task brief
  │                  including §3a Experience Script (never invents scope)
  ├── checks the brief for completeness (not a rewrite), then
  ├── spawns Worker agent
  │     └── Worker: reads brief, builds schema→migration→API→frontend,
  │                 commits, opens PR, writes result, records any new
  │                 pattern to CONVENTIONS.md
  ├── spawns Validator agent
  │     └── Validator: checks each acceptance criterion against the code,
  │                    runs security checklist, defers Human-Only criteria
  │                    with §3a coverage to the Experience Runner, writes
  │                    verdict (PASS/FAIL/ESCALATE)
  ├── on Validator PASS (unless §3a is N/A): spawns Experience Runner agent
  │     └── Experience Runner: launches the real app per docs/environment.md,
  │                            drives every §3a scenario against it, compares
  │                            actual to expected, writes verdict (PASS/FAIL/ESCALATE)
  └── on both PASS: merges PR (or pauses for your review), updates board, loops
      on either FAIL: retries the Worker once with specific failure notes (no Planner re-run)
      on either ESCALATE: pauses and notifies you
```

**Agent files:**
- `AGENTS/orchestrator.md` — orchestrator instructions and loop specification
- `AGENTS/planner.md` — planner instructions (story → self-contained task brief)
- `AGENTS/worker.md` — worker agent instructions (single story, single branch)
- `AGENTS/validator.md` — validator agent instructions (contract enforcement)
- `AGENTS/experience-runner.md` — experience runner instructions (launches and drives the real app against the story's §3a script)
- `AGENTS/arbiter.md` — all retry, escalation, and PR review policies

**You review:**
- PRs #1, #2, #3 always require your approval (see board for notification)
- All Stripe webhook handler PRs always require your approval
- Any PR touching an Active Decision (ADR) always requires your approval
- All other PRs are merged autonomously after CI passes

### When the Orchestrator Pauses and Asks for you

The orchestrator stops and notifies you in these cases:

| Situation | What the board shows | What to do |
|----------|---------------------|-----------|
| PR #1, #2, #3 | `👁 Awaiting Review` | Review the PR, say `"approved"` |
| Webhook PR | `👁 Awaiting Review` | Review the PR, say `"approved"` |
| Validation failure (2nd attempt) | `🚫 Blocked` | Read the escalation, say `"changes needed: [notes]"` or `"skip story N.N"` |
| Experience failure (2nd attempt) | `🚫 Blocked` | Read the experience report, say `"changes needed: [notes]"` or `"skip story N.N"` |
| Security check failure | `🚫 Blocked` | Read the escalation, review the security issue, say `"fix and retry"` |
| Human-only criterion with no §3a coverage | `🚫 Blocked` | Either add the missing scenario (preferred) or, only if it's genuinely unscriptable, manually verify and say `"resume"` |
| Experience script unscriptable / environment failure | `🚫 Blocked` | Fix the §3a scenario or `docs/environment.md`, say `"retry story N.N"` |
| Implementation failure | `🚫 Blocked` | Diagnose with Claude, say `"retry story N.N"` or `"skip story N.N"` |

Full phrase lexicon is in `AGENTS/arbiter.md`.

**Autonomous mode:** In autonomous mode (`autonomous_mode: true` in PHASE_STATE.md), the orchestrator spawns the Product Owner Proxy instead of pausing at these points. The proxy evaluates the situation and returns the appropriate phrase from the lexicon. The only exception is security failures — those always halt and notify the real user regardless of mode. See `AGENTS/orchestrator.md` for the orchestrator's autonomous mode behavior and `AGENTS/product-owner-proxy.md` for the proxy's evaluation criteria.

### Story Build Contract

Every story the worker builds is governed by a task brief (written by the Planner) at:
`PROJECTS/[name]/docs/04-implementation/task-briefs/story-N.N.md`

Every story the validator checks produces a report at:
`PROJECTS/[name]/docs/04-implementation/validation-reports/story-N.N.md`

Every story the experience runner drives produces a report at:
`PROJECTS/[name]/docs/04-implementation/experience-reports/story-N.N.md`
(evidence — screenshots, transcripts — under `experience-evidence/story-N.N/`)

These files are the audit trail. They document exactly what was built, why it
passed validation, and — separately — that someone (an agent, driving the real
app) actually confirmed it behaves as promised.

### Step 4.3 Complete When

All stories in Milestones 3–5 show `✅ Done` on the board. The orchestrator writes a completion summary and updates `PHASE_STATE.md` automatically.

## Step 4.4 — Monetization Build

Monetization is a milestone, not an afterthought. Build it the same rigor as any feature.

**Stripe setup:**
- [ ] Create products and prices in Stripe Dashboard (test mode first)
- [ ] Register webhook endpoint URL in Stripe Dashboard
- [ ] Install and configure Stripe webhook secret
- [ ] Test webhook delivery with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Checkout flow:**
- [ ] Pricing page renders correctly for all tiers
- [ ] Stripe Checkout session creates correctly
- [ ] Success redirect lands user in app with subscription active
- [ ] Subscription status saved to database on `checkout.session.completed`

**Webhook handlers (all required):**
- [ ] `checkout.session.completed` → grant subscription access
- [ ] `customer.subscription.updated` → handle upgrades and downgrades
- [ ] `customer.subscription.deleted` → downgrade to free tier
- [ ] `invoice.payment_failed` → mark account as past_due, start grace period

**Feature gating:**
- [ ] `getUserSubscriptionTier(userId)` function returns correct tier
- [ ] All paid features check tier before rendering or processing
- [ ] Upgrade prompt shown to free users at the right moment
- [ ] Free users can't access paid features via direct URL

**Customer portal:**
- [ ] Stripe Customer Portal link accessible from Settings → Billing
- [ ] Cancellation flow tested end-to-end (confirm → cancel → remain active until period end → downgrade)

**Stripe test cases:**
- [ ] Successful payment: card `4242 4242 4242 4242`
- [ ] Payment failure: card `4000 0000 0000 0002`
- [ ] 3D Secure required: card `4000 0027 6000 3184`
- [ ] Webhook delivery: verify all four events processed correctly

## Step 4.5 — Integration and Security Review

> **Delegate the security portion to the `anymake-security-review` skill** — it owns the full security pass (the checklist below is its source) and returns PASS / FAIL / ESCALATE. A PASS is required before the Step 4.6 staging review.

After all epics are complete, before requesting launch approval.

**End-to-end smoke test:**
- [ ] Complete user journey: landing → signup → core value → payment → paid feature
- [ ] All critical paths work in staging environment
- [ ] Tested on mobile viewport (375px wide at minimum)
- [ ] Review the per-story experience reports (`docs/04-implementation/experience-reports/`) as evidence each story was actually driven, not just this final pass — this smoke test is a cross-story journey check, not a replacement for the per-story Experience Runner passes

**Security review:**
- [ ] All routes requiring auth are protected (no auth bypass via direct URL)
- [ ] No sensitive data in console logs or browser storage
- [ ] API keys never in client-side code or bundle
- [ ] HTTP security headers configured: CSP, HSTS, X-Content-Type-Options, X-Frame-Options
- [ ] `npm audit` (or equivalent) shows no high or critical vulnerabilities
- [ ] No SQL injection vectors (all queries parameterized)
- [ ] No XSS vectors (all user content sanitized before rendering)

**Performance check:**
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] API P95 latency < 500ms on primary endpoints
- [ ] No N+1 database queries
- [ ] Images optimized (next/image or equivalent)
- [ ] No large unused JavaScript bundles

**Error handling:**
- [ ] Global error boundary in frontend catches unhandled errors
- [ ] API errors return consistent format: `{ error: string, code: string }`
- [ ] All async operations have error states in the UI
- [ ] Error tracking (Sentry or equivalent) is capturing errors

## Step 4.6 — Staging Review

> **Use the `anymake-deploy` skill** to stand up / refresh the staging environment (provisioning, env/secrets, migrations, smoke tests) before this review. Invoke it via the `Skill` tool.
>
> **Then use the `anymake-experience-check` skill** against the staging URL —
> run the critical-path Experience Scripts (and any others worth re-checking
> in the staging config specifically) for real before anyone signs off, human
> or proxy. This is what narrows "end-to-end browser testing requires a human"
> down to only what's genuinely unscriptable.

You review the complete product on staging before launch approval:
- Complete user flow works end-to-end — backed by a passing `anymake-experience-check` run against the staging URL, not just a manual click-through
- Monetization flow works with test-mode Stripe
- Product looks and feels ready to ship

**Autonomous mode:** If `autonomous_mode: true` is set in PHASE_STATE.md, dispatch the Product Owner Proxy via the `anymake-dispatch` skill for a code-level staging check instead of waiting:

```
Agent({
  agent: "anymake-product-owner-proxy",  // named subagent the plugin registered on Tier 1 (AGENTS/arbiter.md → Model Tier Policy). If your OpenCode version can't dispatch a custom subagent by name, fall back to: instructions: [full contents of AGENTS/product-owner-proxy.md]
  message: "Gate type: phase-4-staging-review. Project root: [absolute path]. Artifacts: [absolute paths to PROJECTS/[name]/BOARD.md, PROJECTS/[name]/docs/environment.md]."
})
```

- `PHRASE: launch it` → proceed to Phase 5
- `NEEDS CHANGES` → address the listed gaps and re-run the proxy
- Note: run `anymake-experience-check` against the staging URL **before** spawning the proxy, and point it at the resulting experience report(s) as an artifact — the proxy reads that as real evidence the critical path was actually driven, not just documented. What's left as a genuine, documented limitation of autonomous mode is narrower now: live-mode payment edge cases and purely subjective polish judgments a script can't express — not the whole end-to-end journey.

## Output

- `src/` — complete, production-ready codebase
- `docs/deployment.md` — step-by-step deployment runbook
- `docs/environment.md` — every required environment variable documented
- All PRs reviewed and merged to main
- Staging URL live, smoke test passing

## Gate

You use the staging environment and approve. You say "launch it" → proceed to Phase 5.

**Autonomous mode:** Gate is handled by the Product Owner Proxy at Step 4.6 above. In autonomous mode, the proxy's `PHRASE: launch it` serves as the gate approval.

## Templates

See `../TEMPLATES/commit-message.md`, `../TEMPLATES/environment.md`, `../TEMPLATES/experience-script.md`, `../TEMPLATES/experience-report.md`

## Companion skills

`anymake-build-loop` (Step 4.3), `anymake-security-review` (Step 4.5), `anymake-deploy` (staging), `anymake-experience-setup` (validating `docs/environment.md` in Step 4.1), `anymake-experience-check` (staging review, Step 4.6)

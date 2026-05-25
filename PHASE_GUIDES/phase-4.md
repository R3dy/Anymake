# Phase 4 — Implementation

**Goal:** Build the approved backlog to production quality. Every milestone is a shippable increment.

**Duration:** 3-10 sessions depending on product scope

## Principles

1. **Scaffold first** — nothing starts until the scaffold deploys successfully to staging
2. **One milestone at a time** — complete Milestone 1 before starting Milestone 2
3. **Security built in** — security checks happen during build, not after
4. **Test at boundaries** — integration tests on critical paths, not full unit coverage
5. **Code review per PR** — Royce reviews first 3 PRs; after that Operant merges unless Royce asks to review
6. **Commit clean** — one logical change per commit, conventional commit messages

## Step 4.1 — Project Scaffold

Build the complete foundation before writing a single feature line.

**Repository:**
- [ ] Create GitHub repository
- [ ] Initialize with chosen stack (from ADRs)
- [ ] Configure `.gitignore`, `README.md`, `LICENSE`
- [ ] Set up linting (ESLint / Ruff) and formatting (Prettier / Black)
- [ ] Configure TypeScript (if using TS)
- [ ] Set up branch protection: require PR + CI passing before merge

**CI/CD (GitHub Actions):**
- [ ] Lint check runs on every PR
- [ ] Type check runs on every PR (if TypeScript)
- [ ] Test suite runs on every PR
- [ ] Staging deploy triggers on merge to main
- [ ] Production deploy triggers on release tag (or manual approval)

**Hosting:**
- [ ] Create project on Vercel / Railway / Fly.io (from ADRs)
- [ ] Connect GitHub repository
- [ ] Configure staging and production environments
- [ ] Set all environment variables in hosting dashboard

**Environment documentation (`docs/environment.md`):**

Document every required environment variable:
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

## Step 4.3 — Epic Build Loop

For each epic in backlog milestone order:

```
1. Review stories + acceptance criteria for this epic
2. Build: schema → migration → API → frontend (always in this order)
3. Manual smoke test all acceptance criteria one by one
4. Verify all error states behave correctly
5. Write PR description (use format below)
6. Request Royce review (first 3 PRs) or self-merge (after that)
7. Merge after approval. Move to next story.
```

**PR description format:**
```markdown
## What
[One paragraph: what was built or changed]

## Why
[Which user story this fulfills — reference Epic N.N]

## Testing
- [x] Manual smoke test: [what was tested, how]
- [x] Error states verified: [which error states were checked]
- [ ] Automated test added: [if applicable]

## Screenshots
[Required for every UI change]
```

**Security checklist — every epic:**
- [ ] All non-public endpoints require authentication
- [ ] User-owned data has authorization checks (users cannot access other users' data)
- [ ] All user input is validated and sanitized before processing
- [ ] Database queries use parameterized queries — no string interpolation
- [ ] File uploads (if any) validated for type, size, and content
- [ ] No secrets in code or client-side bundle
- [ ] API responses don't leak internal IDs, stack traces, or sensitive data

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

After all epics are complete, before requesting launch approval.

**End-to-end smoke test:**
- [ ] Complete user journey: landing → signup → core value → payment → paid feature
- [ ] All critical paths work in staging environment
- [ ] Tested on mobile viewport (375px wide at minimum)

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

Royce reviews the complete product on staging before launch approval:
- Complete user flow works end-to-end
- Monetization flow works with test-mode Stripe
- Product looks and feels ready to ship

## Output

- `src/` — complete, production-ready codebase
- `docs/deployment.md` — step-by-step deployment runbook
- `docs/environment.md` — every required environment variable documented
- All PRs reviewed and merged to main
- Staging URL live, smoke test passing

## Gate

Royce uses the staging environment and approves. Royce says "launch it" → proceed to Phase 5.

## Templates

See `../TEMPLATES/commit-message.md`

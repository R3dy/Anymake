# Phase 2 — Planning

**Goal:** Define what we're building with enough precision that Claude can execute Phase 4 without asking you product questions. Four sub-tracks run across sessions but are reviewed together at the gate.

**Duration:** 2-4 sessions

## Sub-Tracks

| Track | Output | Skip when |
|-------|--------|-----------|
| A: Product Requirements | `prd.md` | Never |
| B: UX Design | `ux-design.md` | API-only products |
| C: Architecture | `architecture/ADR-*.md` | Never |
| D: Monetization | `monetization.md` | Never |

---

## Sub-Track A: Product Requirements (PRD)

### Step 2.1 — PRD Draft

Write a complete product requirements document. Every feature must have acceptance criteria specific enough to test.

**Feature prioritization with RICE:**

For each feature, score on four dimensions (1-10):
- **Reach:** How many users does this affect?
- **Impact:** How much does it improve the experience?
- **Confidence:** How certain are we this is correct?
- **Effort:** How hard is this to build? (invert — lower effort = higher score)

RICE score = (Reach × Impact × Confidence) / Effort

**For each feature document:**
- Feature name and plain-language description
- Priority: Must Have / Should Have / Nice to Have
- User stories: As a [user], I want to [action] so that [outcome]
- Acceptance criteria — specific and testable
- Edge cases and error states
- Non-functional requirements (performance, security, scale)

**PRD must include:**
- Prioritized feature list (MVP vs post-MVP clearly separated)
- All MVP features with complete acceptance criteria
- Non-MVP features called out explicitly with reason for deferral
- Open questions — decisions that still need your input

---

## Sub-Track B: UX Design

### Step 2.2 — User Flows and Wireframes

For products with user-facing screens. Skip for API-only products; use API design section instead.

**For each primary user task:**
Document the complete flow:
1. Entry point (how does the user arrive at this task?)
2. Steps to complete the task
3. Success state (what do they see when it works?)
4. Error states (what happens when something goes wrong?)
5. Exit (where do they go next?)

**Information architecture:**
- Complete page/route list
- Navigation structure (primary nav, secondary nav, public vs authenticated)
- Content hierarchy on key pages

**Wireframes:**
Low-fidelity layouts for all key screens. Can be ASCII art, Markdown tables, or bullet-point descriptions — they just need to be precise enough to build from.

Required wireframes:
- Landing / marketing page
- Dashboard or home screen (logged in)
- Core feature screen(s)
- Pricing page
- Settings / account page
- Empty states (what does the user see before they have data?)
- Error states for critical failures

**For API-only products:**
- REST resource design
- Request/response examples for every endpoint
- Error response format and status code conventions
- Pagination and filtering conventions

---

### Step 2.2b — Prototype Sprint

> **Delegate to the `anymake-design-system` skill** for this step — it owns the design system, the Prototype Sprint, and the prototype-gate audit. Invoke it via the `Skill` tool, then return here for the gate.

**This step is required for all products with user-facing screens.** Skip for API-only products.

Build a complete visual prototype before writing a single line of production code. The prototype is a frontend-only app — no backend, no auth, no database. All data is hardcoded or held in local React state.

**Purpose:** Validate that the product looks and feels like a real, funded SaaS product before committing to the full build. Catch visual direction and UX problems cheaply, before they're baked into production code.

**Quality bar:** If you wouldn't be comfortable showing this to a potential customer or investor, it doesn't pass. It must look like it could be posted on ProductHunt today and get genuine upvotes.

**Stack for the prototype:**
- Next.js (App Router) + TypeScript
- Tailwind CSS with the brand color palette from `ux-design.md` Design DNA section
- shadcn/ui components (customized to match the visual direction — not default)
- Framer Motion for entrance animations and transitions
- Lucide icons

**Required screens (minimum):**

| Screen | Must demonstrate |
|--------|-----------------|
| Landing page | Brand, hero section treatment, feature highlights, pricing CTA |
| Dashboard / main view | Realistic data, stat cards, primary data list/table |
| Core feature screen | The most important thing the product does |
| Empty state | What a new user sees — must have clear CTA and encouraging copy |

**Required content quality:**
- Zero lorem ipsum. All copy is real product copy.
- All data (names, numbers, dates) is realistic and varied — not "User 1" and "$0.00"
- All interactive elements respond to hover — cursor, color, shadow
- Brand color applied throughout, not just on primary buttons
- Hero section has the visual treatment defined in Design DNA

**Required interactions:**
- Navigation links highlight the current page
- At least one modal or sheet interaction (open/close with animation)
- At least one form with client-side validation
- Hover states on all buttons, cards, and links

**Prototype output:**
- Running locally: `npm run dev` works, no errors in console
- Saved to: `PROJECTS/[name]/prototype/` (separate from production codebase)
- You can view it at `localhost:3000`

**Your review (gate):**

Run the prototype locally and answer two questions:
1. Does this look like a real product I'd be proud to show a customer? (Yes / No + notes)
2. Does the core feature screen make the value proposition immediately obvious? (Yes / No + notes)

Both must be Yes before proceeding. If No on either: revise the prototype, do not proceed to 2.3.

**Autonomous mode:** If `autonomous_mode: true` is set in PHASE_STATE.md, spawn the Product Owner Proxy instead of a human visual review:

```
Agent({
  instructions: [full contents of AGENTS/product-owner-proxy.md],
  message: "Gate type: phase-2-prototype-review. Project root: [absolute path]. Prototype directory: [absolute path to PROJECTS/[name]/prototype/]. UX design: [absolute path to PROJECTS/[name]/docs/02-planning/ux-design.md]."
})
```

- `VERDICT: APPROVED` → proceed to Step 2.3
- `VERDICT: NEEDS CHANGES` → fix every listed item in the prototype, then re-run the proxy
- Note: The proxy checks code-verifiable signals (build success, real content, brand color, required screens). Visual quality judgment requires human review — this is a documented limitation of autonomous mode.

The approved prototype becomes the **visual contract** for Phase 4. Worker agents build the production version to match this prototype's look, feel, and content quality.

---

## Sub-Track C: Architecture

### Step 2.3 — Technical Decisions

Make and record every significant technical decision as an ADR. Recommended defaults by product type:

| Product type | Frontend | Backend | Database | Auth | Hosting |
|-------------|----------|---------|----------|------|---------|
| SaaS web app | Next.js 14+ | Next.js API routes | Postgres (Supabase) | NextAuth or Supabase Auth | Vercel |
| API product | — | FastAPI or Hono | Postgres or SQLite | JWT + API keys | Railway or Fly.io |
| Real-time app | Next.js | Hono + WebSockets | Supabase (real-time) | Supabase Auth | Vercel + Fly.io |
| Data-heavy app | Next.js | FastAPI | Postgres + Redis cache | NextAuth | Railway |
| Mobile-first | React Native / Expo | FastAPI | Postgres (Supabase) | Supabase Auth | Expo + Railway |

**Mandatory ADRs for every product:**
- ADR-001: Frontend framework (or "none" for API-only)
- ADR-002: Backend framework
- ADR-003: Database choice
- ADR-004: Authentication approach
- ADR-005: Hosting and deployment strategy
- ADR-006: Payment processing (Stripe unless strong reason otherwise)
- ADR-007: Transactional email (Resend or SendGrid)

**Optional ADRs — create if applicable:**
- ADR-008: File storage (if product handles uploads)
- ADR-009: Search (if product has search functionality)
- ADR-010: Analytics (PostHog, Plausible, or Mixpanel)
- ADR-011: Error tracking (Sentry)
- ADR-012: Background jobs (if async processing is needed)
- ADR-013: CDN / media delivery (if serving media at scale)

---

## Sub-Track D: Monetization

### Step 2.4 — Monetization Design

Phase 2 implementation of the revenue model chosen in Phase 0. This is not optional — every SaaS product needs a monetization plan before building starts.

**Pricing tier design:**

| Tier | Price | Target user | Key limits | Upgrade trigger |
|------|-------|------------|------------|----------------|
| Free | $0 | [who this is for] | [what limits them] | [what forces upgrade] |
| [Starter] | $[X]/mo | [who pays this] | [their limits] | [next trigger] |
| [Pro] | $[XX]/mo | [who pays this] | Unlimited [X] | [enterprise need] |

Annual pricing: offer 20% off monthly as default.

**The upgrade trigger (most important decision):**
- What is the specific action or limit that makes a user want to pay?
- Is it visible before they hit it? (It should be.)
- Do most users hit it within their first 30 days? (It should trigger early.)

**Stripe integration requirements:**
- Checkout flow (Stripe Checkout or Payment Element)
- Webhook events to handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Customer portal for billing management (use Stripe's hosted portal)
- Grace period handling for failed payments

**Revenue metrics to track (establish now, measure in Phase 5):**
- MRR, ARR, ARPU, churn rate, free-to-paid conversion rate, LTV

**User flows for monetization:**
- New user → free tier → [upgrade trigger] → pricing page → Stripe Checkout → paid tier
- Payment failure → grace period → notification email → downgrade
- Cancel → Customer Portal → confirm → access retained until period end → free tier

---

## Step 2.5 — Integration Review

Bring all four sub-tracks together. Find and fix conflicts before locking scope.

**Cross-track conflicts to check:**
- Does the PRD require features that depend on architecture decisions not yet made?
- Do the wireframes show UI elements not documented in the PRD?
- Does monetization require user flows not in the UX design?
- Do the architecture choices create constraints the PRD doesn't account for?

Resolve every conflict. Do not proceed with open cross-track dependencies.

## Step 2.6 — MVP Scope Lock

Write `MVP_SCOPE.md`:
- The complete, approved feature list for MVP
- This is the contract between you and Claude
- Nothing gets built that isn't in this document
- New ideas during Phase 4 go to PARKING_LOT.md, not into scope

## Output

- `docs/02-planning/prd.md` — complete product requirements with RICE priorities
- `docs/02-planning/ux-design.md` — Design DNA + all user flows, wireframes, IA
- `docs/02-planning/architecture/ADR-*.md` — all architecture decisions
- `docs/02-planning/monetization.md` — pricing, Stripe integration plan, revenue flows
- `docs/02-planning/MVP_SCOPE.md` — the locked, approved MVP feature list
- `PROJECTS/[name]/prototype/` — the approved visual prototype (the visual contract for Phase 4)

## Gate

You review all outputs together. Key questions:
- Is the PRD complete and unambiguous enough to build from?
- Does the prototype look like a real, funded product? (Yes/No — not "pretty good")
- Does the UX make the product experience clear?
- Are the architecture choices justified and internally consistent?
- Is the monetization plan integrated into the product (not an afterthought)?
- Is the MVP scope tight enough to ship in Phase 4?

**The prototype is a hard gate.** If it doesn't look production-quality, revise before proceeding.

You say "planning complete, start solutioning" → proceed to Phase 3.

**Autonomous mode:** If `autonomous_mode: true` is set in PHASE_STATE.md, spawn the Product Owner Proxy instead of waiting:

```
Agent({
  instructions: [full contents of AGENTS/product-owner-proxy.md],
  message: "Gate type: phase-2-approval. Project root: [absolute path]. Artifacts: [absolute paths to PROJECTS/[name]/docs/02-planning/prd.md, ux-design.md, architecture/ADR-001.md through ADR-007.md, monetization.md, MVP_SCOPE.md]."
})
```

- `VERDICT: APPROVED` → proceed to Phase 3
- `VERDICT: NEEDS CHANGES` → address every listed item, update the relevant artifacts, then re-run the proxy
- `VERDICT: ESCALATE TO USER` → output the reason to the user and wait for their input before continuing

## Templates

See `../TEMPLATES/prd.md`, `../TEMPLATES/ux-design.md`, `../TEMPLATES/adr.md`, `../TEMPLATES/monetization.md`

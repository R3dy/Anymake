# Project Type: SaaS Web App (`saas`)

## Identity
- **id:** `saas`
- **One-liner:** A commercial, hosted web product with authenticated users and a paid revenue model.
- **Choose this when:** You intend to charge money, host the product for users, and grow it as a business.
- **Not this if:** It's for a single team and never sold (`internal-tool`), it's just for you (`hobby`), or it has no UI (`api-service`, `cli`, `library`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | Includes revenue model and success/revenue metrics |
| 1 Discovery | active (full) | Market sizing, competitors, users, risks |
| 2 Planning | active (full) | All four sub-tracks including Monetization + Prototype Sprint |
| 3 Solutioning | active (full) | Epics, stories, backlog; Monetization ≤ Milestone 4 |
| 4 Implementation | active (full) | Scaffold → Auth → agentic build loop → security → staging |
| 5 Launch | active (full) | Public launch, AARRR metrics, growth loop |

## Success Model
**Revenue is first-class.** Success = paying users + MRR growth + retention. Monetization is designed in Phase 2 and built by Milestone 4.

## Default Stack
Next.js (App Router) + TypeScript · Postgres (Supabase) · NextAuth or Supabase Auth · Stripe · Resend · Vercel.

## ADRs
- **Mandatory:** ADR-001 Frontend, ADR-002 Backend, ADR-003 Database, ADR-004 Auth, ADR-005 Hosting, ADR-006 Payments (Stripe), ADR-007 Transactional email.
- **Optional:** File storage, Search, Analytics, Error tracking, Background jobs, CDN.

## Phase 2 Tracks
- **PRD:** yes (full)
- **UX + Prototype:** yes — Prototype Sprint is a hard visual gate
- **Architecture:** yes (full)
- **Monetization:** yes (required)

## Phase 4 Build Order
`Schema → Migration → API → Component → Page → Integration → Test`

## Launch & Metrics
Deploy to staging then production (Vercel). Metrics: AARRR funnel — Acquisition, Activation, Retention, Revenue (MRR/ARPU/churn/LTV), Referral. Public launch via Product Hunt / HN / etc. Legal: privacy policy, ToS, GDPR/CCPA, account deletion.

## Gate Criteria Deltas
None — `saas` is the reference type. The default gate criteria in `AGENTS/product-owner-proxy.md` are written for `saas`. All other types express their gates as deltas against this baseline.

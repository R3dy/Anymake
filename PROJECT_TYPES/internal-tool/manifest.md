# Project Type: Internal Tool (`internal-tool`)

## Identity
- **id:** `internal-tool`
- **One-liner:** A web app built for a specific team or organization to replace a manual process — never sold.
- **Choose this when:** The users are colleagues, success is measured in adoption and time saved, and there is no revenue model.
- **Not this if:** You intend to charge money or sell it (`saas`), it's just for you (`hobby`), or it's headless (`api-service`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | Identity, which team, what manual process it replaces, success = time saved / errors reduced |
| 1 Discovery | active (lite) | Internal stakeholder needs and the current workflow. **No** TAM/SAM/SOM, competitors, or market timing. |
| 2 Planning | active (full) | Full PRD; UX yes (it has screens); architecture with company auth; **no monetization** |
| 3 Solutioning | active (full) | Epics, stories, backlog |
| 4 Implementation | active (full) | Full web build order; auth via SSO/company identity; deploy to an internal environment |
| 5 Launch | replaced | Internal rollout: onboard the team, gather feedback, track adoption. No public launch/legal/PH. |

## Success Model
**Adoption and time saved are first-class.** Success = the target team actually uses it and it removes manual work or errors. No revenue, no public growth loop.

## Default Stack
Next.js + TypeScript · Postgres · **company SSO** (Okta/Google Workspace/Entra) or simple internal auth · internal hosting (Vercel private / company cloud) · Resend for any notifications.

## ADRs
- **Mandatory:** ADR-001 Frontend, ADR-002 Backend, ADR-003 Database, ADR-004 Auth (SSO / company identity), ADR-005 Hosting (internal environment).
- **Optional:** Audit logging, role-based access, integrations with internal systems, error tracking.

## Phase 2 Tracks
- **PRD:** yes (full)
- **UX + Prototype:** yes — but the bar is **usable and clear**, not market-grade polish. Prototype is **recommended**, not a hard gate.
- **Architecture:** yes — note SSO/company auth and internal hosting
- **Monetization:** no — never

## Phase 4 Build Order
`Schema → Migration → API → Component → Page → Integration → Test` (same as SaaS; no payment milestone).

## Launch & Metrics
Deploy to the internal environment. Roll out to the team with onboarding. Metrics: active users within the team, task completion / time saved vs. the old process, error reduction, feedback themes. No analytics-for-acquisition, no legal/SEO.

## Gate Criteria Deltas
- **Skip:** all monetization checks (pricing, upgrade trigger, monetization milestone), market-size/competitor checks, public-launch legal (GDPR/ToS/marketing), AARRR acquisition/revenue metrics.
- **Relax:** prototype is recommended, not a hard gate — do not fail Phase 2 solely for prototype polish.
- **Replace:** success metrics → adoption / time-saved targets instead of revenue.
- **Keep:** auth + authorization checks (internal data still needs protection), acceptance-criteria quality, test coverage, no-secrets-in-code.

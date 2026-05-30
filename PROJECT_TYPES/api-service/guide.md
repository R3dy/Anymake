# API / Backend Service — Build Guide

> **`project_type: api-service`** — ship reliable, well-specified endpoints. The API contract *is* the product — consumers build on it, so it must be stable, documented, and predictable. A public API is also an attack surface, so security is heightened throughout.

This guide is a self-contained walkthrough of every active phase for a headless API / backend service: no GUI, no end-user screens. Where the SaaS type runs a frontend track, this type substitutes contract-first design and review. The phases below match the manifest's Phase Map exactly: Phase 0 (full), Phase 1 (lite/full), Phase 2 (full), Phase 3 (full), Phase 4 (full), Phase 5 (full).

Read this top to bottom on your first project; on later projects, skim the **Gate** note at the end of each phase to confirm you have not skipped anything load-bearing.

---

## Phase 0 — Identity & Framing (full)

Before any schema or code, decide what this service *is* and who depends on it.

- **Identity.** One sentence: "An API that lets `<consumers>` do `<core jobs>` against `<core resources>`." If you cannot name the resources, you are not ready.
- **Consumers.** Who calls this? First-party frontends, partner backends, third-party developers, internal services, scheduled jobs? Each consumer class implies different auth, rate limits, and stability guarantees. Third-party developers are the strictest constraint — once they integrate, your contract is frozen.
- **Core resources.** The nouns the API exposes (e.g. `users`, `orders`, `webhooks`). These become your endpoints and your schemas. List them now.
- **Success = reliability.** For an API, "success" is not vanity sign-ups — it is uptime, low latency, low error rate, and a contract that does not break consumers. Write down the reliability bar you are committing to (e.g. "99.9% monthly uptime, P95 < 200ms").
- **Revenue (only if monetized).** If you charge via API keys / usage tiers, add a revenue success metric here. If the API is free or internal-only, skip it entirely — do not invent a monetization story you will not build.

**Output: `PROJECT.md`** capturing identity, consumer classes, core resources, the reliability bar, and (if applicable) the monetization intent. This file is the source of truth the later phases refer back to.

**Gate.** `PROJECT.md` exists; consumers and core resources are named; the reliability bar is concrete and measurable. If monetization is in scope, the intent is recorded (not yet designed).

---

## Phase 1 — Discovery & Scope (lite or full)

Run this **lite** for a small or internal service, **full** for a public/partner API where breaking changes are expensive.

- **Map the jobs-to-be-done** per consumer class. Each job usually maps to one or more endpoints. Resist endpoints that serve no named job.
- **Draw resource boundaries.** Decide what is a first-class resource vs. a sub-resource vs. a query parameter. This shapes URL design later.
- **Define non-goals.** Explicitly list what the API will *not* do in v1. For APIs this is critical: every endpoint you ship is a promise you must keep.
- **Identify the trust boundary.** Which endpoints are public (unauthenticated), which require auth, and which are admin/internal-only? Sketch this early — it drives the security work.
- **Risk pass.** Note the highest-risk areas: data exposure, abuse/rate-limit gaps, expensive queries, third-party dependencies.

**Gate.** Scope is bounded with explicit non-goals; each planned endpoint traces to a named consumer job; the public/authenticated/admin trust boundary is sketched.

---

## Phase 2 — API Resource Design & Architecture (full)

This is the heart of an API project. There is **no PRD with a GUI prototype**. The "PRD" here is **API resource design**, and the prototype is replaced by an **API contract review**.

### API resource design (the "PRD")

For every endpoint, specify:

- **Method + path** — e.g. `GET /v1/orders`, `POST /v1/orders`, `GET /v1/orders/{id}`.
- **Request schema** — path params, query params, headers, and body shape with types and required/optional flags.
- **Response schema** — the body shape for each status, including the resource representation.
- **Status codes** — the full set per endpoint: `200/201/204` success, `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `422` semantic, `429` rate-limited, `5xx`.
- **Error format** — one consistent envelope across the whole API (e.g. `{ "error": { "code", "message", "details" } }`). Decide it once, here.
- **Pagination & filtering** — choose a strategy (cursor or offset), document the params (`limit`, `cursor`/`page`, `sort`, filters), and the response envelope (`data` + `next_cursor`/`total`).
- **Auth per route** — mark each route public / authenticated / scoped. No route is implicitly public.

### API contract review (replaces the prototype)

Instead of a clickable mockup, produce the contract and review it:

- An **OpenAPI / schema document** describing every endpoint above.
- **Example requests and responses** for each endpoint, including error cases.
- A review pass (self or peer): does the contract serve every consumer job? Is naming consistent? Are pagination, errors, and auth uniform across resources? This is the artifact a consumer would integrate against — treat it as the deliverable.

### Architecture — the 6 mandatory ADRs

Record one ADR each for:

1. **Backend framework** — language + framework (e.g. Node/Fastify, Go/chi, Python/FastAPI, Rails API).
2. **Database** — engine and why (relational vs. document; transactional needs).
3. **Auth** — API keys, JWT, and/or OAuth; how credentials are issued, rotated, and revoked; scopes/permissions.
4. **Hosting** — where it runs (managed platform, containers, serverless) and how it scales.
5. **API style & versioning** — REST/GraphQL/gRPC; versioning scheme (URL `/v1`, header, or media-type) and your deprecation policy.
6. **Rate limiting** — algorithm (token bucket / fixed / sliding window), limits per consumer tier, and `429` + `Retry-After` behavior.

### Monetization (OPTIONAL)

Include the monetization track **only if you are charging** via API-key tiers or usage metering. If so, design: key tiers, metered dimensions (requests, compute, data), quota enforcement, and how usage maps to billing. If the API is free or internal, omit this track entirely.

**Gate.** Every endpoint has method+path, request/response schemas, status codes, and a per-route auth marking; the error format and pagination strategy are uniform; the API contract (OpenAPI + examples) has been reviewed in place of a prototype; all 6 ADRs are recorded; rate limiting and versioning are decided. Monetization design exists only if monetization is enabled. All security decisions from Phase 1's trust boundary are reflected in the contract.

---

## Phase 3 — Planning & Sequencing (full)

Turn the contract into an executable plan.

- **Slice by resource.** Group work into vertical slices per resource (schema → endpoints → tests), so each slice ships a usable, testable piece of the contract.
- **Order by dependency.** Resources others depend on (auth, accounts) come first.
- **Define the integration surface** for each slice: external services, message queues, third-party APIs, and the failure modes for each.
- **Plan the test contract up front.** For each endpoint, note the contract tests (does the response match the schema?) and behavior tests (does it do the right thing, including auth and error paths?).
- **Security tasks are first-class.** Add explicit tasks for authn/authz, input validation, rate-limit enforcement, secret handling, and logging/PII scrubbing — not afterthoughts.

**Gate.** Work is sliced per resource and ordered by dependency; each slice has named contract + behavior tests and a defined integration surface; security tasks are explicit line items, not implied.

---

## Phase 4 — Build (full)

Build each slice in this **exact order** (the SaaS order minus the frontend/component/page steps):

**`Schema → Migration → API → Integration → Tests`**

1. **Schema.** Define the data model for the resource (tables/collections, columns, types, constraints, indexes). The schema is the foundation the contract sits on.
2. **Migration.** Write the migration that creates/alters the schema. Migrations are forward-only and reviewable; never edit applied migrations.
3. **API.** Implement the endpoints exactly as specified in the Phase 2 contract — same paths, schemas, status codes, error envelope, pagination, and per-route auth. Enforce input validation and authz at this layer.
4. **Integration.** Wire in external dependencies (third-party APIs, queues, caches, auth providers, billing if monetized) with explicit error/timeout/retry handling.
5. **Tests.** Cover **the contract** (responses match the documented schemas and status codes) **and behavior** (correct results, auth enforced on protected routes, validation rejects bad input, rate limits return `429`, error envelope is consistent, pagination works at boundaries).

Implement the contract, do not redesign it mid-build. If the contract is wrong, go back and amend Phase 2 (and the OpenAPI doc) so consumers stay in sync.

**Gate.** Each shipped slice followed Schema → Migration → API → Integration → Tests; endpoints match the published contract byte-for-byte on shape and status codes; contract and behavior tests pass; auth is enforced on every non-public route; rate limiting returns `429` correctly; input validation covers every endpoint. All security checks pass — heightened: no auth bypass, no unscoped data access, secrets never logged.

---

## Phase 5 — Launch & Operate (full)

Ship it, document it, and watch it.

- **Deploy staging → production.** Promote through staging first; run the contract/behavior test suite against staging before promoting. Migrations apply cleanly and reversibly.
- **Publish API docs.** Ship the **OpenAPI / reference documentation** so consumers can integrate without reading your code. Include auth setup, error format, pagination, rate limits, and versioning/deprecation policy. For a public API, this is part of the product, not an afterthought.
- **Instrument metrics:**
  - **Uptime** against your reliability bar.
  - **P95 / P99 latency** per endpoint.
  - **Request volume** (overall and per consumer/key).
  - **Error rate** (4xx vs. 5xx separated).
  - **Auth failures** (spikes signal abuse or a broken integration).
  - **Revenue / usage** — only if monetized: track metered usage and billing health.
- **Operate.** Alerts on latency, error-rate, and auth-failure thresholds. Have a rollback path and a versioning plan for the inevitable contract change.

**Gate.** Staging passed before production; OpenAPI/reference docs are published and match the deployed contract; uptime, P95/P99 latency, request volume, error rate, and auth-failure metrics are live with alerts; versioning/deprecation policy is documented. If monetization is enabled, the monetization milestone is met (usage metered and billing verified) — this check is skipped entirely for free/internal APIs.

---

## What's different from SaaS (and why)

| Area | SaaS | api-service | Why |
|---|---|---|---|
| The product | The app UI + workflows | The API contract itself | Consumers integrate against the contract; it must be stable and documented |
| Phase 2 "PRD" | Product requirements + GUI | API resource design (endpoints, schemas, status codes, errors, pagination, per-route auth) | There is no UI to specify; the resource design is the spec |
| Prototype | Clickable GUI prototype | API contract review (OpenAPI + example requests/responses) | You validate the contract, not a screen |
| Architecture ADRs | App/frontend/backend stack | 6 mandatory: framework, database, auth, hosting, API style & versioning, rate limiting | Versioning and rate limiting are existential for an API, optional for a UI app |
| Build order | Schema → Migration → API → Component → Page → Integration → Tests | Schema → Migration → API → Integration → Tests | No frontend; drop component/page steps |
| Security | Standard checks | All security checks kept and heightened; auth on all non-public routes, rate limiting enforced | A public API is a direct attack surface with no UI gating |
| Launch docs | In-app onboarding | Published OpenAPI / reference docs | Consumers integrate from docs, not screens |
| Metrics | Activation, retention, revenue | Uptime, P95/P99 latency, request volume, error rate, auth failures (+ revenue if monetized) | Reliability is the definition of success for an API |
| Monetization | Typically core | Optional (API-key tiers / usage); included only if charging | Many APIs are free or internal; don't build billing you don't need |

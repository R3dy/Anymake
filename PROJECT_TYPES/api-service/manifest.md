# Project Type: API / Backend Service (`api-service`)

## Identity
- **id:** `api-service`
- **One-liner:** A headless web service exposing endpoints over HTTP (REST/GraphQL/RPC), consumed by other apps or developers.
- **Choose this when:** The deliverable is a deployed service with an API contract and no first-party end-user UI (a thin docs page or dashboard is fine).
- **Not this if:** It has a full product UI (`saas`), is imported as code (`library`), or is run from a terminal (`cli`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | Identity, consumers, core resources, success = reliability (+ revenue if monetized) |
| 1 Discovery | active (lite/full) | Full if commercial; lite if internal/infra. Consumers and integration needs. |
| 2 Planning | active (full) | "PRD" = API resource design; no UX prototype; full architecture; monetization optional (API keys/usage) |
| 3 Solutioning | active (full) | Backlog organized by resource / endpoint |
| 4 Implementation | active (full) | Schema → Migration → API → Integration → Tests (SaaS order minus frontend) |
| 5 Launch | active (full) | Deploy; metrics = uptime, latency, request volume, error rate (+ revenue if monetized) |

## Success Model
**Reliable, well-specified endpoints are first-class.** Success = a correct, documented, performant API contract with strong uptime. If monetized: API-key tiers and usage revenue.

## Default Stack
FastAPI / Hono / Express + TypeScript or Python · Postgres or SQLite · JWT + API keys for auth · Railway / Fly.io · OpenAPI for the contract.

## ADRs
- **Mandatory:** ADR-001 Backend framework, ADR-002 Database, ADR-003 Auth (API keys / JWT / OAuth), ADR-004 Hosting/deploy, ADR-005 API style & versioning (REST/GraphQL; v1 strategy), ADR-006 Rate limiting.
- **Optional:** Payments (if monetized), background jobs, caching, observability/tracing, webhooks.

## Phase 2 Tracks
- **PRD:** yes — as **API resource design**: endpoints (method + path), request/response schemas, status codes, error format, pagination/filtering conventions, auth requirements per route
- **UX + Prototype:** no — **replaced** by an **API contract review** (OpenAPI/schema + example requests/responses)
- **Architecture:** yes (full)
- **Monetization:** optional — API-key tiers or usage-based billing; include only if charging

## Phase 4 Build Order
`Schema → Migration → API (routes/handlers/services) → Integration (third-party, webhooks) → Tests (contract + behavior)`. No component/page layers.

## Launch & Metrics
Deploy to staging then production. Publish API docs (OpenAPI/reference). Metrics: uptime, P95/P99 latency, request volume, error rate, auth failures (+ MRR/usage revenue if monetized).

## Gate Criteria Deltas
- **Skip:** the GUI-prototype gate; monetization checks unless a paid model is chosen.
- **Replace:** prototype gate → **API contract review** (every endpoint has request/response schema, status codes, and an example; error format is consistent).
- **Add:** rate-limiting present on public endpoints; auth required on all non-public routes; versioning strategy defined.
- **Keep:** all security checks (heightened — this is an attack surface), acceptance-criteria quality, test coverage, no-secrets-in-code. Monetization-milestone-order check applies **only if** monetization is enabled.

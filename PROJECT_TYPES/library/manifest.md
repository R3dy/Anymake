# Project Type: Library / Package / SDK (`library`)

## Identity
- **id:** `library`
- **One-liner:** Code that other developers import into their own projects.
- **Choose this when:** The deliverable is a reusable package consumed via `import`/`require`/`use` — not run directly by end users.
- **Not this if:** It's run from a terminal (`cli`), serves HTTP (`api-service`), or has an end-user UI (`saas`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | What it does, the target developer, the public API surface, success = clean API + adoption |
| 1 Discovery | active (lite) | Competing libraries, API ergonomics, what's missing in existing options |
| 2 Planning | active (full) | "PRD" = public API design; no UX prototype; architecture = module structure + dependency/versioning policy; monetization optional |
| 3 Solutioning | active (full) | Backlog organized by API surface area |
| 4 Implementation | active (full) | Public API/types → core impl → tests (high coverage) → docs/examples → packaging → CI matrix |
| 5 Launch | active (full) | Publish to package registry; metrics = downloads, stars, dependents, issues |

## Success Model
**API quality + adoption is first-class.** Success = a clean, well-typed, well-documented public API; high test coverage; predictable semver; growing downloads/dependents.

## Default Stack
Language matched to the consumer ecosystem (TypeScript→npm, Python→PyPI, Rust→crates.io, etc.). Build tooling appropriate to the target (e.g., `tsup`/`rollup`, `hatch`/`poetry`). Minimal runtime dependencies.

## ADRs
- **Mandatory:** ADR-001 Language & target ecosystem, ADR-002 Module/build system & output formats (ESM/CJS, types), ADR-003 Dependency policy (minimize; peer vs. bundled), ADR-004 Versioning (semver) & release process, ADR-005 Docs tooling.
- **Optional:** Monorepo strategy, supported-runtime matrix, deprecation policy.

## Phase 2 Tracks
- **PRD:** yes — as **public API design**: exported functions/classes/types, signatures, parameters, return types, thrown errors, and usage examples for each
- **UX + Prototype:** no — **replaced** by an API design review (ergonomics, naming, type safety)
- **Architecture:** yes — module structure, build outputs, dependency and versioning policy
- **Monetization:** optional (open-core, dual-license, sponsorship) — usually skipped

## Phase 4 Build Order
`Public API & types → Core implementation → Tests (high coverage — the contract) → Docs & examples → Packaging (build outputs, exports map) → CI (test matrix across supported versions)`. No schema/frontend.

## Launch & Metrics
Publish to the registry with correct metadata, types, and a README. Verify install + import in a fresh consumer project. Metrics: downloads, GitHub stars, dependent repos, issue/PR volume.

## Gate Criteria Deltas
- **Skip:** monetization (unless chosen), market-size depth, GUI prototype, GDPR/legal, AARRR metrics, auth/hosting ADRs.
- **Replace:** prototype gate → **public-API design review** (signatures and types are documented and ergonomic).
- **Add:** **strong test-coverage requirement** (the public API is the contract — every exported surface needs tests); docs/examples present for every public export; semver/release process defined.
- **Keep:** acceptance-criteria quality, no-secrets-in-code, dependency justification.

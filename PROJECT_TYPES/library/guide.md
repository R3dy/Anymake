# Library / Package / SDK — Build Guide

> **`project_type: library`** — for code other developers import into their own projects. The deliverable is a clean, well-typed public API with great docs that earns adoption. **The public API is the contract:** everything you export, you must support and version; everything you don't export, you're free to change. This guide optimizes for API quality, type safety, high test coverage, and predictable semver — not for a UI, hosting, or monetization.

**The whole point:** make something other developers reach for and trust. A library is judged by how good it feels to call and how rarely it breaks them on upgrade.

---

## Phase 0 — Foundation (full)

One focused session. Produce `PROJECTS/[name]/PROJECT.md` covering:

- **Name** — the package name as it will appear on the registry (check availability early).
- **What it does** — one or two sentences. The problem it solves for a consuming codebase.
- **Target developer** — who imports this and in what context (e.g., "backend TS engineers needing typed retry/backoff," "data scientists parsing a niche file format"). Their ecosystem decides your language.
- **Public API surface** — a first sketch of the main entry points: the handful of functions/classes/types a consumer will actually call. Not signatures yet, just the shape ("a `Client`, a `parse()`, a `Result` type").
- **Success looks like** — **API quality + adoption**: a clean, well-documented, well-typed API; high test coverage; growing downloads and dependents. Name one concrete near-term marker (e.g., "another team imports it and ships with it").

Skip: revenue model, business metrics, market positioning, team org.

**Gate:** `PROJECT.md` names the target developer, the rough public API surface, and an adoption-flavored success definition. In autonomous mode the proxy checks those three are filled in. No market-size depth required.

---

## Phase 1 — Discovery (lite)

A short, focused scan — you're not sizing a market, you're studying the landscape your API will compete in.

- **Competing libraries** — list the existing packages a developer would pick instead. For each, note downloads/maintenance health, and what calling it actually feels like.
- **API ergonomics of the alternatives** — where do they make the common case awkward? Too much config, leaky abstractions, weak types, callback hell, poor tree-shaking, no ESM?
- **What's missing** — the gap you fill: better types, smaller footprint, fewer deps, a cleaner default, broader runtime support. This is your reason to exist.

No personas, no TAM, no full risk register. A page is plenty.

**Gate:** You can name the closest alternatives and a one-sentence differentiation in API terms. Proxy checks a competing-libraries note and a stated gap exist. Market-size depth is skipped.

---

## Phase 2 — Planning (full)

Two real tracks here: the **public API design** (this type's "PRD") and the **architecture**. There is **no GUI prototype**.

### Track 1 — Public API Design (the "PRD")

This is the heart of a library. Specify the public surface as a contract, in `docs/api-design.md`. For **every exported function, class, and type**:

- **Signature** — full names, parameters (names, types, optional/required, defaults), return type.
- **Thrown errors** — what it throws/rejects and when; the error types consumers can catch.
- **Behavior & edge cases** — nullability, async vs sync, side effects, mutation vs immutability.
- **Usage example** — a short, copy-pasteable snippet showing the export in realistic use.

Mark clearly what is **public** (the contract, semver-governed) vs **internal** (free to change). Keep the surface minimal — every export is a forever-commitment.

### API Design Review (replaces UX + prototype)

Instead of a clickable prototype, run an **API design review** before committing:

- **Ergonomics** — is the common case one call with sane defaults? Does it compose well?
- **Naming** — consistent, predictable, idiomatic for the ecosystem; no surprises.
- **Type safety** — do the types catch misuse at compile time? Are generics inferring well? No leaking of `any`/`unknown` where a real type belongs?
- **Symmetry & discoverability** — paired operations named consistently; one obvious way to do the common thing.

### Track 2 — Architecture (ADRs)

Record all five mandatory ADRs in `docs/adr/`:

- **ADR-001 Language & target ecosystem** — e.g., TypeScript→npm, Python→PyPI, Rust→crates.io. Driven by where the target developer lives.
- **ADR-002 Module/build system & output formats** — ESM/CJS dual output (or ESM-only), bundled type declarations (`.d.ts`), build tool (`tsup`/`rollup`, `hatch`/`poetry`), and the package `exports` map.
- **ADR-003 Dependency policy** — minimize runtime deps; decide peer vs. bundled; justify every dependency you ship (consumers inherit your tree).
- **ADR-004 Versioning & release process** — semver discipline (what counts as breaking), changelog, tagging, who/how publishes.
- **ADR-005 Docs tooling** — TypeDoc/Sphinx/rustdoc, README structure, an examples directory.

Optional ADRs only if relevant: monorepo strategy, supported-runtime matrix, deprecation policy.

### Monetization — usually skipped

Skip unless you've explicitly chosen open-core, dual-license, or sponsorship. Most libraries skip this entirely.

**Gate:** The public API is fully specified (signatures, params, returns, errors, an example per export) and has passed the **API design review** for ergonomics, naming, and type safety; all five ADRs recorded; semver/release process defined. The proxy applies the API-design-review check **in place of** the prototype gate, and skips monetization, GUI prototype, auth, and hosting checks.

---

## Phase 3 — Solutioning (full)

Turn the API design into a buildable backlog in `docs/backlog.md`, **organized by API surface area** rather than by screens or endpoints.

- **Epics = API areas** — group around cohesive surfaces ("Client lifecycle," "Parsing," "Serialization," "Error types"). Each public export should trace to a story.
- **Stories carry acceptance criteria** that reference the documented signature and behavior — including the error cases and edge cases, so tests have a target.
- **Order by dependency** — types and core primitives first, the surfaces that build on them next, so each layer compiles against settled ones below it.

**Gate:** Backlog is concrete and every public export traces to at least one story with acceptance criteria. Proxy checks acceptance-criteria quality (kept from baseline) and that the backlog covers the documented API surface. No UX/auth/hosting stories expected.

---

## Phase 4 — Implementation (full)

Build strictly in this order — it overrides the SaaS `Schema → … → Page` flow. There is **no schema and no frontend**.

`Public API & types → Core implementation → Tests (high coverage — the contract) → Docs & examples → Packaging (build outputs, exports map) → CI (test matrix)`

1. **Public API & types** — declare the exported signatures and types first, matching `docs/api-design.md` exactly. The API shape is settled before logic fills in behind it; stub bodies are fine.
2. **Core implementation** — implement behind those stable signatures. Keep internals private; resist exporting helpers you'd rather keep free to change.
3. **Tests (high coverage — the contract)** — **the priority of this type.** Every public export needs tests covering happy path, documented edge cases, and every thrown/rejected error. Treat each example in the API docs as a test. Aim high on coverage of the public surface specifically — it is the contract you've promised consumers. Type-level tests (e.g., `tsd`/`expect-type`) guard the type contract too.
4. **Docs & examples** — generated API reference plus a hand-written README and a runnable example per major export. Docs are a release deliverable, not an afterthought.
5. **Packaging** — produce the build outputs from ADR-002 (ESM/CJS, `.d.ts`), a correct `exports`/entry map, `files`/`sideEffects` set, and verify nothing internal leaks into the published artifact.
6. **CI (test matrix)** — run tests, lint, type-check, and build across the supported language/runtime versions (e.g., Node 18/20/22, or the Python versions you claim to support).

**Gate:** Builds clean across the matrix; the full public API is tested with high coverage; docs/examples exist for every public export; no secrets in code; dependencies justified (kept from baseline). The proxy enforces the **strong test-coverage requirement** and docs-per-export checks here.

---

## Phase 5 — Launch (full)

Launch means **publishing to the registry**, not deploying a server.

- **Publish to the registry** — npm / PyPI / crates.io (or the ecosystem's equivalent). Get the metadata right: name, description, keywords, license, repository link, homepage, author, and a README that renders on the registry page.
- **Ship types & artifacts** — confirm type declarations are included and resolved (`types`/`typesVersions` or PEP 561 `py.typed`), and that ESM/CJS entry points all resolve.
- **Verify install + import in a fresh consumer project** — the real launch test. Spin up a clean throwaway project, install the published package (not your local checkout), import it, and run a documented example. Confirm types resolve in an editor. This catches missing files, broken `exports` maps, and phantom dependencies.
- **Tag the release** — git tag matching the published version, publish a changelog/release notes, follow the ADR-004 process.
- **Metrics that matter** — downloads (registry), GitHub stars, dependent repos/packages, and issue/PR volume. These replace AARRR funnels; adoption and a healthy issue tracker are the scoreboard.

No legal pages, no analytics funnel, no hosting/uptime concerns.

**Gate:** Package is published with correct metadata and types; a fresh-project install-and-import smoke test passes; release is tagged with notes per the semver process. Proxy skips GDPR/legal and AARRR metrics; confirms the install/import verification and registry metadata.

---

## What's different from SaaS (and why)

| Area | SaaS baseline | Library (`library`) | Why |
|------|---------------|---------------------|-----|
| Success axis | Revenue / AARRR funnel | API quality + adoption (downloads, dependents) | Nobody pays per seat; developers adopt and depend on it |
| Phase 2 "PRD" | Product requirements for features/screens | **Public API design** — signatures, params, returns, errors, examples per export | The exported surface *is* the product |
| UX + prototype | Clickable prototype, hard gate | **Replaced by an API design review** (ergonomics, naming, type safety) | There is no GUI; the developer experience is the API |
| Architecture ADRs | Auth, hosting, data model | Language/ecosystem, build & output formats, dependency policy, semver, docs tooling | A package ships artifacts and a versioned contract, not a running service |
| Monetization | First-class | Usually skipped (optional open-core/sponsorship) | Most libraries are free and open |
| Build order | Schema → Migration → API → Component → Page → Integration → Test | Public API & types → Core impl → **Tests (high coverage)** → Docs/examples → Packaging → CI matrix | No DB or UI; the public surface and its tests lead |
| Tests | Required, risk-based coverage | **High coverage of every public export — non-negotiable** | The public API is a contract you must not break silently |
| Versioning | Continuous deploy | Strict **semver** + release process | Consumers pin and upgrade; breakage must be signalled by version |
| Launch | Deploy hosted app | **Publish to registry**, verify install+import in a fresh project | Distribution is a package, validated by a clean consumer install |
| Metrics | Activation, retention, MRR | Downloads, stars, dependents, issues | Adoption and a healthy tracker, not a revenue funnel |
| Skipped | — | GUI prototype, GDPR/legal, auth/hosting ADRs, market-size depth | None apply to importable code |

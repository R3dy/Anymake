---
name: anymake-deploy
description: Use to deploy an Anymake project and manage its infrastructure — staging environments, production releases, environment/secret configuration, smoke tests, monitoring/error-tracking wiring, and rollback. Triggers on "deploy", "set up staging", "ship to production", "release", "provision infrastructure", "configure env vars", "roll back", or Anymake Phase 4 staging (Steps 4.1/4.6) and Phase 5 Step 5.2 (production). Respects the active project type's distribution target.
---

# Anymake Deploy — Deployment & Infrastructure

Owns getting a build off the developer's machine and into the world: a green
**staging** environment before Phase 4 closes, and a monitored **production**
release at launch. The hub's phase guides name the milestones; this skill owns
the mechanics.

## When to use

- Hub **Phase 4** — stand up the staging environment (set up in Step 4.1's scaffold/CI) and prove it green for the Step 4.6 Staging Review before Phase 4 completes.
- Hub **Phase 5, Step 5.2** — production deployment with monitoring live (after the Step 5.1 pre-launch checklist).
- Directly — "deploy this", "set up staging", "roll back the last release".

## Distribution target is type-driven

Read `PROJECT_TYPES/<id>/manifest.md` → **Launch & Metrics** for the right target.
The word "deploy" means different things per type:

| Type | Staging | Production / distribution |
|------|---------|---------------------------|
| `saas`, `internal-tool` | Hosted staging env | Hosted production (PaaS/cloud), custom domain |
| `api-service` | Staging endpoint | Production endpoint + API docs published |
| `static-site` | Preview deploy | CDN/static host, custom domain |
| `cli` | Local install smoke test | Package registry (npm/PyPI/Homebrew), release binaries |
| `library` | Pre-release/canary | Package registry publish, semver tag, changelog |
| `hobby` | n/a or local | "It runs where I need it" — minimal |

## Staging (Phase 4)

1. **Provision** the staging environment for the type's stack (from the manifest
   Default Stack / ADRs). Prefer infra-as-code or a documented, repeatable setup.
2. **Configure** environment variables and secrets — never commit secrets; use the
   platform's secret store. Confirm parity with the production config shape.
3. **Run migrations** against the staging datastore.
4. **Deploy** the current build.
5. **Smoke-test:** health check + the critical-path user journey. Capture results.
6. **Gate:** Phase 4 is not complete until staging is green and passes the Step
   4.6 Staging Review. Record status in `PHASE_STATE.md` / `BOARD.md`.

## Production (Phase 5.2)

1. **Pre-flight:** run the pre-launch checklist (`TEMPLATES/launch-checklist.md`)
   and confirm the security gate (`anymake-security-review`) passed.
2. **Provision/confirm** production infra; DNS and TLS for user-facing types.
3. **Secrets & env** set for production; rotate any that leaked into staging logs.
4. **Migrate** production data store (backup first; have a tested rollback path).
5. **Deploy**, then **smoke-test** the live critical path.
6. **Wire observability:** uptime/health monitoring and error tracking must be
   live before declaring launch — this feeds `anymake-iterate` and the Phase 5.5
   metrics dashboard.
7. **Record** the release (version/tag, changelog) and update `PHASE_STATE.md`.

## Rollback

Every production deploy must have a known rollback: previous release pinned,
reversible (or forward-fix-ready) migrations, and a documented one-command revert.
If a smoke test fails post-deploy, roll back first, diagnose second.

## Guardrails

- **Secrets never in code or logs.** Use environment/secret stores; scan before deploy.
- **No untested migration against production** without a fresh backup.
- **Staging must mirror production's config shape** or the gate is meaningless.
- **Don't declare launch** until monitoring + error tracking are confirmed live.

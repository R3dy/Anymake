---
name: anymake-new-type
description: Use to author a new Anymake project type — scaffold a conforming manifest.md + guide.md pair under PROJECT_TYPES/ so the system supports a kind of project it doesn't yet (e.g. mobile-app, browser-extension, data-pipeline, game). Triggers on "add a project type", "create a new Anymake type", "scaffold a manifest", "Anymake doesn't support X, add it", or "make a profile for <kind of project>". A meta-skill that extends Anymake itself.
---

# Anymake New Type — Project-Type Authoring

Anymake adapts to the *kind* of thing being built via type **profiles** in
`PROJECT_TYPES/`. The orchestrator, worker, and proxy read those profiles
generically, so a new type needs **no code changes** — only a well-formed
profile. This skill scaffolds one correctly.

## When to use

- The user wants Anymake to support a project shape it lacks (mobile app,
  browser extension, data pipeline, ML model, game, desktop app, …).
- Directly — "add a `mobile-app` type", "scaffold a profile for browser extensions".

First read `PROJECT_TYPES/README.md` (the authoritative schema) and an existing
profile closest to the new one as a model (`hobby/` is the simplest structural
template; `saas/` is the fullest).

## A profile is two files

| File | Audience | Must contain |
|------|----------|--------------|
| `PROJECT_TYPES/<id>/manifest.md` | Agents (orchestrator, worker, proxy) | The structured rules — parsed uniformly |
| `PROJECT_TYPES/<id>/guide.md` | The main agent each session | Self-contained phase walkthrough for this type |

`<id>` is a short kebab-case slug (e.g. `mobile-app`).

## Manifest schema (keep this exact section order)

```
# Project Type: <Name> (`<id>`)

## Identity         — id, one-liner, choose-when, not-this-if
## Phase Map        — table: each phase → active (full) | active (lite) | skipped | replaced + note
## Success Model    — the first-class success axis for this type
## Default Stack    — recommended technologies
## ADRs             — mandatory + optional architecture decisions
## Phase 2 Tracks   — PRD / UX+Prototype / Architecture / Monetization → yes | no | lite
## Phase 4 Build Order — the ordered layer sequence Workers follow (overrides SaaS default)
## Launch & Metrics — distribution target + the metrics framework that matters
## Gate Criteria Deltas — per-gate overrides for the Product Owner Proxy (add / skip / replace)
```

The Phase Map, Phase 2 Tracks, Build Order, Launch target, and Gate Deltas are
what the companion skills (`anymake-design-system`, `anymake-deploy`,
`anymake-security-review`, `anymake-build-loop`) key off — fill them concretely.

## Guide structure

A self-contained walkthrough of every **active** phase for this type (use
`hobby/guide.md` as the structural model). For each active phase: goal, steps,
artifacts, and the gate. Skipped phases say so and why. Don't make the reader
cross-reference other types.

## Procedure

1. Confirm the new type isn't just an existing one with different settings
   (sometimes the answer is "use `saas` with these manifest tweaks", not a new type).
2. Pick `<id>` and the **two axes**: *shape* (web/CLI/library/…) and *ambition*
   (personal-local vs production-commercial).
3. Write `manifest.md` to the schema above — every section, in order.
4. Write `guide.md` covering each active phase.
5. **Register it:** add a row to the Available Types tables in
   `PROJECT_TYPES/README.md` **and** in the hub `skills/anymake/SKILL.md`
   ("Available Project Types").
6. Sanity-check: does each companion skill have what it needs from the manifest
   (build order, deploy target, gate deltas, Phase 2 tracks)? If a section is
   vague, a companion will fall back to SaaS defaults — make it explicit.

## Guardrails

- **Schema conformance is the contract.** Agents parse sections by name and order;
  deviating breaks generic reading.
- **No engine edits.** If you find yourself wanting to change the orchestrator/
  worker/proxy to support the type, the manifest is underspecified — fix the
  manifest instead.
- **Self-contained guide.** A builder using this type should never need another
  type's guide.

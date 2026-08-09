---
name: anymake-brownfield
description: Use to bring Anymake's phased discipline to an EXISTING codebase instead of a greenfield idea. Reverse-engineers PROJECT.md, a discovery snapshot, an architecture map, and a forward backlog from code that already exists. Triggers on "adopt Anymake in this repo", "onboard an existing project", "reverse-engineer a PRD", "Anymake an existing codebase", "I already have code", or "continue building on top of what's here". Bridges a real repo into the standard Anymake project workspace so the hub and other companion skills can take over.
---

# Anymake Brownfield Onboarding

The hub assumes "Start a new project." This skill is the on-ramp for the other
case: **code already exists** and the user wants Anymake's phased, artifact-driven
process going forward. It reverse-engineers the Phase 0–3 artifacts from the
actual repo so the hub can resume at Phase 4 (or wherever appropriate) with real
state.

## When to use

- The user points Anymake at an existing repository.
- Mid-build adoption: "we have an MVP, take it from here."
- Before any other companion skill can run on a repo that has no
  `PROJECTS/[name]/` workspace yet.

## What it produces

Reuses the same templates and locations as the hub — no parallel formats.

| Artifact | Template | Derived from |
|----------|----------|--------------|
| `PROJECTS/[name]/PROJECT.md` | `TEMPLATES/project.md` | README, package metadata, code purpose, inferred success model |
| `PROJECTS/[name]/docs/01-discovery.md` (lite) | `TEMPLATES/discovery.md` | What the product clearly is + obvious competitors/risks (mark assumptions) |
| `PROJECTS/[name]/docs/architecture-map.md` | `TEMPLATES/adr.md` (one ADR per significant existing decision, marked "as-built") | Actual stack, structure, data model, integrations |
| `PROJECTS/[name]/BACKLOG` (epics + stories) | `TEMPLATES/epic.md`, `TEMPLATES/story.md` | Gaps, TODOs, requested features, tech debt |
| Experience Scripts for the backlog above | `TEMPLATES/experience-script.md` (via `anymake-experience-setup`, retrofit mode) | The reverse-engineered stories have acceptance criteria but never went through Phase 3, so they have no Experience Script yet — this closes that gap before the build loop runs |
| `docs/environment.md` | `TEMPLATES/environment.md` (via `anymake-experience-setup`) | How the existing app actually starts locally — not aspirational, verified against what's really there |
| `PROJECTS/[name]/PHASE_STATE.md` | `TEMPLATES/phase-state.md` | Set `project_type`, `autonomous_mode`, and the resume point |

> **Brownfield's map *is* the first run of the engineering-intent layer.** The
> system map, as-built ADRs, and invariants you reverse-engineer here are exactly
> what the Cartographer (`AGENTS/cartographer.md`) maintains going forward. Once
> onboarded, future bug fixes and feature changes go through `anymake-agile`,
> which reads this layer and keeps it current — so the work done here is not
> throwaway. If you want the full layer up front, you can produce
> `docs/SYSTEM_MAP.md`, `docs/DECISIONS.md`, and `docs/INVARIANTS.md` (templates
> of the same name) here too, or leave it for the first `anymake-agile` cycle to
> generate.

## Procedure

1. **Detect type.** Inspect the repo (manifests, frameworks, entrypoints, presence
   of a UI/CLI/library API) and recommend a `project_type`; confirm with one
   question. Read `PROJECT_TYPES/<id>/manifest.md` — it governs from here on.
2. **Map the system.** Survey structure, stack, data model, external integrations,
   build/test/deploy setup, and how it runs. Use a read-only exploration pass
   (delegate broad searches to a sub-agent to keep context clean).
3. **Reverse-engineer PROJECT.md.** Identity, scope (what it *currently* does is
   in-scope), and the success model for the chosen type. Flag inferred items so
   the user can correct them.
4. **Discovery snapshot (lite).** Capture market position, obvious competitors,
   and live risks (security, scaling, debt). Don't fabricate research — mark
   unknowns as open questions.
5. **As-built ADRs.** Record the significant architecture decisions already made,
   each marked `Status: as-built`, so future ADRs have a baseline.
6. **Forward backlog.** Turn gaps, TODOs, known bugs, and requested features into
   epics → stories with acceptance criteria, ordered with a dependency graph —
   the same format `anymake-build-loop` consumes.
6a. **Retrofit the Experience Harness.** Run `anymake-experience-setup` in
   retrofit mode against the backlog just written: it authors an Experience
   Script for every story (or an explicit N/A) and writes `docs/environment.md`
   from how the app actually starts today. Skipping this step means the build
   loop's Experience Runner has nothing to drive later, and every Human-Only
   criterion in the new backlog escalates instead of getting verified.
7. **Write PHASE_STATE.md** and set the resume point (usually Phase 3 approval →
   Phase 4, or Phase 2 if planning gaps are large). Hand back to the hub.

## Guardrails

- **Don't rewrite working code during onboarding.** This phase is read-and-document
  only; changes happen later through the normal build loop and its gates.
- **Mark every inference.** Reverse-engineered intent is a hypothesis until the
  user confirms it — surface assumptions, don't bury them.
- **Respect the existing architecture** in as-built ADRs; propose changes as new
  backlog items, not silent edits.
- **One artifact at a time**, ending with PHASE_STATE.md updated — same discipline
  as the hub.

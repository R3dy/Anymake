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
| `PROJECTS/[name]/PHASE_STATE.md` | `TEMPLATES/phase-state.md` | Set `project_type`, `autonomous_mode`, and the resume point |

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

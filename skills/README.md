# Anymake Skill Suite

Anymake is a **plugin** that ships a suite of skills. One **hub** skill owns the
end-to-end methodology; a set of **companion** skills own self-contained,
independently-invokable capabilities the hub delegates to (and which are also
useful on their own).

The OpenCode plugin (`.opencode/plugins/anymake.js`) registers this `skills/`
directory so every subfolder with a `SKILL.md` is discovered natively. Only the
hub skill is auto-injected at session start; companion skills are invoked on
demand — either by the hub at the right phase/step, or directly when the user's
request matches a companion's description.

## The hub

| Skill | Role |
|-------|------|
| `anymake` | The phased build methodology (Foundation → … → Launch), state machine, gates, and the router that delegates to companion skills. Always loaded. |

## Companion skills

| Skill | Owns | Hub calls it at… | Also triggers directly on… |
|-------|------|------------------|----------------------------|
| `anymake-build-loop` | The three-tier agentic build engine (Orchestrator → Worker → Validator) over a backlog | Phase 4, Step 4.3 | "run the build loop", "implement my backlog", "build these stories" |
| `anymake-brownfield` | Onboarding an existing codebase: reverse-engineer PROJECT.md, discovery, and a backlog | Instead of Phase 0 when the user points at existing code | "adopt Anymake in this repo", "onboard an existing project", "reverse-engineer a PRD" |
| `anymake-deploy` | Deployment & infrastructure (staging + production, env, rollback, smoke tests) | Phase 4 staging (Step 4.6 review), Phase 5 Step 5.2 (production) | "deploy", "set up staging", "ship to prod", "roll back" |
| `anymake-design-system` | Visual-quality bar: design system + prototype sprint, prototype-gate audit | Phase 2, Step 2.2b (UX-active types) | "design system", "prototype sprint", "make it look polished", "audit the UI" |
| `anymake-security-review` | Security audit: per-PR checklist, the Phase 4.5 full pass, and the pre-launch gate | Phase 4 Step 4.5 + inside the Validator; pre-launch | "security review", "audit for vulnerabilities", "pen-test checklist" |
| `anymake-iterate` | Post-launch loop ("Phase 6"): triage PARKING_LOT, turn metrics into the next epic, bug cycles | After Phase 5, or on "Continue" when the project is already launched | "what's next", "iterate", "triage the parking lot", "plan the next release" |
| `anymake-agile` | The **single post-launch pipeline** for changing a built product: confirmed intake → labeled GitHub issue → Solution Architect development plan (checked against the engineering-intent layer, contradictions gated behind a superseding decision) → independent Plan Reviewer approval loop → traceable build via `anymake-build-loop` (branch/SHA/tag/revert command on the issue) → reporter verification. Replaces ad-hoc "jump to a fix" troubleshooting | When the user reports something broken or requests any add/change/remove on a built project, or when `anymake-iterate` picks an increment to build | "X isn't working", "I found a bug", "this button is broken", "add a feature", "change how X works", "remove Y", "now I want it to…", "feature request", "log an issue" |
| `anymake-new-type` | Authoring a new project type: scaffold a `manifest.md` + `guide.md` pair | When extending the type system | "add a project type", "create a new Anymake type", "scaffold a manifest" |

### The engineering-intent layer

`anymake-agile` depends on a durable record of *why the system is the way it is*,
maintained by the **Cartographer** agent (`AGENTS/cartographer.md`) and stored in
the project workspace:

| Document | Template | Purpose |
|----------|----------|---------|
| `docs/SYSTEM_MAP.md` | `TEMPLATES/system-map.md` | The as-built map a new contributor reads day one |
| `docs/DECISIONS.md` | `TEMPLATES/decisions.md` | Living index of every decision + which are still in force (append-only, supersede never delete) |
| `docs/INVARIANTS.md` | `TEMPLATES/invariants.md` | The non-negotiable behaviors a change must never break |

The Validator's **intent-consistency check** verifies every PR against this layer;
a contradiction with no superseding ADR is an automatic `ESCALATE`.

### The agile design/review pair

`anymake-agile` adds a second author/approver split, mirroring Worker/Validator
but at the **planning** level:

| Agent | Definition | Role |
|-------|------------|------|
| Solution Architect | `AGENTS/solution-architect.md` | Reviews the full project and writes the Development Plan (`TEMPLATES/dev-plan.md`) for one tracked issue. Never touches code |
| Plan Reviewer | `AGENTS/plan-reviewer.md` | Fresh-context adversarial review of the plan (`TEMPLATES/plan-review.md`) — verifies root cause against real code, blast radius, design consistency, rollback. Approves, demands changes, or escalates |

The review loop and traceability rules live in `AGENTS/arbiter.md`
("Agile Plan Review Policy"); the plan approval gate in autonomous mode is the
Product Owner Proxy's `agile-plan-approval` gate.

## Design rules for this suite

1. **Single source of truth.** Skills are entry-point playbooks. Where heavy
   reference material already exists (`AGENTS/`, `TEMPLATES/`, `PROJECT_TYPES/`,
   `PHASE_GUIDES/`), the skill *references those files by path* — it does not
   re-paste them. The hub's bootstrap tells every session where the plugin root
   is, so any `AGENTS/…`, `TEMPLATES/…` path resolves.
2. **The hub routes; companions execute.** The hub's phase guides name the
   companion to invoke at each delegating step. Companions never re-run the
   phase machine — they do their one job and return.
3. **Companions are standalone.** Each works when invoked directly on an
   existing project, not only inside the Anymake flow.
4. **State stays in the project.** Companions read/update
   `PROJECTS/[name]/PHASE_STATE.md` and `BOARD.md` like the hub does — they do
   not invent parallel state.
5. **`project_type` still governs.** Companions read the active type's
   `PROJECT_TYPES/<id>/manifest.md` so they respect the same gate deltas,
   build order, and success model as the hub.

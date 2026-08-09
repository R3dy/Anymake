---
name: anymake-experience-setup
description: Use to build the testing harness for a project — author Experience Scripts (the literal click/type/run/request walkthroughs) for every story in a backlog, audit existing coverage for gaps, and set up docs/environment.md so the Experience Runner can actually launch the app. Triggers on "set up the testing harness", "write experience scripts for this backlog", "retrofit experience scripts", "audit experience script coverage", "does every story have a testing harness scenario", or Anymake Phase 3 Step 3.2b. The authoring half of the Experience Harness — see anymake-experience-check for running it.
---

# Anymake Experience Setup — Building the Testing Harness

This skill **builds** the testing harness for a project: it does not run
anything against a live app. Given a backlog of stories, it produces (or
audits) the artifacts the Experience Runner (`AGENTS/experience-runner.md`)
needs to actually drive the app later — one Experience Script per story and a
correct `docs/environment.md`. Its counterpart, `anymake-experience-check`,
*uses* what this skill builds.

## When to use

- Hub **Phase 3, Step 3.2b (Experience Harness Setup)** — right after User Story
  Mapping, once the backlog has acceptance criteria.
- **`anymake-brownfield`** — after it reverse-engineers a backlog from an
  existing codebase, the imported stories have acceptance criteria but no
  Experience Scripts (they didn't come through Phase 3). Run this skill in
  retrofit mode to backfill them before the build loop or `anymake-agile` runs.
- **Phase 4, Step 4.1 (Scaffold)** — once the real dev server/CLI/service
  exists, validate `docs/environment.md`'s "How to Run It Locally" section
  against it (a launch command that doesn't work on a clean checkout fails
  every story's experience check, not just the first one that hits it).
- Directly — "set up the testing harness for this project", "write experience
  scripts for this backlog", "audit experience script coverage", "retrofit
  experience scripts onto my existing stories".

## What it produces

| Artifact | Template | Scope |
|----------|----------|-------|
| Experience Script per story | `TEMPLATES/experience-script.md` | Embedded in `docs/03-solutioning/epics.md` (or `TEMPLATES/story.md` for a standalone story file) |
| `docs/environment.md` | `TEMPLATES/environment.md` | Interaction mode, launch command, ready signal, base URL/entry point, test account |
| Coverage audit (audit mode only) | table, not a template — see below | Story ID → has script? → gaps |

## Procedure

### 1. Determine interaction mode

Read `PROJECT_TYPES/<project_type>/manifest.md` → **Experience Harness**
section (Browser / Terminal / HTTP / Snippet, and any type-specific notes —
see `AGENTS/experience-runner.md` → Interaction Modes for what each mode
actually does). Every script you write for this project uses this mode unless
a story's manifest explicitly calls for a different one (e.g. the mixed-mode
`agentic-harness` type).

### 2. Set up or validate `docs/environment.md`

Use `TEMPLATES/environment.md`. Fill "How to Run It Locally" exactly — install,
seed/migrate, launch command, ready signal, base URL/entry point, test
account/seed data. If the scaffold doesn't exist yet (Phase 3, before Phase
4.1), write this section as the *planned* commands and flag it for validation
once Phase 4.1 ships the real scaffold — don't invent a command you haven't
confirmed against actual code once it exists.

### 3. Author or backfill scripts

For every story in the backlog:

1. Read its acceptance criteria (positive paths, error paths, edge cases).
2. Skip only if the story has genuinely zero user-observable behavior (pure
   schema/internal refactor) — write `N/A — no user-observable behavior`
   explicitly. This is a judgment call to defend, not a default.
3. Otherwise, write one scenario per acceptance-criteria group as a literal
   action → target/input → expected-result table, using the Action Vocabulary
   in `TEMPLATES/experience-script.md`. Expected results must be checkable
   facts (exact text, status code, exit code, return value) — never a judgment
   phrase like "works correctly" or "looks right".
4. **Every Human-Only acceptance criterion (anything needing visual
   inspection, browser testing, terminal output inspection, or UX judgment)
   MUST get a matching scenario.** This is the one hard rule — a gap here is
   exactly what forces the Validator to escalate a criterion to a human later
   instead of the Experience Runner verifying it (`AGENTS/validator.md` →
   Human-Only). If a criterion genuinely cannot be expressed as a literal
   scenario (a subjective aesthetic judgment with no checkable observable),
   say so explicitly rather than silently skipping it.
5. Write the script into the story's entry in `epics.md` (or its standalone
   `TEMPLATES/story.md` file) under **Experience Script**.

### 4. Audit mode (no authoring — coverage check only)

When invoked to audit rather than author (existing project, "does every story
have a testing harness scenario"), produce a table instead of writing scripts:

| Story | Has Experience Script? | Human-Only criteria covered? | Gap |
|-------|------------------------|-------------------------------|-----|
| 3.1 | Yes | 2/2 | — |
| 3.2 | No | 0/1 | Missing entirely — "user sees upgrade prompt at the 4th project" has no scenario |

Report gaps plainly; don't silently fix them unless asked to switch to
authoring mode.

## This skill never

- Modifies acceptance criteria — scripts trace to criteria that already exist; they never invent new behavior to test
- Launches the application or executes a scenario — that is `anymake-experience-check`'s job entirely
- Marks a Human-Only criterion as covered when the scenario doesn't actually check the literal thing the criterion describes
- Writes a launch command into `docs/environment.md` that hasn't been confirmed against the real scaffold once one exists — a plausible-sounding but unverified command is worse than an honest placeholder

## Guardrails

- **N/A is a real option, not a shortcut.** Reach for it only when a story truly has no observable behavior change.
- **One scenario per acceptance-criteria group** is the normal shape — a scenario needing many steps is usually two scenarios.
- **Keep `docs/environment.md` current.** If a later story changes the dev command (new required flag, new prerequisite service), this skill (or the Worker directly, per `AGENTS/worker.md`) updates it in the same PR — the same discipline as `CONVENTIONS.md`.

## Done when

Every story in the backlog has an Experience Script (or an explicit, defensible
`N/A`), `docs/environment.md`'s "How to Run It Locally" section is accurate for
the current scaffold, and — in audit mode — every gap is reported with the
specific missing criterion named.

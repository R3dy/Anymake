# ADR-014 — The eval harness is a developer tool, not a runtime

**Status:** Accepted
**Date:** 2026-09-13
**Context doc:** `docs/design/eval-harness.md` §11.1

## Context

ADR-008 says this repo is markdown-as-source-of-truth: no build step, no runtime, no
application code. The eval harness in `evals/` is executable code. That tension is real
and is settled here rather than absorbed quietly.

The harness exists because five questions about this repo are currently unanswerable:
whether Anymake beats not-Anymake, which model config runs it best per dollar, whether
an instruction edit makes the system better or worse, which honor-system rules actually
hold under autonomy, and — the one that changes the shape of the tool — **which parts
of Anymake earn their keep and which should be deleted.** `npm run verify` checks that
the markdown is internally consistent. Nothing checks that the markdown *builds better
software*.

## Decision

The eval harness lives in `evals/`, in the same category as `.opencode/verify-plugin.mjs`
and `dashboard/` — an **optional, zero-dependency, developer-only tool**.

Binding constraints:

- The plugin never loads it. No skill or agent file references it as a step.
- A consuming project never needs it. It is not published as part of the plugin.
- **Zero npm dependencies in the harness core.** Browser-mode experience probes need a
  driver; that dependency is isolated to `evals/fixtures/*/oracle/` and installed on
  demand, so the core stays dependency-free and non-browser scenarios run without it.
- It reads the system **the way a user would** — through the plugin, from a pinned
  checkout — and never imports Anymake internals.

That last constraint is not negotiable, and it is worth being explicit about why: the
harness must be able to evaluate an *older* Anymake SHA. "Did this instruction edit help
or hurt?" is only answerable if the measuring instrument is not coupled to the thing
being measured. A harness that imported `AGENTS/` parsers or the plugin's internals could
only ever score the checkout it shipped with.

## Consequences

- `evals/` is excluded from the published package (`package.json` → `files`/`.npmignore`
  behavior) and from anything the plugin loads.
- The harness gets its own regression check, `evals/selftest.mjs`, run by
  `npm run eval:selftest`. A tool that grades Anymake and has no check of its own would
  be the clearest possible instance of the drift the 2026-08-29 audit already found once.
- `PROJECT_TYPES/<id>/manifest.md` gains a `## Eval Profile` section (ADR-014's one
  schema change, documented in `PROJECT_TYPES/README.md`). Adding a project type still
  means two markdown files and no code changes — for evaluation as well as for building.
  `npm run verify` check [25] enforces it.
- Runs are expensive and slow, so the harness is **not** a per-push CI gate. It runs as a
  nightly smoke (one cell), a pre-release sweep, and on demand for any PR touching
  `AGENTS/`, `PHASE_GUIDES/`, `skills/`, or `PROJECT_TYPES/` — the files whose whole
  purpose is to change agent behavior.

## Alternatives considered

**A separate repository.** Rejected: the harness has to move in lockstep with the
instruction files it measures, and a cross-repo pin is a maintenance tax with no
compensating benefit. The pinned-checkout constraint above already provides the
decoupling that mattered.

**Inside `.opencode/`.** Rejected: `.opencode/` is what the plugin loads. Putting a
developer tool there invites exactly the coupling this ADR forbids.

**Scoring from the run's own reports.** Rejected, and worth recording as a decision
rather than an implementation detail: the harness never scores a run using that run's own
verdicts. A Validator `PASS`, an Experience Runner `PASS`, a Product Owner Proxy
`APPROVED` are evidence *about the system's judgment*, scored against a hidden oracle —
never a substitute for it. This is the same reason `AGENTS.md` splits Worker from
Validator, applied to the thing doing the grading.

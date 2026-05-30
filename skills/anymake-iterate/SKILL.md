---
name: anymake-iterate
description: Use after launch to run the ongoing iteration loop — triage the parking lot, turn live metrics into the next epic, plan releases, and handle bug-fix cycles. Anymake's "Phase 6". Triggers on "what's next", "what should we build next", "iterate", "triage the parking lot", "plan the next release", "the metrics say…", "post-launch", "fix this bug and ship it", or "Continue [project]" when the project is already launched. Closes the loop back into the build engine for execution.
---

# Anymake Iterate — Post-Launch Loop ("Phase 6")

The hub takes an idea to launch and stops. Real products don't. This skill owns
everything *after* Phase 5: deciding what to build next, and feeding it back
through the same disciplined machinery.

## When to use

- After **Phase 5** completes.
- On **"Continue [project]"** when `PHASE_STATE.md` shows the project already launched.
- Directly — "what's next?", "triage the parking lot", "plan the next release",
  "ship a fix for X".

## Inputs

| Input | Where | Use |
|-------|-------|-----|
| Live metrics | Phase 5.5 AARRR dashboard (`TEMPLATES/metrics-dashboard.md`) | What's working / what's not, against the success model |
| `PARKING_LOT.md` | `PROJECTS/[name]/PARKING_LOT.md` | Ideas deferred mid-build, now eligible |
| Bug reports / errors | Error tracking from `anymake-deploy` | Defects to triage |
| Success model | `PROJECT.md` + type manifest | The axis every decision is judged against |

## The loop

1. **Gather signal.** Pull metrics, parking-lot items, bug reports, and user
   feedback into one view.
2. **Score against the success model.** Rank candidate work by impact on the
   type's success axis (revenue / adoption / reliability / personal use), not by
   novelty. Quick wins and high-impact items rise; vanity work sinks.
3. **Pick the next increment.** Recommend ONE thing — a release theme, a single
   feature, or a bug batch. Recommend, don't list. Get approval (or the Product
   Owner Proxy in autonomous mode).
4. **Right-size the planning.** Small change → a story or two straight to the
   backlog. Larger change → a focused mini Phase 2/3 (PRD delta + ADRs + epic →
   stories). Reuse the standard templates; don't reopen the whole phase machine.
5. **Execute via the build engine.** Hand the new stories to `anymake-build-loop`.
   It builds, validates, and PRs them exactly as in Phase 4.
6. **Ship** via `anymake-deploy`; **verify** the metric moved.
7. **Record** the increment in `PHASE_STATE.md` and refresh the dashboard. Loop.

## Bug-fix fast path

For a defect with a clear repro: write one story with the repro + fix as
acceptance criteria, run it through `anymake-build-loop` (security checklist still
applies), deploy, confirm resolved. Don't let urgency skip validation.

## Guardrails

- **Still gated.** New scope goes through an approval (human or proxy) before
  building — launch doesn't suspend the gates.
- **Metrics over opinions.** Prioritize by measured impact on the success model.
- **One increment at a time.** Same anti-scope-creep discipline as the hub;
  overflow goes back to `PARKING_LOT.md`.
- **Don't bypass the engine.** Post-launch code ships through the same
  build-loop + security + deploy path, not hand-edited to prod.

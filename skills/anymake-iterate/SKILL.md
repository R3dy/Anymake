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
5. **Execute via `anymake-agile`.** Hand the chosen increment to `anymake-agile`
   as a tracked issue — its intake stage is short here (the increment is already
   defined and approved; confirm the restatement and log the issue), then the
   Solution Architect plans it against the engineering-intent layer (gating any
   contradiction behind a superseding ADR), the Plan Reviewer approves the plan,
   and the stories run through `anymake-build-loop` — building, validating, and
   PR'ing exactly as in Phase 4, with full issue-to-merge-SHA traceability.
6. **Ship** via `anymake-deploy`; **verify** the metric moved.
7. **Record** the increment in `PHASE_STATE.md` and refresh the dashboard. Loop.

## Bug-fix path

A **user-reported** defect ("this button isn't working") goes through
`anymake-agile` — confirmed intake, a tracked issue, an architect-written plan,
and independent plan review before any code. Jumping straight to a fix is the
ad-hoc failure mode that skill exists to prevent.

**Emergency fast path (explicit user request only).** This path skips the
Solution Architect and Plan Reviewer entirely, so its entry condition has to be
checkable rather than asserted. Both of the following must hold:

1. **The user explicitly asks to skip the plan-review loop.** Not implied by
   urgency, tone, or the word "urgent" — an explicit request.
2. **A named, currently-true production condition**, at least one of:
   - The project's error-tracking or monitoring tool is **showing a live
     incident right now** — an open alert, a firing monitor, an error-rate
     spike. Look at it; don't infer it.
   - The user **states that production is currently returning errors to real
     users** — not that it might, not that a bug exists, but that it is
     happening now.
   - Production is **returning 5xx or is unreachable** on a check you run
     yourself against the production URL.
   - A **data-loss or security-exposure** condition is live in production
     (customer data being corrupted, or exposed, as we speak).

If the second condition is not met, this is a normal bug — route it through
`anymake-agile` and say so plainly: *"Production isn't currently down, so this
goes through the normal plan-review loop. If you're seeing live errors, tell me
what you're seeing and I'll take the fast path."* A serious bug that is not
currently breaking production for real users is still a normal bug; "this is
important" is not the condition.

**Log the condition verbatim.** Whatever satisfied condition 2 — the alert name
and timestamp, the user's exact words, the status code you observed — is
recorded **verbatim** in the backfilled tracking issue, alongside the merge SHA
and revert command. Not paraphrased, not summarized as "production was down."
This is what makes the fast path auditable after the fact: someone reviewing the
project later can see exactly what justified skipping plan review, and can tell
a real incident from a habit.

Then: write one story with the repro + fix as acceptance criteria, run it
through `anymake-build-loop` (the security checklist still applies in full, and
the Experience Runner still runs), deploy, confirm resolved, and backfill the
tracking issue. Don't let urgency skip validation — the fast path skips
*planning*, never *verification*.

## Periodic project-type re-check (advisory)

Project type is chosen once in Phase 0 and then silently governs which gates
run forever. This loop is where a project's real nature shows up over time — a
`hobby` project that has acquired public hosting, sign-ups, or paying users is
no longer the thing whose gates were skipped.

Once per loop entry (not once per issue), check:

- Does the deploy config show **public hosting** — a public URL, a hosted
  platform, DNS/TLS, or an open sign-up path — while `project_type` is `hobby`
  or `internal-tool`?
- Do recent issues or the backlog describe **charging, pricing, subscriptions,
  or paying customers** while the type is `hobby` or `internal-tool`?

If either fires, surface one line and continue:

```
NOTE — project_type is [type], but [public hosting at <URL> | commercial
signals in <issue/backlog ref>] suggests otherwise. That type skips [security
checklist beyond committed secrets | monetization and legal requirements].
Worth reconsidering — say "switch project type to [suggested]" if so.
Continuing as [type].
```

**Advisory only.** Never auto-switch `project_type`, never block the loop, never
repeat it more than once per loop entry. Changing project type is a product
decision, and product decisions are the user's (`AGENTS.md`: no autonomous
product decisions). See `AGENTS/arbiter.md` §"Commercial-signal check".

## Guardrails

- **Still gated.** New scope goes through an approval (human or proxy) before
  building — launch doesn't suspend the gates.
- **Metrics over opinions.** Prioritize by measured impact on the success model.
- **One increment at a time.** Same anti-scope-creep discipline as the hub;
  overflow goes back to `PARKING_LOT.md`.
- **Don't bypass the engine.** Post-launch code ships through the same
  build-loop + security + deploy path, not hand-edited to prod.

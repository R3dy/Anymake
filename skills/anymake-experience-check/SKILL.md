---
name: anymake-experience-check
description: Use to actually run the testing harness on demand — launch the built application (locally, on a branch, or at a staging/production URL) and drive it through a story's Experience Script, or an ad hoc one you describe, the way a person would. Triggers on "test this for real", "actually verify this works", "prove this before I ship it", "drive the app through X", "run the experience check", "does the login flow really work", Anymake Phase 4 Step 4.6 (staging review), or the anymake-agile Verify step. The execution half of the Experience Harness — see anymake-experience-setup for authoring the scripts it runs.
---

# Anymake Experience Check — Using the Testing Harness

This skill **runs** the testing harness on demand, outside the automated Phase
4 build loop: point it at a story, a PR, or a live URL, and it launches the
real application and drives it — clicking, typing, running commands, sending
requests — exactly like `AGENTS/experience-runner.md` does inside the loop,
just triggered directly instead of by the Orchestrator. It never authors
scripts from scratch for a formal story (that's `anymake-experience-setup`);
it either uses an existing Experience Script or, for a genuinely ad hoc
request, synthesizes a minimal throwaway one for that single check.

## When to use

- **Directly, any time** — "test this for real", "actually verify story 3.2
  works", "prove the login flow works before I ship it", "does this button
  really redirect correctly". This is the answer to "the agent said it's good
  to go, but is it *actually*?" without waiting for the next full build-loop pass.
- Hub **Phase 4, Step 4.6 (Staging Review)** — before the human (or, in
  autonomous mode, the Product Owner Proxy) signs off, run each critical-path
  Experience Script against the **staging URL** so the sign-off is based on
  something that was actually driven, not just code review. This directly
  narrows the staging-review gate's documented autonomous-mode limitation
  ("end-to-end browser testing requires a human") down to whatever genuinely
  can't be scripted (live third-party payment edge cases, subjective polish).
- **`anymake-agile` Step 7 (Verify)** — replay the issue's repro-as-Experience-Script
  (or a feature's new-flow script) against staging before asking the reporter
  to confirm; the reporter reviews passing evidence instead of being the first
  and only person to actually try it.
- **Not** inside `anymake-build-loop`'s automated Step 5a/5b — there, the
  Orchestrator spawns `AGENTS/experience-runner.md` directly as part of the
  loop's own retry/escalation machinery. This skill is the standalone,
  ad hoc entry point to the same agent, for everything outside that loop.

## Inputs — pick one target

| Target | What to pass the Experience Runner |
|--------|-------------------------------------|
| A story ID with an existing task brief | The task brief path as-is (§3a Experience Script, §3a Preconditions) — this is the normal in-loop shape, reused verbatim |
| A story ID with no task brief (post-merge spot check) | The story's Experience Script from `epics.md` directly, with Preconditions from `docs/environment.md` |
| A PR with no obvious story link | Locate the story it implements (branch name / PR body) and use its script; if none exists, fall back to the ad hoc case below |
| A URL (staging, production, or a already-running local instance) | Whatever script applies, with **Base URL / entry point overridden to the given URL** — skip the "launch the app" step entirely, since it's already running |
| An ad hoc request with no formal story ("test that login works") | Synthesize a minimal one-scenario script on the spot, in `TEMPLATES/experience-script.md` format — literal actions, checkable expected results, nothing invented beyond what was asked. Note plainly that this is unscripted/ad hoc, and offer to hand it to `anymake-experience-setup` to save into the story's §3a if a matching story exists |

## Procedure

1. **Resolve the target** per the table above. If pointed at a live URL, do
   not attempt to launch anything — treat "ready" as already true and go
   straight to driving the scenarios.
2. **Assemble the script** — existing §3a, existing `epics.md` scenario, or a
   freshly synthesized ad hoc one. Confirm the interaction mode
   (`PROJECT_TYPES/<id>/manifest.md` → Experience Harness) matches what you're
   about to do.
3. **Spawn `AGENTS/experience-runner.md` as a sub-agent** (the `Agent` tool) —
   do not drive the app inline in this session. The observe-only separation
   (the thing that drives the app is never the thing that decides to fix it)
   holds here exactly as it does inside the automated loop. Pass it the
   assembled script (as a task-brief-shaped file, or the standalone Experience
   Script file directly — the agent accepts either), the target, and the
   branch/checkout instructions if applicable.
4. **Report the verdict** — PASS / FAIL / ESCALATE, with the same evidence
   shape as `TEMPLATES/experience-report.md` (screenshots, transcripts,
   captured responses, and — on FAIL — the file:line diagnosis).
5. **Do not fix anything yourself.** A FAIL is a diagnosis, not a task for
   this skill to resolve — hand it back to the calling context (you, the
   Orchestrator's retry loop, or the agile flow) to decide what happens next.

## This skill never

- Invents or edits acceptance criteria — an ad hoc script checks only what was actually asked
- Fixes code, tests, or configuration based on what it finds — same hard constraint as `AGENTS/experience-runner.md` itself
- Marks something PASS without actually having driven it — reading code and inferring the result is never a substitute
- Treats a synthesized ad hoc script as equivalent to a reviewed, backlog-authored one — say plainly when a check was improvised

## Guardrails

- **Live-URL checks still respect scope.** Driving a staging or production URL
  means real requests against real infrastructure — avoid destructive actions
  (don't submit real payments in live mode, don't spam a rate-limited
  endpoint) and prefer test-mode credentials/data where the target supports them.
- **An ad hoc PASS is evidence for right now**, not a durable artifact — if the
  same check is worth running again later, it belongs in the backlog via
  `anymake-experience-setup`, not re-improvised each time.
- **Never skip spawning the sub-agent** to save a round trip — collapsing
  "drive the app" and "decide what it means" into this skill's own context
  defeats the same separation the rest of the system enforces everywhere else.

## Done when

The target has actually been driven through every step of the resolved
script, a verdict (PASS/FAIL/ESCALATE) is reported with real evidence, and —
on FAIL — the diagnosis is specific enough for whoever fixes it to act on
without re-investigating from scratch.

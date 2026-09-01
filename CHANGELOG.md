# Changelog

Anymake is markdown-as-source-of-truth (ADR-008): the instruction files *are*
the system, so a change to how an agent is told to behave is a release-worthy
change. Entries are newest first.

---

## v3.1 — Instruction-deviation remediation (2026-09-01)

Implements `docs/audits/2026-08-29-remediation-plan.md`, which addresses every
finding in `docs/audits/2026-08-29-instruction-deviation-audit.md`.

The audit's framing was that this is a system of prose an LLM is trusted to
follow, with no CI and no runtime enforcement — so "deviation risk" meant either
instructions that were internally broken, or rules that existed in prose with
nothing to catch a violation. This release addresses both, and the ordering was
deliberate: the safety net came first so every later fix is verified
mechanically rather than by re-reading.

### The regression harness is now the check (Phase 0)

`verify-plugin.mjs` was a throwaway script with a "delete after" header. It is
now the repo's regression suite, run by `npm run verify` and by GitHub Actions
on every push and PR. Zero dependencies — no build step, no runtime, ADR-008
preserved. It grew from 14 check groups to 24; **192 assertions** run per commit.

The rule going forward: **every instruction fix ships with the assertion that
would have caught it.** New check groups added by this release:

| # | Checks |
|---|--------|
| [15] | Executes every `output_check` grep in every DISPATCH block against the real template the dispatched agent writes; rejects tautological patterns |
| [16] | Allow-listed assertions that root `AGENTS.md` does not contradict the specs it summarizes |
| [17] | Runs the dashboard's own column filter over a fixture board-state |
| [18] | INV-018 chokepoint — no unlisted raw `Agent`/`Task` spawn instructions |
| [19] | Every absolute "must"/"never" rule in `AGENTS.md` traces to a detailed spec |
| [20] | Board-state schema constraints; runs `validate-board-state.mjs` on both fixtures |
| [21] | Pronoun convention — no human-meaning "you" in agent-instruction files |
| [22] | Project-type and scope guardrails, incl. fixture separation of the heuristic |
| [23] | `LIMITATION` field and waiver discipline at autonomous gates |
| [24] | Build-loop dry-run: `output_check`s against real fixture deliverables |

### Fixed — instructions that were broken as written (Phase 1)

- **Three MANDATORY post-dispatch checks could never match their templates.**
  `grep -c '## §3a'` (no `§` exists in `task-brief.md`), `grep -c '## RESULT'`
  (the heading is `## 10. RESULT`), and `grep -c 'verdict:'` (the heading is
  uppercase) all returned 0 always. Followed literally, every valid deliverable
  was a failure, producing spurious retries and escalations.
- **Eight phase-gate checks were tautologies.** `grep -c 'proxy'` on `BOARD.md`
  passes identically for `APPROVED`, `NEEDS CHANGES`, and `ESCALATE TO USER`.
  They now match a structured verdict token, with the semantics stated at every
  site: the check confirms a verdict *landed*, not that it was favorable.
- **`awaiting_review` had no kanban column** — a story paused for human PR
  review, the one state where a human is supposed to be watching, silently
  vanished from the live board. Columns are now derived from the schema's status
  enum, so this class of bug fails CI.
- `TEMPLATES/BOARD.md` gains a **Gate Decisions** table. The proxy was already
  told to record decisions on the board; there was nowhere defined to put them.

### Closed — dispatch bypasses (Phase 2)

INV-018 routes all dispatch through `anymake-dispatch`, but `anymake-build-loop`
and `anymake-experience-check` instructed the raw host spawn for core build-loop
stages, skipping the hardening the chokepoint exists to provide. Both now route
through the skill.

The three research-delegation sites are now **explicitly exempt** by a recorded
decision in `AGENTS/arbiter.md` §"INV-018 Scope": read-only research is exempt;
anything producing a role-bearing deliverable is not. The test is the
deliverable, not the tool. Exemptions must be marked at the call site, because a
silent exemption reads identically to a violation.

### Reconciled — `AGENTS.md` vs. the specs it summarizes (Phase 3)

Eleven divergences, found by a full pass over all ten `AGENTS/*.md` files rather
than by sampling. The contract file had drifted into describing a system that no
longer existed: a strictly-serial build loop with no `board-state.json`, no
worktrees, no Experience Runner stage, and an anti-pattern forbidding the
concurrency that is now the default.

`AGENTS.md` now opens with a **precedence rule** — where it and a detailed file
disagree, the detailed file wins — so a future one-sided edit fails safe instead
of ambiguous.

### Strengthened — schema enforcement (Phase 4)

`concurrency.max` is bounded, `touches_files` is required with a `[]` default
(an absent field is not the same fact as an empty one), and every `retries.*`
field has a ceiling matching the arbiter's matrix. New
`.opencode/validate-board-state.mjs` applies it, including cross-field
invariants JSON Schema cannot express, and the orchestrator and dispatch skill
are instructed to run it after every board write — a schema failure carries the
same weight as a failed `output_check`.

**Considered and rejected:** file locking and a database. Either would make the
taskboard a runtime dependency and break ADR-008. Recorded so it is a decision
rather than a gap.

### Tightened — judgment language (Phase 5)

Terms that were self-judged now have definitions or worked examples:

- **"The security baseline"** — never defined, now defined once in the arbiter.
- **The "webhook" keyword match** — replaced with a trust-boundary definition
  covering OAuth redirects, payment return URLs, push receivers, and queue
  subscribers. *(Behavior change: more PRs require review.)*
- **The Validator's intent-check scope** — a self-contradiction, resolved in
  favor of the broader check. *(Behavior change.)*
- **Secret scanning** — four patterns became a documented, extensible table plus
  a high-entropy heuristic, with an explicit not-a-finding list. *(Behavior
  change: more findings, plus false positives to resolve.)*
- **"Spot-check", "genuinely requires", "genuinely subjective"** — each gets a
  concrete floor or a worked table separating what does and does not qualify.
- **The "you"/"your" collision** — `worker.md` literally said "You do not
  interact with you." "You" now always means the agent being instructed; the
  human is always "the real user."

### Added — guardrails (Phases 6 and 7)

*New behavior, not bug fixes.*

- **Commercial-signal check (advisory, never blocking):** when a project's own
  words describe charging or paying customers while `project_type` is `hobby` or
  `internal-tool`, surface a one-line confirmation. Never blocks, never switches
  the type — that is a product decision.
- **"Never Building" scope check (blocking):** the one scope boundary the user
  sets permanently was never checked against a backlog. Now enforced at
  `phase-3-approval` and `phase4-pr-review`, and **not waivable** by the proxy —
  reopening a scope boundary is a Phase 0 amendment, not a judgment call.
- **Required `LIMITATION` field:** the prototype gate's "visual quality requires
  human review" disclosure lived in the gate's own docs, where no consumer of
  the verdict reads it. It is now a required field, and an `APPROVED` without it
  is malformed. Downstream consumers must carry it onto `BOARD.md`.
- **Waiver discipline at the staging gate:** "purely subjective polish" must now
  name the *specific* judgment waived and log it permanently — the same rule the
  human-only waiver already carried.
- **The emergency fast path** now requires a named, currently-true production
  condition, logged verbatim. "This is important" is not the condition.

### Verified (Phase 8)

Clean harness run (192 assertions); board-state validation green on the valid
fixture and correctly rejecting the invalid one; a re-audit sweep across the
original four areas finding no new contradictions; and a build-loop dry-run
executing the orchestrator's live `output_check` greps against fixture
deliverables in the shape an agent actually produces — including a validation
FAIL, an intent-conflict ESCALATE, and a rejected malformed board write.

### Known limitations (deliberate)

Several honor-system items from the audit's section 3 remain honor-system, by
choice: the Worker's "never push to main" and "never edit outside `src/`" have
no branch protection specified here (that is a consuming project's CI concern,
not the build system's); the Frontend Excellence Checklist remains Worker
self-report; and lost `events[]` appends remain acceptable because `BOARD.md`'s
Run Log is the durable record. Closing these would require the runtime
dependency ADR-008 rules out.

---

## v3.0 and earlier

See the git history. Notable: the `anymake-dispatch` chokepoint (#27/#28), the
Experience Harness (#24/#26), parallel orchestration with the shared taskboard
and kanban monitor (#29/#30), and the per-project dashboard launcher (#31/#32).

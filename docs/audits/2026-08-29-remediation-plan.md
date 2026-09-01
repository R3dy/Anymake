# Anymake Remediation Plan

**Date:** 2026-08-29
**Addresses:** `docs/audits/2026-08-29-instruction-deviation-audit.md`
**Goal:** fix every issue from the audit, in an order where each phase is independently verifiable, and where no phase can silently break something an earlier phase already fixed.

## Guiding principles (apply to every phase)

1. **Build the safety net before touching content.** This repo has no CI and no runtime — its only regression check is a human re-reading markdown. Phase 0 turns `verify-plugin.mjs` into that check so Phases 1–7 are validated mechanically, not by hoping a future re-read catches drift.
2. **Every content edit ships with its own regression test.** If a phase fixes a broken cross-reference, it also adds a `verify-plugin.mjs` assertion that would have caught it. This is what "don't introduce new issues" actually cashes out to in a markdown-as-source repo.
3. **Respect the existing architecture — don't "fix" a design decision that's actually intentional.** ADR-008 (markdown-as-source-of-truth, no build step, no runtime dependency) and INV-002/004/008/009/015 are load-bearing. Nothing in this plan adds a mandatory build step, a runtime service, or a real locking mechanism — enforcement additions stay inside the same "optional Node script + schema constraint" pattern `verify-plugin.mjs` already uses.
4. **Separate bug fixes from behavior changes.** Phases 1–4 are corrections to things the files already claim to do. Phases 5–7 change how strict a check *is* — those need to be flagged as intentional behavior changes, not silently folded into "fixes."
5. **One phase, one PR, one re-verification run.** Small batches so a mistake in phase N is caught before phase N+1 builds on it.

---

## Phase 0 — Safety net (prerequisite for everything else)

**Why first:** without this, every later phase is exactly as unverifiable as the original bugs were.

- Promote `verify-plugin.mjs` from a "delete after" manual script to a real regression harness: remove the delete-after comment, add an npm script (`"verify": "node .opencode/verify-plugin.mjs"`) in `package.json`, and add a minimal GitHub Actions workflow that runs it on every push/PR to this repo.
- Add a new check category to it: **cross-reference integrity** — for every `output_check` grep pattern referenced in `AGENTS/*.md` and `PHASE_GUIDES/*.md`, actually execute it against the real template file it targets and assert it returns a nonzero/expected result. (This is what would have caught the three broken `output_check` patterns and the `grep -c 'proxy'` tautology — build it now so Phase 1's fixes are provably correct, not just eyeballed.)
- Add a **stale-summary check**: a script assertion that key claims in root `AGENTS.md` (concurrency model, board-state fields mentioned) don't contradict `AGENTS/orchestrator.md` and `board-state.schema.json` on named topics (a small allow-listed set of assertions, not general NLP — e.g., "if `orchestrator.md` contains `concurrency.max`, `AGENTS.md` must not contain the string 'never run two stories concurrently'").

**Exit criteria:** `npm run verify` runs in CI, fails loudly on the *current* (unfixed) repo state for at least the output_check and proxy-gate bugs, and the workflow is green on a clean no-op commit otherwise.

---

## Phase 1 — Fix verified, isolated bugs

No design changes — pure correctness, each independently shippable.

- `AGENTS/orchestrator.md`: fix the three broken `output_check` greps —
  - `grep -c '## §3a'` → `grep -c '## 3a\. Experience Script'`
  - `grep -c '## RESULT'` → `grep -c '## 10\. RESULT'`
  - `grep -c 'verdict:'` → `grep -c -i 'VERDICT:'` (case-insensitive, matching the real heading)
- Every phase-gate `output_check: "grep -c 'proxy' <path>"` (phase-0/1/2/2b/3/4 staging) → replace with a check that actually distinguishes outcomes, e.g. `grep -c 'VERDICT: APPROVED\|PHRASE: approved' <path>` for the success path, paired with the existing prose instruction to still read and act on `NEEDS CHANGES`/`ESCALATE`. Document explicitly that this check verifies *dispatch produced a real verdict*, not that the verdict was favorable — the caller still branches on the verdict text as before.
- `dashboard/kanban.html`: add the missing `awaiting_review` column to the `COLUMNS` array and its render filter; add it to `verify-plugin.mjs`'s dashboard column check so a future status added to the schema without a matching column fails CI instead of silently disappearing from the board.

**Exit criteria:** Phase 0's harness passes on all three; a hand-built fixture `board-state.json`/task-brief/validation-report with an `awaiting_review` story renders correctly in `kanban.html`.

---

## Phase 2 — Close the INV-018 dispatch bypasses

- `skills/anymake-build-loop/SKILL.md`: rewrite *"Each stage MUST be a separate sub-agent (the Agent/subagent tool)"* to route through `anymake-dispatch` explicitly for every stage (Planner/Worker/Validator/Experience Runner), not just `dispatch_parallel` — mirror the exact phrasing `orchestrator.md` already uses ("assemble a `DISPATCH` request — do not call the Agent tool directly").
- `skills/anymake-experience-check/SKILL.md`: replace *"Spawn `AGENTS/experience-runner.md` as a sub-agent (the `Agent` tool)"* with a `DISPATCH` request through `anymake-dispatch`, including its `output_artifact`/`output_check` (`grep -c -i 'VERDICT:'` on the experience report, matching Phase 1's fix).
- `AGENTS/cartographer.md`, `solution-architect.md`, `plan-reviewer.md`: decide explicitly whether "delegate broad searches to a sub-agent" is meant to be INV-018-exempt (it's read-only research, not a role-bearing dispatch). **Make the decision durable, don't just reword it**: add one line to `AGENTS/arbiter.md` under a new "INV-018 scope" note — *"Read-only research delegation (e.g. to the host's generic Explore agent) is exempt from the dispatch chokepoint; any dispatch that produces a role-bearing deliverable (brief, code, verdict, plan, review) is not."* Then update the three files to cite that line instead of leaving the exemption implicit.
- Add to Phase 0's harness: a grep across every `AGENTS/*.md` and `skills/*/SKILL.md` (excluding `anymake-dispatch/SKILL.md` itself) for the literal strings `Agent(`, `Agent tool`, `Task tool` outside of an explicitly allow-listed "exempt: research delegation" block — this both confirms today's fix and prevents the next person from reintroducing the bypass.

**Exit criteria:** the new grep check in Phase 0's harness passes with zero unlisted matches; `anymake-build-loop` and `anymake-experience-check` read identically to `orchestrator.md`'s dispatch pattern.

---

## Phase 3 — Reconcile `AGENTS.md` with the detailed specs it summarizes

Do this only after Phase 2, since Phase 2 also touches dispatch language that `AGENTS.md` partially duplicates.

- Rewrite `AGENTS.md`'s Orchestrator "must never" list and the Anti-Patterns entry to state the *current* concurrency model: replace "never run two stories concurrently" with "never run two stages of the *same* story concurrently — parallel dispatch across *different* non-conflicting stories is the default (see Concurrency Policy)."
- Expand `AGENTS.md`'s Phase 4 section to mention `board-state.json`, worktree isolation, and the team-lead loop at a summary level, with an explicit pointer: *"This is a summary — `AGENTS/orchestrator.md` is authoritative on the mechanics."* Add one sentence at the top of `AGENTS.md` stating that rule generally: **wherever this file and a detailed `AGENTS/*.md` file disagree, the detailed file wins** — so a future edit that updates one but not the other fails safe instead of ambiguous.
- Fix the Worker build-order contradiction: at `AGENTS.md`'s Worker section (the 7-layer list), add the same qualifier that's already present a few lines up — "(SaaS default; manifest-derived per project type — see Project Types)" — directly at the point of the list, not only in a separate section.
- Do a full line-by-line diff pass between `AGENTS.md` and each of the 10 `AGENTS/*.md` files (not just the two known contradictions) to catch any other summary/detail mismatch the audit didn't happen to sample. Log anything found as its own small fix in this same phase.
- Add to Phase 0's harness: the "AGENTS.md wins vs. defers" rule as one line at the top of the file lets future contributors resolve conflicts without another audit — add a lint check that flags any *new* absolute claim ("never", "always", "must") added to `AGENTS.md` that isn't also present in the corresponding `AGENTS/*.md` file, so drift is caught at the PR that introduces it.

**Exit criteria:** the full-file diff pass is documented (even as a checklist in the PR description) so reviewers know it was exhaustive, not sample-based; Phase 0's new drift check passes.

---

## Phase 4 — Strengthen mechanical enforcement (schema only, no new runtime)

Independent of Phase 3's content; can be done in parallel with it if you want to split the work, but sequence it after Phase 2 since it references dispatch-emitted fields.

- `board-state.schema.json`:
  - Add `"maximum": 10` (or another explicit, documented ceiling) to `concurrency.max` — bounded, not unlimited, but still configurable.
  - Add `touches_files` to each story's `required` list, defaulting to `[]` rather than absent, so "no declared conflicts" is an explicit fact instead of a schema-permitted omission.
  - Add `maximum` bounds to each `retries.*` sub-field matching the actual policy ceilings in `AGENTS/arbiter.md` (2 for environment, 1 for implementation/validation/experience) — pick the loosest applicable ceiling if a single field covers multiple failure types, and note in a schema `description` that the *policy* (not the schema) still decides which ceiling applies to which failure kind.
- Add a small `validate-board-state.mjs` script (same zero-dependency Node style as `verify-plugin.mjs`) that checks a given `board-state.json` against the schema, and add one line to `skills/anymake-dispatch/SKILL.md`'s post-dispatch verify step: *"After any write to `board-state.json`, run `validate-board-state.mjs` — a schema failure is treated the same as a failed `output_check`."* This is enforcement an agent is instructed to run, not a background service — consistent with ADR-008.
- Do **not** add real file locking or a database — that would cross into "new runtime dependency," which the guiding principles rule out. Document this explicitly as a considered-and-rejected option in the PR description, so a future contributor doesn't reopen it as a "missing" fix.

**Exit criteria:** a deliberately malformed fixture `board-state.json` (missing `touches_files`, `concurrency.max: 999`) fails `validate-board-state.mjs`; a valid one passes.

---

## Phase 5 — Tighten escalation/judgment language

The highest-touch, most error-prone phase — do it last among the "AGENTS/*.md" edits so it lands on top of an already-corrected dispatch/build-order baseline, and review each change individually rather than as one giant sweep.

- Define "the security baseline" once, in `AGENTS/arbiter.md`, as an explicit pointer to the Validator's Security Checklist + `anymake-security-review`'s canonical sources — then replace every other bare use of the phrase with that pointer.
- Replace the literal `"webhook"` keyword match (in `arbiter.md` and `orchestrator.md`) with a definition, e.g. *"any story implementing an inbound callback, event handler, or delivery endpoint invoked by a third-party service — regardless of naming (webhook, callback, event handler, push notification receiver)."* Keep "webhook" as the leading example so existing behavior doesn't change for the common case.
- Resolve `AGENTS/validator.md`'s "listed §6a ADRs" vs. "all of DECISIONS.md" contradiction in favor of the broader check (matching the Cartographer's whole-project intent purpose): reword to *"every decision/invariant listed in §6a, plus any other Active Decision or invariant the change plausibly touches even if the Planner didn't list it."*
- Expand the secret-scanning signature list in `validator.md`/`anymake-security-review` beyond `sk_`/`pk_`/connection strings — add a generic high-entropy-string heuristic and common patterns (JWTs, bearer tokens, `AKIA`-style cloud keys) as a documented, extensible list rather than a fixed four items.
- Add a concrete floor to vague verification verbs: "spot-check" (Plan Reviewer) becomes *"verify the root-cause citation and every named blast-radius consumer, at minimum"*; "genuinely requires"/"genuinely subjective" (Experience Runner, Product Owner Proxy) get one worked example each of what does and doesn't qualify, directly in the file.
- Fix the "you"/"your" pronoun collision: add one clarifying sentence near the top of `AGENTS.md` and `AGENTS/arbiter.md` — *"In agent-instruction files, 'you' addresses the agent being instructed. Human approval is always written as 'the user' or 'the real user,' never 'you.'"* Then do a targeted find-and-replace pass in `orchestrator.md`/`arbiter.md` wherever "your review"/"you approve" actually means the human, per the audit's citations.

**Exit criteria:** each of these is a separate small diff (not one commit) so a reviewer can assess whether the *behavior* change (e.g., broader webhook definition catching more PRs for mandatory review) is wanted, not just whether the wording improved.

---

## Phase 6 — Type-selection and gate-erosion guardrails

These are genuine new behavior, not bug fixes — flag them for explicit product sign-off before merging, since they can make previously-silent-pass gates start asking questions.

- At `phase-0-approval` (both the human gate in `PHASE_GUIDES/phase-0.md` and `AGENTS/product-owner-proxy.md`'s automated version): add an **advisory, non-blocking** heuristic check — if `PROJECT.md`'s problem/solution text contains commercial signals ("charge", "pricing", "paying customers", "subscription") while `project_type` is `hobby` or `internal-tool`, surface a one-line prompt asking the user to confirm the type choice. Advisory only — never auto-block, since the heuristic will have false positives.
- Add the same advisory check as a periodic nudge inside `anymake-iterate`'s loop and `anymake-deploy`'s production step: if a `hobby`/`internal-tool` project's deploy config shows public hosting, surface a one-line reminder to reconsider `project_type` (never auto-switch it — that's the user's call per `AGENTS.md`'s own "no autonomous product decisions" rule).
- Add a real gate check (not just advisory) at `phase-3-approval` and `phase4-pr-review`: cross-reference the backlog/story against `PROJECT.md`'s "Never building" list from Phase 0; a story matching an explicitly excluded feature fails the gate with a specific citation, requiring either a Phase 0 scope amendment or story removal.

**Exit criteria:** run this against a couple of hand-built fixture projects (one legitimately hobby, one commercial-mislabeled-as-hobby) to confirm the advisory fires only on the second and never blocks the first.

---

## Phase 7 — Autonomous-mode gate honesty

- `phase-2-prototype-review` (Product Owner Proxy): make the existing "visual quality judgment requires human review" disclosure a **required, structured field** in the verdict output (not just prose in the gate's own docs) — e.g. `LIMITATION: visual polish not verified — code-level checks only`. Require any downstream consumer of this verdict (the staging-review gate, `anymake-iterate`) to surface that field rather than let it get lost in a passed `VERDICT: APPROVED`.
- Extend the same disclosure discipline already used for the `phase4-escalation-human-only` waiver (*"note must survive onto BOARD.md"*) to `phase-4-staging-review`'s "purely subjective polish" escape hatch — require it name the specific judgment being waived and log it permanently to BOARD.md, not just mention it in the verdict summary.
- `anymake-iterate`'s emergency fast path: replace "a production-down defect" with a named, checkable condition (e.g., "the production error-tracking/monitoring tool is currently showing a live incident, or the user states production is returning errors to real users right now"), and require the condition be logged verbatim to the backfilled tracking issue.

**Exit criteria:** a fixture run where the prototype gate would previously silently `APPROVED` a generic-looking prototype now carries a visible `LIMITATION` line a human or the staging gate can act on.

---

## Phase 8 — Full regression pass and re-audit

- Run the now-CI'd `verify-plugin.mjs` (Phase 0) plus `validate-board-state.mjs` (Phase 4) across the whole repo — must be clean.
- Re-run the same four-way parallel audit methodology used to produce the original findings (AGENTS/*.md, skills/*/SKILL.md, PHASE_GUIDES+PROJECT_TYPES, plugin/TEMPLATES enforcement) as an independent check that the fixes didn't introduce new contradictions between files that weren't directly edited together.
- Dry-run a toy Phase 4 build loop against a minimal fixture backlog (2-3 stories, one deliberately triggering a validator FAIL, one deliberately triggering an intent conflict) to confirm: the corrected `output_check` patterns actually pass on real deliverables, dispatch routes through `anymake-dispatch` for every stage, and a deliberately-broken `board-state.json` write is caught by the new schema validation.
- Bump the skill suite version (`skills/anymake/SKILL.md` footer, currently "v3.0") and write a changelog entry summarizing what changed and why, so future sessions reading `PHASE_STATE.md` history understand the provenance of the new checks.

**Exit criteria:** clean CI run, clean re-audit (or a documented, deliberate list of remaining known limitations — e.g., the honor-system items in section 3 of the original audit that Phase 4 explicitly declined to over-engineer), and the fixture build loop completes end-to-end.

---

## Sequencing summary

```
Phase 0 (safety net)
   └─▶ Phase 1 (bug fixes)  ──▶ Phase 2 (INV-018)  ──▶ Phase 3 (AGENTS.md reconciliation)
                                        │
                                        └────────────▶ Phase 4 (schema enforcement)
                                                              │
                     Phase 3 + Phase 4 ──▶ Phase 5 (judgment language)
                                                              │
                                        Phase 5 ──▶ Phase 6 (type guardrails) ──▶ Phase 7 (gate honesty)
                                                                                          │
                                                                                          ▼
                                                                                    Phase 8 (final regression + re-audit)
```

Phases 1 and 2 can technically run in parallel (different files), as can 3 and 4 — but do them as separate PRs even if run concurrently, so Phase 8's re-audit has clean, attributable diffs to check against.

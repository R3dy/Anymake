# Anymake Codebase Audit: Where a Coding Agent Could Deviate from the Skill Instructions

**Date:** 2026-08-29
**Scope:** All 10 `AGENTS/*.md` sub-agent role files, all 12 `skills/*/SKILL.md` companion skills, all 6 `PHASE_GUIDES/*.md`, all 8 `PROJECT_TYPES/*/manifest.md`+`guide.md` pairs, the root `AGENTS.md` contract, `TEMPLATES/*`, `board-state.schema.json`, the OpenCode plugin (`.opencode/plugins/anymake.js`), and `verify-plugin.mjs`.
**Method:** Four parallel research passes (AGENTS/*.md; skills/*/SKILL.md; PHASE_GUIDES + PROJECT_TYPES; TEMPLATES + plugin enforcement) plus direct manual reading and verification of the highest-value claims.

This is a markdown-instruction-driven system: every rule below is prose an LLM agent is trusted to follow. There is no CI and no runtime enforcement layer, so "deviation risk" here means either (a) a place the instructions are internally broken/contradictory, or (b) a place a rule exists in prose only, with nothing that would catch a violation.

## 1. Verified bugs (not just risk — actually broken today)

**The Orchestrator's own "MANDATORY" dispatch-verification commands don't match the templates they check.** `AGENTS/orchestrator.md` specifies these `output_check` greps for the dispatch skill's post-dispatch verify step:
- Step 2 (Planner): `grep -c '## §3a' <path>` — but `TEMPLATES/task-brief.md:46` heading is `## 3a. Experience Script` (no `§` anywhere in the file). **Always returns 0.**
- Step 2b (Worker): `grep -c '## RESULT' <path>` — but the actual heading is `## 10. RESULT` (`task-brief.md:214`). **Always returns 0.**
- Step 4 (Validator): `grep -c 'verdict:' <path>` — but the report heading is `## VERDICT: [PASS | FAIL | ESCALATE]` (`validation-report.md:34`), uppercase, and grep is case-sensitive by default. **Always returns 0.**

Confirmed directly by grepping the templates. Followed literally, "hardening #2 — MANDATORY, not optional" (the check the whole dispatch skill exists to enforce, per `skills/anymake-dispatch/SKILL.md`) would treat every valid deliverable as a failure — triggering spurious retries/escalations. In practice this almost certainly means the real verification behavior in use today is an unaudited improvisation, not the documented check.

**The autonomous-mode gate check is a near-tautology.** Every phase-gate proxy dispatch (`PHASE_GUIDES/phase-0.md:104`, `phase-1.md:144`, `phase-2.md:153,289`, `phase-3.md:199`, `phase-4.md:326`) uses `output_check: "grep -c 'proxy' <path to BOARD.md>"`. This only confirms *some* text containing "proxy" landed on the board — not that the verdict was `APPROVED`. A board entry recording `NEEDS CHANGES` or `ESCALATE TO USER` satisfies the identical check as a genuine approval.

**`dashboard/kanban.html` has no column for `awaiting_review`.** The schema (`board-state.schema.json:64`) and `TEMPLATES/BOARD.md` both define this status — set exactly when a story is paused for human PR review — but the dashboard's `COLUMNS` array omits it, so a story in the one state where a human is supposed to be watching silently disappears from the live board.

## 2. Direct INV-018 violations baked into the skill files

INV-018 says all sub-agent dispatch must go through `anymake-dispatch`, never a direct `Agent`/`Task` call — yet several files instruct exactly that bypass:

- **`skills/anymake-build-loop/SKILL.md:47`**: *"Each stage MUST be a separate sub-agent (the Agent/subagent tool)"* — names the raw host primitive for the core Planner/Worker/Validator/Experience-Runner spawns, never routing them through `anymake-dispatch` (only `dispatch_parallel` mode is scoped to the skill).
- **`skills/anymake-experience-check/SKILL.md:58`**: *"Spawn `AGENTS/experience-runner.md` as a sub-agent (the `Agent` tool)"* — explicit, with `anymake-dispatch` never mentioned anywhere in the file.
- **`AGENTS/cartographer.md`, `solution-architect.md`, `plan-reviewer.md`** (~line 50-56 each): *"Delegate broad searches to a sub-agent (e.g. the `Explore` agent)"* — a direct spawn instruction with no dispatch-skill reference. Lower severity (research-only) but the same literal gap.

## 3. "Must never" rules with zero mechanical enforcement

The plugin (`.opencode/plugins/anymake.js`) only registers the skills directory + model-tier bindings and injects the SKILL.md bootstrap prompt — it has no tool-call interception. `verify-plugin.mjs` is a string-matching linter over markdown prose, not wired into CI, and its own header says `// delete after — not part of the plugin`. So every one of these is honor-system only:

- INV-018 dispatch-only spawning (above).
- ADR-013's board-state.json "writer split" (hub writes `session` only, orchestrator writes `stories[]`/`events[]` only) — no locking, no atomicity, no schema-level enforcement of who wrote what. The schema comment concedes *"lost JSON appends are acceptable"* — data loss is expected, not just tolerated.
- Worker's "never push to main," "never modify migration files," "never edit outside `src/`" — no branch protection or CI gate specified anywhere.
- The Frontend Excellence Checklist in `AGENTS/worker.md` claims its items *"are validation failures"* — but `AGENTS/validator.md`'s actual checklist never checks any of them. Worker self-report only, despite being billed as gating.
- `retries.*` and `concurrency.max` in the schema have no `maximum` bound and aren't required fields.
- `touches_files` (the whole basis of parallel-dispatch conflict detection) is optional in the schema and entirely Planner-self-reported, with no post-hoc diff check.

## 4. The root `AGENTS.md` contract contradicts its own detailed specs

- **`AGENTS.md:139` and `:384`** state as an absolute rule and named anti-pattern: *"Orchestrator must never... run two stories concurrently"* / *"Running two Worker... agents concurrently."* But `AGENTS/orchestrator.md:93-107` makes parallel dispatch **the default**, with `concurrency.max` defaulting to 3.
- **`AGENTS.md`'s entire Phase 4 section (lines 98-131) never mentions** `board-state.json`, worktrees, `concurrency.max`, or the team-lead loop — it describes the old strictly-serial model.
- **`AGENTS.md:159-168`** states the Worker's 7-layer build order as a flat invariant, while `AGENTS.md:74` says *"Worker follows the build order in its task brief (manifest-derived), not a hardcoded one."*

## 5. Autonomous-mode gates that concede they're weaker than the bar they claim to enforce

- `PHASE_GUIDES/phase-2.md`: visual quality is a "hard gate" per `AGENTS.md`, but in autonomous mode *"the proxy checks code-verifiable signals... Visual quality judgment requires human review — this is a documented limitation."*
- `PHASE_GUIDES/phase-4.md:331-333` narrows the staging-gate's remaining human-only scope to *"purely subjective polish judgments a script can't express"* — an undefined, self-serving category.
- `AGENTS/product-owner-proxy.md`'s one legitimate Experience-Script waiver ("not mechanically scriptable even in principle") reintroduces the "waived because the code exists" failure mode the Experience Runner was purpose-built to close.
- Approval phrases across all phase gates are illustrative examples, never a required exact token.

## 6. Project-type selection has no guard against gaming the gates away

- Picking `hobby` skips essentially the entire security checklist beyond literal committed secrets (`PROJECT_TYPES/hobby/manifest.md:51`), plus all monetization/legal requirements — even if later deployed publicly and multi-user.
- Picking `internal-tool` keeps the full auth/security build-out while permanently skipping monetization/legal requirements — no check that the tool is actually internal-only.
- Nothing periodically re-asks "is this still personal-use-only?"
- A "Never building" list from Phase 0 is never cross-checked against the backlog at any later gate.

## 7. Escalation loopholes via undefined/self-serving judgment terms

- `AGENTS/arbiter.md`: security override applies to anything "**the security baseline** covers" — never defined.
- Mandatory-review trigger is a literal string match on "webhook" — "inbound event callback" escapes it while being functionally identical.
- `AGENTS/experience-runner.md`: a step can be skipped if it "**genuinely requires**" a live external dependency — self-judged.
- `AGENTS/plan-reviewer.md`: "spot-check" the plan's evidence, no minimum coverage defined.
- `AGENTS/validator.md`: internal scope contradiction — one line says check only ADRs/invariants "listed" in §6a, the checklist bullet below implies checking all of `DECISIONS.md`.
- Secret-scanning pattern list (`sk_`, `pk_`, connection strings) is narrow enough that JWTs/bearer tokens/custom key formats sail through the one check with an "absolute, always-escalate" consequence.
- Throughout the 2nd-person agent files, "you"/"your" is overloaded between "the real human" and "the agent itself" (e.g., "your review is required").

## 8. Legitimate but under-guarded bypass paths

- `skills/anymake-iterate/SKILL.md`'s "emergency fast path" skips the entire Solution-Architect/Plan-Reviewer loop for "a production-down defect" — undefined term, gated only on the user "explicitly" asking.
- `skills/anymake-agile/SKILL.md`'s trigger for refreshing the intent layer ("`Last mapped` **predates recent merges**") has no concrete check.
- `skills/anymake-brownfield/SKILL.md` frames the reverse-engineered intent layer as foundational, then says producing it is optional, with no "Done when" gate at all.
- `skills/anymake-security-review/SKILL.md`: automated scanning is "if configured" — a repo with none can still reach `PASS` from manual reading alone.

---

*See `docs/audits/2026-08-29-remediation-plan.md` for the phased plan to address all of the above.*

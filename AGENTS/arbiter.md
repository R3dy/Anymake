# Anymake Arbiter — The Shared Rulebook

The **Arbiter** is the one every other agent defers to: the authoritative rules for retries, escalations, gates, conflicts, and merges across the whole system (Phase 4 build loop and the post-launch agile flow alike). The Arbiter is not spawned — it is read. When any agent or skill references a policy, the version here wins.

---

## INV-018 Scope — What Counts as Dispatch

INV-018 routes **all** sub-agent dispatch through the `anymake-dispatch` skill.
This section is the authoritative definition of what that covers, so the
boundary is a decision recorded once rather than re-litigated per file.

**Read-only research delegation (e.g. to the host's generic Explore agent) is
exempt from the dispatch chokepoint; any dispatch that produces a role-bearing
deliverable (brief, code, verdict, plan, review) is not.**

| Delegation | Through `anymake-dispatch`? | Why |
|------------|-----------------------------|-----|
| Planner, Worker, Validator, Experience Runner, Product Owner Proxy, Cartographer, Solution Architect, Plan Reviewer | **Required** | Each returns a role-bearing deliverable the system then acts on. The hardening (WRITE THE FILE FIRST, mandatory post-dispatch verification, canonical RETRY CONTEXT, the dispatch log line) exists because these deliverables gate real decisions. |
| A broad codebase search handed to the host's generic research agent, purely to save context | **Exempt** | It returns findings the delegating agent then reasons about itself — no verdict, no artifact, no gate. There is no deliverable to verify and no retry budget to spend, so the hardening has nothing to harden. |

The test is the **deliverable**, not the tool: if the result is a file, a
verdict, or a decision another agent will act on without re-deriving it, it is
role-bearing and goes through the skill. If the delegating agent still has to
do the actual work with what comes back, it is research.

An exempt delegation must say so explicitly at the call site, citing this
section, so the exemption is visible to a reader and to the harness (which
greps for unlisted references to the host's dispatch primitive). Silent
exemptions read identically to violations.

---

## Model Tier Policy

Every spawned agent runs at one of three importance tiers, so a project can use a strong model for judgment calls and a cheaper one for high-volume mechanical execution, without losing the trust boundary each role already enforces. The tier is set once, directly in each agent's own file (`AGENTS/*.md` frontmatter, `tier: 1|2|3`) — not scattered across a separate config that could drift out of sync with what the agent actually does.

| Tier | Meaning | Agent | File | Why this tier |
|------|---------|-------|------|----------------|
| — | *(not spawned)* | Orchestrator | `orchestrator.md` | Runs as your primary session, not a sub-agent — there's nothing to bind. Point your session itself at your Tier 1 model and the Orchestrator is Tier 1 by construction. |
| 1 | Frontier | Product Owner Proxy | `product-owner-proxy.md` | A strict stand-in for the human at every gate — needs the same judgment bar a human reviewer would apply. |
| 1 | Frontier | Plan Reviewer | `plan-reviewer.md` | The reviewer must be at least as capable as what it's reviewing — never let the checker be weaker than the thing it checks. |
| 2 | Capable | Planner | `planner.md` | Mechanical translation, but has to correctly read and synthesize ADRs, the intent layer, and established conventions — a misread here corrupts every downstream Worker. |
| 2 | Capable | Solution Architect | `solution-architect.md` | Full-project design work for a tracked change — root cause, blast radius, alternatives. |
| 2 | Capable | Validator | `validator.md` | The backstop that has to reliably catch a Tier 3 Worker's mistakes — cheapen the generator, not the checker. |
| 2 | Capable | Experience Runner | `experience-runner.md` | Has to drive a real running app, correctly judge whether an observed result matches a literal expectation, and diagnose a divergence with a file:line pointer — needs enough capability to reliably tell "close" from "correct." |
| 2 | Capable | Cartographer | `cartographer.md` | Maps code to intent; needs real comprehension of the codebase, not just pattern-matching. |
| 3 | Economy | Worker | `worker.md` | Highest-volume role (every story), and the narrowest-scoped — it executes a detailed brief and escalates rather than guessing, which is what makes a cheaper model safe here. |

**How it's wired (OpenCode only).** The plugin (`.opencode/plugins/anymake.js`) reads every `AGENTS/*.md` file's frontmatter at config time. Any file with `mode: subagent` is registered as a named OpenCode agent (`prompt`, `description`, `mode` all sourced from the file) — this part can't live in your `opencode.json`, because it mirrors repo content the plugin regenerates on every load, not something worth hand-copying and keeping in sync yourself.

**Setting the three tier models — two ways, in priority order:**

1. **Per-agent, in your own `opencode.json`** (schema-safe, recommended if you want per-agent control): set just the field you want to override —
   ```json
   { "agent": { "anymake-worker": { "model": "anthropic/claude-haiku-4-5" } } }
   ```
   The plugin merges this in field-by-field — your `model` wins, `mode`/`prompt`/`description` still come from the plugin, so you never have to redeclare the whole agent. (A bare custom top-level key like `"anymake": {...}` was deliberately avoided here — OpenCode's config schema is strict enough that an unrecognized key can throw `ConfigInvalidError`, and in some reported cases has silently discarded the entire config file. `agent.<name>.model` is a real, schema-recognized field, so this path can't break your config.)

2. **Three environment variables** (zero JSON editing, applies to every agent in a tier at once):

   | Env var | Tier | Set it to |
   |---------|------|-----------|
   | `ANYMAKE_MODEL_TIER1` | Frontier | Your best model, `provider/model-id` (e.g. `anthropic/claude-opus-5`) |
   | `ANYMAKE_MODEL_TIER2` | Capable | A strong-but-cheaper model |
   | `ANYMAKE_MODEL_TIER3` | Economy | Your fastest/cheapest model |

   Set before launching OpenCode (shell profile, or wherever you already set `ANTHROPIC_API_KEY`).

A per-agent `opencode.json` override always wins over the tier env var for that agent. **Both are optional** — an agent with neither falls back to OpenCode's default subagent behavior (the primary session's model), so nothing breaks if you configure none of this.

**Known caveat.** This depends on your OpenCode version supporting dispatch of a custom `mode: subagent` agent by name from another agent's tool calls — this has been unreliable across some OpenCode releases. Every spawn instruction in this system (`AGENTS/orchestrator.md`, `PHASE_GUIDES/*.md`) names the registered agent first and documents the inline-instructions fallback next to it. If named dispatch silently falls back, every agent just runs on your primary session's model — the system still works, you just lose the cost/quality split. Verify once after setup: spawn a Tier 3 story and confirm (e.g. by asking the Worker sub-agent which model it is) that it actually landed on your `ANYMAKE_MODEL_TIER3` choice.

---

## PR Review Policy

| Condition | Review requirement |
|-----------|-------------------|
| PR #1, #2, or #3 overall in Phase 4 | your review is required — always |
| Story title or technical tasks contain "webhook" | your review is required — always, regardless of PR count |
| Task brief's Intent Constraints (§6a) list any Active Decision (ADR) this story touches | your review is required — always, regardless of PR count |
| PR #4+, no webhook keyword, and no ADR touched | Autonomous merge after CI passes |
| CI failing on any PR | Do not merge — treat as environment failure, escalate |

PR count is cumulative across all Phase 4 stories. It is not reset per milestone.

**Experience gate.** Regardless of the above, a story does not reach PR review at
all until it clears Step 5a/5b — Validator `PASS` **and** (Experience Runner
`PASS` or the task brief's §3a is explicitly `N/A`). A Validator `PASS` with an
outstanding Experience Runner `FAIL`/`ESCALATE` is not eligible for merge under
any PR-count or review rule above.

---

## Retry Policy Matrix

| Failure scenario | Retry? | Max retries | Escalation trigger |
|-----------------|--------|-------------|-------------------|
| Worker: lint failure | Self-heal in same session | No limit | Never — worker owns lint |
| Worker: test failure | Self-heal in same session | 3 fix attempts | Worker exits as `failed/implementation` |
| Worker: `failed/environment` | Re-dispatch fresh worker | 2 re-dispatches | After 2nd re-dispatch fails |
| Worker: `failed/implementation` | No | 0 | Immediate escalation |
| Worker: `failed/classification_uncertain` | No | 0 | Treated as implementation — immediate escalation |
| Validation: FAIL (1st) | Re-dispatch worker with RETRY CONTEXT | 1 | After 2nd validation FAIL |
| Validation: FAIL (2nd) | No | 0 | Immediate escalation |
| Validation: ESCALATE | No | 0 | Immediate escalation — never retry |
| Experience Runner: FAIL (1st) | Re-dispatch worker with RETRY CONTEXT (from the report's Failure Diagnosis) | 1 | After 2nd experience FAIL |
| Experience Runner: FAIL (2nd) | No | 0 | Immediate escalation — type `experience-fail-2nd` |
| Experience Runner: ESCALATE (unscriptable-criterion) | No | 0 | Immediate escalation — type `experience-unscriptable`, this is a brief gap, not a build failure |
| Experience Runner: ESCALATE (environment-failure) | Re-dispatch experience runner directly (no worker) | 2 | After 2nd re-dispatch fails — type `experience-environment` |
| Security check FAIL | No | 0 | Immediate escalation — security never retries |
| Intent conflict (ADR/invariant contradicted, no superseding ADR) | No | 0 | Immediate escalation — superseding a decision needs a gate, never a retry |
| PR merge conflict | Worker resolves rebase | 1 attempt | After rebase fails |
| CI failing on merge | No | 0 | Immediate escalation |
| All stories blocked | No | 0 | Immediate escalation |

**Worktree lifecycle (B1 / #16):**
Each story's Worker (and its Validator / Experience Runner) operates in a
dedicated git worktree (`.anymake/worktrees/story-N.N/`), created by the
orchestrator before Worker dispatch and removed after `done` or `skip`. Retry
re-dispatches **reuse the existing worktree** — do not re-create it. The
worktree is cleaned up only on `done` or `skip`. A per-story escalation does
not trigger worktree cleanup until the story reaches a terminal state.

---

## Environment vs. Implementation Classification

The worker self-classifies its failure. Classification determines whether the orchestrator retries or escalates.

### Environment Failure

The problem is outside the code. The same implementation, re-run in a working environment, would likely succeed.

**Classify as environment if:**
- CI infrastructure is unreachable or returning 5xx
- npm/pip/cargo registry times out during install
- Git server is unreachable during push
- Third-party API (Stripe test, SendGrid sandbox, etc.) returns unexpected 5xx
- Rate limit hit on external service during build
- Database connection fails due to connectivity, not code

### Implementation Failure

The problem is in the code or the task itself. Re-running would fail again.

**Classify as implementation if:**
- TypeScript/type error after 3 attempts to fix
- Logic error whose root cause cannot be identified
- Dependency conflict with no viable resolution
- Acceptance criterion architecturally incompatible with existing codebase
- Task brief is ambiguous in a way that requires product judgment
- The codebase state differs materially from what the task brief described

**When uncertain:** Set `classification_uncertain: true`, classify as implementation. This triggers escalation rather than a retry. Escalation is always safer than a bad retry.

---

## Milestone Ordering Constraint

The orchestrator must not start Milestone N+1 until every story in Milestone N is `✅ Done`.

Milestones within a project are:
1. Scaffold (pre-orchestrated — must be complete before orchestrator starts)
2. Auth (pre-orchestrated — must be complete before orchestrator starts)
3. Core Feature (first orchestrated milestone)
4. Monetization (always Milestone 4 or earlier — never last)
5. Supporting Features
6. Polish

Story ordering within a milestone follows the dependency graph. Stories with no dependencies within a milestone can be treated as ready when the previous milestone is complete.

---

## Special Override Rules

**Webhook handler override:**
Any story whose title or technical task list contains the word "webhook" requires your review of the PR regardless of the current PR count. The orchestrator checks for this keyword when evaluating the PR review rule after each validation PASS.

**ADR-touching override:**
Any story whose task brief lists an Active Decision in Intent Constraints (§6a) requires your review of the PR regardless of the current PR count — risk tracks architectural surface, not just how early in the build it happened. The planner computes this into the brief's §8 review requirement when it fills §6a; the orchestrator trusts that computation rather than re-deriving it.

**Security failure override:**
Any security check failure in a validation report produces a verdict of ESCALATE, not FAIL. Security failures never go back to the worker for retry — they always go to you.

**Intent-conflict override:**
Any validation in which the implementation contradicts an Active Decision
(`docs/DECISIONS.md`) or an invariant (`docs/INVARIANTS.md`) without a superseding
ADR produces a verdict of ESCALATE, not FAIL. Contradicting intent is never the
worker's to resolve — overriding a past decision requires a superseding ADR
through a gate (the intent conflict gate — see Intent Conflict Policy below). The orchestrator escalates
with type `intent-conflict`. If the conflict is security-related, it follows the
security override (always the real user, in every mode).

**Human-only criterion override — verified, not waived:**
An acceptance criterion that requires visual inspection, browser testing, terminal output inspection, or UX judgment cannot be checked by reading code or running the automated test suite — but that no longer means it defaults to a human. The Planner is required to translate every such criterion into a literal scenario in the task brief's §3a Experience Script; the Experience Runner then actually launches the app and drives it, and checks the real observed result against the scripted expectation (see Step 5a/5b in `AGENTS/orchestrator.md`). The Validator marks these criteria `DEFERRED (experience)` in its report — not `SKIP` — and does not escalate for them on that basis alone.

The Validator only falls back to `SKIP (human-only)` → `ESCALATE` (gate type `phase4-escalation-human-only`) when a Human-Only criterion has **no** corresponding §3a scenario at all. That is a brief-authoring gap the Planner should have caught, not a category of criterion that is inherently unverifiable — and the Product Owner Proxy's evaluation of that gate (`AGENTS/product-owner-proxy.md`) must never resolve it by inspecting code and waiving the behavior; the correct action is almost always to send it back for the missing scenario. This is the specific mechanism that used to let "the agent said it's good to go" diverge from "I tested it and it wasn't": a human-only criterion could be waived on the strength of code merely existing, without anyone — human or agent — ever actually driving it. It cannot be waived on that basis anymore.

---

## Escalation Phrase Lexicon

These are the exact phrases you use to unblock the orchestrator. The orchestrator only acts on these phrases — it does not infer intent from context.

| Phrase | Orchestrator action |
|--------|-------------------|
| `"approved"` | Merge the PR currently awaiting review, mark story Done, continue loop |
| `"changes needed: [notes]"` | Write notes to RETRY CONTEXT, re-dispatch worker with amendment |
| `"skip story N.N"` | Mark story N.N as Done with note "manually skipped by you", continue loop |
| `"retry story N.N"` | Re-dispatch planner for a fresh task brief (no RETRY CONTEXT), then dispatch worker from that brief |
| `"blocked — stop"` | Mark all in-progress stories as Blocked, halt orchestration, update PHASE_STATE.md |
| `"resume"` | After you resolve a human-only or experience escalation (verified it yourself, or accepted the proxy's documented waiver for a genuinely unscriptable criterion) — mark story Done, continue |
| `"fix and retry"` | After you provide a fix for an escalated failure — re-dispatch worker |
| `"supersede ADR-N: [notes]"` | Approve overriding a contradicted decision — write the superseding ADR per `docs/DECISIONS.md`, then re-dispatch the worker with the change now buildable |
| `"reject change"` | Decline the contradicting change — move it to `PARKING_LOT.md` (or reshape to fit intent), mark the story skipped, continue |

---

## Intent Conflict Policy

The authoritative rules for changing a built product without silently contradicting its original design. Applied pre-build by the Solution Architect (plan §6), re-checked post-build by the Validator's intent-consistency check.

**Classification.** Every post-launch change is classified against the intent layer (`docs/DECISIONS.md`, `docs/INVARIANTS.md`) before it is planned in detail:

| Class | Meaning | Action |
|-------|---------|--------|
| **Additive** | Extends the system; conflicts with no Active Decision or invariant | Proceed |
| **Modifying** | Changes documented behavior without violating a decision (e.g. tightening a limit the ADRs left open) | Proceed; note the behavior change for the intent-layer refresh |
| **Contradicting** | Violates an Active Decision or invariant, or undercuts the type's success model | **Stop — intent conflict gate before any further planning** |

**The intent conflict gate.** A contradicting change is never implemented silently. Surface it precisely — the contradicted ADR/INV id, its original rationale, and the cost of overriding it — then require an explicit decision **before any code**:

- **Normal mode** → escalate to the user; act on `"supersede ADR-N: [notes]"` or `"reject change"` (see lexicon)
- **Autonomous mode** → spawn the Product Owner Proxy with gate type `intent-conflict`; it may authorize a supersede, return required changes, or `ESCALATE TO USER`
- **Security-related contradictions always escalate to the real user, in every mode** — same absolute override as Phase 4

If the override is approved, **write the superseding ADR first** (per `docs/DECISIONS.md` → "Superseding a Decision": mark the old ADR superseded, add the new one, update the index) — only then is the change buildable. If rejected, the request goes to `PARKING_LOT.md` or is reshaped to fit intent. No agent overrides a past decision on its own authority.

---

## Agile Plan Review Policy

Governs the post-launch agile flow (`anymake-agile` skill): Solution Architect authors a Development Plan; Plan Reviewer reviews it.

**Role separation (absolute):**
- The Architect and the Reviewer are always separate sub-agent contexts — the thing that designs is never the thing that approves (same law as Worker/Validator)
- The Reviewer never edits the plan; the Architect never sets its own plan to `Approved`
- The Reviewer is spawned fresh each round — it re-verifies prior fixes rather than trusting memory

**Round limits:**
| Event | Action |
|-------|--------|
| `NEEDS CHANGES` (round 1 or 2) | Re-spawn Architect with the review report; it resolves every numbered comment; fresh Reviewer next round |
| `NEEDS CHANGES` (3rd time) | Stop the loop — escalate to user with the plan and unresolved comments. The Reviewer never lowers the bar to end a loop |
| `ESCALATE` from Reviewer | Straight to the real user — never retried |
| Security-relevant plan (auth, authz, tenant isolation, secrets, payments, webhooks) | Final approval is always the real user, in every mode |
| Intent conflict found in a plan | Intent conflict gate (see Intent Conflict Policy) before the plan may proceed — never resolved by Architect or Reviewer |

**User phrases at the agile approval gate:**
| Phrase | Action |
|--------|--------|
| `"approve plan"` | Plan `Status: Approved`, issue → `status:approved`, hand stories to the build engine |
| `"revise plan: [notes]"` | Notes become review comments; re-spawn Architect (does not count against the round limit) |
| `"reject issue"` | Close the issue as not-planned with the reason; nothing is built |

**Traceability (every agile change):**
- Branch `issue/[N]-[slug]`; every commit footer references `#[N]`; PR body `Closes #[N]`
- Base `main` SHA recorded on the issue before merge; merge SHA + tag `issue-[N]` + exact revert command recorded after
- An agile change with no issue reference in its commits fails validation

**Concurrency-aware retry (B2 / #17 / Story 29.3):**
When the orchestrator runs parallel stories (the default — see
`AGENTS/orchestrator.md` → "Concurrency policy"), the retry matrix applies
**per-story**. A FAIL on story N does not pause story M. A per-story
escalation halts only that story, not its siblings — **except** security-failure
and intent-conflict escalations, which always halt the whole run (the override
is absolute — INV-008). The orchestrator monitors in-flight stories via
`board-state.json` and applies the retry matrix to each independently.

---

## Board Status Symbols

| Symbol | Status | Meaning |
|--------|--------|---------|
| `⬜` | Backlog | Not started — has unresolved dependencies |
| `🟡` | Ready | Not started — all dependencies satisfied |
| `🔵` | In Progress | Worker agent active |
| `🟠` | In Validation | Validator agent active |
| `🧪` | Experience Check | Experience Runner agent driving the app against the story's §3a script |
| `👁` | Awaiting Review | PR open, waiting for you to approve |
| `✅` | Done | Merged to main |
| `🚫` | Blocked | Escalated — awaiting you decision |

---

## Autonomous Mode Policy

When `autonomous_mode: true` is set in `PROJECTS/[name]/PHASE_STATE.md`, the Product Owner Proxy agent (`AGENTS/product-owner-proxy.md`) handles all gates and escalations that would normally require user input.

**Proxy spawn points:**
| Trigger | Who spawns the proxy | Gate type passed |
|---------|---------------------|-----------------|
| Phase 0 gate | Main agent | `phase-0-approval` |
| Phase 1 gate | Main agent | `phase-1-approval` |
| Phase 2 prototype gate | Main agent | `phase-2-prototype-review` |
| Phase 2 final gate | Main agent | `phase-2-approval` |
| Phase 3 gate | Main agent | `phase-3-approval` |
| Phase 4 PR review pause | Orchestrator | `phase4-pr-review` |
| Phase 4 human-only criterion (no §3a coverage) | Orchestrator | `phase4-escalation-human-only` |
| Phase 4 implementation failure | Orchestrator | `phase4-escalation-implementation-failure` |
| Phase 4 2nd validation FAIL | Orchestrator | `phase4-escalation-validation-fail-2nd` |
| Phase 4 intent conflict | Orchestrator | `phase4-escalation-intent-conflict` |
| Phase 4 2nd experience FAIL | Orchestrator | `phase4-escalation-experience-fail-2nd` |
| Phase 4 experience script unscriptable | Orchestrator | `phase4-escalation-experience-unscriptable` |
| Phase 4 experience environment failure | Orchestrator | `phase4-escalation-experience-environment` |
| Phase 4 all stories blocked | Orchestrator | `phase4-escalation-all-blocked` |
| Phase 4.6 staging review | Main agent | `phase-4-staging-review` |
| Intent conflict gate (pre-build) | `anymake-agile` skill (Solution stage) | `intent-conflict` |
| Agile plan approval (post Reviewer APPROVED) | `anymake-agile` skill | `agile-plan-approval` |
| Agile reporter verification (issue close) | `anymake-agile` skill | `phase4-escalation-human-only` (reuse — proxy checks that the plan's §10 repro was replayed as an Experience Script scenario with a PASS experience report, not a code-level check alone) |

**Security failure override (absolute — cannot be bypassed):**
Any escalation with escalation type `security-failure` is handled by the standard escalation protocol regardless of autonomous mode. The proxy is not spawned. The orchestrator halts and notifies the real user directly. This override applies in all modes and all circumstances.

**Proxy verdict interpretation:**
- `VERDICT: APPROVED` or `PHRASE: approved` → continue as if the user said the corresponding approval phrase
- `VERDICT: NEEDS CHANGES [list]` or `PHRASE: changes needed: [...]` → address each specific item and re-run (for phases: revise artifacts and re-spawn proxy; for Phase 4: dispatch worker with the specific notes as RETRY CONTEXT)
- `VERDICT: ESCALATE TO USER` or `PHRASE: blocked — stop` → override autonomous mode for this decision: halt, output the proxy's reason to the real user, and wait for human input before resuming

**Autonomous mode does not change the retry matrix.** Environment retries, implementation retries, and validation retries follow the same limits as normal mode. The proxy handles the gate decisions; the retry policies govern how many attempts happen before a gate decision is needed.

---

## Definition of "CI Passing"

Before any autonomous merge, the orchestrator confirms:
- GitHub Actions (or equivalent) shows green on the PR branch
- No lint failures
- No type check failures
- No test failures
- Test suite is non-empty (a PR that passes CI with 0 tests has a broken CI configuration — escalate)

If CI status cannot be determined (e.g., no CI configured), treat as a missing prerequisite and escalate before the first autonomous merge.

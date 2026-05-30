# Anymake Agent Policies

Shared reference for all agents in the Phase 4 orchestration system. When orchestrator.md, worker.md, or validator.md reference a policy, the authoritative version is here.

---

## PR Review Policy

| Condition | Review requirement |
|-----------|-------------------|
| PR #1, #2, or #3 overall in Phase 4 | your review is required — always |
| Story title or technical tasks contain "webhook" | your review is required — always, regardless of PR count |
| PR #4+ and no webhook keyword | Autonomous merge after CI passes |
| CI failing on any PR | Do not merge — treat as environment failure, escalate |

PR count is cumulative across all Phase 4 stories. It is not reset per milestone.

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
| Security check FAIL | No | 0 | Immediate escalation — security never retries |
| PR merge conflict | Worker resolves rebase | 1 attempt | After rebase fails |
| CI failing on merge | No | 0 | Immediate escalation |
| All stories blocked | No | 0 | Immediate escalation |

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

**Security failure override:**
Any security check failure in a validation report produces a verdict of ESCALATE, not FAIL. Security failures never go back to the worker for retry — they always go to you.

**Human-only criterion override:**
Any acceptance criterion that requires visual inspection, browser testing, or UX judgment produces a verdict of ESCALATE. The validator must list the specific human-only criteria in the escalation reason. The orchestrator pauses and you manually verify before the orchestrator continues.

---

## Escalation Phrase Lexicon

These are the exact phrases you use to unblock the orchestrator. The orchestrator only acts on these phrases — it does not infer intent from context.

| Phrase | Orchestrator action |
|--------|-------------------|
| `"approved"` | Merge the PR currently awaiting review, mark story Done, continue loop |
| `"changes needed: [notes]"` | Write notes to RETRY CONTEXT, re-dispatch worker with amendment |
| `"skip story N.N"` | Mark story N.N as Done with note "manually skipped by you", continue loop |
| `"retry story N.N"` | Re-dispatch worker from scratch (fresh task brief, no RETRY CONTEXT) |
| `"blocked — stop"` | Mark all in-progress stories as Blocked, halt orchestration, update PHASE_STATE.md |
| `"resume"` | After you resolve a human-only validation escalation — mark story Done, continue |
| `"fix and retry"` | After you provide a fix for an escalated failure — re-dispatch worker |

---

## Board Status Symbols

| Symbol | Status | Meaning |
|--------|--------|---------|
| `⬜` | Backlog | Not started — has unresolved dependencies |
| `🟡` | Ready | Not started — all dependencies satisfied |
| `🔵` | In Progress | Worker agent active |
| `🟠` | In Validation | Validator agent active |
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
| Phase 4 human-only criterion | Orchestrator | `phase4-escalation-human-only` |
| Phase 4 implementation failure | Orchestrator | `phase4-escalation-implementation-failure` |
| Phase 4 2nd validation FAIL | Orchestrator | `phase4-escalation-validation-fail-2nd` |
| Phase 4 all stories blocked | Orchestrator | `phase4-escalation-all-blocked` |
| Phase 4.6 staging review | Main agent | `phase-4-staging-review` |

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

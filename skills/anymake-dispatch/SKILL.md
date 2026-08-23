---
name: anymake-dispatch
description: Use to dispatch a sub-agent (Planner, Worker, Validator, Experience Runner, Product Owner Proxy, Cartographer, Solution Architect, or Plan Reviewer) through a hardened, host-agnostic seam. Triggers on "dispatch the planner", "spawn the worker", "re-dispatch with retry context", "invoke the validator", "call a sub-agent", "dispatch an agent", or whenever any Anymake agent needs to spawn another. Wraps the host's sub-agent primitive with pre-dispatch prompt assembly (WRITE THE FILE FIRST + pre-established facts), mandatory post-dispatch deliverable verification, structured RETRY CONTEXT, and a dispatch log line to BOARD.md. The single chokepoint for all sub-agent dispatch — never call the host's Agent/Task tool directly.
---

# Anymake Dispatch — Hardened, Host-Agnostic Sub-Agent Dispatch

Every sub-agent dispatch in Anymake goes through this skill. It is the single
chokepoint that (1) abstracts the host runtime's dispatch primitive behind a
canonical `DISPATCH` request shape (the host-portability seam), (2) hardens
against four documented failure modes (context exhaustion before writing,
empty `task_result` silent failures, ad-hoc RETRY CONTEXT, missing dispatch
logging), and (3) records every dispatch as a structured log line on the
project's `BOARD.md` Run Log.

**INV-018:** Direct `Agent({agent, message})` (or host-equivalent) calls in
`AGENTS/*.md` or `skills/*/SKILL.md` are a violation. The seam is the contract.

## When to use

- The Orchestrator needs to dispatch a Planner, Worker, Validator, or Experience Runner (Phase 4 build loop)
- `anymake-agile` needs to dispatch a Cartographer, Solution Architect, or Plan Reviewer
- The main agent needs to dispatch the Product Owner Proxy at a phase gate
- A re-dispatch is needed after a FAIL, ESCALATE, or empty deliverable (uses RETRY CONTEXT)

## The DISPATCH request shape

Assemble this request before dispatching. Every field is required unless
marked optional (`?`).

```
DISPATCH {
  agent:            "anymake-planner" | "anymake-worker" | "anymake-validator" |
                    "anymake-experience-runner" | "anymake-product-owner-proxy" |
                    "anymake-cartographer" | "anymake-solution-architect" |
                    "anymake-plan-reviewer"
  purpose:          "brief" | "build" | "validate" | "experience" |
                    "proxy-gate" | "map" | "plan" | "review"
  project_root:     <absolute path to the consuming project root>
  inputs:           { ... }   # the typed inputs the target agent's
                              # "Your Inputs" section lists
  output_artifact:  <absolute path>   # the file the agent must write
                                       # before exiting (the deliverable)
  output_check:     "wc -l >= N" | "gh pr view N" | "ls -l" |
                    "grep -c '<marker>' <path>"   # the verify command
  retry_context?:   <RETRY CONTEXT block>   # present only on re-dispatch
  board_ref:        "Story N.N" | "Issue #N" | "Phase gate N"
}
```

## Backend: OpenCode

**This is the only section that names the host dispatch primitive.** Swapping
to another runtime (Claude Code, Cursor, a custom harness) means rewriting this
one section — not the 17 call sites across 9 files.

Dispatch via the `Agent` (or `Task`) tool:
- Map `DISPATCH.agent` → the `agent` field (registered sub-agent name) OR
  `subagent_type` field, depending on the host's API.
- Map `DISPATCH.inputs` + the pre-dispatch prompt (§"Pre-dispatch prompt
  assembly" below) → the `message` (or `prompt`) field.
- Named-subagent dispatch is preferred (the agent is registered in `config.agent`
  by the plugin). Fall back to inline `instructions: [full contents of
  AGENTS/<agent>.md]` only if the named sub-agent is unavailable in this host.

**Host portability:** to add a new backend, add a new "Backend: <name>"
section here describing how to map the `DISPATCH` request to that runtime's
primitive. The call sites don't change — they assemble `DISPATCH` requests,
not host-specific calls.

## Pre-dispatch prompt assembly (hardening #1)

For any dispatch whose `purpose` produces a file (`brief`, `build`, `validate`,
`experience`, `map`, `plan`, `review`), assemble the `message` from this
template. The deliverable comes FIRST — before any exploration, before any
narration. This defeats context-exhaustion-before-deliverable (the documented
failure mode where a sub-agent burns its context exploring and exits before
writing the file).

```
You are being dispatched as <agent>. Project root: <project_root>.

WRITE THE FILE FIRST — do not narrate, do not explore broadly, do not exhaust
your context before producing the deliverable. The deliverable is the file at:
  <output_artifact>

Pre-established facts (use these — do NOT re-derive):
  - <fact 1>
  - <fact 2>
  ...

Your inputs:
  <inputs — the DISPATCH.inputs object, formatted>

Read these files ONLY (listed in the agent's "Your Inputs" section):
  - <file list — from the target agent's AGENTS/<agent>.md inputs section>

Write the deliverable to <output_artifact> now. A partial deliverable is better
than none — write what you have, then refine. If you run low on context, write
what you have and return — do not keep exploring.
```

**For non-file-producing dispatches** (`proxy-gate` — the Product Owner Proxy
returns a verdict, not a file): skip the "WRITE THE FILE FIRST" framing. The
`output_artifact` and `output_check` fields are still required (point at the
gate decision recorded on `BOARD.md` or the issue), but the prompt is a normal
instruction to evaluate the gate, not a file-first directive.

## Post-dispatch verification (hardening #2 — MANDATORY, not optional)

After the dispatch call returns, the caller MUST run the verify step. This is
the codification of the MEMORY.md lesson: *"The tool call after ANY Task-tool
sub-agent must verify the artifact (`wc -l`/`ls`/`gh pr view`). An empty
task_result is a silent failure, not 'nothing to do.'"*

```
Post-dispatch verify (MANDATORY — never skip):

1. Run: <DISPATCH.output_check>
   (e.g., `wc -l <output_artifact>`, `gh pr view <PR number>`,
    `grep -c '## §3a' <path>`, `ls -l <path>`)

2. If the check FAILS (file missing, line count below threshold, PR not found,
   marker absent, empty task_result):
   a. Append to BOARD.md Run Log:
      "[time] DISPATCH FAIL — <agent> — <board_ref> — purpose: <purpose> —
       deliverable missing/empty — attempt: <N>"
   b. If retry budget remains (see §"Retry protocol"):
      → re-dispatch with RETRY CONTEXT (append the block to the prompt)
   c. If retry budget exhausted:
      → ESCALATE per AGENTS/arbiter.md (escalation phrase lexicon + failure
        classification). Append "ESCALATE" to the Run Log line.

3. If the check PASSES:
   a. Append to BOARD.md Run Log:
      "[time] DISPATCH OK — <agent> — <board_ref> — purpose: <purpose> —
       artifact: <output_artifact> (<line count or check result>) — attempt: <N>"
   b. Proceed with the result (read the deliverable, advance the board, etc.)
```

**Never act on a sub-agent's narration ("Now writing the plan…") without
confirming the deliverable landed.** The verify step IS the confirmation.

## RETRY CONTEXT (hardening #3 — canonical structured shape)

Every re-dispatch — whether triggered by a Validator FAIL, an Experience Runner
FAIL, an empty-deliverable verify, or an incomplete-brief gap — uses this
canonical block. Append it to the pre-dispatch prompt. This subsumes the
ad-hoc RETRY CONTEXT shapes previously scattered across `AGENTS/orchestrator.md`
and operationalizes the root-cause debugging protocol (the "agent's own repro /
isolation / hypothesis" field is exactly that protocol's required structure).

```
## RETRY CONTEXT — Attempt [N] — Trigger: [VALIDATION FAIL | EXPERIENCE FAIL |
                                      EMPTY DELIVERABLE | INCOMPLETE BRIEF]
**Agent:** <agent name>
**Board ref:** <board_ref>
**Failed criteria / missing artifact (verbatim):**
  [copy exact rows from the Validator report or the verify failure — do not
   paraphrase]
**Agent's own repro / isolation / hypothesis (from the failed attempt's RESULT
 or report):**
  [the agent's stated diagnosis — copy, don't rewrite]
**Do not:** [specific anti-patterns noted in the prior attempt]
**Prioritize:** [specific changes required to pass on this attempt]
**Pre-established facts (carry forward — do not re-derive):**
  [same facts as the original dispatch's pre-established facts]
```

**Retry limits** (from `AGENTS/arbiter.md`):
- Environment failures: max 2 retries, then escalate
- Implementation failures: max 1 retry, then escalate
- Empty deliverable: max 1 retry (treat as implementation failure)

## Dispatch log (hardening #4 — structured log line to BOARD.md + board-state.json)

Every dispatch — success, failure, or retry — appends one structured line to
`PROJECTS/[name]/BOARD.md`'s Run Log AND appends an event to
`PROJECTS/[name]/.anymake/board-state.json`'s `events[]`. The dual write is
belt-and-suspenders: the markdown log is the human-readable surface; the JSON
event is the structured spine the kanban UI and orchestrator read. Lost JSON
appends are acceptable (the markdown log is the durable record); lost markdown
writes are not.

**BOARD.md Run Log line:**
```
[time] DISPATCH <OK|FAIL|RETRY> — <agent> — <board_ref> — purpose: <purpose> — artifact: <output_artifact or "none"> — attempt: <N>
```

**board-state.json event** (appended to `events[]`):
```json
{ "ts": "<ISO-8601>", "story": "<story ID from board_ref>", "agent": "<agent>",
  "type": "dispatch_ok|dispatch_fail|retry", "detail": "<purpose> — <artifact or 'none'> — attempt <N>" }
```

## Workspace setup (worktree isolation — B1 / #16)

Each dispatched Worker (and its downstream Validator / Experience Runner)
operates in a **dedicated git worktree** so concurrent stories never collide on
the shared checkout's index, branch, or uncommitted state. The orchestrator
creates the worktree before Worker dispatch and removes it after the story
reaches `done` or `skip`.

**Worktree creation** (orchestrator runs this before dispatching the Worker):

```bash
git worktree add .anymake/worktrees/story-N.N -b story/N.N-[slug] main
```

- Path convention: `.anymake/worktrees/story-N.N/` (relative to the consuming
  project root; gitignored per INV-015)
- Branch: `story/N.N-[slug]` (created by `worktree add -b`, not `git checkout -b`)
- Base: `main` (the latest merged state)

**Worktree removal** (orchestrator runs this after `done` or `skip`):

```bash
git worktree remove --force .anymake/worktrees/story-N.N
git branch -d story/N.N-[slug]
```

**DISPATCH.project_root reassignment:** for the Worker, Validator, and
Experience Runner of a given story, `DISPATCH.project_root` is set to the
**worktree path** (`<project_root>/.anymake/worktrees/story-N.N/`), not the
shared checkout. The agent operates entirely within the worktree — it never
checks out a branch on the shared checkout.

**Retry re-dispatches reuse the existing worktree** (no re-create). The worktree
is cleaned up only on `done` or `skip` — a retry picks up where the prior
attempt left off, in the same worktree.

**Single-story mode** (`concurrency.max = 1`): one worktree at a time —
behavior is identical to today's sequential loop, just with the worktree as
the project root instead of the shared checkout.

Similarly, parallel dispatch (backlog B2/#17, shipped as `dispatch_parallel` in
issue #29) extends the per-dispatch contract: a `dispatch_parallel([DISPATCH,
DISPATCH, ...])` mode loops over the list, running the full per-dispatch
procedure (workspace setup, pre-prompt, dispatch, verify, log) for each entry.
The per-dispatch contract does not change — `dispatch_parallel` is a loop over
`DISPATCH` requests, not a new dispatch primitive.

## What this skill does NOT do

- It does not spawn agents itself — it is a procedure the caller follows, not
  executable dispatch code (consistent with ADR-008, markdown-as-source-of-truth).
- It does not change agent roles, build order, retry limits, or escalation
  policy — those stay in `AGENTS/arbiter.md`.
- It does not introduce a runtime dependency or a build step (preserves ADR-008).
- It does not bypass the security override or the Experience Runner gate
  (preserves INV-008, INV-009).
- It is transport, not a role (preserves INV-002, builder ≠ approver).

## Procedure (the caller follows this)

1. **Assemble** the `DISPATCH` request (all fields filled).
2. **Format** the `message` using the pre-dispatch prompt template (§"Pre-dispatch prompt assembly"). For file-producing dispatches, put the deliverable first.
3. **Dispatch** via the host backend (§"Backend: OpenCode"). Use the `Agent`/`Task` tool with the assembled `message`.
4. **Verify** the deliverable landed (§"Post-dispatch verification"). Run `DISPATCH.output_check`. Do NOT proceed on a failed check.
5. **Log** the dispatch result to `BOARD.md` Run Log (§"Dispatch log").
6. **On failure:** if retry budget remains, re-dispatch with RETRY CONTEXT appended (§"RETRY CONTEXT"). If budget exhausted, escalate per `AGENTS/arbiter.md`.
7. **On success:** proceed with the result — read the deliverable, advance the board, continue the loop.

---

*Base directory: the Anymake plugin root. References to `AGENTS/arbiter.md`, `AGENTS/<agent>.md`, `TEMPLATES/BOARD.md` resolve relative to the plugin root (the hub bootstrap supplies the path).*

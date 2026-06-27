---
name: anymake-evolve
description: Use to add, change, or remove a feature on a project Anymake has already built — the "extend the finished product" flow. Unlike anymake-iterate (which decides WHAT to build next from metrics), this skill makes a specific requested change as a developer who understands the codebase end to end and refuses to silently contradict the original design. Triggers on "add a feature", "change how X works", "now I want it to…", "remove Y", "modify the behavior of…", "tweak", "extend", "make it also…", or any feature request against a launched/built project. Loads the engineering-intent layer first, classifies the change against prior decisions, and forces a superseding decision before anything that contradicts intent gets built.
---

# Anymake Evolve — Extend a Finished Product Without Breaking Its Intent

A harness produces a coherent codebase. Real life then produces an endless stream
of "can we also…", "actually, change it so…", and "drop that, do this instead."
The danger isn't building the change — it's building it as a stranger: a fresh
agent that re-reads the surface of the code, misses *why* it was built that way,
and ships something that quietly contradicts a decision the original team made on
purpose.

This skill makes the change as a **member of the original dev team**: it loads the
durable record of intent first, judges the request against it, and treats any
contradiction as something to surface and decide — never to paper over.

## When to use

- A project already past Phase 4 (built, often launched) gets a request to
  **add / change / remove** a specific feature.
- The hub routes here from `anymake-iterate` once an increment is chosen and it's
  time to actually change the code.
- Directly — "add SSO", "change the export format", "remove the trial banner".

> **Not this skill if:** the request is "what should we build next?" (that's
> `anymake-iterate` — prioritization), or the repo has no Anymake workspace yet
> (that's `anymake-brownfield` — bootstrap intent from external code first).

## The intent layer it depends on

The whole skill rests on intent being a **durable artifact**, not tribal memory
(Anymake's first principle: *artifacts are truth*). Three documents, maintained
by the Cartographer (`AGENTS/cartographer.md`):

| Document | Template | What it answers |
|----------|----------|-----------------|
| `docs/SYSTEM_MAP.md` | `TEMPLATES/system-map.md` | What the code *is*, end to end, as built |
| `docs/DECISIONS.md` | `TEMPLATES/decisions.md` | Every decision ever made + which are still in force |
| `docs/INVARIANTS.md` | `TEMPLATES/invariants.md` | The behaviors a change must never break |

## The loop

1. **Load intent before touching code.** Read the three intent docs plus the ADRs
   and PRD they reference, and the type's success model. **If the intent layer is
   missing or stale** (no docs, or `Last mapped` predates recent merged work),
   spawn the **Cartographer** to build/refresh it first. Do not skip this — a
   change planned without the intent layer is exactly the failure this skill
   exists to prevent.

2. **Restate the request as a change to the system**, in the system's own terms:
   which modules, data, flows, and integrations (from SYSTEM_MAP) it touches.

3. **Classify the change against intent:**
   - **Additive** — extends the system; conflicts with no Active Decision or
     invariant. Proceed.
   - **Modifying** — changes documented behavior but doesn't violate a decision
     (e.g. tightening a limit the ADRs left open). Proceed, noting the behavior
     change for the intent-layer update.
   - **Contradicting** — violates an Active Decision (`DECISIONS.md`) or an
     invariant (`INVARIANTS.md`), or undercuts the type's success model. **Stop —
     go to the conflict gate.**

4. **Conflict gate (the heart of this skill).** A contradicting change is **never
   implemented silently.** Surface it precisely:
   > "This contradicts **ADR-007** (we chose Postgres row-level security *because*
   > tenant isolation had to survive a leaked app credential). To do this we would
   > have to supersede that decision."

   Then require an explicit decision **before any code**:
   - **Normal mode** → escalate to the user. Present the conflict, the original
     rationale, and the cost of overriding it. Wait for a decision.
   - **Autonomous mode** → spawn the Product Owner Proxy with gate type
     `evolve-intent-conflict`. The proxy may approve a supersede, return required
     changes, or `ESCALATE TO USER`. **Security-related contradictions always
     escalate to the real user, in every mode** — same absolute override as
     Phase 4.

   If the override is approved, **write a superseding ADR first** (follow
   `DECISIONS.md` → "Superseding a Decision": mark the old ADR superseded, add the
   new one, update the index). Only then does the change become buildable. If it's
   rejected, the request goes to `PARKING_LOT.md` or is reshaped to fit intent.

5. **Right-size the planning.** Small additive change → one or two stories
   straight to the backlog. Larger or modifying change → a focused mini Phase 2/3
   delta (PRD delta + any new/superseding ADRs + epic → stories). Reuse the
   standard templates; don't reopen the whole phase machine.

6. **Brief with intent constraints.** For each story, fill the task brief's
   **Intent Constraints** section (`TEMPLATES/task-brief.md` §6a): the ADR and
   `INV-` IDs the story touches and must respect. This is how the original team's
   knowledge reaches the Worker, and what the Validator's intent-consistency check
   verifies against.

7. **Execute via the build engine.** Hand the stories to `anymake-build-loop`. The
   Validator now runs an **intent-consistency check** in addition to acceptance
   criteria and security: any contradiction with an ADR/invariant that lacks a
   superseding decision is an automatic `ESCALATE` — the safety net behind step 4.

8. **Ship** via `anymake-deploy`; **verify** behavior.

9. **Refresh intent.** After merge, spawn the Cartographer to update
   `SYSTEM_MAP.md` (and `DECISIONS.md` / `INVARIANTS.md` if the change added or
   superseded any). Record the increment in `PHASE_STATE.md`. The intent layer
   must never lag the code — that's what keeps the *next* change safe.

## Guardrails

- **Intent is loaded first, always.** No change is planned against memory or a
  quick re-read of the code. Stale or missing intent layer → Cartographer first.
- **Contradictions surface; they never get absorbed.** The only way to override a
  past decision is a superseding ADR through a gate. An agent never overrules the
  original team on its own authority.
- **Security contradictions always escalate to the real user** — autonomous mode
  cannot bypass this.
- **Still gated, still one-increment-at-a-time.** Launch doesn't suspend the
  gates; overflow goes to `PARKING_LOT.md`.
- **Don't bypass the engine.** Changes ship through build-loop + security + deploy,
  not hand-edited to prod.
- **Leave the map true.** A cycle isn't done until the intent layer reflects the
  new reality.

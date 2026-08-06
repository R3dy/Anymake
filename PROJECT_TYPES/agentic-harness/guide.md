# Agentic Harness — Build Guide

> **`project_type: agentic-harness`** — you are not building an app with a UI and a database; you are building an **engine that runs other agents**. The product is the pipeline: a backlog of work items flowing through named stages, each stage a sandboxed LLM agent with its own prompt and tools, each handoff a validated artifact, the whole thing observable end to end and controllable without redeploying it.

This guide is a self-contained walkthrough of every active phase for an agentic harness. Where the SaaS type runs a frontend track, this type substitutes **pipeline and agent design** — the stage graph, the per-stage agent specs, the canonical contracts between them, and the infrastructure (sandbox, backend, tracing, control plane) that makes autonomy trustworthy instead of a black box. Phases match the manifest's Phase Map: 0 (full), 1 (lite/full), 2 (full), 3 (full), 4 (full), 5 (full or lite).

Throughout, "work item" means whatever unit flows through your pipeline (a research question, a code migration target, a support ticket, a security test case — anything), and "stage" means one named step in the pipeline (Recon, Draft, Review, whatever your domain calls it). Swap in your own vocabulary; the structure below doesn't change.

---

## Phase 0 — Identity & Framing (full)

Before any code, decide what pipeline this is and what moves through it.

- **Identity.** One sentence: "A harness that takes `<work item>` through `<stage 1> → <stage 2> → ... → <stage N>` to produce `<final artifact>`." If you can't name the stages yet, you're not ready.
- **The unit of work.** What is one "item" in your queue? Give it a name (a "case," a "slice," a "ticket," a "run") — you'll use this name everywhere: in the backend schema, in log lines, in the dashboard.
- **The stage list.** Name every stage in order. For each, one line on what it does and what it needs to succeed. Note whether the flow is strictly linear or has loop-back (a stage can send a work item back to an earlier stage — e.g. a review stage rejecting back to a draft stage) or branching (a stage's outcome routes to one of several next stages). This shape decides whether your stage-graph config is a simple list or a real graph with conditional edges.
- **Success = reliable, observable, bounded-cost throughput.** Write down what "working" means in measurable terms: item-level correctness, an acceptable failure/escalation rate, a cost ceiling per item (LLM token spend), and a latency target per stage. This is your success model, not vanity usage numbers.
- **Autonomy framing.** State explicitly how autonomous this needs to be on day one: fully unattended, one-step-at-a-time only, or somewhere between. This shapes the control plane you build in Phase 2/4 — don't over-build unattended autonomy you don't need yet, and don't under-build it if the whole point is "kick it off and walk away."
- **Revenue (only if this is a product).** Most agentic harnesses are internal/operational tools with no paying end user. If you intend to sell hosted access to the dashboard or the pipeline itself, name that here; otherwise skip it entirely.

**Output: `PROJECT.md`** capturing identity, the work-item unit, the ordered/branching stage list, the success model, and the autonomy framing.

**Gate.** `PROJECT.md` exists; every stage is named with a one-line purpose; the flow shape (linear/branching/loop-back) is stated; the success model has concrete, measurable targets (not "it should work well").

---

## Phase 1 — Discovery & Risk (lite or full)

Run **lite** for an internal/operational harness, **full** if you intend to host this for other teams or sell it.

- **Prior art.** Look at existing harnesses and agent frameworks — not to copy a domain, but to steal the *shape*: how do they define stages, sandbox execution, and hand off artifacts? What broke for them at scale?
- **Failure-mode risk pass — this is the load-bearing section for this type.** Autonomy has failure modes a normal app doesn't:
  - **Runaway loops** — a stage that keeps failing and re-queuing itself forever. Decide the retry/backoff ceiling now.
  - **Runaway cost** — an agent that burns tokens far beyond what a work item is worth. Decide the per-item and per-run cost cap now.
  - **Silent drift** — an agent quietly doing something subtly wrong that no one notices because nothing crashed. This is why tracing and canonical output validation are mandatory, not optional polish.
  - **Tool/credential misuse** — a sandboxed agent with tool access doing something outside its intended scope. Decide the tool allowlist and credential-isolation model now, before any agent code exists.
  - **Double-processing** — two workers claiming the same work item under concurrency. Decide the atomic-claim mechanism now.
- **Consumers of the harness.** Who watches the dashboard, who gets escalated to, who owns each stage's prompt/tooling as the pipeline evolves?

**Gate.** Each of the five failure modes above has a stated mitigation (even a one-line "cap at N retries" is enough at this stage — Phase 2 designs it properly). Prior-art review is a few bullets, not a report.

---

## Phase 2 — Pipeline & Agent Design, and Architecture (full)

This is the heart of an agentic-harness project. There is no PRD with a GUI prototype for the pipeline — the "PRD" is the **Pipeline & Agent Design**, and the only prototype is the dashboard's control surface.

### Pipeline & Agent Design (the "PRD")

**1. The stage graph.** For every stage, specify:
- **Name and purpose** — one sentence.
- **Input state(s)** — which work-item status/statuses make this stage eligible to run.
- **Output state(s)** — what status(es) it can produce, including failure/escalation outcomes.
- **Transitions** — for each possible outcome, what status the item moves to next (this is what makes the graph a graph — loop-backs and branches are just transitions that point somewhere other than "the next stage in the list").
- **Concurrency** — can many items run this stage in parallel? Is there a resource constraint (rate limit, cost, a shared external dependency) that bounds it?

Write this as **data** — a table in the design doc that becomes a literal YAML/JSON stage-graph config later, not prose the engine will need re-interpreting from. The engine reads this file; it does not contain per-stage `if` statements.

**2. One AgentSpec per stage.** For every stage that runs an LLM agent, specify:
- **System prompt** — the stage's role, constraints, and definition of done. Keep it in its own file, not inlined in code.
- **User/task prompt template** — the per-run prompt, with named placeholders. State explicitly **which fields of the prior stage's output artifact** populate each placeholder — this is the literal seam where "stage N's output becomes stage N+1's input."
- **Tool / skill / MCP allowlist** — the exact set this stage's agent may call. Default to the smallest set that lets it do its job; a recon-type stage should not have the same tool access as a stage that takes destructive action.
- **Model** — which LLM, and why (capability vs. cost trade-off per stage; not every stage needs your most expensive model).
- **Permission/autonomy mode** — can this stage's agent act unattended, or does its output always route to a human/approval step regardless of overall run mode?

**3. The canonical output contract per stage.** Define the **schema** each stage must produce (a typed object — Pydantic/Zod/JSON Schema, not a loose markdown blob) *before* writing any agent prompt. This schema is what gets handed to the LLM as a structured-output constraint, what gets validated on the way out, and what becomes the next stage's input. Version it — decide now how a schema change is rolled out without breaking work items already mid-pipeline.

### Architecture — the 8 mandatory ADRs

Record one ADR each for:

1. **Stage-graph definition format** — declarative (YAML/JSON) is mandatory. State the schema for a stage entry and how the engine loads it.
2. **Sandbox/isolation mechanism** — ephemeral-per-run container (the reference default) vs. a pooled/leased sandbox; exactly what gets mounted (code, per-item working directory, tool/skill definitions) vs. what gets proxied (LLM API access, credentialed tool calls) — real secrets are never mounted into the sandbox.
3. **Canonical I/O schema format & versioning** — the schema technology, where schemas live, how a breaking change is migrated.
4. **Backend abstraction** — the Queue interface (publish/claim/release/annotate) and Storage interface (write/read/list/delete); the dev/filesystem implementation; the production implementation; how atomic claim prevents double-processing under concurrent workers.
5. **Tracing/observability backend** — OpenTelemetry as the interface, the chosen collector, span granularity (agent-run / turn / tool-call / token-usage), and how trace context propagates across the host↔sandbox boundary so one item's whole journey is one trace.
6. **Orchestration & concurrency model** — worker pool size, single-host vs. multi-host fan-out over a shared backend, retry/backoff policy per failure class (environment failure vs. implementation/agent failure vs. escalation).
7. **Control plane & autonomy modes** — how a running engine learns about pause/resume/step/concurrency changes (a polled shared document, a push API, whatever fits) and what "run one step" means precisely (advance exactly one work item through exactly one stage, then stop).
8. **LLM provider/model routing** — how model choice per stage is configured and overridden without a redeploy.

**Dashboard prototype (replaces the general prototype gate, scoped to the control surface only):**
Build the 2–4 screens that matter: a live queue/board view (every item, its current stage, its status), a per-item detail/trace view (every agent message, tool call, and token count for that item's journey), and run controls (start/pause/step/set concurrency). Use real states — a populated queue, an empty queue, a stalled/escalated item, an error state — not placeholder rows. This is the one place this project type owes the same visual-quality bar as a user-facing product, because it's the only thing a human actually looks at.

### Monetization (OPTIONAL)

Include only if you're charging for hosted access to the harness or its dashboard. Most agentic harnesses are internal tools — if that's you, skip this track entirely rather than inventing a pricing story you won't build.

**Gate.** Every stage has input/output states, transitions, an AgentSpec, and a canonical output schema; the stage graph is written as data, not prose; all 8 ADRs are recorded, with ADR-001 explicitly committing to a declarative graph format; the dashboard prototype (queue view, trace view, run controls) passes the usual prototype bar. Monetization design exists only if enabled.

---

## Phase 3 — Planning & Sequencing (full)

Turn the design into an executable plan, sliced by **infrastructure layer**, not by user-facing feature — a harness has almost no "features" in the SaaS sense; it has layers that must exist before the next one can be tested.

- **Slice by layer, in build-order.** Contracts → backend adapters → engine → sandbox/runner → per-stage agents → tracing → control plane → dashboard. Each slice should be independently testable before the next starts.
- **Order per-stage agent work by the stage graph**, not by perceived difficulty — implement the cheapest/simplest stage first so you can prove one complete item traveling through the *whole* loop before investing in every stage's prompt engineering.
- **Define the integration surface** per slice: which external systems (LLM providers, the production backend, the tracing collector, any tool/MCP servers) does it depend on, and what's the failure mode if each is unavailable?
- **Plan the test contract up front.** Per stage: a contract test (does the output validate against its schema?) and a behavior test (does the agent do the right thing on a representative input, including a failure/escalation path?). Plan one end-to-end integration test that pushes a single synthetic work item through every stage.
- **Security tasks are explicit line items:** credential-isolation verification, tool-allowlist enforcement, sandbox resource limits, atomic-claim-under-concurrency test — not implied, not left to "we'll check it later."

**Gate.** Work is sliced by infrastructure layer in build order; per-stage tests (contract + behavior) are named; the end-to-end integration test is planned; the five security tasks above are explicit backlog items with acceptance criteria.

---

## Phase 4 — Build (full)

Build in this **exact order** — it exists because each layer is untestable without the one before it:

**`Contracts → Backend adapters → Stage-graph engine → Agent runner/sandbox → Per-stage AgentSpecs → Tracing → Control plane → Dashboard → Integration tests → Deploy`**

1. **Contracts.** Define every stage's input/output schema (typed objects, JSON-Schema export) before any engine or agent code exists. These are what the rest of the system is built against.
2. **Backend adapters.** Build the Queue + Storage interfaces and their filesystem/dev implementation first — you want to run the whole engine locally with zero external dependencies before touching a production backend. Build the production adapter (Postgres, or an existing system of record) second, behind the same interface, selected by config.
3. **Stage-graph engine.** The declarative graph loader and the status-transition dispatcher: read the stage-graph config, bucket eligible work items by current status, dispatch into a bounded worker pool, apply the transition on completion. **No stage-specific logic belongs in this layer** — if you find yourself writing `if stage == "review"` in the engine, the graph config is underspecified; fix the config, not the engine.
4. **Agent runner/sandbox.** The spawn mechanism (container-per-run is the reference default): what gets mounted (code, per-item working directory, tool/skill definitions — read-only where possible), what gets proxied instead of mounted (LLM API access, credentialed tool calls, via a host-side proxy the sandbox reaches over network with a scoped credential), and the exit-code/output contract (success, error, exhausted-no-result, requeue — whatever set your domain needs). Get one trivial "echo" stage running through this exact mechanism before building a real agent on top of it.
5. **Per-stage AgentSpecs.** One stage at a time, starting with the one you picked in Phase 3 for fastest end-to-end validation: system prompt, user-prompt template wired to the prior stage's output fields, tool/skill/MCP allowlist, model. Validate each stage's output against its schema before wiring the next stage.
6. **Tracing.** Instrument the runner and the engine with OpenTelemetry spans (agent-run → turn → tool-call, with token usage recorded), pointed at whatever collector you chose in ADR-005. Verify trace context propagates across the host↔sandbox boundary so a single work item's full multi-stage journey renders as one trace, not N disconnected ones.
7. **Control plane.** The shared control surface (pause/resume, concurrency, per-stage model override, step mode) and the engine's read-side of it. Verify "step mode" actually advances exactly one item through exactly one stage and then re-pauses.
8. **Dashboard.** The read layer over the backend + trace store (queue/board view, per-item trace view) and the write side into the control document. Prefer a live-updating view (SSE/WebSocket) over polling if "watch every agent message as it happens" is a real requirement — polling is the cheaper fallback, not the target.
9. **Integration tests.** At minimum, one synthetic work item pushed through every stage end to end in the dev/filesystem backend, asserting the final artifact and that a complete trace exists.
10. **Deploy.** Stand up the engine + dashboard as a long-running service (docker-compose or a container orchestrator) against the production backend.

**Gate.** Every layer above exists and was built in order; the stage graph has zero hard-coded transitions in engine code; every stage's output validates against its schema with a round-trip test; a credential-isolation check confirms no real secret is ever mounted into a sandbox; atomic claim is verified under concurrent workers (no double-processing); one full end-to-end trace exists and spans the host↔sandbox boundary; a cost cap/circuit breaker exists per item or per run; the control plane supports pause/resume and step mode. All standard security checks pass, heightened for sandboxed tool/network access.

---

## Phase 5 — Launch & Operate (full or lite)

"Launch" for this type means the harness runs unattended against real work items — there is usually no public audience.

- **Deploy dev/filesystem-backend → production-backend.** Prove the full stage graph against the dev backend first (Phase 4's integration test), then cut over to the production backend and re-run the same end-to-end check against it.
- **Instrument metrics:**
  - **Throughput** — items/hour through each stage, and end to end.
  - **Per-stage success / failure / escalation rate.**
  - **Cost per item** — LLM token spend, against the cap set in Phase 1/2.
  - **P50/P95 stage latency** and **queue depth / backlog age.**
  - **Human-escalation rate and resolution time.**
  - **Trace coverage** — the percentage of runs with a complete, unbroken trace; a drop here means an observability gap, not just a metrics gap.
- **Operate.** Alert on cost-cap breaches, escalation-rate spikes, and stalled queue depth. Have a documented way to pause the whole engine, replay a single stage for a single item, and roll back a bad stage-graph or prompt change without redeploying the whole system.
- **If this is also a sold product** (hosted dashboard access), apply `saas`'s launch discipline (AARRR metrics, legal, growth loop) to the dashboard/commercial layer only — never to the pipeline internals.

**Gate.** The end-to-end check passes against the production backend; throughput, cost-per-item, escalation rate, and trace-coverage metrics are live with alerts; a pause/replay/rollback runbook exists and has been exercised at least once. Monetization checks apply only if enabled.

---

## What's different from SaaS (and why)

| Area | SaaS | agentic-harness | Why |
|---|---|---|---|
| The product | The app UI + workflows | The pipeline/engine itself | End users (if any) touch only a thin control/observability surface; the value is in correct, autonomous stage execution |
| Phase 2 "PRD" | Product requirements + GUI | Pipeline & Agent Design: stage graph + one AgentSpec + one canonical schema per stage | There's no feature list to write — the spec *is* the stage graph and the per-stage agent contracts |
| Prototype | Full clickable GUI prototype | Scoped to the dashboard only: queue/board view, per-item trace view, run controls | The pipeline has no UI to prototype; the dashboard is the only human-facing surface |
| Architecture ADRs | App/frontend/backend stack | 8 mandatory: stage-graph format, sandbox isolation, I/O schema & versioning, backend abstraction, tracing backend, concurrency model, control plane, model routing | These are existential for a multi-agent pipeline and meaningless for a typical CRUD app |
| Build order | Schema → Migration → API → Component → Page → Integration → Test | Contracts → Backend adapters → Stage-graph engine → Sandbox runner → Per-stage AgentSpecs → Tracing → Control plane → Dashboard → Integration tests → Deploy | The engine and its contracts must exist and be provably wired before any single agent is built on top of them |
| Security | Standard checks | Standard checks, heightened: credential isolation from sandboxes, enforced tool allowlists, atomic claim under concurrency, sandbox resource limits | Every stage is LLM-directed code execution with tool and network access — a materially larger attack surface than a web form |
| Observability | Error tracking (Sentry-style) | Mandatory distributed tracing across the host↔sandbox boundary, with per-agent-run/turn/tool-call granularity and token-usage capture | "What did the agent actually do and why" is not optional for a system meant to run unattended |
| Autonomy | N/A | A first-class control plane: continuous / step / paused run modes, live concurrency and model overrides | The whole point of this type is being able to run it fully autonomous *or* one step at a time from the same engine |
| Launch | Public launch, AARRR metrics | Unattended production operation; metrics are throughput, cost/item, escalation rate, trace coverage | Success is "it correctly processes items without supervision," not acquisition/activation/revenue |
| Monetization | Typically core | Optional, and rare — only if a hosted dashboard is itself sold | Most builds of this type are internal operational tooling, not products with paying end users |

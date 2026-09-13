# Anymake Eval Harness

Launches one or more agent runs against the Anymake system, across project types,
scenario classes and model configurations, and produces a composite-scored HTML report.

**Design:** `docs/design/eval-harness.md` — this README is the operator's guide; the
design doc is the spec, and every section reference below points into it.
**Decision:** `docs/adr/ADR-014-eval-harness-is-a-developer-tool.md`.

---

## What you run

```bash
# what does this host actually expose? run this FIRST — it is the riskiest unknown
node evals/run.mjs --probe

# a complete report in 30 seconds, with no provider and no spend (synthetic)
node evals/run.mjs --scenario s1-cli-greenfield --adapter mock --matrix evals/matrix/smoke.json

# one scenario, whatever model this machine is already configured for
node evals/run.mjs --scenario s1-cli-greenfield

# the standard sweep: every scenario class × every model config in the matrix
node evals/run.mjs --suite standard --matrix evals/matrix/default.json --repeats 3

# does this feature earn its keep? one component removed, everything else identical
node evals/run.mjs --suite ablation --ablate no-experience-runner --repeats 2

# the staircase: bare model → +phases → +planner → +validator → +experience → full
node evals/run.mjs --suite staircase --scenario s1-cli-greenfield --repeats 2

# re-score and re-render an old run without re-running any agents
node evals/run.mjs --score evals/runs/<run-id> --baseline evals/runs/<older-run-id>

# serve the report with trace detail (traces are too large to inline)
bash evals/report/serve.sh evals/runs/<run-id>

# the harness's own regression check — free, offline, ~30s
npm run eval:selftest
```

One command, N arenas, one self-contained HTML file at the end.

---

## The one rule

**The harness never scores a run using that run's own verdicts.** A Validator `PASS`, an
Experience Runner `PASS`, a Product Owner Proxy `APPROVED` are *evidence about the
system's judgment*, scored against a hidden oracle — never a substitute for it. That is
the same reason `AGENTS.md` splits Worker from Validator, pointed at the thing doing the
grading.

The headline number is the **trust gap** (`OUT-04`): claimed-done stories that fail an
independent oracle the run never sees. Everything else is context for that one.

---

## Layout

```
evals/
├── run.mjs            CLI + scheduler
├── selftest.mjs       the harness's own regression check
├── lib/               fs, stats, seeded RNG, bounded parallelism
├── matrix/            run matrices (model configs)
├── scenarios/<id>/    scenario.json · brief.md (public + HIDDEN half) · oracle/
├── fixtures/<id>/     repo/ · oracle/ · ground-truth/ · defects/ · fixture.json
├── ablations/<id>/    a prose patch + the trace assertion that proves it took
├── arena/             per-cell world builder
│   └── shims/         gh (hermetic GitHub) · ci (the real test/lint runner)
├── drive/             opencode adapter · mock adapter · simulated product owner
├── collect/           trace · board series · git · gh ledger · scans · oracle
├── score/             catalog · normalizers · weights · composite · vetoes · probes · alarms
├── diagnostics/       component ledger · stage yield · instruction attention · fix list
├── report/            renderer · template.html · serve.sh · domstub (for the selftest)
└── runs/<run-id>/     run.json · report.html · report.json · cells/ · traces/  (gitignored)
```

Zero npm dependencies, Node ESM only — the same constraint `.opencode/verify-plugin.mjs`
works under, and for the load-bearing reason in ADR-014: the harness must be able to
evaluate an **older** Anymake SHA, which is only possible if it never couples to one.

---

## Adapters

`--adapter opencode` (default) drives a real OpenCode session. `--adapter mock` runs an
in-process simulation.

**The mock adapter is not a measurement of anything.** Every run it produces is stamped
`synthetic: true` and the report says so in its masthead. It exists so the scoring,
diagnostics and report can be tested without spending money, and so you can look at a
complete report before the first real sweep. Nothing it produces may be used to answer
Q1–Q5.

OpenCode's non-interactive flags and on-disk session layout are a moving target, so
`--probe` is the first thing to run on a new machine. It is empirical: it starts a real
throwaway session, continues it, and exports it, then reports which of the four
capabilities (`start`, `send`, `usage`, `kill`) it found and the evidence for each —
including which of §7.1's trace fields your setup can actually fill.

```bash
npm run eval:probe                 # ~70s: real model turn + continuation + export
npm run eval:probe -- --no-live    # instant: flag surface only, no model call
npm run eval:probe -- --isolated-home   # the same, in a throwaway HOME (hermeticity check)
```

**It costs one real model turn** and prints progress as it goes, because silence for a
minute is indistinguishable from a hang.

**Credentials and the HOME override.** opencode keeps credentials in
`<data>/opencode/auth.json`, and the arena redirects `HOME`/`XDG_DATA_HOME` per cell
(§3.2 rule 1). Isolation must not take the credentials with it, so `auth.json` is
*copied* into each cell's HOME — copied, not symlinked, so a cell can never write back
over your real credentials. Provider env vars (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, …)
survive the override on their own. Both `--probe` and the start of every sweep print
which of the two you are relying on; if neither is present, they say so up front rather
than letting every cell discover it an hour in.

Everything downstream reads the normalized `telemetry/trace.jsonl`, so a host change is
a one-file fix in `drive/opencode.mjs`. `evals/drive/host-stub/opencode` reproduces
the host's quirks (help on stderr; export's chatter on stderr beside JSON on stdout) so
`npm run eval:selftest` covers that file even on a machine with no opencode installed.

---

## Configuring models

A matrix entry is a partial `opencode.json` plus an env pair, using Anymake's own
mechanism rather than a new one (`AGENTS/arbiter.md` → Model Tier Policy):

```json
{ "id": "tiered-default",
  "tiered": true,
  "env": { "ANYMAKE_MODEL_TIER1": "<frontier>", "ANYMAKE_MODEL_TIER2": "<capable>", "ANYMAKE_MODEL_TIER3": "<economy>" },
  "opencode": {} }
```

`{ "id": "system-default", "env": {}, "opencode": {} }` configures nothing and lets the
host use whatever the machine is already set up for. Run with no matrix at all and you
get one cell per scenario on your default model.

**Tier binding is itself measured.** `EFF-07` is the fraction of sub-agent turns that ran
on the model their tier asked for. A "tiered" cell where that number is near zero is not
a tiered cell, and the report's **tier illusion** alarm says so instead of attributing
the result to tiering.

---

## Adding a scenario

1. `evals/scenarios/<id>/scenario.json` — class (`S0`–`S5`), type, the **verbatim**
   entry prompt, the script table, the probe schedule, caps.
2. `evals/scenarios/<id>/brief.md` — the public brief, then a `## HIDDEN` acceptance
   list of 8–15 atomic checkable statements. The hidden half is stripped before anything
   reaches the arena, and `selftest.mjs` asserts that.
3. An oracle: either the scenario's own `oracle/index.mjs`, or a fixture's.

## Adding a fixture

`repo/` (frozen source, green before any defect is applied), `oracle/regression|repro/`,
`ground-truth/` (one stated root cause per defect), `fixture.json`. Bug reports are
written in **user voice** — intake quality is part of what is being measured, and the
selftest fails a report written in system terms.

## Adding an ablation

`evals/ablations/<id>/ablation.json`: the prose patch (`ops`) **and** a trace assertion
(`assert`) proving the component did not run. An ablation whose assertion fails is
discarded, not scored — otherwise you are measuring a patch that did not apply. This is
not theoretical: it caught a miswired mock during this harness's own construction.

---

## Reading the report

The diagnostic views come **before** the scoreboard views, because the leaderboard is the
smallest part of what the report is for:

1. **Overview** — headline tiles, leaderboard, efficiency frontier, derived alarms.
2. **Components** — does each feature earn its keep? Ledger, staircase, stage yield.
3. **Traces** — the dispatch tree, per turn, filterable to failures.
4. **Instructions** — per file: reads, token share, rules exercised, rules violated,
   and a verdict of load-bearing / expensive / dead / unread-but-violated.
5. **Fix list** — ranked, file-targeted, each with the assertion that would catch a
   regression.

Then the scoreboard: scenario × config matrix, invariant probes, trust gap, autonomy,
spend, cell drill-down.

Three habits the report is built to enforce:

- **An absence is reported, never defaulted.** A metric with no evidence is dropped and
  its weight redistributed; it is never scored 0 and never quietly set to a middle value.
- **A veto caps, it does not deduct.** A security escalation resolved autonomously, a
  Never Building item built, a push to `main`, a weakened test, a shipped regression —
  each caps the composite at 40 with its reason attached, because a weighted average
  would let speed buy past it.
- **Differences inside the noise are marked, not ranked.** n≥3 before you conclude
  anything; overlapping IQRs print "not separated at n=k". This instrument detects large
  effects — a broken instruction, a model that cannot hold the process, a tier config
  that collapses. It does not resolve two-point gaps.

---

## Status against the build plan

`docs/design/eval-harness.md` §13 lays out P0–P9. What is here:

| Phase | State |
|---|---|
| **P0** adapter + `--probe`, arena, one scenario, full trace capture | **built** — the OpenCode adapter's four capabilities are probed, not assumed |
| **P1** trace viewer, dispatch tree, input composition, instruction attention | **built** |
| **P2** `gh`/CI shims, board snapshotter, mechanical metrics, `report.json` | **built** |
| **P3** HTML report: composite scoring, derivation tables, spend views | **built** |
| **P4** fixture #1 with hidden oracle, S3 bugfix, trust gap, stage yield | **built** (`cli-notes`) |
| **P5** ablation runner + trace assertions, staircase, component ledger | **built** |
| **P6** simulated product owner + invariant probes | **built** — 13 probes; the persona fallback needs `ANYMAKE_EVAL_SIMULATOR_MODEL` + a key |
| **P7** judges with citation verification; defect attribution + fix list | **partial** — attribution and the fix list are built and mechanical; the judged metrics (`FID-01/04/06/08`, `OUT-06`) report *unscored* until a judge pass exists, and their weight redistributes |
| **P8** matrix sweeps, repeats, variance, `--baseline`, control arm | **built** — `--baseline` currently carries the earlier run's model into `report.json`; the per-metric delta view is not rendered yet |
| **P9** fixtures #2–3, remaining types, nightly CI smoke | **not built** — `cli-notes` is the only fixture; all eight types have Eval Profiles |

Calibration is deliberately absent: `EFF-01/02/03/05` bands have no anchors yet, so cost
and time are **reported raw and excluded from the composite**, and the report says so.
Anchors get set from observed medians after the first real sweep — not guessed up front.

---

## Environment

| Variable | Effect |
|---|---|
| `ANYMAKE_EVAL_OPENCODE` | path to the `opencode` binary (default: `opencode`) |
| `ANYMAKE_EVAL_SIMULATOR_MODEL` | pins the simulated product owner's persona model — one model across the whole matrix, because varying the system under test and its interlocutor at once produces uninterpretable numbers |
| `ANTHROPIC_API_KEY` | enables the persona fallback layer; without it, unmatched questions get "I don't know — use your judgement and note the assumption", logged as `AUT-05b` |
| `ANYMAKE_EVAL_LOG` | `silent` · `error` · `warn` · `info` (default) · `debug` |

Per-cell caps default to $25 / 120 min / 600 turns and are set with `--cap-usd`,
`--cap-minutes`, `--cap-turns`. A cap hit is a **result** (`AUT-09 = capped`), not an
exclusion — dropping timeouts would bias every comparison toward slow, thorough models.
A harness-level crash *is* excluded, counted in `REL-01`, and reported.

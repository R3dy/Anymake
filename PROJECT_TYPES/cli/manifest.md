# Project Type: CLI Tool / Script (`cli`)

## Identity
- **id:** `cli`
- **One-liner:** A terminal program or automation script run from the command line.
- **Choose this when:** The primary interface is the terminal — commands, flags, stdin/stdout, exit codes — and the deliverable is something people install and run.
- **Not this if:** It's imported as a dependency rather than run (`library`), it serves HTTP (`api-service`), or it has a GUI (`saas`, `internal-tool`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | Identity, the command(s), inputs/outputs, who runs it, success = reliability + ease of install |
| 1 Discovery | active (lite) | Prior art — existing tools and why this one is needed. No market sizing. |
| 2 Planning | active (full) | "PRD" = command spec (args, flags, I/O, exit codes); no UX prototype; architecture = language + distribution; monetization optional |
| 3 Solutioning | active (full) | Backlog organized by command / feature |
| 4 Implementation | active (full) | Core logic → arg parsing → I/O → tests → packaging → docs |
| 5 Launch | active (full) | Publish to a registry; metrics = installs/downloads/issues |

## Success Model
**Reliable utility + frictionless install is first-class.** Success = it does the job correctly across inputs and is trivial to install and run. Optional: downloads, GitHub stars.

## Default Stack
Node + TypeScript (`commander`/`yargs`, published as an npm bin) **or** Python (`argparse`/`click`, published to PyPI / `pipx`) **or** Go/Rust for a single static binary. Choose based on distribution needs.

## ADRs
- **Mandatory:** ADR-001 Language/runtime, ADR-002 Distribution & packaging (npm bin / PyPI / Homebrew / single binary), ADR-003 Configuration format (flags / env / config file).
- **Optional:** Update mechanism, telemetry (opt-in only), plugin architecture.

## Phase 2 Tracks
- **PRD:** yes — as a **command specification**: each subcommand, its arguments/flags, stdin/stdout contract, exit codes, and error messages
- **UX + Prototype:** no GUI prototype. **Replaced** by CLI UX: help text (`--help`), usage examples, and output formatting
- **Architecture:** yes — language, distribution, config
- **Monetization:** optional (paid license key, sponsorship/donations) — usually skipped

## Phase 4 Build Order
`Core logic → CLI layer (arg/flag parsing) → I/O & formatting → Tests → Packaging/Distribution → Docs (README + usage)`. No schema/migration/frontend unless the tool maintains local state.

## Launch & Metrics
Publish to the chosen registry (npm / PyPI / Homebrew tap / GitHub Releases binary). Verify clean install on a fresh machine. Metrics: download/install counts, open issues, time-to-first-successful-run.

## Gate Criteria Deltas
- **Skip:** monetization checks (unless a paid model is chosen), market-size/competitor depth, the GUI-prototype gate, GDPR/legal, AARRR metrics.
- **Replace:** the prototype gate → a **CLI UX check** (`--help` output exists and is clear; at least one usage example; consistent error messages and exit codes).
- **Add:** install verification (the published artifact installs and runs on a clean environment); usage docs present.
- **Keep:** acceptance-criteria quality, test coverage for runtime behavior, no-secrets-in-code.

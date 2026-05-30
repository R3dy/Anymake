# CLI Tool / Script — Build Guide

> **`project_type: cli`** — for a terminal program or automation script people install and run. Success is a reliable utility that does the job correctly across inputs and is frictionless to install. The whole arc bends toward two things: it behaves predictably from the shell (args, stdin/stdout, exit codes), and `install → run` Just Works on a clean machine.

The interface is the terminal, not a screen. So the heavy SaaS machinery built around a GUI and a paying funnel falls away, and is replaced by the discipline that actually matters for a command-line tool: a precise command contract, tested runtime behavior, and a verified install path.

---

## Phase 0 — Foundation (full)

One focused session. Produce `PROJECTS/[name]/PROJECT.md` covering:

- **Name** — the binary/command name people will type (e.g. `mytool`). Check it isn't already taken on the registry you'll publish to.
- **What it does** — one or two sentences describing the job it performs from the shell.
- **The command(s)** — the top-level command and any subcommands you expect (`mytool sync`, `mytool clean`, `mytool report`). Rough is fine; Phase 2 makes it exact.
- **Inputs / outputs** — what it reads (args, flags, stdin, files, env) and what it writes (stdout, files, exit codes). Name the primary data flow in one line.
- **Who runs it** — the operator: a developer at a prompt, a CI pipeline, a cron job, a Makefile. This shapes everything (a CI tool must be non-interactive and machine-parseable).
- **Done looks like** — the one concrete success: "running `mytool sync ./data` exits 0 and writes a deduped manifest." Success = it's reliable across inputs and trivial to install.

Skip: revenue model, market positioning, business metrics, team.

**Gate:** A human confirms the command name, the I/O contract, and who runs it are clear. In autonomous mode the Product Owner Proxy checks that the command(s), inputs/outputs, and "done looks like" are filled in. No monetization or market check.

---

## Phase 1 — Discovery (lite)

A short prior-art pass, not a market study.

- **Existing tools** — list the two or three utilities that already do something close (`jq`, `fd`, a homegrown script). For each, one line on what it does and where it falls short for your case.
- **Why this one** — the gap you're filling: a missing flag, a better default, a narrower scope, a friendlier output, or just "no good tool exists in this ecosystem."
- **Unknowns worth a 10-minute look** — e.g. "does the platform API page its results?", "can I parse this format with a stdlib module?"

No market sizing, no TAM, no personas, no competitor matrix. Move on quickly.

**Gate:** The "why this exists" gap is articulated and the few real unknowns are noted. Proxy checks prior art is acknowledged; it does not require depth or a competitor table.

---

## Phase 2 — Planning (full)

Three tracks run: the command spec (the "PRD"), CLI-UX, and architecture. Monetization is skipped unless you've chosen a paid model.

### The PRD is a Command Specification
There is no feature list of screens — there is a contract per command. For the top-level command and **each subcommand**, write:

- **Synopsis** — `mytool sync [--dry-run] [--config <path>] <source>`
- **Arguments & flags** — every positional arg and flag: name, type, default, required vs optional, short alias. Note mutually exclusive groups.
- **stdin/stdout contract** — does it read stdin when no file is given? Is stdout machine-parseable (NDJSON, plain lines) so it pipes cleanly? Keep human chatter on stderr so stdout stays clean for `|`.
- **Exit codes** — define them: `0` success, `1` generic failure, `2` usage error, and any tool-specific codes (e.g. `3` = no matches). Document them; tests will assert them.
- **Error messages** — the message text and exit code for each failure mode (bad flag, missing file, network error). Consistent, actionable, on stderr.

### CLI-UX deliverable (replaces the GUI prototype)
No mockups. Instead specify the tool's terminal experience:

- **`--help` text** — the exact help output for the root command and each subcommand: usage line, flag descriptions, examples footer. This is the primary "design artifact."
- **Usage examples** — at least one realistic copy-pasteable invocation per command, including a piping example if relevant (`mytool list --json | jq '.[].id'`).
- **Output formatting** — default human-readable output, plus a `--json`/`--quiet`/`--no-color` story if the tool is meant for scripting. Honor `NO_COLOR` and non-TTY (don't emit color/spinners when piped).
- **Interaction policy** — decide up front whether the tool ever prompts. If it can run in CI or cron, default to non-interactive and gate any prompt behind a TTY check, with a `--yes`/`--force` flag to bypass.

### Architecture (the 3 mandatory ADRs)
Write each as a short ADR:

- **ADR-001 Language / runtime** — Node+TypeScript (`commander`/`yargs`), Python (`argparse`/`click`), or Go/Rust for a single static binary. Choose primarily by distribution needs and where your users already are.
- **ADR-002 Distribution & packaging** — how it ships: npm bin, PyPI / `pipx`, a Homebrew tap, or a GitHub Releases static binary. This decision often drives ADR-001.
- **ADR-003 Configuration format** — precedence of flags vs. env vars vs. a config file (e.g. `~/.config/mytool/config.toml`). Define the resolution order: flag > env > config file > default.

No monetization track (unless a license-key/sponsorship model was explicitly chosen).

**Gate:** A human confirms the command spec is complete (every subcommand has args, I/O, exit codes, errors), the CLI-UX check passes (`--help` text drafted and clear, at least one usage example, consistent error/exit-code scheme), and the three ADRs are decided. Proxy skips the GUI-prototype gate, market depth, and monetization.

---

## Phase 3 — Solutioning (full)

Turn the command spec into a backlog in `docs/backlog.md`, **organized by command / feature**.

- One epic (or grouping) per subcommand, plus cross-cutting epics for arg parsing, config resolution, output formatting, and packaging.
- Each task carries acceptance criteria phrased as observable shell behavior: "`mytool clean --dry-run` lists targets, exits 0, deletes nothing."
- Order tasks toward the "done looks like" command working end-to-end first, then breadth (more subcommands/flags), then polish.

**Gate:** The backlog is concrete and ordered, with testable acceptance criteria. Proxy keeps the acceptance-criteria quality check; it does not require formal SaaS epics.

---

## Phase 4 — Implementation (full)

Build in this exact order. Each layer builds on the last:

1. **Core logic** — the actual work the tool does, written as plain functions/modules with no dependence on `argv`. Keep it pure and importable so it's directly testable.
2. **CLI layer (arg/flag parsing)** — wire `commander`/`click`/etc. on top of the core: parse args and flags, resolve config precedence, dispatch to subcommands. The CLI layer should be thin — translate input, call core, set exit code.
3. **I/O & formatting** — stdin reading, file I/O, and output rendering. Human format by default, machine format under `--json`/`--quiet`; human chatter to stderr, results to stdout; respect non-TTY and `NO_COLOR`.
4. **Tests** — **required** for runtime behavior, not optional here. Unit-test the core logic; add end-to-end tests that invoke the built CLI and assert stdout, stderr, **and exit codes** across normal, edge, and error inputs. This is the reliability guarantee that defines success for this type.
5. **Packaging / Distribution** — make the artifact installable per ADR-002: a `bin` field + shebang for npm, `entry_points`/`console_scripts` for PyPI, a build/release workflow for binaries, a formula for Homebrew. Pin a version.
6. **Docs (README + usage)** — README with install instructions, the `--help` output, and the usage examples from Phase 2. Keep it in sync with the command spec.

No schema/migration/frontend layers unless the tool maintains local state (then add a small state/storage layer ahead of core logic).

**Gate:** The tool builds, the test suite passes (including exit-code assertions), and it runs locally end-to-end doing what "done looks like" described. Proxy checks build/run success, test coverage for runtime behavior, and no secrets committed (API tokens, registry credentials).

---

## Phase 5 — Launch (full)

Publish and verify the real install path.

- **Publish to the chosen registry** — per ADR-002: `npm publish` (with the `bin` entry), `python -m build && twine upload` to PyPI (and confirm `pipx install` works), push the Homebrew formula to the tap, or attach built binaries to a GitHub Release. Tag the version in git.
- **Verify clean install on a fresh machine** — the load-bearing step. On a clean container/VM with nothing preinstalled, run the real install command (`npm i -g mytool`, `pipx install mytool`, `brew install …`, or download-and-run the binary), then run the tool and confirm it works. This catches missing files in the package, broken shebangs, and undeclared dependencies.
- **Metrics that matter** — download/install counts from the registry, open issues, and time-to-first-successful-run. No AARRR funnel, no revenue dashboard, no analytics SDK embedded in the tool (telemetry, if any, is opt-in only per the optional ADR).

**Gate:** The artifact is published and verified to install and run cleanly on a fresh environment, and usage docs are present. Proxy adds the install-verification check; it skips monetization, market, AARRR metrics, and GDPR/legal pages.

---

## What's different from SaaS (and why)

| Aspect | SaaS | CLI (and why) |
|--------|------|---------------|
| Phase 1 Discovery | Full market sizing, personas, competitors | Lite prior-art note — you're filling a gap, not sizing a market |
| Phase 2 "PRD" | Feature/user-story spec for a product | A **command specification**: args, flags, stdin/stdout, exit codes, error messages |
| Phase 2 UX | GUI design + clickable prototype (hard gate) | **CLI-UX**: `--help` text, usage examples, output formatting — no mockups |
| Architecture focus | Schema, services, hosting | Language/runtime, distribution/packaging, config precedence (3 ADRs) |
| Monetization | First-class | Skipped (optional paid license/sponsorship at most) |
| Build order | Schema → Migration → API → Component → Page → Integration → Test | Core logic → CLI layer → I/O & formatting → Tests → Packaging → Docs |
| Tests | Required | Required, and asserting **exit codes** specifically, since reliability is the success axis |
| Launch | Deploy to hosting, AARRR metrics, legal | Publish to a registry, **verify clean install on a fresh machine**; metrics = downloads/installs/issues |
| Success axis | Revenue | Reliable utility + frictionless install |

If the tool grows a GUI or a hosted, monetized surface, that's a signal it has outgrown `cli` — switch types and the fuller phases (prototype gate, monetization, AARRR) kick in.

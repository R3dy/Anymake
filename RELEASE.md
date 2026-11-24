# Releasing Anymake to Running Sessions

Anymake is distributed as an OpenCode plugin, installed on OpenCode 2.4.1+ with
`opencode plugin add github:R3dy/Anymake` (or, legacy 1.x, the
`anymake@git+https://github.com/R3dy/Anymake.git` spec). OpenCode installs the plugin into its
package cache (`.../node_modules/anymake/`) and serves later sessions from that copy. A merge to
`main` does NOT automatically reach running sessions — the installed copy has to be refreshed and
OpenCode restarted.

This document is the repeatable "how to get this into running sessions" step. Every release
(including the merge of an issue's PR) should end with this procedure.

---

## The procedure

0. **Check CI.** The `verify` workflow (`.github/workflows/verify.yml`) runs the regression
   harness on every push and PR, so `origin/main` should already be green before you start.
   Confirm the latest commit's check passed on GitHub. CI is the first gate; the local run
   below is the confirmation, not the only signal.

1. **Verify `origin/main` is green locally.** On the local checkout:
   ```bash
   cd PROJECTS/anymake/repo
   git fetch origin main
   git checkout main && git pull origin main
   npm run verify
   node .opencode/validate-board-state.mjs .opencode/fixtures/board-state.valid.json
   node .opencode/validate-board-state.mjs --expect-fail .opencode/fixtures/board-state.invalid.json
   ```
   `npm run verify` must print `ALL CHECKS PASSED`, and both fixture validations must exit 0
   (the second is expected-fail — it confirms the schema still rejects a malformed board).
   If any of them doesn't, **stop** — do not release a broken HEAD. The harness is the only
   regression check this repo has; a red run means an instruction is broken, and instruction
   bugs reach every running session silently.

   > `node .opencode/verify-plugin.mjs` still works and is identical — `npm run verify` is
   > just the documented entry point.

2. **Refresh the installed copy.** On OpenCode 2.4.1+:
   ```bash
   opencode plugin update anymake
   ```
   (A cloned install at `~/.config/opencode/plugins/anymake` is refreshed with
   `git -C ~/.config/opencode/plugins/anymake pull` instead.)

   **If `plugin update` does not pick up the new HEAD** (or on OpenCode 1.x), move the stale
   cache aside — non-destructive, it creates a rollback point. Locate it first; the directory
   name encodes the install spec:
   ```bash
   find ~/.cache/opencode -maxdepth 6 -type d -path '*node_modules/anymake' 2>/dev/null
   # 1.x example — the cached spec directory:
   mv ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git/ \
      ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git.bak-$(date +%s)
   ```
   A plain `rm -rf` would also invalidate the cache but forecloses rollback — the `mv`-aside
   variant is the default so a bad HEAD can be restored with a single `mv` back. If `.bak-*`
   dirs accumulate, purge them manually after a release is confirmed good.

3. **Restart OpenCode** (`opencode service restart` if it runs as a service). New sessions load
   the refreshed plugin, which also refreshes the generated `~/.config/opencode/agents/anymake-*.md`
   files from `AGENTS/*.md`.

4. **Confirm the refresh.** From a shell:
   ```bash
   opencode plugin check
   find ~/.cache/opencode -maxdepth 7 -path '*node_modules/anymake/dashboard/kanban.html' 2>/dev/null
   ```
   The check must be clean and the file must exist. If it does not, the refresh did not pick up
   the latest `main` — re-run step 1 and confirm `origin/main` actually has the work
   (`git ls-tree origin/main -- dashboard/`).

---

## A running session cannot be hot-patched

The plugin loads once at startup. A session that is already running will continue to serve the
stale plugin until it is restarted — there is no mid-session reload.

**Immediate workaround for the dashboard only:** the dashboard HTML can be served directly from
the already-synced local checkout while waiting to restart:
```bash
python3 -m http.server 8080 -d PROJECTS/anymake/repo
# open http://localhost:8080/dashboard/kanban.html?board=../../../PROJECTS/<name>/.anymake/board-state.json
```
This gives you the latest `kanban.html` immediately, but the plugin-level instructions
(board-writing in `AGENTS/*`, the schema, the skill references) only reach the *next* session
after a cache invalidation + restart.

---

## Optional: pinning a ref

The default spec (`github:R3dy/Anymake`) resolves to the default branch HEAD **at install time
only**. For reproducibility, pin to a commit SHA or tag:
```bash
opencode plugin add 'github:R3dy/Anymake#<sha-or-tag>'
```
(1.x: `"anymake@git+https://github.com/R3dy/Anymake.git#<sha-or-tag>"` in the `plugin` array.)
Changing the spec forces OpenCode to re-resolve on the next restart, but the **old cache entry
lingers until moved/wiped** — pinning does not replace the cache-invalidation procedure above.
Run the procedure (move-aside + restart) after changing the spec to guarantee the pinned ref is
actually served.

A GitHub release tag (`git tag v0.x.x && git push origin v0.x.x`) is useful for pinning but adds
a release step with no freshness benefit over the cache-invalidation procedure. Tagging is
optional; the default release flow is: merge to `main` → cache-invalidation → restart.

---

## Before the merge: version and changelog

A change to the instruction files *is* a change to the system's behavior — there is no code/docs
split here (ADR-008). So a release that changes how an agent behaves should also:

1. Add a `CHANGELOG.md` entry describing what changed and **why**, with behavior changes called
   out as behavior changes rather than folded in among fixes. A future session reading
   `PHASE_STATE.md` history uses this to understand where a rule came from.
2. Bump the skill-suite version in `skills/anymake/SKILL.md`'s footer and `package.json`.

Neither is enforced by the harness — they are judgment calls about whether a change is
release-worthy. A typo fix is not; a new gate check is.

---

## Rollback

If the refreshed cache breaks sessions (it should not — step 1 verified the harness is green on
the released HEAD), restore the pre-release cache with one command:
```bash
mv ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git.bak-<timestamp>/ \
   ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git/
```
Then restart OpenCode. The pre-release plugin is restored.

**Fallback if no `.bak-*` is available:** re-pin to the last-known-good SHA
(`opencode plugin add 'github:R3dy/Anymake#<last-good-sha>'`) and restart OpenCode.

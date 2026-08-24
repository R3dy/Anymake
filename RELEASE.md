# Releasing Anymake to Running Sessions

Anymake is distributed as an OpenCode git plugin (`anymake@git+https://github.com/R3dy/Anymake.git`).
OpenCode caches the cloned plugin in `~/.cache/opencode/packages/<encoded-spec>/node_modules/anymake/`
and serves subsequent sessions from that cache **without re-fetching**. A merge to `main` does NOT
automatically reach running sessions — the cache must be invalidated so OpenCode re-clones current
`origin/main` on the next restart.

This document is the repeatable "how to get this into running sessions" step. Every release
(including the merge of an issue's PR) should end with this procedure.

---

## The procedure

1. **Verify `origin/main` is green.** On the local checkout:
   ```bash
   cd PROJECTS/anymake/repo
   git fetch origin main
   git checkout main && git pull origin main
   node .opencode/verify-plugin.mjs
   ```
   The last line must print `ALL CHECKS PASSED`. If it does not, **stop** — do not release a
   broken HEAD.

2. **Move the stale cache aside** (non-destructive — creates a rollback point):
   ```bash
   mv ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git/ \
      ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git.bak-$(date +%s)
   ```
   A plain `rm -rf` would also invalidate the cache but forecloses rollback — the `mv`-aside
   variant is the default so a bad HEAD can be restored with a single `mv` back. If `.bak-*`
   dirs accumulate, purge them manually after a release is confirmed good.

3. **Restart OpenCode.** On restart, OpenCode re-clones `origin/main` HEAD into the cache.
   New sessions load the refreshed plugin.

4. **Confirm the cache is refreshed.** In a fresh session (or from a shell):
   ```bash
   ls ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git/node_modules/anymake/dashboard/kanban.html
   ```
   The file must exist. If it does not, the re-clone did not pick up the latest `main` — re-run
   step 1 and confirm `origin/main` actually has the work (`git ls-tree origin/main -- dashboard/`).

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

The default spec (`anymake@git+https://github.com/R3dy/Anymake.git`) resolves to the default
branch HEAD **at clone time only**. For reproducibility, pin to a commit SHA or tag:
```
"anymake@git+https://github.com/R3dy/Anymake.git#<sha-or-tag>"
```
Changing the spec forces OpenCode to re-resolve on the next restart, but the **old cache entry
lingers until moved/wiped** — pinning does not replace the cache-invalidation procedure above.
Run the procedure (move-aside + restart) after changing the spec to guarantee the pinned ref is
actually served.

A GitHub release tag (`git tag v0.x.x && git push origin v0.x.x`) is useful for pinning but adds
a release step with no freshness benefit over the cache-invalidation procedure. Tagging is
optional; the default release flow is: merge to `main` → cache-invalidation → restart.

---

## Rollback

If the refreshed cache breaks sessions (it should not — step 1 verified `verify-plugin.mjs` is
green on the released HEAD), restore the pre-release cache with one command:
```bash
mv ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git.bak-<timestamp>/ \
   ~/.cache/opencode/packages/anymake@git+https:/github.com/R3dy/Anymake.git/
```
Then restart OpenCode. The pre-release plugin is restored.

**Fallback if no `.bak-*` is available:** re-pin the spec to the last-known-good SHA
(`anymake@git+https://github.com/R3dy/Anymake.git#<last-good-sha>`) and run the cache-invalidation
procedure (move-aside + restart).

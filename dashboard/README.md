# Anymake Kanban Dashboard

A zero-build, single-file kanban monitor for the Anymake build loop + session
activity channel. Live view of `board-state.json` (build-loop stories/events)
and `session-log.jsonl` (session lifecycle events — see ADR-013).

## Launch (recommended — `kanban.sh`)

One command opens the dashboard for a named project:

```bash
bash dashboard/kanban.sh <project-name> [port]
# e.g. bash dashboard/kanban.sh realhax
# e.g. bash dashboard/kanban.sh realhax 8090
```

The script locates `kanban.html` (plugin cache or local checkout), creates a
temp HTTP root with symlinks to the dashboard and the project's `.anymake/`,
binds `127.0.0.1` (localhost-only), opens the browser, and prints the URL +
PID + stop command. Set `MISSION_CONTROL` env if your hub isn't at
`~/mission-control`. Set `ANYMAKE_DASHBOARD` to override the HTML path.

## Launch (manual — fallback)

Serve the consuming project root over HTTP and point the dashboard at the
board-state file:

```bash
# From the consuming project root (the one with .anymake/board-state.json):
python3 -m http.server 8080 --bind 127.0.0.1

# Then open in a browser:
# http://localhost:8080/path/to/anymake/dashboard/kanban.html?board=.anymake/board-state.json&log=.anymake/session-log.jsonl
```

Or, if the Anymake repo is installed as a plugin (the usual case):

```bash
# Serve from the project root, reference the plugin's dashboard path:
python3 -m http.server -d . 8080 --bind 127.0.0.1
# http://localhost:8080/.opencode/plugins/anymake/dashboard/kanban.html?board=.anymake/board-state.json&log=.anymake/session-log.jsonl
```

The page polls `board-state.json` and `session-log.jsonl` every 2 seconds and
re-renders on change. When either file is absent (404), the poll interval
backs off to 15 seconds and the dashboard shows a "Waiting for
board-state.json..." status — this prevents endless 404 spam in the server
log when no session has created the files yet. Polling resumes at 2s
automatically once the files appear.

## Launch (offline mode — drag-drop fallback)

Open `kanban.html` directly (`file://`). No server needed. Drag-and-drop a
`board-state.json` file onto the page (or click to select). No polling in this
mode — reload the file to refresh. (Session Activity panel is not available in
offline mode — it requires fetching `session-log.jsonl` over HTTP.)

## What it shows

- **7 kanban columns**: Backlog, Ready, In Progress, In Validation, Experience,
  Done, Escalated — matching the board-status palette from `AGENTS/arbiter.md`.
  These render `stories[]` (build-loop story-status transitions).
- **Session Activity panel**: a timeline of the last 50 session lifecycle events
  from `session-log.jsonl` (session_start, phase_step, artifact, checkpoint,
  escalation, session_end) — reverse-chronological, color-coded by event type.
  Shows "No session history" when `session-log.jsonl` is absent or the `?log=`
  param is omitted.
- **Cards**: story ID, title, branch, PR#, retry count, last-event age
- **Solo session card**: when `board-state.json` has a `session` object but no
  build-loop state (`stories` empty, no `run_id`), the In Progress column
  renders one derived pseudo-card (session id, current step, "solo session"
  badge, started age) so solo sessions are visible on the board. It disappears
  as soon as a real build-loop run takes over. Display-only — the dashboard
  never writes. When the session log shows the session has ended, the card is
  removed — the board never claims in-progress work for a dead session.
  Offline drag-drop mode has no session log; there the card renders from
  board-state alone (deliberate static-inspection mode).
- **Header**: run ID, concurrency (current/max), last-updated timestamp, and
  session context (Session ID, Phase, Step) when `board-state.json` has a
  `session` object
- **Run log tail**: last 15 build-loop events from `board-state.json`'s `events[]`

## Design

- **Read-only** — no write controls. The dashboard observes; agents and the
  orchestrator own state (mirrors the Experience Runner's observe-never-fix
  discipline).
- **Zero-build** — single file, vanilla JS, inline CSS. No `dist/`, no
  transpilation, no external resources. Respects ADR-008.
- **Dark/terminal aesthetic** — near-black `#0b0d10`, monospaced IDs, status
  colors from the Arbiter's board-status palette.
- **Writer split (ADR-013)** — the orchestrator owns `board-state.json`
  (stories, events[], concurrency); the hub (main agent) appends session
  lifecycle events to `session-log.jsonl` only and sets the `session` object
  once at start. The dashboard reads both files — two fetches, no write conflict.

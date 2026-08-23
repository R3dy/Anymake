# Anymake Kanban Dashboard

A zero-build, single-file kanban monitor for the Anymake build loop. Live view
of `board-state.json` — the structured taskboard spine.

## Launch (live mode — recommended)

Serve the consuming project root over HTTP and point the dashboard at the
board-state file:

```bash
# From the consuming project root (the one with .anymake/board-state.json):
python3 -m http.server 8080

# Then open in a browser:
# http://localhost:8080/path/to/anymake/dashboard/kanban.html?board=.anymake/board-state.json
```

Or, if the Anymake repo is installed as a plugin (the usual case):

```bash
# Serve from the project root, reference the plugin's dashboard path:
python3 -m http.server -d . 8080
# http://localhost:8080/.opencode/plugins/anymake/dashboard/kanban.html?board=.anymake/board-state.json
```

The page polls `board-state.json` every 2 seconds and re-renders on change.

## Launch (offline mode — drag-drop fallback)

Open `kanban.html` directly (`file://`). No server needed. Drag-and-drop a
`board-state.json` file onto the page (or click to select). No polling in this
mode — reload the file to refresh.

## What it shows

- **7 kanban columns**: Backlog, Ready, In Progress, In Validation, Experience,
  Done, Escalated — matching the board-status palette from `AGENTS/arbiter.md`
- **Cards**: story ID, title, branch, PR#, retry count, last-event age
- **Header**: run ID, concurrency (current/max), last-updated timestamp
- **Run log tail**: last 15 events from `board-state.json`'s `events[]`

## Design

- **Read-only** — no write controls. The dashboard observes; agents and the
  orchestrator own state (mirrors the Experience Runner's observe-never-fix
  discipline).
- **Zero-build** — single file, vanilla JS, inline CSS. No `dist/`, no
  transpilation, no external resources. Respects ADR-008.
- **Dark/terminal aesthetic** — near-black `#0b0d10`, monospaced IDs, status
  colors from the Arbiter's board-status palette.

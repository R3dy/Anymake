#!/usr/bin/env bash
# anymake kanban launcher — open the kanban dashboard for a named project.
# Usage: kanban.sh <project-name> [port]
# Requires: python3 (for http.server). Binds 127.0.0.1 (localhost-only).
set -euo pipefail

PROJECT="${1:-}"
PORT="${2:-8080}"
MISSION_CONTROL="${MISSION_CONTROL:-$HOME/mission-control}"

if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <project-name> [port]" >&2
  echo "  e.g. $0 realhax" >&2
  echo "  e.g. $0 realhax 8090" >&2
  echo "  MISSION_CONTROL env (default: ~/mission-control) locates the project." >&2
  exit 1
fi

PROJECT_ROOT="$MISSION_CONTROL/PROJECTS/$PROJECT"
if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: project directory not found: $PROJECT_ROOT" >&2
  echo "Set MISSION_CONTROL env if your hub is elsewhere." >&2
  exit 1
fi

# Locate the dashboard HTML (env override → plugin cache → local checkout)
DASHBOARD=""
if [ -n "${ANYMAKE_DASHBOARD:-}" ] && [ -f "$ANYMAKE_DASHBOARD" ]; then
  DASHBOARD="$ANYMAKE_DASHBOARD"
elif ls "$HOME"/.cache/opencode/packages/anymake@git+*/node_modules/anymake/dashboard/kanban.html >/dev/null 2>&1; then
  DASHBOARD="$(ls "$HOME"/.cache/opencode/packages/anymake@git+*/node_modules/anymake/dashboard/kanban.html 2>/dev/null | head -1)"
elif [ -f "$MISSION_CONTROL/PROJECTS/anymake/repo/dashboard/kanban.html" ]; then
  DASHBOARD="$MISSION_CONTROL/PROJECTS/anymake/repo/dashboard/kanban.html"
else
  echo "Error: cannot locate kanban.html. Set ANYMAKE_DASHBOARD env to the full path." >&2
  exit 1
fi

# Verify board-state.json (warn if absent — dashboard handles empty gracefully)
ANOMAKE_DIR="$PROJECT_ROOT/.anymake"
if [ ! -f "$ANOMAKE_DIR/board-state.json" ]; then
  echo "Warning: $ANOMAKE_DIR/board-state.json not found — dashboard will show empty board." >&2
fi

# Create a temp served root with symlinks so kanban.html and the project's
# .anymake/ are under one HTTP root (kanban.html fetches ?board=/?log=
# relative to its own URL).
TMPROOT="$(mktemp -d)"
ln -sf "$DASHBOARD" "$TMPROOT/kanban.html"
ln -sf "$ANOMAKE_DIR" "$TMPROOT/.anymake"

PIDFILE="/tmp/anymake-kanban-$PROJECT.pid"
URL="http://localhost:$PORT/kanban.html?board=.anymake/board-state.json&log=.anymake/session-log.jsonl"

cleanup() {
  if [ -f "$PIDFILE" ]; then
    kill "$(cat "$PIDFILE")" >/dev/null 2>&1 || true
    rm -f "$PIDFILE"
  fi
  rm -rf "$TMPROOT"
}
trap cleanup EXIT INT TERM

# Start the HTTP server (localhost-only)
python3 -m http.server "$PORT" --directory "$TMPROOT" --bind 127.0.0.1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"

# Wait briefly for the server to come up
sleep 0.5

# Open the browser
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi

echo "Anymake Kanban for '$PROJECT' is running."
echo "  URL: $URL"
echo "  PID: $SERVER_PID (in $PIDFILE)"
echo "  Stop: kill \$(cat $PIDFILE)"
echo "  Press Ctrl+C to stop."

# Wait for the server process to exit (or be killed)
wait "$SERVER_PID" 2>/dev/null || true

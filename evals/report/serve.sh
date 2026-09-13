#!/usr/bin/env bash
# Serve one run directory over localhost so the report can lazy-load traces/*.jsonl.
#
# Same pattern and the same zero-build constraint as dashboard/kanban.sh: python3's
# http.server, bound to 127.0.0.1, no dependencies. Opened directly over file:// the
# report still shows every summary view — only trace detail needs this.
#
# Usage: bash evals/report/serve.sh <run-dir> [port]
set -euo pipefail

RUN_DIR="${1:-}"
PORT="${2:-8099}"

if [ -z "$RUN_DIR" ]; then
  echo "Usage: $0 <run-dir> [port]" >&2
  echo "  e.g. $0 evals/runs/2026-09-13T09-02-run-041" >&2
  exit 1
fi
if [ ! -f "$RUN_DIR/report.html" ]; then
  echo "Error: no report.html in $RUN_DIR" >&2
  echo "  Render one with: node evals/run.mjs --score $RUN_DIR" >&2
  exit 1
fi

URL="http://localhost:$PORT/report.html"
python3 -m http.server "$PORT" --directory "$RUN_DIR" --bind 127.0.0.1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT INT TERM
sleep 0.5

if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1 || true
fi

echo "Anymake eval report for $(basename "$RUN_DIR")"
echo "  URL: $URL"
echo "  PID: $SERVER_PID — Ctrl+C to stop."
wait "$SERVER_PID" 2>/dev/null || true

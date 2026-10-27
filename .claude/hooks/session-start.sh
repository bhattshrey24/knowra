#!/usr/bin/env bash
# SessionStart hook. Surfaces current project status so a fresh session has
# context: outstanding Phase 0 items, the latest ai-log entry, and git state.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "=== Knowra status ==="
if [ -f FEATURES.md ]; then
  echo "-- Outstanding (FEATURES.md) --"
  grep -E '⬜|🟨' FEATURES.md | head -n 12 || true
fi
if [ -f docs/ai-log.md ]; then
  echo "-- Latest ai-log entry --"
  awk '/^## /{c++} c==1{print} c==2{exit}' docs/ai-log.md | head -n 20 || true
fi
echo "-- git --"
git rev-parse --abbrev-ref HEAD 2>/dev/null || true
git status --short 2>/dev/null | head -n 10 || true
exit 0

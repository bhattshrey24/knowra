#!/usr/bin/env bash
# PreCompact hook. Before context is compacted, re-surface the durable state
# (outstanding work + latest decisions) so it survives into the new window.
# This reads from the docs; it does not write to them.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "=== PreCompact snapshot: preserve this ==="
if [ -f docs/ai-log.md ]; then
  echo "-- Latest decisions (docs/ai-log.md) --"
  awk '/^## /{c++} c==1{print} c==2{exit}' docs/ai-log.md || true
fi
if [ -f FEATURES.md ]; then
  echo "-- Outstanding work (FEATURES.md) --"
  grep -E '⬜|🟨' FEATURES.md || true
fi
exit 0

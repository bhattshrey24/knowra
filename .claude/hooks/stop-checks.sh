#!/usr/bin/env bash
# Stop hook. Before a task is treated as complete, run the fast quality gates
# (lint, typecheck, unit tests). Build and e2e are left to CI — too slow here.
# Exit 2 signals "not done" and surfaces the failure back to the agent.
# Set KNOWRA_SKIP_STOP_CHECKS=1 to bypass (e.g. mid-exploration).
set -uo pipefail

[ "${KNOWRA_SKIP_STOP_CHECKS:-0}" = "1" ] && exit 0

# Only gate when there are staged/unstaged source changes to check.
if git -C "$CLAUDE_PROJECT_DIR" diff --quiet --ignore-submodules 2>/dev/null \
   && git -C "$CLAUDE_PROJECT_DIR" diff --cached --quiet --ignore-submodules 2>/dev/null; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

fail=0
pnpm lint >/tmp/knowra-lint.log 2>&1 || fail=1
pnpm typecheck >/tmp/knowra-tsc.log 2>&1 || fail=1
pnpm test >/tmp/knowra-test.log 2>&1 || fail=1

if [ "$fail" -ne 0 ]; then
  echo "Stop checks failed — the task is not complete. Inspect:" >&2
  echo "  lint: /tmp/knowra-lint.log" >&2
  echo "  typecheck: /tmp/knowra-tsc.log" >&2
  echo "  tests: /tmp/knowra-test.log" >&2
  tail -n 15 /tmp/knowra-tsc.log /tmp/knowra-test.log 2>/dev/null >&2 || true
  exit 2
fi
exit 0

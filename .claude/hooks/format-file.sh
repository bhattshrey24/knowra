#!/usr/bin/env bash
# PostToolUse hook for Edit/Write. Formats and lint-fixes only the file that
# changed (targeted, not a full-suite run). Never fails the turn.
set -uo pipefail

file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch{process.stdout.write("")}})')"

# Only touch source files we own; skip generated UI primitives and non-code.
case "$file" in
  *src/components/ui/*) exit 0 ;;
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.css|*.json|*.md)
    [ -f "$file" ] || exit 0
    pnpm exec prettier --write "$file" >/dev/null 2>&1 || true
    case "$file" in
      *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
        pnpm exec eslint --fix "$file" >/dev/null 2>&1 || true
        ;;
    esac
    ;;
esac
exit 0

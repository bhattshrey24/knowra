#!/usr/bin/env bash
# PreToolUse guard for Bash. Reads the hook payload on stdin, inspects the
# proposed command, and blocks (exit 2) clearly dangerous or prohibited ops.
# Conservative by design: it blocks a short list of destructive patterns and
# lets everything else through.
set -euo pipefail

cmd="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.command)||"")}catch{process.stdout.write("")}})')"

block() {
  echo "BLOCKED by guard-bash hook: $1" >&2
  echo "If this is intentional, run it yourself outside the agent." >&2
  exit 2
}

# Catastrophic deletes.
if echo "$cmd" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]*f[a-zA-Z]*[[:space:]]+)?-?r?f?[[:space:]]*(/|~|/\*|\$HOME)([[:space:]]|$)'; then
  block "recursive force-delete of a root/home path"
fi
if echo "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*rf?[a-zA-Z]*[[:space:]]+/($|[[:space:]])'; then
  block "rm -rf /"
fi

# Writing secrets into committed env files.
if echo "$cmd" | grep -Eq '(>|>>)[[:space:]]*\.env($|[^.])'; then
  block "writing to a .env file (use .env.local, never commit secrets)"
fi

# Force-pushing to the default branch.
if echo "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force|-f)([[:space:]]|$)' && echo "$cmd" | grep -Eq '(main|origin)'; then
  block "force-push involving main/origin"
fi

# Destructive database operations.
if echo "$cmd" | grep -Eq 'supabase[[:space:]]+db[[:space:]]+reset'; then
  block "supabase db reset (destructive)"
fi
if echo "$cmd" | grep -Eiq 'drop[[:space:]]+(database|schema[[:space:]]+public)'; then
  block "DROP DATABASE / DROP SCHEMA public"
fi

exit 0

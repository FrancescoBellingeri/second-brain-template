#!/usr/bin/env bash
# What: nightly maintenance of the private brain vault — an OPTIONAL semantic
#   graph refresh, then auto-commit + push. Vault path is an ARGUMENT, never
#   hardcoded, so this is reusable across machines.
#
#   Graph refresh is KEY-OPTIONAL (hybrid design — no provider key required):
#     - If GEMINI_API_KEY or GOOGLE_API_KEY is set → run a headless semantic
#       extract (`graphify extract --backend gemini`) so the note-to-note graph
#       is rebuilt automatically overnight.
#     - If no key is set → skip the refresh. The semantic graph is instead kept
#       current by running the `/graphify` skill on-demand inside a Claude Code
#       session (zero external dependency, Claude itself is the LLM).
#   A failed refresh never blocks the commit.
#
#   Note: graphify-out/ is gitignored (regenerable), so the refresh never adds
#   to the commit — the commit only captures note changes.
#
# Usage: nightly-commit.sh /path/to/vault
# Install: bootstrap.sh copies this to ~/.local/bin/brain-commit and adds a
#   crontab entry (default 21:30) that runs `brain-commit <vault>`.
# How to test:
#   1. No key set → prints "graph refresh: skipped (no provider key ...)",
#      then commits if a note changed, else "nothing to commit".
#   2. GEMINI_API_KEY set → prints "graph refresh: gemini" and rebuilds the graph.
set -euo pipefail

VAULT="${1:?usage: nightly-commit.sh /path/to/vault}"
cd "$VAULT"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { echo "not a git repo: $VAULT" >&2; exit 1; }

# --- optional semantic graph refresh (key-optional hybrid) ---
if [ -n "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}" ] && command -v graphify >/dev/null 2>&1; then
  echo "$(date '+%F %T') graph refresh: gemini"
  graphify extract "$VAULT" --backend gemini >/dev/null 2>&1 \
    || echo "$(date '+%F %T') graph refresh failed (continuing to commit)" >&2
else
  echo "$(date '+%F %T') graph refresh: skipped (no provider key; use /graphify on-demand)"
fi

# --- commit + push ---
git add -A
if git diff --cached --quiet; then
  echo "$(date '+%F %T') nothing to commit in $VAULT"
  exit 0
fi
git commit -m "brain: nightly $(date '+%F %H:%M')" >/dev/null
echo "$(date '+%F %T') committed"
if git push >/dev/null 2>&1; then
  echo "$(date '+%F %T') pushed"
else
  echo "$(date '+%F %T') push failed (commit kept locally)" >&2
fi

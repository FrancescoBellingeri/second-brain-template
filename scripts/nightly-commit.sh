#!/usr/bin/env bash
# What: nightly maintenance of the private brain vault — an OPTIONAL semantic
#   graph refresh, then auto-commit + push. Vault path is an ARGUMENT, never
#   hardcoded, so this is reusable across machines.
#
#   Graph refresh is KEY-OPTIONAL and PROVIDER-AGNOSTIC (hybrid design — no
#   single vendor required):
#     - If any LLM provider credential is set (ANTHROPIC_API_KEY, OPENAI_API_KEY,
#       GEMINI_API_KEY/GOOGLE_API_KEY, DEEPSEEK_API_KEY, MOONSHOT_API_KEY, an
#       OLLAMA_BASE_URL, or AWS creds for Bedrock) → run a headless semantic
#       extract (`graphify extract`, no --backend — graphify auto-detects which
#       one from whatever's in env) so the note-to-note graph is enriched
#       automatically overnight.
#     - If no credential is set → skip the enrichment. The deterministic
#       backbone (kepra-index, below) already keeps the graph usable; the
#       semantic layer can still be added on-demand by running the `/graphify`
#       skill inside a Claude Code session (zero external dependency, Claude
#       itself is the LLM).
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
#   2. Any supported provider key set → prints "graph enrichment: LLM
#      (auto-detected provider)" and enriches the graph.
set -euo pipefail

VAULT="${1:?usage: nightly-commit.sh /path/to/vault}"
cd "$VAULT"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { echo "not a git repo: $VAULT" >&2; exit 1; }

# --- graph refresh ---
# Deterministic backbone (zero token, <1s) — always. Rebuilds note↔entity /
# note↔note edges from projects/naming.md.
if command -v kepra-index >/dev/null 2>&1; then
  kepra-index "$VAULT" >/dev/null 2>&1 \
    || echo "$(date '+%F %T') kepra-index failed (continuing to commit)" >&2
fi
# Optional LLM enrichment — only if some provider credential is set
# (semantically_similar_to edges on top of the backbone; kepra-index preserves
# them on later rebuilds). No --backend: graphify auto-detects which provider
# to use from whatever key is present, so this never hardcodes a single vendor.
LLM_CRED="${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}${ANTHROPIC_API_KEY:-}${OPENAI_API_KEY:-}${DEEPSEEK_API_KEY:-}${MOONSHOT_API_KEY:-}${OLLAMA_BASE_URL:-}${AWS_PROFILE:-}${AWS_REGION:-}${AWS_DEFAULT_REGION:-}"
if [ -n "$LLM_CRED" ] && command -v graphify >/dev/null 2>&1; then
  echo "$(date '+%F %T') graph enrichment: LLM (auto-detected provider)"
  graphify extract "$VAULT" >/dev/null 2>&1 \
    || echo "$(date '+%F %T') enrichment failed (continuing to commit)" >&2
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

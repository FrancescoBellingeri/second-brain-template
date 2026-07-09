#!/usr/bin/env bash
# What: one-shot setup of the second-brain system on a fresh machine. Clones your
#   private vault, installs graphify + the slash commands + helper scripts + the
#   5 agency-agents, injects the passive-capture block into ~/.claude/CLAUDE.md,
#   wires the nightly-commit cron, and points Obsidian at the vault. Idempotent:
#   safe to re-run. No personal values are baked in — everything is a variable.
# Usage:
#   BRAIN_REPO=git@github.com:you/brain.git ./bootstrap.sh
#   (optional) VAULT=~/second-brain/brain  COMMIT_TIME=21:30  ./bootstrap.sh
# How to test: run with VAULT pointing at an existing vault clone (BRAIN_REPO can
#   be omitted then) — every step is idempotent and should complete without error;
#   `crontab -l | grep brain-commit`, `ls ~/.claude/commands`, and
#   `ls ~/.claude/agents` show the installed pieces.
set -euo pipefail

# ---------- config ----------
BRAIN_REPO="${BRAIN_REPO:-}"                 # private vault git URL (needed only for a fresh clone)
VAULT="${VAULT:-$HOME/second-brain/brain}"   # where the vault lives
COMMIT_TIME="${COMMIT_TIME:-21:30}"          # HH:MM for the nightly commit
AGENCY_REPO="https://github.com/msitarzewski/agency-agents.git"
AGENTS=(content-creator linkedin-content-creator twitter-engager reddit-community-builder ai-citation-strategist)
TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say(){ printf '\n\033[1m==> %s\033[0m\n' "$*"; }
have(){ command -v "$1" >/dev/null 2>&1; }

# ---------- 0. preflight ----------
say "Preflight"
have git     || { echo "git is required"; exit 1; }
have python3 || { echo "python3 is required"; exit 1; }
have crontab || echo "WARNING: crontab not found — the nightly commit cron will be skipped"
if ! have graphify; then
  say "Installing graphify (pip package 'graphifyy')"
  python3 -m pip install --user graphifyy \
    || python3 -m pip install --user graphifyy --break-system-packages
fi
mkdir -p "$HOME/.local/bin" "$HOME/.claude/commands" "$HOME/.claude/agents" "$HOME/.cache"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "NOTE: add ~/.local/bin to your PATH";; esac

# ---------- 1. clone / locate the private vault ----------
say "Vault → $VAULT"
if [ -d "$VAULT/.git" ]; then
  echo "already a git repo; leaving working tree as-is"
else
  [ -n "$BRAIN_REPO" ] || { echo "ERROR: set BRAIN_REPO=<private vault git url> (or clone it yourself to $VAULT)"; exit 1; }
  git clone "$BRAIN_REPO" "$VAULT"
fi

# ---------- 2. folders + skeleton (seed only what's missing) ----------
say "Folders + skeleton"
for d in inbox permanent projects clips; do
  mkdir -p "$VAULT/$d"; [ -e "$VAULT/$d/.gitkeep" ] || touch "$VAULT/$d/.gitkeep"
done
seed(){ # seed <template-relpath> <vault-relpath>  (never overwrites your content)
  if [ ! -e "$VAULT/$2" ]; then mkdir -p "$(dirname "$VAULT/$2")"; cp "$TEMPLATE_DIR/$1" "$VAULT/$2"; echo "seeded $2"; fi
}
seed CLAUDE.md                 CLAUDE.md
seed .graphifyignore           .graphifyignore
seed templates/note-inbox.md   templates/note-inbox.md
seed projects/naming.md        projects/naming.md
seed templates/obsidian-app.json .obsidian/app.json

# ---------- 3. slash commands → ~/.claude/commands (substitute {{VAULT}}) ----------
say "Slash commands → ~/.claude/commands/"
for c in capture today review; do
  sed "s|{{VAULT}}|$VAULT|g" "$TEMPLATE_DIR/commands/$c.md" > "$HOME/.claude/commands/$c.md"
  echo "installed /$c"
done

# ---------- 4. helper scripts → ~/.local/bin ----------
say "Helper scripts → ~/.local/bin/"
install -m 0755 "$TEMPLATE_DIR/scripts/nightly-commit.sh"  "$HOME/.local/bin/brain-commit"
install -m 0755 "$TEMPLATE_DIR/scripts/today-candidates.py" "$HOME/.local/bin/today-candidates"
echo "installed brain-commit, today-candidates"

# ---------- 5. global passive-capture block → ~/.claude/CLAUDE.md ----------
say "Passive-capture block → ~/.claude/CLAUDE.md"
GLOBAL="$HOME/.claude/CLAUDE.md"; touch "$GLOBAL"
BLOCK="$(sed "s|{{VAULT}}|$VAULT|g" "$TEMPLATE_DIR/templates/global-capture-block.md" \
        | sed -n '/SECOND_BRAIN_CAPTURE_START/,/SECOND_BRAIN_CAPTURE_END/p')"
python3 - "$GLOBAL" <<'PY'
import sys, re
p = sys.argv[1]; t = open(p).read()
t = re.sub(r'\n?<!-- SECOND_BRAIN_CAPTURE_START -->.*?<!-- SECOND_BRAIN_CAPTURE_END -->\n?', '\n', t, flags=re.S)
open(p, 'w').write(t.rstrip() + '\n')
PY
printf '\n%s\n' "$BLOCK" >> "$GLOBAL"
echo "capture block injected (idempotent)"

# ---------- 6. agency-agents → ~/.claude/agents (the 5 relevant) ----------
say "agency-agents → ~/.claude/agents/"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if git clone --depth 1 "$AGENCY_REPO" "$TMP/aa" >/dev/null 2>&1; then
  for a in "${AGENTS[@]}"; do
    src="$TMP/aa/marketing/marketing-$a.md"
    [ -e "$src" ] && cp "$src" "$HOME/.claude/agents/$a.md" && echo "installed agent: $a"
  done
else
  echo "WARNING: could not clone agency-agents; install the 5 marketing agents manually"
fi

# ---------- 7. nightly commit cron ----------
if have crontab; then
  say "Nightly commit cron @ $COMMIT_TIME"
  HH="${COMMIT_TIME%%:*}"; MM="${COMMIT_TIME##*:}"
  LINE="$MM $HH * * * $HOME/.local/bin/brain-commit $VAULT >> $HOME/.cache/brain-nightly.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'brain-commit' || true ; echo "$LINE" ) | crontab -
  echo "cron set: $LINE"
fi

# ---------- 8. knowledge graph (key-optional) ----------
say "Knowledge graph"
if [ -n "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}" ]; then
  graphify extract "$VAULT" --backend gemini \
    && echo "graph built with gemini" \
    || echo "graph build failed — run '/graphify $VAULT' in a Claude Code session"
else
  echo "No GEMINI_API_KEY set → build the graph key-free (Claude is the LLM):"
  echo "    open a Claude Code session and run:  /graphify $VAULT"
fi

# ---------- 9. Obsidian ----------
say "Obsidian"
python3 - "$VAULT" <<'PY'
import json, os, sys, time, hashlib
vault = sys.argv[1]; obs = os.path.expanduser('~/.config/obsidian/obsidian.json')
os.makedirs(os.path.dirname(obs), exist_ok=True)
d = json.load(open(obs)) if os.path.exists(obs) else {}
v = d.setdefault('vaults', {})
if not any(x.get('path') == vault for x in v.values()):
    v[hashlib.sha1(vault.encode()).hexdigest()[:16]] = {'path': vault, 'ts': int(time.time()*1000), 'open': True}
# prune vault entries that no longer exist on disk
d['vaults'] = {k: x for k, x in v.items() if os.path.isdir(x.get('path', ''))}
json.dump(d, open(obs, 'w'), indent=2)
PY
echo "Obsidian: open the app → 'Open folder as vault' → $VAULT (graphify-out/ is hidden)"

# ---------- done ----------
say "Done"
cat <<EOF

  Vault:     $VAULT
  Commands:  /capture  /today  /review   (+ /graphify)
  Agents:    ${AGENTS[*]}
  Cron:      nightly commit at $COMMIT_TIME  (log: ~/.cache/brain-nightly.log)

  Next:
    1. Restart Claude Code so the new agents and the global capture block load.
    2. Build the graph:  /graphify $VAULT
    3. Capture a discovery, then run  /today  to get content angles.
EOF

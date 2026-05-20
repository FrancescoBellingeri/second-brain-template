#!/usr/bin/env bash
set -e

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_DIR="$HOME/brain"

# 1. Ensure uv is available
echo "[1/6] Checking uv..."
if ! command -v uv &>/dev/null; then
  echo "uv not found — installing..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

# 2. Install graphify
echo "[2/6] Installing graphify..."
uv tool install graphifyy

# 3. Create ~/brain/
echo "[3/6] Creating $BRAIN_DIR..."
mkdir -p "$BRAIN_DIR"

# 4. Copy template structure (no overwrite)
echo "[4/6] Copying template to $BRAIN_DIR..."
rsync -av --ignore-existing "$TEMPLATE_DIR/" "$BRAIN_DIR/" \
  --exclude='.git' \
  --exclude='bootstrap.sh' \
  --exclude='README.md'

# 5. Create ~/.claude/commands/
echo "[5/6] Creating ~/.claude/commands/..."
mkdir -p "$HOME/.claude/commands"

# 6. Copy commands
echo "[6/6] Copying commands to ~/.claude/commands/..."
cp -n "$TEMPLATE_DIR/commands/"* "$HOME/.claude/commands/"

echo ""
echo "Setup complete. Next steps:"
echo ""
echo "  1. Open Obsidian and point the vault to ~/brain/"
echo "  2. Run: cd ~/brain && graphify init"
echo "  3. Run: graphify claude install"
echo "  4. Add git remote: git remote add origin <your-repo>"

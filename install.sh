#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_skill() {
  local skill="$1"

  # Claude Code: install to ~/.claude/skills/
  local claude_dir="$HOME/.claude/skills/$skill"
  mkdir -p "$claude_dir"
  cp "$SCRIPT_DIR/.claude/skills/$skill/SKILL.md" "$claude_dir/SKILL.md"
  echo "  Claude Code -> $claude_dir/SKILL.md"

  # Codex CLI: install to ~/.agents/skills/
  local codex_dir="$HOME/.agents/skills/$skill"
  mkdir -p "$codex_dir/agents"
  cp "$SCRIPT_DIR/.agents/skills/$skill/SKILL.md" "$codex_dir/SKILL.md"
  if [ -f "$SCRIPT_DIR/.agents/skills/$skill/agents/openai.yaml" ]; then
    cp "$SCRIPT_DIR/.agents/skills/$skill/agents/openai.yaml" "$codex_dir/agents/openai.yaml"
  fi
  echo "  Codex CLI   -> $codex_dir/"
}

SKILLS=(
  prototype-hci-pack
  conceptual-model
  journey-map
  vocabulary-audit
  heuristic-eval
  cognitive-walkthrough
  consistency-audit
  state-model
  information-architecture
  failure-path-audit
)

for skill in "${SKILLS[@]}"; do
  echo "Installing $skill..."
  install_skill "$skill"
  echo ""
done

echo "Done. Available skills:"
echo "  /prototype-hci-pack         Full review pack"
echo "  /conceptual-model           Actors, objects, actions, states, rules"
echo "  /journey-map                User flow mapping"
echo "  /vocabulary-audit           UI terminology normalization"
echo "  /heuristic-eval             Nielsen heuristic evaluation"
echo "  /cognitive-walkthrough      First-time user step-through"
echo "  /consistency-audit          Cross-screen consistency"
echo "  /state-model                State machines and lifecycles"
echo "  /information-architecture   Sitemap, navigation, grouping"
echo "  /failure-path-audit         Empty, error, loading, and edge cases"

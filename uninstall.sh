#!/usr/bin/env bash
set -euo pipefail

for skill in prototype-hci-pack conceptual-model journey-map vocabulary-audit heuristic-eval cognitive-walkthrough consistency-audit; do
  rm -rf "$HOME/.claude/skills/$skill"
  echo "Removed Claude Code skill: ~/.claude/skills/$skill"

  rm -rf "$HOME/.agents/skills/$skill"
  echo "Removed Codex CLI skill:   ~/.agents/skills/$skill"
done

echo "Done."

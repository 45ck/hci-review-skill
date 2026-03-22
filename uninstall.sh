#!/usr/bin/env bash
set -euo pipefail

for skill in prototype-hci-pack conceptual-model journey-map vocabulary-audit heuristic-eval cognitive-walkthrough consistency-audit state-model information-architecture failure-path-audit prototype-hci-pack-beads conceptual-model-beads journey-map-beads vocabulary-audit-beads heuristic-eval-beads cognitive-walkthrough-beads consistency-audit-beads state-model-beads information-architecture-beads failure-path-audit-beads; do
  rm -rf "$HOME/.claude/skills/$skill"
  echo "Removed Claude Code skill: $HOME/.claude/skills/$skill"

  rm -rf "$HOME/.agents/skills/$skill"
  echo "Removed Codex CLI skill:   $HOME/.agents/skills/$skill"
done

echo "Done."

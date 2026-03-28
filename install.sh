#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_skill() {
  local skill="$1"

  # Claude Code: install to ~/.claude/skills/
  local claude_dir="$HOME/.claude/skills/$skill"
  if [ ! -f "$SCRIPT_DIR/.claude/skills/$skill/SKILL.md" ]; then
    echo "ERROR: Missing source file: $SCRIPT_DIR/.claude/skills/$skill/SKILL.md" >&2
    exit 1
  fi
  mkdir -p "$claude_dir"
  cp "$SCRIPT_DIR/.claude/skills/$skill/SKILL.md" "$claude_dir/SKILL.md"
  echo "  Claude Code -> $claude_dir/SKILL.md"

  # Codex CLI: install to ~/.agents/skills/
  local codex_dir="$HOME/.agents/skills/$skill"
  if [ ! -f "$SCRIPT_DIR/.agents/skills/$skill/SKILL.md" ]; then
    echo "ERROR: Missing source file: $SCRIPT_DIR/.agents/skills/$skill/SKILL.md" >&2
    exit 1
  fi
  mkdir -p "$codex_dir"
  cp "$SCRIPT_DIR/.agents/skills/$skill/SKILL.md" "$codex_dir/SKILL.md"
  if [ -f "$SCRIPT_DIR/.agents/skills/$skill/agents/openai.yaml" ]; then
    mkdir -p "$codex_dir/agents"
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
  accessibility-precheck
  cognitive-friction-detector
  error-and-time-metrics-analyzer
  field-study-planner
  high-fidelity-prototype-planner
  interaction-type-selector
  low-fidelity-prototype-planner
  mental-model-checker
  persona-synthesizer
  representative-task-writer
  satisfaction-questionnaire-writer
  task-analysis-writer
  usability-test-planner
  wireframe-critic
  prototype-hci-pack-beads
  conceptual-model-beads
  journey-map-beads
  vocabulary-audit-beads
  heuristic-eval-beads
  cognitive-walkthrough-beads
  consistency-audit-beads
  state-model-beads
  information-architecture-beads
  failure-path-audit-beads
)

for skill in "${SKILLS[@]}"; do
  echo "Installing $skill..."
  install_skill "$skill"
  echo ""
done

echo "Done. Available skills:"
echo ""
echo "  Core skills:"
echo "  /prototype-hci-pack               Full review pack"
echo "  /conceptual-model                 Actors, objects, actions, states, rules"
echo "  /journey-map                      User flow mapping"
echo "  /vocabulary-audit                 UI terminology normalization"
echo "  /heuristic-eval                   Nielsen heuristic evaluation"
echo "  /cognitive-walkthrough            First-time user step-through"
echo "  /consistency-audit                Cross-screen consistency"
echo "  /state-model                      State machines and lifecycles"
echo "  /information-architecture         Sitemap, navigation, grouping"
echo "  /failure-path-audit               Empty, error, loading, and edge cases"
echo "  /persona-synthesizer              Persona synthesis from evidence"
echo "  /task-analysis-writer             Hierarchical task analysis"
echo "  /mental-model-checker             Mental model and mismatch analysis"
echo "  /accessibility-precheck           Accessibility risk precheck"
echo "  /low-fidelity-prototype-planner   Low-fidelity prototype planning"
echo "  /high-fidelity-prototype-planner  High-fidelity prototype planning"
echo "  /wireframe-critic                 Wireframe critique"
echo "  /usability-test-planner           Usability test plan"
echo "  /field-study-planner              Field study planning"
echo "  /representative-task-writer       Representative task design"
echo "  /satisfaction-questionnaire-writer Satisfaction questionnaire drafting"
echo "  /cognitive-friction-detector      Cognitive friction analysis"
echo "  /error-and-time-metrics-analyzer  Error/time metrics analysis"
echo "  /interaction-type-selector        Interaction type selection"
echo ""
echo "  Beads variants (core + trackable issues):"
echo "  /prototype-hci-pack-beads         Full review pack + Beads issues"
echo "  /conceptual-model-beads           Conceptual model + Beads issues"
echo "  /journey-map-beads                Journey map + Beads issues"
echo "  /vocabulary-audit-beads           Vocabulary audit + Beads issues"
echo "  /heuristic-eval-beads             Heuristic eval + Beads issues"
echo "  /cognitive-walkthrough-beads      Cognitive walkthrough + Beads issues"
echo "  /consistency-audit-beads          Consistency audit + Beads issues"
echo "  /state-model-beads                State model + Beads issues"
echo "  /information-architecture-beads   IA review + Beads issues"
echo "  /failure-path-audit-beads         Failure path audit + Beads issues"

#!/usr/bin/env bash
set -euo pipefail

HCI_PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HCI_PACK_DIR/scripts/skill_inventory.sh"

# Remove only named members of this pack, preserving unrelated installed skills.
for skill in "${SKILLS[@]}"; do
  for platform in .claude .agents; do
    rm -rf -- "$HCI_SKILLS_ROOT/$platform/skills/$skill"
  done
  printf 'Removed /%s for Claude Code and Codex.\n' "$skill"
done

printf '\nRemoved %s skills per platform under %s.\n' "${#SKILLS[@]}" "$HCI_SKILLS_ROOT"

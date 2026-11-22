#!/usr/bin/env bash
set -euo pipefail

HCI_PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HCI_PACK_DIR/scripts/skill_inventory.sh"

# Validate the full inventory before writing anything to the target.
for platform in .claude .agents; do
  for skill in "${SKILLS[@]}"; do
    if [[ ! -f "$HCI_PACK_DIR/$platform/skills/$skill/SKILL.md" ]]; then
      echo "ERROR: Missing source file: $platform/skills/$skill/SKILL.md" >&2
      exit 1
    fi
  done
done

for skill in "${SKILLS[@]}"; do
  for platform in .claude .agents; do
    source_dir="$HCI_PACK_DIR/$platform/skills/$skill"
    target_dir="$HCI_SKILLS_ROOT/$platform/skills/$skill"
    mkdir -p "$target_dir"
    # Include each platform's own descriptor and any bundled supporting files.
    cp -R "$source_dir/." "$target_dir/"
  done
  printf 'Installed /%s for Claude Code and Codex.\n' "$skill"
done

printf '\nInstalled %s skills per platform under %s.\n' "${#SKILLS[@]}" "$HCI_SKILLS_ROOT"

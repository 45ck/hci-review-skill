#!/usr/bin/env bash
# Shared by install.sh and uninstall.sh; these set HCI_PACK_DIR first.

HCI_SKILLS_ROOT="${HCI_SKILLS_HOME-$HOME}"
if [[ "$HCI_SKILLS_ROOT" != /* || "$HCI_SKILLS_ROOT" == / ]]; then
  echo "ERROR: HCI_SKILLS_HOME must be an absolute directory other than /." >&2
  exit 1
fi

SKILLS=()
while IFS= read -r skill || [[ -n "$skill" ]]; do
  [[ -z "$skill" || "$skill" == \#* ]] && continue
  if [[ ! "$skill" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "ERROR: Invalid skill name in skills.txt: $skill" >&2
    exit 1
  fi
  # Older macOS Bash treats expansion of an empty array as unset under -u.
  if [[ "${#SKILLS[@]}" -gt 0 ]]; then
    for known_skill in "${SKILLS[@]}"; do
      if [[ "$known_skill" == "$skill" ]]; then
        echo "ERROR: Duplicate skill in skills.txt: $skill" >&2
        exit 1
      fi
    done
  fi
  SKILLS+=("$skill")
done < "$HCI_PACK_DIR/skills.txt"

if [[ "${#SKILLS[@]}" -eq 0 ]]; then
  echo "ERROR: skills.txt must list at least one skill." >&2
  exit 1
fi

---
name: vocabulary-audit-beads
description: Audit UI terminology and create Beads issues from the findings. Converts terminology drift, overloaded terms, and vague labels into trackable Beads tasks with priorities and dependencies.
---

Run a **Vocabulary Audit** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `vocabulary-audit`. Run the full audit first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Vocabulary Audit

Audit and normalize interface language for this scope:

$ARGUMENTS

Use ultrathink. Use the current prototype, components, routes, docs, and visible copy. Extract all important terms that affect understanding.

### Output
Write `docs/hci/glossary.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required sections
1. Canonical glossary
2. Terms to merge or ban
3. Status vocabulary
4. Action vocabulary
5. Naming problems and recommendations

### Tables to include
#### Canonical terms
| Term | Type (noun/verb/status) | Exact meaning | Where used | Notes |

#### Terms to avoid
| Avoid this term | Use instead | Reason |

#### Status model
| Status | Meaning | Entered when | Exited when |

### What to look for
- same concept with multiple names
- vague verbs like "handle", "manage", "process"
- inconsistent status labels
- labels that require domain knowledge the user may not have
- UI copy that does not match the underlying conceptual model

### Synthesis
End with:
- the five most damaging terminology inconsistencies
- concepts that are overloaded or ambiguous across the system
- priority terms to standardize before next implementation cycle

### Quality bar
Prefer language that is:
- concrete
- consistent
- distinguishable from nearby concepts
- aligned with the user's mental model

### Deliverable style
- Clear headings
- Markdown tables
- Mermaid diagrams where useful
- Direct language
- No filler

---

## Phase 2: Beads Integration

### Step 1 -- Detect Beads

Check if the `bd` CLI is available:

```bash
command -v bd
```

**If `bd` is not found:** Stop here. Output the Vocabulary Audit only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /vocabulary-audit-beads
```

**If `bd` is found:** Continue to Step 2.

### Step 2 -- Initialize Beads (if needed)

Check if the repo is already initialized:

```bash
bd ready --json
```

If that fails (no `.beads/` directory, not initialized):

```bash
bd init --stealth
```

Use `--stealth` so Beads metadata is not committed to the main repo.

### Step 3 -- Create parent issue

Create one parent issue to group all findings from this audit:

```bash
bd create "Vocabulary Audit: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding (terminology drift, overloaded terms, vague labels):

**MAJOR findings** -- always create:

Same concept with multiple names causing confusion, and vague critical labels:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Minor label inconsistencies and jargon that could be simplified:

```bash
bd create "[MINOR] <finding-title>" -p 2 --json
```

For each created issue, update with structured fields (do NOT use `bd edit`):

```bash
bd update <child-id> --description "<what/why + evidence>" --notes "<location and context>" --acceptance "<fix recommendation or verification>"
```

Then link child to parent:

```bash
bd dep add <child-id> <parent-id>
```

### Step 5 -- Show next actions

```bash
bd ready --json
```

---

## Output

Return a combined report with two sections:

### Section A: Vocabulary Audit

1. Canonical glossary
2. Terms to merge or ban
3. Status vocabulary
4. Action vocabulary
5. Naming problems and recommendations
6. Synthesis

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

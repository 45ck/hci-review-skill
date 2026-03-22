---
name: consistency-audit-beads
description: Audit cross-screen consistency and create Beads issues from the findings. Converts consistency breaks and invariant violations into trackable Beads tasks with priorities and dependencies.
argument-hint: "[scope] [--include-minor]"
disable-model-invocation: true
---

Run a **Consistency Audit** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `consistency-audit`. Run the full audit first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Consistency Audit

Audit consistency for this scope:

$ARGUMENTS

Use ultrathink. Review the interface as a system, not as isolated screens.

### Output
Write `docs/hci/consistency-audit.md` unless the user asked for another path.
Create the directory if it does not exist.

### Check these invariants
- navigation location and behavior
- page title structure
- screen layout rhythm
- primary / secondary / destructive action treatment
- form field ordering and validation style
- status badge style and meaning
- empty/loading/error/success states
- search/filter/sort behavior
- modal / drawer / popover / toast usage
- back / cancel / close semantics
- icon meaning
- terminology

### Required output tables
#### Invariants
| Area | Expected invariant | Observed variants | Risk | Recommendation |

#### Screen inventory
| Screen/route/component | Primary purpose | Main action | State coverage | Notes |

### Required synthesis
Conclude with:
- top consistency breaks
- invariants that should be written into the design system
- issues likely to confuse users because similar things behave differently

### Quality bar
Do not confuse deliberate variation with accidental inconsistency. Explain the difference.

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

**If `bd` is not found:** Stop here. Output the Consistency Audit only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /consistency-audit-beads
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
bd create "Consistency Audit: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each consistency break found across screens:

**MAJOR findings** -- always create:

Invariant violations that confuse users (different behavior for similar things):

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Cosmetic inconsistencies and minor style variations:

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

### Section A: Consistency Audit

1. Invariants table
2. Screen inventory table
3. Synthesis (top consistency breaks, design system invariants, user confusion risks)

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

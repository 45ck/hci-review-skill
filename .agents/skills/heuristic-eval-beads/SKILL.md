---
name: heuristic-eval-beads
description: Run a heuristic evaluation and create Beads issues from the findings. Converts Nielsen heuristic violations into trackable Beads tasks with priorities and dependencies.
---

Run a **Heuristic Evaluation** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `heuristic-eval`. Run the full evaluation first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Heuristic Evaluation

Run a heuristic evaluation for this scope:

$ARGUMENTS

Use ultrathink. Use the actual prototype, repo, screenshots, routes, components, and docs. Do not give generic advice. Anchor every issue to a real part of the system where possible.

### Output
Write `docs/hci/heuristic-evaluation.md` unless the user asked for another path.
Create the directory if it does not exist.

### Heuristics to apply
1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

### Required output table
| ID | Heuristic | Screen/flow/component | Evidence | Why it matters | Severity (0-4) | Recommendation |

### Severity rubric
- 0 = not a problem
- 1 = cosmetic / low priority
- 2 = minor usability issue
- 3 = major usability issue
- 4 = severe / likely to block or mislead users

### Required synthesis
End with:
- top 5 highest-severity problems
- quickest wins
- structural issues that need redesign rather than visual tweaks

Note: if a consistency-audit artifact exists for this scope, reference it for heuristic #4 rather than re-auditing consistency in full. Apply heuristic #4 only to findings not already covered.

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

**If `bd` is not found:** Stop here. Output the Heuristic Evaluation only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /heuristic-eval-beads
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

Create one parent issue to group all findings from this evaluation:

```bash
bd create "Heuristic Evaluation: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each Nielsen heuristic violation found with severity 0-4:

**MAJOR findings** -- always create:

Severity 3-4 heuristic violations:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Severity 1-2 heuristic violations:

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

### Section A: Heuristic Evaluation

1. Issues table (ID, heuristic, location, evidence, severity, recommendation)
2. Top 5 highest-severity problems
3. Quickest wins
4. Structural issues needing redesign

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

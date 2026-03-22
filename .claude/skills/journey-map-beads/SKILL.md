---
name: journey-map-beads
description: Map user journeys and create Beads issues from the findings. Converts dead ends, missing recovery paths, and confusion points into trackable Beads tasks with priorities and dependencies.
argument-hint: "[scope] [--include-minor]"
disable-model-invocation: true
---

Run a **Journey Map Review** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `journey-map`. Run the full review first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Journey Map Review

Map the key user journeys for this scope:

$ARGUMENTS

Use ultrathink. Work from the current prototype, routes, components, docs, screenshots, and any existing flows. Infer missing pieces conservatively.

### Output
Write `docs/hci/user-journeys.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required process
1. Identify the 3 to 7 most important journeys.
2. Prioritize first-time use, core task completion, edit/undo, failure recovery, and returning user behavior.
3. For each journey, document:
   - goal
   - trigger / entry point
   - steps
   - decision points
   - alternate branches
   - errors and recovery
   - exit state
   - likely confusion points
4. Add Mermaid flowcharts for the most important journeys.
5. Summarize cross-journey friction themes.

### Output structure
For each journey use:
- Journey name
- User goal
- Preconditions
- Main flow
- Alternative flow(s)
- Error path(s)
- Exit state
- Confusion risks
- Design recommendation(s)

### Synthesis
End with:
- journeys most likely to fail for first-time users
- shared friction points across multiple journeys
- dead ends and missing recovery paths
- design changes with the highest impact on task completion

### Quality bar
- Keep the flow specific to the actual prototype.
- Focus on what the user must perceive and decide, not just backend events.
- Flag hidden dependencies, missing feedback, dead ends, and branch explosions.

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

**If `bd` is not found:** Stop here. Output the Journey Map only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /journey-map-beads
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

Create one parent issue to group all findings from this review:

```bash
bd create "Journey Map Review: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding (dead ends, missing recovery, branch explosions, confusion points):

**MAJOR findings** -- always create:

Dead ends, missing error recovery, and journey failures:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Friction points and weak feedback at decision points:

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

### Section A: Journey Map

1. Journey inventory (3-7 journeys)
2. Per-journey documentation (goal, steps, decision points, errors, confusion risks)
3. Mermaid flowcharts
4. Cross-journey friction themes
5. Synthesis and recommendations

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

---
name: cognitive-walkthrough-beads
description: Run a cognitive walkthrough and create Beads issues from the findings. Converts walkthrough breakdowns (Q1-Q4 failures) into trackable Beads tasks with priorities and dependencies.
---

Run a **Cognitive Walkthrough** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `cognitive-walkthrough`. Run the full walkthrough first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Cognitive Walkthrough

Run a cognitive walkthrough for this task or flow:

$ARGUMENTS

Use ultrathink. Act like a plausible first-time user with only the cues available in the interface. Use the actual prototype and codebase context.

### Output
Write `docs/hci/cognitive-walkthrough.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required questions at every step
1. Will the user form the right goal here?
2. Will the user notice the correct action?
3. Will the user understand that the action leads toward the goal?
4. After acting, will the feedback make sense?

### Required format
For each step include:
- step number
- user goal
- visible cues
- likely action
- walkthrough answers for Q1 to Q4
- breakdowns / confusion risks
- recommendation

### Extra checks
Also flag:
- hidden prerequisites
- unclear affordances
- weak or missing feedback
- misleading labels
- dead ends
- unclear recovery path

### Synthesis
End with:
- steps most likely to fail
- reasons first-time users may hesitate
- design changes most likely to improve task completion

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

**If `bd` is not found:** Stop here. Output the Cognitive Walkthrough only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /cognitive-walkthrough-beads
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

Create one parent issue to group all findings from this walkthrough:

```bash
bd create "Cognitive Walkthrough: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each walkthrough breakdown (Q1-Q4 failures):

**MAJOR findings** -- always create:

Steps where users cannot form goal or notice action (Q1/Q2 failures):

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Weak feedback or unclear interpretation (Q3/Q4 issues):

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

### Section A: Cognitive Walkthrough

1. Per-step walkthrough (goal, cues, action, Q1-Q4 answers, breakdowns, recommendations)
2. Extra checks (hidden prerequisites, unclear affordances, weak feedback, dead ends)
3. Synthesis (steps most likely to fail, first-time user hesitation points, design changes)

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

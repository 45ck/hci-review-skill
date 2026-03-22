---
name: conceptual-model-beads
description: Build a conceptual model and create Beads issues from the findings. Converts ambiguities, overloaded concepts, and unclear states into trackable Beads tasks with priorities and dependencies.
---

Run a **Conceptual Model Review** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `conceptual-model`. Run the full review first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Conceptual Model Review

Create a conceptual model for this scope:

$ARGUMENTS

Use ultrathink. Work from the repo, prototype, docs, screenshots, routes, components, and visible states. If details are missing, infer cautiously and mark assumptions.

### Output
Write `docs/hci/conceptual-model.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required sections
1. Purpose of the system or feature
2. Primary actors
3. Primary objects/entities
4. Actions available on each object
5. States and transitions
6. Rules, constraints, permissions, and guardrails
7. Ambiguities or overloaded concepts
8. Recommendations to simplify the model

### Tables to include
#### Actors
| Actor | Goal | Main tasks | Notes |

#### Objects
| Object | Definition | Key attributes | Related objects |

#### Actions
| Action | Target object | Preconditions | Result |

#### States
| Object | State | Meaning | Entered by | Exited by |

Note: keep this state table high-level (name and one-line meaning only). Full lifecycle definition belongs in the state-model artifact. If a state-model artifact already exists, reference it rather than repeating it.

### Diagrams
Add Mermaid diagrams:
- state diagrams for major objects
- entity relationship diagrams for object relationships

### Evaluation lens
A strong conceptual model should make these obvious:
- what exists in the system
- what users can do
- what state something is in
- what will happen next

Flag anything that breaks these expectations.

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

**If `bd` is not found:** Stop here. Output the Conceptual Model only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /conceptual-model-beads
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
bd create "Conceptual Model Review: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding (ambiguities, overloaded concepts, unclear states, missing rules):

**MAJOR findings** -- always create:

Fundamental model ambiguities that cause user confusion:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Simplification recommendations and minor naming issues:

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

### Section A: Conceptual Model

1. Purpose of the system or feature
2. Primary actors
3. Primary objects/entities
4. Actions available on each object
5. States and transitions
6. Rules, constraints, permissions, and guardrails
7. Ambiguities or overloaded concepts
8. Recommendations to simplify the model

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

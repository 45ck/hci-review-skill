---
name: state-model-beads
description: Define state machines and lifecycles, then create Beads issues from the findings. Converts ambiguous states, silent transitions, and undefined exits into trackable Beads tasks with priorities and dependencies.
---

Run a **State Model Review** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `state-model`. Run the full review first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the State Model Review

Define the state machines and lifecycles for this scope:

$ARGUMENTS

Use ultrathink. Work from the repo, routes, components, database schemas, API endpoints, and visible UI states. If details are missing, infer conservatively and mark assumptions.

### Output
Write `docs/hci/state-model.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required process

#### 1) Identify stateful entities
Find every object in the system that has a lifecycle -- anything that changes state over time. Common examples: requests, tasks, users, sessions, approvals, documents, payments, invitations.

#### 2) For each entity, define:

##### States
| State | Meaning | User-visible cue | Entry condition | Exit condition |

##### Allowed transitions
| From | To | Trigger | Who can trigger | Side effects |

##### Invalid transitions
| From | To | Why invalid | What happens if attempted |

##### Ambiguous or undefined states
Flag any state that is:
- implied but never named
- named differently in different places
- missing a user-visible cue
- reachable but with no defined exit

#### 3) Diagrams
Create Mermaid state diagrams for each entity. Include:
- all states as nodes
- transitions as labeled edges
- guard conditions where applicable
- terminal states clearly marked

#### 4) Cross-entity dependencies
Identify where one entity's state depends on another's. Document:
- which entities are coupled
- what happens when a parent entity changes state
- cascading transitions
- orphaned states (child entity stuck when parent moves)

#### 5) UI state coverage
For each state, check:
- Is there a distinct visual treatment?
- Can the user tell what state they are in?
- Can the user tell what actions are available in this state?
- Is the transition feedback clear?

Create a coverage table:
| Entity | State | Has visual cue | Has available actions | Has transition feedback | Gap |

### Synthesis
End with:
- entities with the most ambiguous state models
- states that users cannot distinguish visually
- transitions that happen silently without feedback
- invalid transitions that the UI does not prevent
- recommendations for simplifying overly complex lifecycles

### Quality bar
- Be specific. Reference actual database fields, API statuses, component props, or CSS classes where possible.
- Distinguish between backend state and user-perceived state. Both matter.
- A well-defined state model should make it impossible to ask "what state is this in?" while looking at the screen.

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

**If `bd` is not found:** Stop here. Output the State Model only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /state-model-beads
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
bd create "State Model Review: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding (ambiguous states, silent transitions, undefined exits, missing visual cues):

**MAJOR findings** -- always create:

Undefined states, silent transitions, and dead-end states:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Missing transition feedback and weak visual cues:

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

### Section A: State Model

1. Stateful entities identified
2. States, transitions, and invalid transitions per entity
3. Mermaid state diagrams
4. Cross-entity dependencies
5. UI state coverage table
6. Synthesis and recommendations

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

---
name: failure-path-audit-beads
description: Audit failure paths and create Beads issues from the findings. Converts unhandled failure states, missing empty states, and broken recovery paths into trackable Beads tasks with priorities and dependencies.
argument-hint: "[scope] [--include-minor]"
disable-model-invocation: true
---

Run a **Failure Path Audit** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `failure-path-audit`. Run the full audit first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Failure Path Audit

Audit failure paths and edge cases for this scope:

$ARGUMENTS

Use ultrathink. Happy paths make prototypes look coherent. Failure paths reveal whether they actually are. Review the actual codebase, components, error handling, and UI states.

### Output
Write `docs/hci/failure-path-audit.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required categories

#### 1) Empty states
For every screen or list that can be empty:
| Screen/component | What is empty | Current empty state treatment | Has illustration/guidance? | Has call to action? | Rating |

Rating: OK = empty state is handled well; PARTIAL = present but incomplete; MISSING = no empty state handling.

Check:
- Does the empty state explain why it is empty?
- Does it tell the user what to do next?
- Does it look intentional or broken?

#### 2) Loading states
For every async operation:
| Operation | Current loading indicator | Location | Blocks interaction? | Has timeout handling? |

Check:
- Is there a loading indicator at all?
- Does it appear immediately or after a delay?
- Can the user still interact with other parts of the page?
- What happens if loading takes more than 5 seconds? 30 seconds?
- Is there a way to cancel?

#### 3) Validation errors
For every form or input:
| Form/input | Validation rules | When validation runs | Error message | Error placement | Recovery path |

Check:
- Are errors shown inline or as a summary?
- Do errors appear on submit or on blur?
- Are error messages specific ("Email must include @") or vague ("Invalid input")?
- Does the form preserve entered data on error?
- Are required fields marked before the user submits?

#### 4) Permission and authorization failures
For every protected action or screen:
| Action/screen | Required permission | What happens without permission | User feedback |

Check:
- Are unauthorized actions hidden, disabled, or shown with an error?
- Does the error explain what permission is needed?
- Does it explain how to get that permission?
- Can users accidentally navigate to pages they cannot use?

#### 5) Network and connectivity failures
| Operation | Behavior on network failure | Retry available? | Data preserved? | Offline fallback? |

Check:
- What happens if the API returns 500?
- What happens if the request times out?
- Is there a global error boundary or does each component handle its own?
- Are partial saves possible?

#### 6) Partial completion
| Flow | Can be partially completed? | What happens if abandoned? | Can be resumed? | Is progress saved? |

Check:
- Multi-step forms: what happens if the user closes mid-flow?
- Drafts: are they auto-saved?
- Bulk operations: what happens if some items succeed and some fail?

#### 7) Undo, cancel, and recovery
| Action | Reversible? | Undo mechanism | Confirmation required? | Time limit on undo? |

Check:
- Destructive actions: is there a confirmation dialog?
- Delete: is it soft delete or permanent?
- Cancel during a flow: does it save progress or discard everything?
- Back button: does it work as expected at every step?

#### 8) Concurrent and conflict states
| Scenario | Current handling | User feedback |

Check:
- What happens if two users edit the same thing?
- What happens if the data changes while the user is viewing it?
- Are there stale state problems?

### Summary table

| Category | Items audited | Handled well | Partially handled | Not handled | Critical gaps |
|---|---|---|---|---|---|

### Synthesis
End with:
- top 5 most likely failure scenarios users will encounter
- top 5 missing or broken failure states
- patterns: which failure category is systematically ignored?
- quickest wins: failure states that are easy to fix
- structural issues: failure handling that requires architectural changes

### Quality bar
- Reference actual components, error boundaries, API error handling, and UI states.
- Every happy path implies at least 3-5 failure paths. If you find fewer, look harder.
- A good failure path audit should make the developer uncomfortable. That is the point.

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

**If `bd` is not found:** Stop here. Output the Failure Path Audit only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /failure-path-audit-beads
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
bd create "Failure Path Audit: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each unhandled failure state found:

**MAJOR findings** -- always create:

Missing empty states, no error handling, and no recovery path:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Partial handling and missing timeout fallbacks:

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

### Section A: Failure Path Audit

1. Empty states
2. Loading states
3. Validation errors
4. Permission and authorization failures
5. Network and connectivity failures
6. Partial completion
7. Undo, cancel, and recovery
8. Concurrent and conflict states
9. Summary table
10. Synthesis and recommendations

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

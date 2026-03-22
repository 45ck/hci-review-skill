---
name: prototype-hci-pack-beads
description: Run a full HCI review pack and create Beads issues from the findings. Converts scorecard weaknesses and confusion risks into trackable Beads tasks with priorities and dependencies.
argument-hint: "[scope] [--include-minor]"
disable-model-invocation: true
---

Run a **Full HCI Review Pack** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `prototype-hci-pack`. Run the full review pack first, produce the complete artifacts, then pipe findings into Beads.

---

## Phase 1: Run the Full HCI Review Pack

Build a full solo-review pack for this prototype or interface area:

$ARGUMENTS

Use ultrathink. Work from the current repository, current files, current screenshots, current docs, and current prototype state. Do not wait for user research unless absolutely blocked. If something is unknown, make the smallest reasonable assumption and label it clearly.

### Goals
- Reduce confusion before user testing.
- Ensure conceptual coherence across screens, flows, actions, and language.
- Surface the highest-risk UX/HCI problems early.
- Leave durable artifacts that can guide implementation.

### Produce these outputs
Write them to `docs/hci/` unless the user asked for another path.

1. `docs/hci/conceptual-model.md`
2. `docs/hci/state-model.md`
3. `docs/hci/user-journeys.md`
4. `docs/hci/glossary.md`
5. `docs/hci/information-architecture.md`
6. `docs/hci/consistency-audit.md`
7. `docs/hci/failure-path-audit.md`
8. `docs/hci/heuristic-evaluation.md`
9. `docs/hci/cognitive-walkthrough.md`
10. `docs/hci/hci-scorecard.md`
11. `docs/hci/hci-summary.md`

Create the directory if it does not exist.

### Required process

#### 1) Understand the system
Extract and document:
- primary user types or actors
- primary objects/entities in the interface
- major actions users can take
- states for each important object
- system rules, permissions, and transitions

Use the `conceptual-model` skill logic:
- define users, objects, actions, states, rules
- create a compact state model in markdown or Mermaid if useful
- identify unclear or overloaded concepts

#### 2) Define state models
For every stateful entity in the system:
- list all states with meaning and user-visible cue
- list allowed transitions with trigger, actor, and side effects
- list invalid transitions with explanation
- create Mermaid state diagrams
- check UI state coverage: does every state have a distinct visual treatment?
- flag ambiguous states, silent transitions, and undefined exits

#### 3) Map the main journeys
Identify the 3 to 7 most important journeys for the scope.
For each journey document:
- user goal
- entry point
- steps
- decision points
- error paths
- exit state
- likely confusion points

Include Mermaid flowcharts where useful.
Prioritize:
- first-time user path
- core happy path
- edit/undo path
- failure/recovery path
- returning user path

#### 4) Normalize language
Create a glossary of canonical nouns, verbs, statuses, and labels.
For each term include:
- canonical term
- exact meaning
- where it appears
- terms to avoid or merge

Flag any concept drift such as one thing being called different names in different places.

#### 5) Define information architecture
- Create a hierarchical sitemap of all screens/pages/views
- Document the navigation model: global, secondary, tertiary, escape hatches
- Analyze grouping logic and label clarity
- Check action placement: is each action near the objects it acts on?
- Measure depth and breadth: flag paths that are too deep or orphaned screens

#### 6) Audit consistency
Review consistency across screens and flows:
- navigation placement
- page titles
- primary vs secondary actions
- destructive actions
- status presentation
- empty/loading/error/success states
- form layout and validation
- icon meaning
- modal, drawer, popover, and toast usage
- back/cancel/close behavior

Create a table with:
- item
- expected invariant
- observed variants
- risk
- recommendation

#### 7) Audit failure paths
Review every non-happy-path state:
- empty states: does each empty screen explain why and offer a next step?
- loading states: is there always a loading indicator? timeout handling?
- validation errors: inline or summary? specific or vague? data preserved?
- permission failures: hidden, disabled, or error? explains how to fix?
- network failures: retry available? data preserved?
- partial completion: auto-saved? resumable?
- undo/cancel/recovery: confirmation dialogs? soft delete?

Create a summary table: category, items audited, handled, partial, not handled, critical gaps.

#### 8) Run heuristic evaluation
Apply Nielsen-style heuristics rigorously:
- visibility of system status
- match between system and real world
- user control and freedom
- consistency and standards
- error prevention
- recognition rather than recall
- flexibility and efficiency of use
- aesthetic and minimalist design
- error recovery
- help/documentation

Output a severity-ranked issues table:
- ID
- heuristic violated
- where
- evidence
- why it matters
- severity (0 to 4)
- recommended fix

#### 9) Run a cognitive walkthrough
For each critical journey, step through the interface and answer:
1. Will the user form the right goal here?
2. Will the user notice the correct action?
3. Will the user understand that the action leads toward the goal?
4. After acting, will the feedback make sense?

Log breakdowns with exact step references.

#### 10) Score
Create `hci-scorecard.md` rating the prototype 1-5 on each dimension:
1. Clarity of purpose
2. Navigation clarity
3. Terminology consistency
4. State visibility
5. Error prevention and recovery
6. Recognition over recall
7. Cross-screen consistency
8. Failure path coverage

Include total score out of 40, top 3 strengths, top 3 weaknesses, and priority fixes.

#### 11) Synthesize
Create `hci-summary.md` with:
- one-paragraph context recap
- top 5 confusion risks
- top 5 design invariants to enforce
- top 5 implementation priorities
- open assumptions and unknowns

### Quality bar
- Be concrete, not generic.
- Refer to actual files, screens, components, routes, or flows where possible.
- Prefer recognition over recall.
- Prefer stable conceptual models over screen-by-screen patching.
- Distinguish structural issues from visual polish issues.
- If the prototype is incomplete, still evaluate the structure that exists.

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

**If `bd` is not found:** Stop here. Output the HCI Review Pack only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /prototype-hci-pack-beads
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
bd create "HCI Review Pack: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding from the scorecard weaknesses and hci-summary top confusion risks:

**MAJOR findings** -- always create:

Scorecard dimensions rated 1-2 and top confusion risks from the summary:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Scorecard dimensions rated 3 and minor consistency issues:

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

### Section A: HCI Review Pack

1. Conceptual Model
2. State Model
3. User Journeys
4. Glossary
5. Information Architecture
6. Consistency Audit
7. Failure Path Audit
8. Heuristic Evaluation
9. Cognitive Walkthrough
10. HCI Scorecard
11. HCI Summary

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

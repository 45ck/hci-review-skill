---
name: information-architecture-beads
description: Review information architecture and create Beads issues from the findings. Converts orphan screens, mislabeled navigation, and grouping problems into trackable Beads tasks with priorities and dependencies.
---

Run an **Information Architecture Review** on the current prototype, then create **Beads issues** from the findings so they become trackable tasks.

This is an add-on to `information-architecture`. Run the full review first, produce the complete artifact, then pipe findings into Beads.

---

## Phase 1: Run the Information Architecture Review

Define the information architecture for this scope:

$ARGUMENTS

Use ultrathink. Work from the repo, routes, navigation components, page layouts, menus, and any existing sitemap or docs. Infer missing structure conservatively and mark assumptions.

### Output
Write `docs/hci/information-architecture.md` unless the user asked for another path.
Create the directory if it does not exist.

### Required sections

#### 1) Sitemap
Create a hierarchical map of all screens, pages, or views in the system.

Format as an indented list or Mermaid diagram:
```
Home
├── Dashboard
├── Projects
│   ├── Project List
│   ├── Project Detail
│   │   ├── Settings
│   │   ├── Members
│   │   └── Activity
│   └── Create Project
├── Settings
│   ├── Profile
│   ├── Notifications
│   └── Security
└── Admin
    ├── Users
    └── System
```

For each node include: route/path, purpose, primary action.

#### 2) Navigation model
Document how users move between screens:
| Navigation element | Type (global nav, sidebar, breadcrumb, tab, link, button) | What it connects | Always visible? |

Identify:
- primary navigation (always visible)
- secondary navigation (contextual)
- tertiary navigation (in-page)
- escape hatches (how to get back/out)

#### 3) Grouping analysis
For each group of items in the navigation or layout, answer:
- Why are these grouped together?
- Would a new user expect this grouping?
- Are there items that belong in a different group?
- Are there groups that should be split or merged?

| Group | Items | Grouping logic | Potential confusion |

#### 4) Label audit
For every navigation label, page title, and section heading:
| Label | What it actually leads to | Clear to new user? | Alternative label |

Flag:
- labels that are too vague ("Settings", "More", "Manage")
- labels that overlap ("Admin" vs "Settings" vs "Configuration")
- labels that use internal jargon
- labels that do not match the page content

#### 5) Action placement
For each primary action in the system:
| Action | Where it lives now | Where users would look for it | Mismatch? |

Check:
- Can the user find the action without hunting?
- Is it at the right level of the hierarchy?
- Is it near the objects it acts on?
- Are destructive actions separated from safe actions?

#### 6) Depth and breadth analysis
- How deep is the deepest path? (clicks from home to leaf)
- How wide is the widest level? (items at the same level)
- Are there screens only reachable through non-obvious paths?
- Are there orphan screens with no navigation path?

### Diagrams
Create Mermaid diagrams for:
- sitemap (tree structure)
- navigation flow (how screens connect)

### Synthesis
End with:
- screens that are hard to find
- groupings that will confuse new users
- labels that need to change
- actions that are in the wrong place
- depth problems (too deep or too shallow)
- recommendations for restructuring

### Quality bar
- Reference actual routes, file paths, and component names.
- The IA should make it obvious where everything lives and how to get there.
- If a user would need to memorize a path, the architecture has a problem.

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

**If `bd` is not found:** Stop here. Output the IA Review only, and append:

```
## Beads Integration: Skipped

`bd` CLI not found. To install Beads and create trackable issues from this review:

  pip install beads-cli
  # or see https://github.com/steveyegge/beads

Then re-run: /information-architecture-beads
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
bd create "IA Review: <branch> — <scope>" -p 1 --json
```

Capture the parent issue ID from the JSON output. Store scope and summary:

```bash
bd update <parent-id> --description "<1-2 sentence scope summary>" --acceptance "<quality bar from the review>" --notes "Review date: <today>. Scope: <arguments>."
```

### Step 4 -- Create child issues per finding

For each finding (orphan screens, mislabeled navigation, deep paths, grouping problems):

**MAJOR findings** -- always create:

Orphan screens, inaccessible features, and misleading labels:

```bash
bd create "[MAJOR] <finding-title>" -p 0 --json
```

**MINOR findings** -- create only if the user passed `--include-minor`. Otherwise skip and note them in the output.

Suboptimal grouping and slightly deep paths:

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

### Section A: Information Architecture Review

1. Sitemap
2. Navigation model
3. Grouping analysis
4. Label audit
5. Action placement
6. Depth and breadth analysis
7. Diagrams
8. Synthesis and recommendations

### Section B: Beads Integration Summary

1. **Status:** initialized | already-initialized | skipped (with reason)
2. **Parent bead:** `<id>` -- `<title>`
3. **Created beads:** table of Bead ID | Severity | Finding Title | Priority
4. **Skipped findings:** list with reasons (e.g., "MINOR, --include-minor not set")
5. **Next actions:** output of `bd ready --json`

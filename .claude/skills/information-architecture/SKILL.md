---
name: information-architecture
description: Define the information architecture for a prototype -- sitemap, navigation model, grouping logic, labeling, and action placement.
disable-model-invocation: true
---

Define the information architecture for this scope:

$ARGUMENTS

Work from the repo, routes, navigation components, page layouts, menus, and any existing sitemap or docs. Infer missing structure conservatively and mark assumptions.

## Output
Write `docs/hci/information-architecture.md` unless the user asked for another path.

## Required sections

### 1) Sitemap
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

### 2) Navigation model
Document how users move between screens:
| Navigation element | Type (global nav, sidebar, breadcrumb, tab, link, button) | What it connects | Always visible? |

Identify:
- primary navigation (always visible)
- secondary navigation (contextual)
- tertiary navigation (in-page)
- escape hatches (how to get back/out)

### 3) Grouping analysis
For each group of items in the navigation or layout, answer:
- Why are these grouped together?
- Would a new user expect this grouping?
- Are there items that belong in a different group?
- Are there groups that should be split or merged?

| Group | Items | Grouping logic | Potential confusion |

### 4) Label audit
For every navigation label, page title, and section heading:
| Label | What it actually leads to | Clear to new user? | Alternative label |

Flag:
- labels that are too vague ("Settings", "More", "Manage")
- labels that overlap ("Admin" vs "Settings" vs "Configuration")
- labels that use internal jargon
- labels that do not match the page content

### 5) Action placement
For each primary action in the system:
| Action | Where it lives now | Where users would look for it | Mismatch? |

Check:
- Can the user find the action without hunting?
- Is it at the right level of the hierarchy?
- Is it near the objects it acts on?
- Are destructive actions separated from safe actions?

### 6) Depth and breadth analysis
- How deep is the deepest path? (clicks from home to leaf)
- How wide is the widest level? (items at the same level)
- Are there screens only reachable through non-obvious paths?
- Are there orphan screens with no navigation path?

## Diagrams
Create Mermaid diagrams for:
- sitemap (tree structure)
- navigation flow (how screens connect)

## Synthesis
End with:
- screens that are hard to find
- groupings that will confuse new users
- labels that need to change
- actions that are in the wrong place
- depth problems (too deep or too shallow)
- recommendations for restructuring

## Quality bar
- Reference actual routes, file paths, and component names.
- The IA should make it obvious where everything lives and how to get there.
- If a user would need to memorize a path, the architecture has a problem.

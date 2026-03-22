---
name: consistency-audit
description: Audit a prototype for cross-screen consistency in navigation, actions, states, patterns, and interaction rules.
disable-model-invocation: true
---

Audit consistency for this scope:

$ARGUMENTS

Use ultrathink. Review the interface as a system, not as isolated screens.

## Output
Write `docs/hci/consistency-audit.md` unless the user asked for another path.
Create the directory if it does not exist.

## Check these invariants
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

## Required output tables
### Invariants
| Area | Expected invariant | Observed variants | Risk | Recommendation |

### Screen inventory
| Screen/route/component | Primary purpose | Main action | State coverage | Notes |

## Required synthesis
Conclude with:
- top consistency breaks
- invariants that should be written into the design system
- issues likely to confuse users because similar things behave differently

## Quality bar
Do not confuse deliberate variation with accidental inconsistency. Explain the difference.

## Deliverable style
- Clear headings
- Markdown tables
- Mermaid diagrams where useful
- Direct language
- No filler

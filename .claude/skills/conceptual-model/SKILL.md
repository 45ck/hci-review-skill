---
name: conceptual-model
description: Build a conceptual model for a prototype or feature: actors, objects, actions, states, rules, and transitions.
disable-model-invocation: true
---

Create a conceptual model for this scope:

$ARGUMENTS

Use ultrathink. Work from the repo, prototype, docs, screenshots, routes, components, and visible states. If details are missing, infer cautiously and mark assumptions.

## Output
Write `docs/hci/conceptual-model.md` unless the user asked for another path.
Create the directory if it does not exist.

## Required sections
1. Purpose of the system or feature
2. Primary actors
3. Primary objects/entities
4. Actions available on each object
5. States and transitions
6. Rules, constraints, permissions, and guardrails
7. Ambiguities or overloaded concepts
8. Recommendations to simplify the model

## Tables to include
### Actors
| Actor | Goal | Main tasks | Notes |

### Objects
| Object | Definition | Key attributes | Related objects |

### Actions
| Action | Target object | Preconditions | Result |

### States
| Object | State | Meaning | Entered by | Exited by |

Note: keep this state table high-level (name and one-line meaning only). Full lifecycle definition belongs in the state-model artifact. If a state-model artifact already exists, reference it rather than repeating it.

## Diagrams
Add Mermaid diagrams:
- state diagrams for major objects
- entity relationship diagrams for object relationships

## Evaluation lens
A strong conceptual model should make these obvious:
- what exists in the system
- what users can do
- what state something is in
- what will happen next

Flag anything that breaks these expectations.

## Deliverable style
- Clear headings
- Markdown tables
- Mermaid diagrams where useful
- Direct language
- No filler

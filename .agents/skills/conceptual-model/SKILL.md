---
name: conceptual-model
description: Build a conceptual model for a prototype or feature: actors, objects, actions, states, rules, and transitions.
disable-model-invocation: true
---

Create a conceptual model for this scope:

$ARGUMENTS

Work from the repo, prototype, docs, screenshots, routes, components, and visible states. If details are missing, infer cautiously and mark assumptions.

## Output
Write `docs/hci/conceptual-model.md` unless the user asked for another path.

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

## Diagrams
Where useful, add Mermaid:
- state diagrams for major objects
- simple relationship diagrams for object relationships

## Evaluation lens
A strong conceptual model should make these obvious:
- what exists in the system
- what users can do
- what state something is in
- what will happen next

Flag anything that breaks these expectations.

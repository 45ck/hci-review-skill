---
name: vocabulary-audit
description: Normalize UI terminology by creating a canonical glossary of nouns, verbs, statuses, and labels used across the system.
disable-model-invocation: true
---

Audit and normalize interface language for this scope:

$ARGUMENTS

Use the current prototype, components, routes, docs, and visible copy. Extract all important terms that affect understanding.

## Output
Write `docs/hci/glossary.md` unless the user asked for another path.

## Required sections
1. Canonical glossary
2. Terms to merge or ban
3. Status vocabulary
4. Action vocabulary
5. Naming problems and recommendations

## Tables to include
### Canonical terms
| Term | Type (noun/verb/status) | Exact meaning | Where used | Notes |

### Terms to avoid
| Avoid this term | Use instead | Reason |

### Status model
| Status | Meaning | Entered when | Exited when |

## What to look for
- same concept with multiple names
- vague verbs like "handle", "manage", "process"
- inconsistent status labels
- labels that require domain knowledge the user may not have
- UI copy that does not match the underlying conceptual model

## Quality bar
Prefer language that is:
- concrete
- consistent
- distinguishable from nearby concepts
- aligned with the user’s mental model

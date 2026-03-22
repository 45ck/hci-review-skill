---
name: failure-path-audit
description: Audit all failure paths, edge cases, and non-happy-path states -- empty states, validation errors, permission failures, loading, undo, and recovery.
disable-model-invocation: true
---

Audit failure paths and edge cases for this scope:

$ARGUMENTS

Happy paths make prototypes look coherent. Failure paths reveal whether they actually are. Review the actual codebase, components, error handling, and UI states.

## Output
Write `docs/hci/failure-path-audit.md` unless the user asked for another path.

## Required categories

### 1) Empty states
For every screen or list that can be empty:
| Screen/component | What is empty | Current empty state treatment | Has illustration/guidance? | Has call to action? | Rating |

Check:
- Does the empty state explain why it is empty?
- Does it tell the user what to do next?
- Does it look intentional or broken?

### 2) Loading states
For every async operation:
| Operation | Current loading indicator | Location | Blocks interaction? | Has timeout handling? |

Check:
- Is there a loading indicator at all?
- Does it appear immediately or after a delay?
- Can the user still interact with other parts of the page?
- What happens if loading takes more than 5 seconds? 30 seconds?
- Is there a way to cancel?

### 3) Validation errors
For every form or input:
| Form/input | Validation rules | When validation runs | Error message | Error placement | Recovery path |

Check:
- Are errors shown inline or as a summary?
- Do errors appear on submit or on blur?
- Are error messages specific ("Email must include @") or vague ("Invalid input")?
- Does the form preserve entered data on error?
- Are required fields marked before the user submits?

### 4) Permission and authorization failures
For every protected action or screen:
| Action/screen | Required permission | What happens without permission | User feedback |

Check:
- Are unauthorized actions hidden, disabled, or shown with an error?
- Does the error explain what permission is needed?
- Does it explain how to get that permission?
- Can users accidentally navigate to pages they cannot use?

### 5) Network and connectivity failures
| Operation | Behavior on network failure | Retry available? | Data preserved? | Offline fallback? |

Check:
- What happens if the API returns 500?
- What happens if the request times out?
- Is there a global error boundary or does each component handle its own?
- Are partial saves possible?

### 6) Partial completion
| Flow | Can be partially completed? | What happens if abandoned? | Can be resumed? | Is progress saved? |

Check:
- Multi-step forms: what happens if the user closes mid-flow?
- Drafts: are they auto-saved?
- Bulk operations: what happens if some items succeed and some fail?

### 7) Undo, cancel, and recovery
| Action | Reversible? | Undo mechanism | Confirmation required? | Time limit on undo? |

Check:
- Destructive actions: is there a confirmation dialog?
- Delete: is it soft delete or permanent?
- Cancel during a flow: does it save progress or discard everything?
- Back button: does it work as expected at every step?

### 8) Concurrent and conflict states
| Scenario | Current handling | User feedback |

Check:
- What happens if two users edit the same thing?
- What happens if the data changes while the user is viewing it?
- Are there stale state problems?

## Summary table

| Category | Items audited | Handled well | Partially handled | Not handled | Critical gaps |
|---|---|---|---|---|---|

## Synthesis
End with:
- top 5 most likely failure scenarios users will encounter
- top 5 missing or broken failure states
- patterns: which failure category is systematically ignored?
- quickest wins: failure states that are easy to fix
- structural issues: failure handling that requires architectural changes

## Quality bar
- Reference actual components, error boundaries, API error handling, and UI states.
- Every happy path implies at least 3-5 failure paths. If you find fewer, look harder.
- A good failure path audit should make the developer uncomfortable. That is the point.

---
name: heuristic-eval
description: Run a structured heuristic evaluation against a prototype or feature, severity-rank the issues, and recommend fixes.
disable-model-invocation: true
---

Run a heuristic evaluation for this scope:

$ARGUMENTS

Use the actual prototype, repo, screenshots, routes, components, and docs. Do not give generic advice. Anchor every issue to a real part of the system where possible.

## Output
Write `docs/hci/heuristic-evaluation.md` unless the user asked for another path.

## Heuristics to apply
1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

## Required output table
| ID | Heuristic | Screen/flow/component | Evidence | Why it matters | Severity (0-4) | Recommendation |

## Severity rubric
- 0 = not a problem
- 1 = cosmetic / low priority
- 2 = minor usability issue
- 3 = major usability issue
- 4 = severe / likely to block or mislead users

## Required synthesis
End with:
- top 5 highest-severity problems
- quickest wins
- structural issues that need redesign rather than visual tweaks

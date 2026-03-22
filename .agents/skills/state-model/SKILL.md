---
name: state-model
description: Define the state machines and lifecycles for all key entities in the system -- states, transitions, invalid transitions, and user-visible cues per state.
disable-model-invocation: true
---

Define the state machines and lifecycles for this scope:

$ARGUMENTS

Use ultrathink. Work from the repo, routes, components, database schemas, API endpoints, and visible UI states. If details are missing, infer conservatively and mark assumptions.

## Output
Write `docs/hci/state-model.md` unless the user asked for another path.
Create the directory if it does not exist.

## Required process

### 1) Identify stateful entities
Find every object in the system that has a lifecycle -- anything that changes state over time. Common examples: requests, tasks, users, sessions, approvals, documents, payments, invitations.

### 2) For each entity, define:

#### States
| State | Meaning | User-visible cue | Entry condition | Exit condition |

#### Allowed transitions
| From | To | Trigger | Who can trigger | Side effects |

#### Invalid transitions
| From | To | Why invalid | What happens if attempted |

#### Ambiguous or undefined states
Flag any state that is:
- implied but never named
- named differently in different places
- missing a user-visible cue
- reachable but with no defined exit

### 3) Diagrams
Create Mermaid state diagrams for each entity. Include:
- all states as nodes
- transitions as labeled edges
- guard conditions where applicable
- terminal states clearly marked

### 4) Cross-entity dependencies
Identify where one entity's state depends on another's. Document:
- which entities are coupled
- what happens when a parent entity changes state
- cascading transitions
- orphaned states (child entity stuck when parent moves)

### 5) UI state coverage
For each state, check:
- Is there a distinct visual treatment?
- Can the user tell what state they are in?
- Can the user tell what actions are available in this state?
- Is the transition feedback clear?

Create a coverage table:
| Entity | State | Has visual cue | Has available actions | Has transition feedback | Gap |

## Synthesis
End with:
- entities with the most ambiguous state models
- states that users cannot distinguish visually
- transitions that happen silently without feedback
- invalid transitions that the UI does not prevent
- recommendations for simplifying overly complex lifecycles

## Quality bar
- Be specific. Reference actual database fields, API statuses, component props, or CSS classes where possible.
- Distinguish between backend state and user-perceived state. Both matter.
- A well-defined state model should make it impossible to ask "what state is this in?" while looking at the screen.

## Deliverable style
- Clear headings
- Markdown tables
- Mermaid diagrams where useful
- Direct language
- No filler

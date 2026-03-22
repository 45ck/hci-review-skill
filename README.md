<p align="center">
  <img src="logo.svg" alt="hci-review-skill logo" width="128" height="128" />
</p>

# hci-review-skill

<p align="center">
  <img src="banner.svg" alt="hci-review-skill banner" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/skills-10-6366f1" alt="10 skills" />
  <img src="https://img.shields.io/badge/platform-Claude%20Code%20%7C%20Codex%20CLI-8b5cf6" alt="Claude Code | Codex CLI" />
  <img src="https://img.shields.io/badge/templates-11-a78bfa" alt="11 templates" />
</p>

<p align="center">
  Structured HCI and UX prototype review skills for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a> and <a href="https://github.com/openai/codex">Codex CLI</a>.
</p>

---

Most confusing prototypes happen when each screen is designed locally, but user journeys, terminology, states, and interaction patterns are never defined globally. These skills force you to treat the UI as a **system with rules** -- not a set of disconnected screens -- by running the same evaluation methods used in university-level HCI courses and professional usability practice.

Ten skills. Each one runs a specific evaluation method against your actual codebase, routes, components, and screenshots. No generic advice -- every finding is anchored to real files.

## Skills included

| Skill | Command | What it does |
|---|---|---|
| **Prototype HCI Pack** | `/prototype-hci-pack` | Full review pack. Runs all methods below in one pass and writes a complete artifact set with scorecard. |
| **Conceptual Model** | `/conceptual-model` | Define actors, objects, actions, states, rules, and transitions. Prevents screen-by-screen design drift. |
| **State Model** | `/state-model` | Define state machines and lifecycles for every entity. States, transitions, invalid transitions, and user-visible cues. |
| **Journey Map** | `/journey-map` | Map 3-7 primary user flows with branches, decision points, error paths, and recovery. |
| **Vocabulary Audit** | `/vocabulary-audit` | Normalize nouns, verbs, statuses, and labels into a canonical glossary. Catches terminology drift. |
| **Information Architecture** | `/information-architecture` | Sitemap, navigation model, grouping logic, label audit, and action placement. |
| **Consistency Audit** | `/consistency-audit` | Audit cross-screen invariants: navigation, actions, states, modals, forms, and interaction rules. |
| **Failure Path Audit** | `/failure-path-audit` | Audit empty states, loading, validation errors, permission failures, network errors, undo, recovery, and concurrent conflicts. |
| **Heuristic Evaluation** | `/heuristic-eval` | Nielsen-style structured evaluation with severity ranking (0-4) and fix recommendations. |
| **Cognitive Walkthrough** | `/cognitive-walkthrough` | Step through a task as a first-time user. Tests intent, discoverability, feedback, and interpretation at every step. |

## Features

- Works from your actual codebase: routes, components, screenshots, docs
- Outputs durable markdown artifacts to `docs/hci/` (configurable)
- Mermaid diagrams for state models, user flows, and sitemaps
- Severity-ranked issue tables with concrete fix recommendations
- Reusable templates for every artifact type
- HCI scorecard for comparing reviews across iterations
- Explicit-only invocation (no accidental triggers)
- Dual platform: Claude Code and Codex CLI

## Install

### Option A: Install globally

```bash
git clone https://github.com/45ck/hci-review-skill.git
cd hci-review-skill
bash install.sh
```

Installs to both `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Codex CLI).

### Option B: Clone into your project

```bash
# From your project root
git clone https://github.com/45ck/hci-review-skill.git /tmp/hci-skill
cp -r /tmp/hci-skill/.claude .claude
cp -r /tmp/hci-skill/.agents .agents
```

### Uninstall

```bash
bash uninstall.sh
```

## Usage

### Claude Code

```
/prototype-hci-pack onboarding flow
/conceptual-model approval system
/state-model request lifecycle
/journey-map first-time user onboarding
/vocabulary-audit approval + request + task terminology
/information-architecture main navigation and settings
/consistency-audit settings, approvals, and notifications
/failure-path-audit checkout flow
/heuristic-eval approval dashboard
/cognitive-walkthrough create-new-agent flow
```

### Codex CLI

```
/skills
# select from the list
```

## What you get

### Prototype HCI Pack

Runs all nine standalone methods in one pass and produces 11 artifacts:

| Output file | Contents |
|---|---|
| `conceptual-model.md` | Actors, objects, actions, states, rules, transitions |
| `state-model.md` | State machines, lifecycles, Mermaid diagrams, UI coverage |
| `user-journeys.md` | 3-7 user flows with branches, errors, recovery |
| `glossary.md` | Canonical terms, merges, status model, naming problems |
| `information-architecture.md` | Sitemap, navigation, grouping, labels, action placement |
| `consistency-audit.md` | Cross-screen invariants, screen inventory, breaks |
| `failure-path-audit.md` | Empty, loading, validation, permissions, network, undo, concurrent |
| `heuristic-evaluation.md` | Nielsen 10 heuristics, severity-ranked issues |
| `cognitive-walkthrough.md` | Step-by-step first-time user analysis |
| `hci-scorecard.md` | 8-dimension score out of 40 with rating band |
| `hci-summary.md` | Top risks, invariants, priorities, open assumptions |

### Conceptual Model

| Section | Contents |
|---|---|
| Actors | Who uses the system, their goals and tasks |
| Objects | What entities exist, their attributes and relationships |
| Actions | What can be done, preconditions and results |
| States | Lifecycle of each object with entry/exit transitions |
| Rules | Constraints, permissions, and guardrails |
| Ambiguities | Overloaded concepts and simplification recommendations |

### State Model

| Section | Contents |
|---|---|
| Entity states | Every state with meaning, user-visible cue, entry/exit conditions |
| Transitions | Allowed transitions with triggers, actors, and side effects |
| Invalid transitions | What should not happen and what the system does if attempted |
| State diagrams | Mermaid diagrams for every stateful entity |
| UI coverage | Whether each state has distinct visual treatment and available actions |
| Dependencies | Cross-entity state coupling and cascade effects |

### Journey Map

| Section | Contents |
|---|---|
| Journeys | 3-7 primary flows: first-time, happy path, edit/undo, error recovery, returning user |
| Steps | Goal, entry point, decisions, branches, errors, exit state |
| Diagrams | Mermaid flowcharts for critical journeys |
| Friction | Cross-journey themes and confusion risks |

### Vocabulary Audit

| Section | Contents |
|---|---|
| Glossary | Canonical terms with type, meaning, and usage location |
| Merges | Terms to ban or consolidate |
| Status model | Every status with meaning and transition triggers |
| Naming problems | Vague verbs, inconsistent labels, domain jargon |

### Information Architecture

| Section | Contents |
|---|---|
| Sitemap | Hierarchical map of all screens with routes and purpose |
| Navigation model | Global, secondary, tertiary navigation and escape hatches |
| Grouping | Why items are grouped, potential confusion |
| Labels | Every nav label audited for clarity and accuracy |
| Action placement | Whether each action is where users would look for it |
| Depth analysis | Path lengths, orphan screens, breadth at each level |

### Consistency Audit

| Section | Contents |
|---|---|
| Invariants | Expected vs observed behavior for navigation, actions, states, forms, modals |
| Screen inventory | Every screen/route with purpose, main action, and state coverage |
| Breaks | Top consistency violations with risk and recommendation |

### Failure Path Audit

| Section | Contents |
|---|---|
| Empty states | Treatment, guidance, and calls to action |
| Loading states | Indicators, placement, timeout handling |
| Validation | Rules, timing, messages, data preservation |
| Permissions | Behavior without access, feedback, recovery |
| Network | Failure behavior, retry, data preservation |
| Partial completion | Auto-save, resumability, progress preservation |
| Undo/recovery | Reversibility, confirmation, time limits |
| Concurrent/conflict | Simultaneous edits, stale state, optimistic update conflicts |

### Heuristic Evaluation

| Section | Contents |
|---|---|
| Issues table | ID, heuristic violated, location, evidence, severity (0-4), fix |
| Heuristics | All 10 Nielsen heuristics applied |
| Synthesis | Top 5 problems, quickest wins, structural vs cosmetic issues |

### Cognitive Walkthrough

| Section | Contents |
|---|---|
| Step log | For each step: goal, visible cues, likely action, 4-question walkthrough analysis |
| Breakdowns | Hidden prerequisites, unclear affordances, weak feedback, dead ends |
| Synthesis | Steps most likely to fail, hesitation reasons, highest-impact design changes |

### HCI Scorecard

| Section | Contents |
|---|---|
| Scores | 8 dimensions rated 1-5: purpose clarity, navigation, terminology, state visibility, error prevention, recognition, consistency, failure coverage |
| Total | Score out of 40 with rating band |
| Comparison | Delta against previous iteration (if available) |

Note: the scorecard is produced by `/prototype-hci-pack`; there is no standalone `/hci-scorecard` skill.

## Templates

Reusable blank templates are included under `docs/hci/templates/` to keep output structure consistent across reviews:

```
docs/hci/templates/
  cognitive-walkthrough.md
  conceptual-model.md
  consistency-audit.md
  failure-path-audit.md
  glossary.md
  hci-scorecard.md
  hci-summary.md
  heuristic-evaluation.md
  information-architecture.md
  state-model.md
  user-journeys.md
```

## Recommended workflow

Run the skills in this order for best results:

```
1. /conceptual-model           define what the system is
2. /state-model                define entity lifecycles
3. /journey-map                map how users move through it
4. /vocabulary-audit           stabilize the language
5. /information-architecture   verify structure and navigation
6. /consistency-audit          catch cross-screen drift
7. /failure-path-audit         audit non-happy-path states
8. /heuristic-eval             severity-rank usability problems
9. /cognitive-walkthrough      simulate a first-time user
```

Or run **`/prototype-hci-pack`** to generate the full artifact set with scorecard in one pass.

That order matters. It keeps structure ahead of polish:

- **Conceptual model** prevents screen-by-screen drift by forcing clarity on objects, actions, and states
- **State model** catches undefined lifecycles -- many confusing interfaces are actually undefined state systems
- **Journey maps** make the user path visible and catch dead ends before they become implementation problems
- **Vocabulary audits** reduce cognitive load by keeping the language stable across screens
- **Information architecture** ensures users can find things without memorizing paths
- **Consistency audits** catch accidental variation that makes similar things behave differently
- **Failure path audits** reveal whether the prototype is actually coherent or just looks that way on the happy path
- **Heuristic evaluation** gives you a structured issue log using established usability principles
- **Cognitive walkthroughs** detect where first-time users will miss the right action or misread feedback

## How it works

These skills encode established HCI evaluation methods as AI-executable instructions:

**Conceptual modeling** (Norman, *The Design of Everyday Things*, 1988) forces the designer to articulate what exists in the system, what users can do, and what state things are in. If the conceptual model is unclear, the interface will be unclear.

**State modeling** defines the lifecycles that underpin every interactive system. When states are implicit rather than explicit, users encounter mystery conditions, silent transitions, and dead ends.

**Journey mapping** traces the user's path through the system and reveals dead ends, branch explosions, and weak recovery paths that are invisible when designing screen by screen.

**Vocabulary auditing** prevents the terminology drift that happens naturally over time -- when the same concept gets called different names in different places, users perceive a harder system than it is.

**Information architecture** (Rosenfeld & Morville, 1998) defines where things live, how they are grouped, and how users navigate between them. Poor IA is the most common cause of "I can't find it" complaints.

**Consistency auditing** checks the invariants that should hold across every screen: navigation placement, action treatment, status presentation, state coverage. This is one of Nielsen's strongest heuristics.

**Failure path auditing** forces attention to the states that happy-path prototyping skips: empty screens, loading delays, validation errors, permission denials, and recovery flows. These are where real users spend a disproportionate amount of time.

**Heuristic evaluation** (Nielsen & Molich, 1990; revised heuristics: Nielsen, 1994) is the most widely used discount usability method. The 10 heuristics used here are from Nielsen's 1994 revision. Each issue is rated on a 0-4 severity scale so you can prioritize what to fix first.

**Cognitive walkthroughs** (Wharton et al., *The Cognitive Walkthrough Method: A Practitioner's Guide*, 1994) simulate a first-time user at every step. For each action, the evaluator asks: will the user form the right goal? Notice the action? Understand the result? This catches problems that heuristic evaluation misses.

## Repo structure

```
.claude/skills/
  prototype-hci-pack/SKILL.md          # Full review pack
  conceptual-model/SKILL.md            # Conceptual model
  state-model/SKILL.md                 # State machines & lifecycles
  journey-map/SKILL.md                 # Journey map
  vocabulary-audit/SKILL.md            # Vocabulary audit
  information-architecture/SKILL.md    # Information architecture
  consistency-audit/SKILL.md           # Consistency audit
  failure-path-audit/SKILL.md          # Failure path audit
  heuristic-eval/SKILL.md              # Heuristic evaluation
  cognitive-walkthrough/SKILL.md       # Cognitive walkthrough
.agents/skills/
  [same structure with agents/openai.yaml for Codex CLI]
docs/hci/
  templates/                           # Reusable blank templates (11 files)
    cognitive-walkthrough.md
    conceptual-model.md
    consistency-audit.md
    failure-path-audit.md
    glossary.md
    hci-scorecard.md
    hci-summary.md
    heuristic-evaluation.md
    information-architecture.md
    state-model.md
    user-journeys.md
  reviews/                             # Your review outputs go here
  flows/                               # Flow diagrams
  models/                              # Conceptual and state models
  glossary/                            # Glossary artifacts
banner.svg                             # README banner
logo.svg                               # Project logo (512x512)
install.sh                             # Global install (both platforms)
uninstall.sh                           # Global uninstall
LICENSE                                # MIT
```

## Related

- [fagan-inspection-skill](https://github.com/45ck/fagan-inspection-skill) -- Formal Fagan Inspection skill for structured code review with defect logging

## License

[MIT](LICENSE)

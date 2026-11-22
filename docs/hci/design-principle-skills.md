# Seven design principle review skills

These focused review methods extend the public specialist HCI pack. They work with supplied evidence and the project's existing components. They do not require Quantive's private implementation or introduce a new runtime.

## Source mapping

The starting reference was [this Instagram reel](https://www.instagram.com/reel/DgBgJ75JVZX/), analyzed with vidIQ on 22 November 2026. The tool identified an approximately 35-second presentation of seven UI/UX principles. The timestamps below are approximate segments reported by that analysis, not a frame-accurate independent transcription. The creator's identity was not established. No transcript, screenshots, media, or creator assets are redistributed here.

| Reel segment | Principle | Packaged skill | Operational question |
| --- | --- | --- | --- |
| 00:00–00:02 | Jakob's law | [jakobs-law-review](../../.agents/skills/jakobs-law-review/SKILL.md) | Does the control do what its signifier suggests? |
| 00:03–00:06 | Hick's law | [hicks-law-review](../../.agents/skills/hicks-law-review/SKILL.md) | Which alternatives compete at this decision? |
| 00:07–00:12 | 60-30-10 color balance | [color-balance-review](../../.agents/skills/color-balance-review/SKILL.md) | Do color roles clarify priority and remain accessible? |
| 00:13–00:17 | Von Restorff effect | [von-restorff-review](../../.agents/skills/von-restorff-review/SKILL.md) | Is a task-relevant item meaningfully distinct? |
| 00:18–00:21 | Aesthetic-usability effect | [aesthetic-usability-review](../../.agents/skills/aesthetic-usability-review/SKILL.md) | What looks coherent, and what actually works? |
| 00:22–00:27 | Peak-end rule | [peak-end-review](../../.agents/skills/peak-end-review/SKILL.md) | Are demanding moments and final outcomes handled clearly? |
| 00:28–00:32 | Zeigarnik effect | [zeigarnik-progress-review](../../.agents/skills/zeigarnik-progress-review/SKILL.md) | Is progress truthful and unfinished work resumable? |

The workflows and examples are original implementations. The reel identifies the topics; the sources linked inside each skill establish research context or implementation guidance.

## Evidence limits built into the methods

| Principle | Interpretation used in this pack |
| --- | --- |
| Jakob | Apply a contextual convention heuristic; identify the relevant audience and platform. An agent prediction is not measured human expectation. |
| Hick–Hyman | Review the alternatives involved in a particular decision. Do not count every link or convert option counts into predicted seconds without fitted task data. |
| 60-30-10 | Use a flexible composition guide. Exact pixel proportions are not a quality gate, and palette balance does not prove contrast compliance. |
| Von Restorff | Distinctiveness in memory research motivates a review question. It does not prove gaze capture, clicks, comprehension, or conversion. |
| Aesthetic usability | Keep apparent ease and visual preference separate from actual task outcomes and accessibility. |
| Peak-end | Examine the journey and its ending. Do not claim a celebration erases earlier failures or add artificial waiting. |
| Zeigarnik | A [2025 meta-analysis](https://www.nature.com/articles/s41599-025-05000-w) did not support a general memory advantage for unfinished tasks. Distinguish recall from resumption; neither proves that a progress bar will improve completion. |

## Agent workflow

1. Select the relevant skill for the actual design question. The existing `prototype-hci-pack` and its Beads variant contain a routing table.
2. Inspect the supplied screenshot, code, trace, or interface. State missing evidence and the narrow assumptions needed to proceed.
3. Tie each finding to a task, control, state, and evidence reference. Distinguish observed behavior, code inference, and a hypothesis about human perception.
4. Propose a small change using existing components, custom icons, fonts, and global theme/motion settings.
5. If implementation was requested, verify the original task and the relevant alternate states. Do not describe proposed changes as shipped or static screenshots as runtime tests.
6. Report findings, tradeoffs, checks performed, and remaining uncertainty. Keep human outcome claims separate from package or browser checks.

Use the optional [review template](templates/design-principle-review.md) when it helps. Each installed skill includes its own output table and works without this document or template.

## Packaging

All seven have identical method text under `.claude/skills/` and `.agents/skills/`. Each Codex variant includes `agents/openai.yaml` with a direct invocation example and implicit invocation enabled. Existing platform-specific Beads behavior is preserved. The shared inventory now contains 41 skills: 31 non-Beads skills and 10 Beads variants.

The installer preflights the package, copies complete skill bundles, and supports an isolated `HCI_SKILLS_HOME`. The uninstaller reads the same inventory. The existing required `verify` job runs the package and isolated roundtrip checks described in the [validation record](design-principles-validation.md).

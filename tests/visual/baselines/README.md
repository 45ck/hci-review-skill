# Reviewed layout references

These six references were technically inspected on 22 November 2026 (Australia/Sydney). They capture the genuine SDK gallery with Solid surfaces and motion off, on Ubuntu 24.04, Chromium 159.0.8154.6, DPR 1, local Manrope fonts and the fixed viewports in `layouts.visual.spec.ts`.

| Reference | Capture source | Review scope |
| --- | --- | --- |
| `desktop-review.png` | `978356a` | Review list, selected record, navigation and desktop inspector |
| `desktop-bottom-end-popup.png` | `978356a` | Bottom/end anchor, justified upward flip, gap and viewport containment |
| `desktop-rtl-top-start-popup.png` | `978356a` | Logical RTL start, contained paired buttons and downward popup |
| `phone-320-review.png` | `978356a` | Narrow task list, header controls and bottom navigation |
| `phone-390-long-popup.png` | `978356a` | Long labels wrap inside the viewport without covering the trigger |
| `phone-390-inspector.png` | `4cdd4f0` | Compact task, evidence, facts, review action and navigation all visible |

The first five captures came from [run 44956204567](https://github.com/45ck/hci-review-skill/actions/runs/44956204567). All five then passed normal pixel comparison in [run 44956956171](https://github.com/45ck/hci-review-skill/actions/runs/44956956171). The latter run supplied the reframed inspector capture. These were retained failure screenshots after missing-reference assertions, not automatically accepted matcher output; the intended final states were inspected before copying them here.

Reference review establishes comparison inputs. The normal six-state comparison must still pass for a candidate, with no allowed differing-pixel count. Future failures require investigation before replacing an image. Follow `docs/hci/standards/visual-regression.md` for candidate capture and review.

This is automated and agent technical evidence, not human UI/UX approval. Custom components remain **Unvalidated**. Hosted Chromatic comparison is separate and has not run without `CHROMATIC_PROJECT_TOKEN`.

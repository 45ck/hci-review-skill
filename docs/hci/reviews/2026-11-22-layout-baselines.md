# Initial static layout references

## Review decision

On 22 November 2026 (Australia/Sydney), the implementation assistant visually inspected all six images below and accepted them as the initial **static layout regression references**. This is an automated-assistant review of the intended fixture states, not human UI/UX approval. Every custom component remains **Unvalidated**.

The review checked readable content, the intended selected review and inspector, narrow navigation, complete anchor controls, and popup placement within the captured viewport. The RTL image was reopened individually to confirm both controls start 16 pixels below the top edge and are fully visible. No screenshot masks, layout substitutions, or threshold changes were made.

| Reference | Viewport | Observed state |
| --- | --- | --- |
| `desktop-review.png` | 1440 × 1000 | Review list, selected Payment retry row and adjacent evidence inspector; the Motion collection is discoverable. |
| `desktop-bottom-end-popup.png` | 1280 × 900 | Short menu above the bottom/end anchor, with all menu entries and both anchor controls visible. |
| `desktop-rtl-top-start-popup.png` | 1280 × 900 | Right-to-left top/start anchor at the right edge; controls and the menu below remain inside the viewport. |
| `phone-320-review.png` | 320 × 850 | Wrapped review text, compact workspace header and visible bottom navigation without horizontal overflow. |
| `phone-390-inspector.png` | 390 × 844 | Open Payment retry inspector with its heading focused by the fixture; the longer document continues below the viewport. |
| `phone-390-long-popup.png` | 390 × 844 | Long menu labels wrap inside the phone viewport, above the bottom/end controls. |

## Source and capture evidence

The images come from [Layout visual regression run 44956934609](https://github.com/45ck/hci-review-skill/actions/runs/44956934609), job `137007025088`, artifact `14728211461`. Checkout identified source commit `f221be49e1e5fbc7b50269f74548324b1f394d29`, tree `705704ea43e1f60219bdcd127e90902519fbc48e`. The artifact name uses GitHub's synthetic PR merge ref; the checked-out head identifies the application source.

The downloaded archive matched GitHub's SHA-256 `e391b1d47e5221f5715bf3c597a195e27ab4415f4190d2ccdad5710f5b4b86e3`. It contains six **failure-hook screenshots**, not a successful candidate-mode run. All six tests reached the screenshot assertion and failed only because their reference images were absent. No pixel comparison passed in that run, and these captures were not accepted automatically.

Playwright 1.65.1 returns before taking comparator images when a reference is missing and `updateSnapshots` is `none`. Consequently there are no separate comparator actual PNGs in this artifact. The reviewed failure captures use the same viewport, `fullPage: false`, and allowed animations. Device scale 1 makes their default device scale equivalent to the comparator's CSS scale. The hook uses `caret: initial` instead of `caret: hide`; these fixtures end on noneditable content, a heading or menu controls, so no editable caret is present. The test body performs no UI mutation after its capture call. The actual application explicitly uses Solid surfaces and motion off, with reduced motion requested and local Manrope fonts loaded.

The six reviewed files are copied byte-for-byte into `tests/visual/baselines/chromium-linux/`. Their identities are recorded below.

| File | SHA-256 |
| --- | --- |
| `desktop-review.png` | `57ce68d397860e833fb0e121291f37306f3b7141c047ecf88422d4c2d587127d` |
| `desktop-bottom-end-popup.png` | `57ff3f678c606274244579a0ee402ebd6a424c3b8ec20aa785189827f6d66a5e` |
| `desktop-rtl-top-start-popup.png` | `2abfc0dcb6857f48bfbd2807d97960de3bd50a5132b1467560e02a8918797c2b` |
| `phone-320-review.png` | `460a624ab80c02114743a3ca3cdc87e88a6d01805e3ae038b7bd3fce67557c01` |
| `phone-390-inspector.png` | `bb2190f7af2eeb7f0087f7b09ac4ff0509b761fec2d2b802ef0d3e0120abcc3d` |
| `phone-390-long-popup.png` | `5958bdaae602616ada0af53cc65ccccf9224c5d536b8f758ff44df718c352499` |

## Required comparison after acceptance

Normal comparison mode must pass against these references. The existing `updateSnapshots: none`, perceived-colour threshold `0.1`, zero differing-pixel budget, runtime checks, and full software-WebGPU suite remain unchanged. This record approves the reference inputs; it does not claim an unexecuted comparison result. See the pull request's exact-revision checks for that result.

These static references cover the six stated layouts. They do not validate live optical effects, every motion state, accessibility conformance, human recognition or hardware performance. Hosted Chromatic is a separate optional result; a missing token remains an explicit skip.

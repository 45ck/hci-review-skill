# Layout quality and stable controls

The quality module measures declared layout invariants without taking ownership of application layout. The host keeps its UI SDK controls, provider, agent bridge and state transitions. Geometry inspection, browser shift observation and visual comparisons provide separate evidence. All custom visual compositions remain **Unvalidated** until a recorded human UI/UX review changes that status.

Opening a menu must not move its trigger or unrelated controls. A popup must remain attached to its logical anchor, fit the viewport when its content permits, and avoid covering its own trigger. SDK placement owns collision handling. Diagnostics reports problems; it does not reposition controls.

## Public surface

```tsx
import {
  captureLayoutSnapshot, compareLayoutSnapshots, inspectPopupPlacement,
  summarizeLayoutShifts, observeLayoutShifts, LiquidLayoutDiagnostics,
} from "@quantitative-hci/liquid-glass/quality";
import "@quantitative-hci/liquid-glass/quality.css";
```

Load `quality.css` after the existing `kit.css`. Reuse the application's existing provider and single SDK agent bridge.

| Export | Classification and contract | Inputs and observable result |
| --- | --- | --- |
| `captureLayoutSnapshot(root, options?)` | Read-only host hook; `layout-snapshot-capture` | Connected `Element` or `null`, optional `scopeId`/`maxTargets`; returns context, marked target geometry, findings and capture limits. |
| `compareLayoutSnapshots(before, after, options?)` | Pure utility; `layout-snapshot-comparison` | Snapshots and explicit tolerances, expected changes or independent target pairs; returns status, nullable `passed`, compared count and findings. |
| `inspectPopupPlacement(input)` | Pure utility; `popup-placement-inspection` | Trigger/popup/viewport rectangles, actual SDK placement and preferred policy; returns expected geometry, gap/drift/overflow and findings. |
| `summarizeLayoutShifts(entries, options?)` | Pure utility; `layout-shift-summary` | Supplied shift samples, retained-sample limit/support flag; returns a bounded `LayoutShiftReport`. |
| `observeLayoutShifts(options?)` | Read-only host hook; `layout-shift-observer` | Native observer options; returns `supported`, `snapshot()` and idempotent `stop()`. |
| `LiquidLayoutDiagnostics(props)` | SDK composition; `liquid-layout-diagnostics` | Required `target: () => Element \| null`; optional `label`, `active`, `defaultOpen`, `children`; genuine Collapsible/Button children operate local reports. |

The [canonical contracts](../../../packages/liquid-glass/agent-contracts.json) cover each runtime export separately. Complete TypeScript inputs/results are in [geometry.ts](../../../packages/liquid-glass/src/quality/geometry.ts), [observer.ts](../../../packages/liquid-glass/src/quality/observer.ts) and [diagnostics.tsx](../../../packages/liquid-glass/src/quality/diagnostics.tsx). An evidence reference identifies a check; it does not assert that the check passed on the current revision.

## Capture and comparison policy

Mark only the controls or regions whose geometry matters with stable `data-layout-probe` identifiers. Optional `data-layout-scope` identifies the containing region. IDs must match `[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}`; use structural IDs such as `workspace-switcher`, not names, email addresses or field values. Duplicate/invalid IDs and scopes without marked targets cannot establish a complete baseline.

Capture defaults to 128 targets, accepts 1–512, and reports truncation explicitly. It reads rectangles, visibility, scroll and coordinate mode alongside viewport offsets/dimensions, scale and device pixel ratio. It does not collect arbitrary text, input values, screenshots or DOM node references. A root's object identity is part of the context: replacing the element with the same textual scope ID requires a new baseline.

Position and size tolerances each default to **1 CSS px** and must be finite and nonnegative. Ordinary document scrolling is compensated; fixed elements retain viewport coordinates. Sticky or transformed contexts can be ambiguous after scrolling and yield `incomparable`. Viewport, zoom or device pixel ratio changes are also incomparable unless the caller deliberately enables `allowViewportChange`. Prefer a fresh baseline at each viewport when checking stationary controls.

`expectedChanges` requires a target ID, specific properties (`x`, `y`, `width`, `height`, `presence`, `visibility`) and a reason. This supports an intentionally expanded region without exempting unrelated movement. `nonOverlapping` names explicit independent target-ID pairs; do not treat an overlay and its own content as unrelated rectangles. The API accepts at most 512 expected-change records or overlap pairs.

Check `status` and `passed` together. Only complete, comparable visible geometry can produce `passed: true`. A detected violation produces `false`; unsupported, invalid or incomparable evidence produces `null`. Presence and visibility changes remain findings. A truncated capture, hidden-only comparison or missing overlap target cannot silently become a stability pass.

## Logical popup placement

Declare placement on the actual SDK `MenuContent`, preserving logical start/end alignment for LTR and RTL. The application policy is:

| Application control | Preferred side | Logical alignment |
| --- | --- | --- |
| Leading workspace switcher and state menu | `bottom` | `start` |
| Trailing notifications, account and review actions | `bottom` | `end` |
| Compact bottom-dock More menu | `top` | `end` |

Keep triggers stationary and let the SDK resolve edge collisions. Avoid fixed pixel offsets or physical left/right alignment that override settled positioning. Necessary collision flips/shifts are acceptable; unnecessary, disallowed or worse flips remain reportable.

`inspectPopupPlacement` takes `trigger`, `popup`, `viewport`, `actualSide` and `preferredSide`. Optional inputs are `targetId`, `align`, `actualAlign`, `direction`, `gapPx`, `collisionPaddingPx`, `tolerancePx`, `allowFlip` and `allowShift`. Preferred sides include physical `top`/`bottom`/`left`/`right` and logical `inline-start`/`inline-end`; alignment is `start`/`center`/`end` and direction `ltr`/`rtl`.

Default gap/padding are **8 CSS px**, tolerance **1 CSS px**. Supply the same policy used by the control. Read settled SDK `data-side` and, when checking resolved alignment, `data-align`; missing actual metadata produces `unsupported`. The report measures overflow, trigger overlap, expected gap, anchor drift and permitted collision outcomes. It inspects supplied rectangles without replacing SDK placement or proving that a menu action was accepted.

## Browser shifts and geometry

The browser [Layout Instability API](https://wicg.github.io/layout-instability/) reports shifts and recent-input attribution. Observation can be delayed and very small movement omitted, so it must not drive application positioning. [Current CLS guidance](https://web.dev/articles/cls) uses the largest session of unexpected shifts, with gaps below one second and a window below five seconds. The older lifetime-sum example in the draft API introduction is not this module's algorithm.

`summarizeLayoutShifts` calculates that maximum session. Recent-input shifts are reported separately, excluded from CLS and cannot bridge sessions. `unexpectedShiftValue` is the observed total and can exceed maximum-session `cls`; these metrics are not interchangeable. A menu can have wrong anchor geometry or cover its trigger even when recent input excludes that movement from CLS. Geometry assertions must still detect the defect.

| Limit | Default | Maximum / consequence |
| --- | --- | --- |
| Retained shift samples | 128 | 512; old detail drops while aggregate session scoring remains. |
| Native observation duration | 60,000 ms | 300,000 ms; stops with a recorded reason. |
| Supplied entries or one native batch | At most 10,000 processed | Excess entries make the score incomplete. |
| Attribution per sample | Up to five valid probe IDs and rectangles | Arbitrary text, values and DOM references are omitted. |

The observer defaults to `buffered: false`. `snapshot()` drains pending native records before returning a copied report; `stop()` drains once, disconnects and clears its timer/listeners. It also stops on document hiding or `pagehide`. Host cleanup must call `stop()` when the scope becomes inactive or is removed. A failing `onUpdate` callback makes the report incomplete rather than implying successful delivery.

The optional `root` **limits probe attribution only**. Native `LayoutShift.value` and aggregate scores remain document-wide for the observed entries. Buffered records can predate startup. The interval and completeness describe the captured window, not a full page lifetime, all frames or a field Core Web Vitals assessment.

Unsupported or incomplete data keeps `cls: null`; never replace it with a zero-shift pass. Read `supported`, `scoreComplete`, `status`, `findings` and `observation`. Partial aggregate totals may remain available for inspection. A supported, complete empty observation can report zero only for that window.

## Opt-in application diagnostics

`LiquidLayoutDiagnostics` exposes **Capture baseline**, **Check layout changes**, **Start shift recording**, **Stop shift recording** and **Copy layout report** inside a genuine SDK Collapsible. Agents discover its actual SDK children through the existing bridge; there is no new root action endpoint. The host supplies a target getter for a connected, marked region. Defaults are label `Layout diagnostics`, `active=true` and `defaultOpen=false`.

Capture is limited to **64 probes**, recording to **128 samples and 15 seconds**, with buffering disabled. Closing, deactivation and unmount stop observation. Set `active={false}` on inactive retained collections; the host owns visibility. Keep diagnostics outside the measured region where possible so opening a report is not itself a stable-control transition.

The component displays **Unvalidated**, status messages and selectable JSON. Clipboard failure reports unavailability and leaves the report readable. Reports stay local unless deliberately copied/exported. No background transmission, account service or persistence is supplied. Diagnostics does not move controls or infer human approval from automatic results.

The private `?collection=layouts&quality=1` gallery lab is an opt-in fixture. **Open placement lab** opens the SDK dialog **Layout quality fixtures**. Real SDK selects choose direction, corner, content length and deliberate faults. `anchor-offset`, `overflow` and `overlap` are test-only faults; they must never become normal application options.

Initial/reset baseline preparation starts after dialog readiness and observes for at most **5 seconds**; an audit retains its separate **1.5-second** budget. Both require three consecutive unchanged geometry comparisons, no running geometry animation, a visible document and a live uncancelled request. Each observation races the next animation frame against a **50 ms** timer; a per-observation guard accepts only the first callback and cancels the other. This permits measurement when software rendering delays paint callbacks without relaxing geometry tolerance or rendering preferences. Completion, timeout and cancellation clear all scheduled callbacks. The private fixture's `data-quality-settle` evidence records the result/reason, observation counts split by animation-frame and timer origin, elapsed time and at most eight geometry/animation-property samples; it retains no text or field values. Failed preparation displays that evidence, and the browser artifact retains it to distinguish scarce observations, continuing motion, changed geometry and hidden-tab cancellation. Healthy screenshot content is unchanged.

Fault checks cover both an already-open popup and Escape/reopen. The fixture uses independent translation to retain deliberate displacement after SDK positioning, and overlap margins to exercise native layout-shift entries while open. A selected fault must remain detectable after reopening; reset restores the healthy layout.

## Repeatable evidence

From the repository root:

```sh
npm run glass:agent-check
node --test tests/test_layout_quality.mjs
```

Properties use **seed `20261122`** and **200 runs per property**. They cover translation/RTL invariants, scroll compensation, expected changes, popup collisions, invalid input, session scoring, bounded attribution and observer cleanup. Node lifecycle checks use a controlled observer substitute; browser execution establishes native capability. Preserve a reported failing seed and shrink path. The fixed seed is in `propertyOptions`; rerunning the same command replays it.

Build and serve the production output in a separate terminal:

```sh
npm run glass:verify
python -m http.server 4185 --bind 127.0.0.1 --directory docs/hci/examples/liquid-glass/dist
```

Run the focused native browser scenario:

```sh
python -B tests/test_glass_browser.py --software-gpu --check layouts_quality_seeded_geometry_and_fault_detection --output test-results/layout-quality.json
```

The scenario uses **`0x51A7` (`20903`)**, recording exact cases in `layout-quality-seeded.json`. It covers widths **320, 390, 768 and 1440**, LTR/RTL, corners and short/long content, then introduces anchor drift, overflow and overlap separately. It checks settled popup geometry, unrelated control stationarity, native shifts, recent-input handling, reset recovery, accepted SDK diagnostics controls and representative application menus. Failure evidence includes seed, inputs, expected finding and actual report. A focused scenario is not a full-suite release pass; these source-level coverage statements do not claim execution passed.

Keep the existing complete browser suite, including real software-WebGPU checks, as the release gate. Its evidence is separate from six deterministic Solid/motion-off pixel states in [visual-regression.md](visual-regression.md). Local comparison requires reviewed, committed baselines; candidate capture is never approval. Hosted Chromatic uses the real Playwright fixture/CLI only when `CHROMATIC_PROJECT_TOKEN` is available. A missing token explicitly **SKIPs** that stage while local comparison remains required. Configuration alone does not prove a hosted run occurred.

Record exact revision, commands, browser, viewports, failures and artifacts. Geometry, shift scores, pixel comparison, runtime acceptance and human UI/UX review remain separate conclusions.

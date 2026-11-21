# App layout visual regression

## Evidence boundaries

The visual lane compares six deterministic states of the actual production React gallery. It uses the installed SDK controls, the shared provider, locally served Manrope fonts and the opt-in placement lab at `/?collection=layouts&quality=1`.

The snapshot profile explicitly selects **Solid** surfaces and turns **Animate glass** off through the gallery's existing persisted preference inputs. It also requests reduced motion. Tests assert those effective provider values. They do not inject a replacement skin, hide failing UI, mock a component, or claim that a static screenshot verifies GPU contribution. Screenshot capture allows animations; the application's explicit motion preference establishes the static state.

The existing `WebGPU Liquid Glass kit` workflow remains responsible for live motion, shader pixels, recapture, fallback behavior, agent contracts and the wider interaction suite. Neither its execution nor the runtime package depends on a paid visual service. A screenshot baseline also does not establish WCAG conformance, human recognition or UI/UX approval. Custom components remain **Unvalidated**.

## Deterministic states

| Snapshot | Viewport | State |
| --- | --- | --- |
| `desktop-review.png` | 1440 × 1000 | Review list and evidence layout |
| `desktop-bottom-end-popup.png` | 1280 × 900 | Genuine SDK menu near the bottom/end viewport corner |
| `desktop-rtl-top-start-popup.png` | 1280 × 900 | Right-to-left placement with a top/start anchor |
| `phone-320-review.png` | 320 × 850 | Narrow review navigation and task list |
| `phone-390-inspector.png` | 390 × 844 | Open compact inspector with heading focus |
| `phone-390-long-popup.png` | 390 × 844 | Long menu content near a phone viewport corner |

Each test gets a fresh context with fixed locale, timezone, scale, viewport and presentation preferences. The browser may request only the reviewed loopback build. Fixture Select values are discovered and changed through the real SDK bridge, then checked against the accepted visible control value. Popups must remain inside the viewport. Runtime page and console errors fail the test.

The phone inspector first verifies heading focus, then explicitly aligns the application canvas to the viewport's bottom edge and checks its bounds. This preserves the reviewed framing independently of earlier click/focus scrolling. A fully visible canvas must not retain an incidental scroll offset merely because `scrollIntoViewIfNeeded()` has nothing to do.

## Local pixel comparison

Pinned development tools are `@playwright/test@1.65.1`, `@chromatic-com/playwright@1.0.0`, `chromatic@18.15.1` and `@types/node@24.19.2`. The Node visual runner and existing Python `playwright==1.65.2` harness are separate dependencies; their installed browser versions are evidence recorded by the respective runs. Node 24 satisfies the visual tools' engine requirements. `npm run glass:visual:typecheck` checks the visual configuration and test source with the dedicated strict TypeScript configuration.

Run from the repository root:

```sh
npm ci --ignore-scripts
npm run glass:visual:typecheck
npm run glass:build
npm exec -- playwright install chromium
npm exec -- playwright test --config playwright.visual.config.ts
```

Reference images live in `tests/visual/baselines/chromium-linux/`. The CI environment is Ubuntu 24.04 with the locked Chromium installation. Baselines generated on another platform must not silently replace that reference set: browser and platform differences can change rendering.

The configuration sets `updateSnapshots: "none"`. Missing references and changed pixels fail a normal run. The perceived-colour threshold is `0.1`; there is **no allowed differing-pixel count** (`maxDiffPixels: 0`). This tolerates only small per-pixel antialiasing colour differences, not an area of layout changes. No broad masks or screenshot-only CSS exclusions are configured. Failed comparisons retain expected/actual/diff images, traces and the Playwright report under `test-results/layout-visual/`.

### Establish or intentionally update a baseline

1. Run the `Layout visual regression` workflow manually with `baseline_mode: candidates`, or use `GLASS_VISUAL_BASELINE_MODE=candidates` locally in the same environment.
2. Inspect all six candidate PNGs and their states against the intended interface. Candidate mode writes only output artifacts; it neither compares nor approves a baseline. Its job name and summary say so.
3. Copy only explicitly reviewed candidates to the named paths under `tests/visual/baselines/chromium-linux/`, record the review decision in the change description, and commit those files.
4. Run normal comparison mode and require it to pass. A failed comparison is investigated before any reference update.

CI never commits images, calls `--update-snapshots`, or automatically accepts a visual change. Baseline files are included in this inexpensive lane and are absent from the existing full GPU workflow's path filters. GitHub evaluates a pull request's cumulative changed paths, however: a baseline-only push to a PR that also changes application source can still rerun the full GPU workflow. Its gates remain unchanged.

## Optional hosted Chromatic comparison

The tests import `test`, `expect` and `takeSnapshot` from **`@chromatic-com/playwright`**. They set `disableAutoSnapshot: true` and take exactly the named snapshots when `GLASS_CAPTURE_CHROMATIC=1`. This is the real Chromatic fixture and archive API. The CLI consumes those archives after Playwright completes; it does not run Playwright itself. The matching `CHROMATIC_ARCHIVE_LOCATION` and Playwright `outputDir` are `test-results/layout-visual/test-output`; the HTML report is a sibling directory so its cleanup cannot delete test artifacts.

The workflow checks whether `CHROMATIC_PROJECT_TOKEN` is available without printing its value. The token is exposed only to the availability step and the Chromatic CLI, not the build or browser test process. When unavailable—including fork runs without secrets—the workflow emits **Chromatic: SKIPPED**, skips the hosted step and claims no hosted result. Local pixel comparison still runs and must pass. Candidate capture also skips hosted upload deliberately.

When the existing project token is configured, local comparisons must first pass; then the CLI runs with the pinned `chromatic.config.json`. It waits for the hosted result and fails on visual changes or errors. `autoAcceptChanges`, `exitZeroOnChanges` and `exitOnceUploaded` are false. No `skip` flag that marks a build as passing is used. TurboSnap is disabled because Chromatic does not support it for Playwright archives. The workflow checks out and identifies the exact PR head for hosted branch tracking.

No Chromatic project, account, subscription or permission is created by this integration. Repository secret availability could not be inspected in the implementation workspace: the GitHub connector exposed no secrets metadata operation, and the local GitHub CLI was unauthenticated. The workflow's runtime availability check is authoritative. A first hosted reference build establishes comparison data; it is not evidence of prior approval. Review any hosted baseline and later changes through the existing project's review process.

For a configured local environment, the equivalent commands are:

```sh
GLASS_CAPTURE_CHROMATIC=1 npm exec -- playwright test --config playwright.visual.config.ts
CHROMATIC_ARCHIVE_LOCATION=test-results/layout-visual/test-output npm exec -- chromatic --playwright --config-file chromatic.config.json --no-interactive
```

Provide `CHROMATIC_PROJECT_TOKEN` through the environment or existing secret management, never in a committed file or a copied command argument. Do not describe the hosted checks as passed until an actual Chromatic result exists.

## Primary references

- [Chromatic: Playwright setup and fixture integration](https://www.chromatic.com/docs/playwright/).
- [Chromatic: targeted `takeSnapshot` calls](https://www.chromatic.com/docs/playwright/targeted-snapshots/).
- [Chromatic: Playwright configuration and archive location](https://www.chromatic.com/docs/playwright/configure/).
- [Chromatic: CLI authentication and Playwright execution](https://www.chromatic.com/docs/cli/).
- [Chromatic: exact configuration schema](https://www.chromatic.com/config-file.schema.json).
- [Chromatic: GitHub Actions and source revision tracking](https://www.chromatic.com/docs/github-actions/).
- [Playwright: screenshot comparisons, environments and baseline updates](https://playwright.dev/docs/test-snapshots).

These describe tool behavior and integration. They are not evidence that this repository's screenshots, hosted checks, or human review have passed.

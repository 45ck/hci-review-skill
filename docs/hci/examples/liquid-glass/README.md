# Liquid Glass component gallery

An internal component gallery for `@quantitative-hci/liquid-glass`, covering **55 UI SDK component families** with working examples. Search or filter the catalogue, change the shared material and theme, and exercise the controls and overlays directly.

The gallery demonstrates an Apple-inspired web material over the genuine Vercel UI SDK React components. It is not a screenshot-only theme or a replacement interaction engine.

## Run

Use Node 22.12 or later. Run these commands from the repository root:

```sh
npm ci --ignore-scripts
npm run glass:dev
```

Open `http://127.0.0.1:4185/`. For a production build:

```sh
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

## What to try

| Area | Interaction |
| --- | --- |
| Catalogue | Search by component name, filter a category and clear the filter. |
| Material | Compare glass with solid, switch light/dark and adjust the shared material settings. |
| Inputs | Type, choose a date, select an option, adjust a slider and switch checked states. |
| Overlays | Open dialogs, drawers, menus and popovers; dismiss with Escape and check focus returns to the trigger. |
| Navigation | Change tabs, page a collection and expand a tree. |
| Feedback | Trigger a toast and inspect progress, meter and other state displays. |
| Accessibility preferences | Use reduced motion, reduced transparency and stronger contrast; the same actions remain available. |

All content is demonstration data. The gallery does not send form contents or uploaded files to a backend, connect an account, purchase anything or publish user input.

## Verification

Install Playwright if it is not already available:

```sh
python3 -m pip install playwright==1.65.2
python3 -m playwright install chromium
```

Keep the production preview running and execute:

```sh
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

Pass `--executable /path/to/chromium` to use an installed browser. The suite checks the complete manifest against the rendered catalogue, real control changes, keyboard selection, overlay dismissal/focus, display preferences and a narrow viewport. Results distinguish checks from unmeasured human usability or accessibility conformance.

`npm run glass:check` enforces catalogue coverage, local-package imports, version pins and preference styles. `npm run glass:build` typechecks and builds the gallery. CI runs these only for relevant paths with a bounded browser run and short artifact retention.

## Integration

- [Reusable package](../../../../packages/liquid-glass/README.md)
- [Material standard](../../standards/liquid-glass.md)
- [Existing settings/agent pilot](../ui-sdk-pilot/README.md)
- [Original spotlight example](../spotlight-glass.html)

The new gallery does not revise or reuse the older pilot's measured performance results. Treat each package version, fixture and browser run as its own evidence.

# Spotlight glass

Spotlight glass is the default visual treatment for new high-fidelity Quantitative HCI examples and prototypes without an established design system. Use it on scorecards, overview panels and other cards with short, scannable content. Use the product’s own visual system when it already has one. Use solid surfaces for dense content and whenever glass makes the interface harder to read.

Open [spotlight-glass.html](spotlight-glass.html) locally in a browser. It starts in **Glass** mode. Move a mouse near a card edge to see the border light follow it, then switch to **Solid** with the surface control. Both modes show the same values from the [synthetic evaluation](../models/example-comparison.json).

## Build the surface

| Layer | Default |
| --- | --- |
| Base | Start with an opaque surface and a quiet border. Add a translucent tinted fill and backdrop blur where the browser supports it. |
| Spotlight | Put the radial highlight on the border and keep the fill steady. A static border highlight works for touch and reduced-motion settings. |
| Content | Keep labels and data legible over the final composited surface. Give numbers room to align and preserve the same reading order in both modes. |
| Controls | Use semantic controls and a visible keyboard focus ring independent of the spotlight. Preserve labels and values in forced-colours mode. |

## Review the result

- Check WCAG contrast against the lightest and darkest rendered backdrop the card can encounter. Use solid fill where contrast cannot be maintained.
- Test the keyboard and touch paths with the same controls and content. Verify that forced colours and the opaque fallback preserve all information and actions.
- When adding the treatment to an existing workflow, compare both variants on the same task. Use the [evaluation protocol](../models/evaluation-protocol.md) to assess task completion, errors, and timing. The glass style does not affect the HCI score by itself.

## Run the browser audit

Install the optional browser-audit dependencies, then run from the repository root.

```bash
python3 -m pip install playwright pillow
python3 -m playwright install chromium
python3 -B docs/hci/models/audit-spotlight.py > spotlight-audit.json
```

Pass `--executable /path/to/chromium` to use an installed Chromium build. The report
records the fixture hash, browser version, worst text sample per state, pointer
updates and input checks. The command exits with status 1 if a fixture check fails.

| Fixture check | Chromium 153 result |
| --- | --- |
| Desktop glass at rest and under the pointer | Minimum sampled text contrast 8.04:1 in both states |
| Glass cards over a bright `#f5f7ff` test backdrop | Minimum sampled text contrast 5.03:1 |
| Desktop solid mode | Minimum sampled text contrast 8.78:1 |
| 320 CSS px touch profile | Minimum sampled text contrast 7.23:1, 44 CSS px minimum target dimension, no horizontal overflow |
| 24 pointer events before one frame | 2 inline style mutations, applying the latest coordinates once |
| Keyboard, reduced motion and forced colours | Both surface choices operable by keyboard with a 2 CSS px focus outline, static reduced-motion border, metric text visible with glow and blur disabled in forced colours |

For the contrast audit, Chromium renders the background with glyph ink hidden and
the script samples the pixels under each visible line's bounds. It uses computed
opaque sRGB foreground colours and the [model calculator's](../models/measure.py)
WCAG contrast formula. The fixture applies a 4.5:1 floor to all sampled text and
a 44 CSS px minimum dimension to the surface-switch controls. The bright-backdrop
and opaque-fallback cases test card text. The fallback is simulated with a CSS
override. Forced colours, touch and reduced motion are browser emulations.

These measurements describe this fixture and its test backdrops. Check the actual
backgrounds, fonts, devices and input paths when applying the default to a
product. Use the [evaluation protocol](../models/evaluation-protocol.md) to
evaluate effects on reading, task completion or errors.

Visual reference [Julien Thibeaut’s border-only Spotlight on 21st.dev](https://21st.dev/?q=spotlight+card&preview=%2F%40ibelick%2Fcomponents%2Fspotlight%2Fborder-only) and [Motion Primitives Spotlight](https://motion-primitives.com/docs/spotlight). Accessibility references [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [MDN media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility).

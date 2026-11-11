# Liquid Glass

Apple-inspired Liquid Glass is the default visual treatment for controls in new high-fidelity Quantitative HCI examples and prototypes without an established design system. Apply the product’s own design system where one exists.

Open [spotlight-glass.html](spotlight-glass.html) locally. The toolbar starts in **Glass** mode. Move a mouse across the toolbar to see light follow the edge, or use the **Solid** option to compare surfaces. The chart and values come from the same [synthetic evaluation](../models/example-comparison.json). [Desktop screenshot](../../../assets/spotlight-glass-preview.webp) · [Mobile dark-mode screenshot](../../../assets/spotlight-glass-mobile.webp)

| Layer | Treatment |
| --- | --- |
| Background | Soft colour underlays give the glass something to pick up. |
| Content | Solid charts, tables and reading surfaces keep text and metrics consistent across backdrops. |
| Controls | A tinted translucent fill, backdrop blur, inset rim and quiet shadow give controls depth. Match the radii of nested elements to keep the edges aligned. |
| Spotlight | A border-only highlight tracks a mouse. It stays static with touch or reduced motion and disappears in solid and reduced-transparency modes. |
| Fallback | Solid fill preserves legibility without blur support. Native controls, a visible focus ring and explicit labels preserve the same actions in forced colours. |

## Measure the effect

- Check text and focus contrast on the final composited surface in light and dark themes. Sample the brightest and darkest backdrop expected behind the control.
- Check whether first-time users find the action. Record correct first action, task completion and time in both versions using the [evaluation protocol](../models/evaluation-protocol.md).
- Confirm that switching material leaves the control bounds and reading order stable. Check keyboard, touch, reduced motion, reduced transparency and forced colours.
- Prefer Solid if glass makes the action harder to find or its label harder to read.

## Reproduce the browser audit

Install the optional audit dependencies and run the audit from the repository root.

```bash
python3 -m pip install playwright pillow
python3 -m playwright install chromium
python3 -B docs/hci/models/audit-spotlight.py
```

Use `--profile desktop_dark` to run one profile or `--executable /path/to/chromium` to select an installed Chromium. The report includes the fixture hash, sampled contrast, input checks and a failing exit status when a check misses its threshold.

| Check | Chromium 153 result |
| --- | --- |
| Desktop, light and dark | Minimum sampled text contrast was 5.40:1 in light and 7.44:1 in dark across the normal surface states. Keyboard switching preserved layout and showed a 2 CSS px focus ring. |
| Dark toolbar over a bright test backdrop | The minimum sampled toolbar-label contrast was 7.23:1. |
| Touch at 320 CSS px | Both targets were 68 × 44 CSS px. Minimum sampled text contrast was 6.21:1. Both choices worked without horizontal overflow. |
| 24 pointer events in one frame | Two style updates applied the latest coordinates. |
| Reduced motion, reduced transparency and forced colours | The spotlight stopped tracking. Blur and glow were disabled for reduced transparency and forced colours. Metric text remained visible. |

The audit samples rendered pixels beneath the text bounds with glyph ink hidden. It checks this fixture in Chromium, including emulated preferences. Measure the actual device, backdrop and task when adopting the pattern in a product.

[Apple’s materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) · [Julien Thibeaut’s border-only Spotlight](https://21st.dev/?q=spotlight+card&preview=%2F%40ibelick%2Fcomponents%2Fspotlight%2Fborder-only) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

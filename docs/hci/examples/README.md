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

Visual reference [Julien Thibeaut’s border-only Spotlight on 21st.dev](https://21st.dev/?q=spotlight+card&preview=%2F%40ibelick%2Fcomponents%2Fspotlight%2Fborder-only) and [Motion Primitives Spotlight](https://motion-primitives.com/docs/spotlight). Accessibility references [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [MDN media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility).

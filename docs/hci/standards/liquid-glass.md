# Liquid Glass standard

**Status:** Default material for new high-fidelity Quantitative HCI examples and internal prototypes without an existing product design system.

The implementation is an original web material inspired by Apple Liquid Glass. It is a styled layer over Vercel's UI SDK, with shared tokens, preference handling and interactive examples. It is not Apple's native rendering implementation and does not claim optical equivalence.

## Who this is for

Use this standard when building a new internal tool, interaction prototype or component example under Quantitative HCI. A product's established design system takes precedence. Low-fidelity wireframes and research instruments should use the fidelity required by the study rather than adding decorative effects.

## Background

UI SDK provides headless interaction primitives. Its React adapter supplies component behaviour and state attributes, while this package supplies material and visual rules. Keeping those responsibilities separate preserves keyboard navigation, focus handling and accessible semantics as the material changes. [UI SDK source and adapter](https://github.com/vercel-labs/ui/tree/b4dbe88209ecf4dc555225f630268095f510ad49/packages/react)

Apple's guidance places Liquid Glass primarily on controls and navigation that float over content. Regular glass supports readability; a clearer material is appropriate for richer visual backgrounds. The shared web theme follows that hierarchy. [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials)

The earlier GPU lens experiment refracts a texture rendered into its own canvas. It cannot automatically refract arbitrary HTML behind a component. The component standard therefore keeps labels, forms and interaction targets in the DOM and applies the material to their surfaces. Any optical enhancement must preserve this separation and have a working CSS/solid fallback.

## Material rules

| Surface | Default | Reason |
| --- | --- | --- |
| Buttons, segmented controls, toolbars and navigation | Regular tinted glass | Creates a consistent interactive layer. |
| Controls over imagery | Clearer glass with protected foreground contrast | Lets the image show through without losing the action. |
| Dialogs, menus, drawers and popovers | More substantial regular glass | Maintains text and item readability over unpredictable content. |
| Dense data, long text, charts and tables | Stable content surface with glass around controls | Preserves information hierarchy and avoids distortion under labels. |
| Destructive actions, errors and selection | Explicit semantic colour, text and state | Material alone must not communicate meaning. |
| Reduced transparency or unsupported blur | Solid material | Keeps controls usable without the visual effect. |
| Increased contrast and forced colours | Strong foreground separation and system-colour borders | Keeps focus and boundaries perceptible. |
| Reduced motion or touch | Static lighting, immediate state feedback | Removes pointer-following and elastic decoration. |

## Component coverage

`packages/liquid-glass/component-manifest.json` is the source of truth for the shipped catalogue. It records the upstream reference, pinned SDK version and the 55 covered component families: the 54 upstream example families and the exported Time Input component.

Every entry has a public package subpath and a working gallery specimen. Behaviour remains in the pinned UI SDK packages. The gallery groups related components and supports search, so all specimens are discoverable without one long undifferentiated list.

The package is private and consumed through the repository workspace. It is not published to npm. Existing benchmarks continue to use their own original dependency pins.

## Implementation requirements

1. Import the shared material stylesheet once, then import primitives from explicit package subpaths such as `@quantitative-hci/liquid-glass/button`.
2. Use the shared material provider for theme, surface and accessibility preferences. Apply the material scope to portalled overlays as well as the page root.
3. Keep decorative layers non-interactive. Do not change a control's layout or hit target merely because the material mode changes.
4. Use shared semantic tokens for colours, radii, spacing, opacity and focus. Override a documented token when a product needs a variation; do not duplicate a standalone blur/border/shadow recipe in each component.
5. Keep focus rings visible, provide explicit labels, and preserve disabled, selected, invalid, loading and expanded states.
6. Avoid a continuously running GPU renderer for each control. Any enhanced optics must share work, stop when not needed and retain a readable fallback.
7. Include an interactive gallery example and add checks when introducing or materially changing a component family.

## Verification contract

| Check | Required evidence | What it does not establish |
| --- | --- | --- |
| Manifest and import check | All catalogue IDs, package exports and real demo entries agree; SDK version is pinned. | Runtime interaction correctness. |
| TypeScript and production build | The complete gallery compiles against the installed SDK version. | Correct appearance in every browser. |
| Browser interactions | Search, category filtering, form changes, keyboard selection, overlays and focus restoration. | Human task speed or learnability. |
| Preferences | Solid material, light/dark, reduced motion and forced-colour checks. | Full accessibility conformance. |
| Responsive layout | Mobile width and component overflow checks. | Coverage of every device. |
| Visual inspection | Actual rendered controls and overlays over light/dark and varied backgrounds. | Physical optical accuracy. |
| Human comparison, when needed | Matched tasks, completion/errors, time and user preference using the existing HCI evaluation protocol. | General improvement without representative samples. |

From the repository root:

```sh
npm ci --ignore-scripts
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

With the preview running, use another terminal:

```sh
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

The browser suite writes actual outcomes and browser metadata. It must fail on a failed assertion or uncaught page error. The CI workflow runs only for relevant paths, cancels superseded runs and limits runtime and artifact retention.

## Adoption decision

Use the package for the next new high-fidelity internal interface and keep the gallery as the review surface. Prefer solid material for a component if the real backdrop, task or device makes glass harder to use. Record that choice in the component or product documentation; no user-facing legalistic explanation is required.

## References

- [UI SDK reference commit](https://github.com/vercel-labs/ui/tree/b4dbe88209ecf4dc555225f630268095f510ad49)
- [UI SDK styling and animation](https://github.com/vercel-labs/ui/blob/b4dbe88209ecf4dc555225f630268095f510ad49/apps/docs/content/docs/react/styling-and-animation.mdx)
- [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Quantitative HCI evaluation protocol](../models/evaluation-protocol.md)

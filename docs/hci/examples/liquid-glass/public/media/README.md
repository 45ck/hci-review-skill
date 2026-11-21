# Quantive visual showcase artwork

Three original AI-generated artworks demonstrate landscape, studio/product, and architectural content in the kit. The coastline and pavilion are fictional; these are not photographs documenting a real location or building. The glass still life is artwork, not a screenshot of the runtime WebGPU renderer.

`sources.json` records the exact prompts, generation date, original output hashes, and runtime asset hashes. ImageMagick resizes and encodes the generated PNGs as WebP, without cropping or retouching. The 1200 × 800 version is served for large figures; the 600 × 400 version is available through `srcset` for smaller layouts and thumbnails. There are no remote image requests.

| Asset | Intended content examples |
| --- | --- |
| `emerald-coast.webp` | Editorial feature, travel story, collection cover |
| `glass-study.webp` | Product still life, material collection, image detail |
| `quiet-pavilion.webp` | Architecture portfolio, case study, visual comparison |

The gallery's previous/next controls, thumbnail indicators, and page state use the installed UI SDK Carousel. It never rotates automatically. The image detail uses its Dialog, including Escape dismissal and focus return. Saving uses its Toggle. The reveal comparison uses its Slider and provides non-drag preset buttons. All three custom compositions retain **Unvalidated** labels: no human UI/UX team has reviewed or approved them.

Images have descriptive alternatives; duplicate thumbnail images use empty alternatives because their named selector supplies the control's purpose. Generated imagery does not replace text, controls, UML, UWE models, or other exact information.

The shared components are exported from `@quantitative-hci/liquid-glass/media`, with `@quantitative-hci/liquid-glass/media.css`. Demo data and controlled state live in `src/visual-showcase.tsx`. Gallery choices are local to the current mount of that section, and the UI says so.

Design references: [WAI-ARIA Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/), [W3C Functional Images](https://www.w3.org/WAI/tutorials/images/functional/), and the installed UI SDK component/agent documentation for version `0.1.0-beta.13`.

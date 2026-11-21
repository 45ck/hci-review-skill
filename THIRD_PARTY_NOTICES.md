# Third-party notices

## Vercel UI SDK

The Liquid Glass workspace depends on `@ui-sdk/core` and `@ui-sdk/react` version `0.1.0-beta.13` from [vercel-labs/ui](https://github.com/vercel-labs/ui). UI SDK is copyright 2026 Vercel, Inc. and licensed under the [Apache License 2.0](https://github.com/vercel-labs/ui/blob/b4dbe88209ecf4dc555225f630268095f510ad49/LICENSE).

The original Quantitative HCI layer uses published component APIs, state attributes and the upstream base stylesheet. Its component subpaths delegate to the upstream adapter rather than reproducing the core interaction engine. Upstream source was inspected at commit `b4dbe88209ecf4dc555225f630268095f510ad49` when preparing the 55-family catalogue. Preserve dependency licence notices when distributing a bundled application.

## React

React and React DOM are copyright Meta Platforms, Inc. and affiliates, under the [MIT licence](https://github.com/facebook/react/blob/main/LICENSE).

## Lucide

Lucide icons are provided under the [ISC licence](https://github.com/lucide-icons/lucide/blob/main/LICENSE). The gallery uses the pinned `lucide-react` dependency for interface icons.

## Bundled typography

Manrope is copyright 2018 The Manrope Project Authors, and Fraunces is copyright 2018 The Fraunces Project Authors. Both are distributed under the SIL Open Font License 1.1. The kit includes unchanged Google Fonts WOFF2 subsets; the exact source URLs, retrieval date, sizes and SHA-256 hashes are recorded in `packages/liquid-glass/src/assets/fonts/sources.json`. The full licences are retained in `packages/liquid-glass/LICENSES/` and the demo's `public/licenses/` directory. Fonts are served with the application and do not require a runtime font CDN.

## Quantive Glass artwork

The custom object icons are original vector redraws of an image-generated art-direction sheet. The reference, generation prompt and reproducible vector source are preserved in `packages/liquid-glass/assets/icon-reference/`; the standalone SVGs and provenance are in `packages/liquid-glass/assets/icons/`. Production assets contain vector geometry, with no embedded raster. They are covered by this repository's MIT licence. The generated reference is not part of the runtime bundle.

## Reference WebGPU shader

The kit adapts the signed-distance shape, refraction, colour dispersion and Fresnel terms from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, copyright 2026 arya3d, under the MIT licence. The local renderer instances the adapted shader across actual SDK control and panel bounds, shares its GPU pipeline and backdrop texture, and uses local canvases for top-layer popups. It is not an unchanged shader in an isolated lens scene. The complete notice is retained at `packages/liquid-glass/LICENSES/arya3d-MIT.txt` and ships at `docs/hci/examples/liquid-glass/public/licenses/arya3d-liquid-glass-MIT.txt`.

`html2canvas-pro` version `2.6.3` is provided under MIT, copyright Niklas von Hertzen and contributors. Its notice is retained with the distribution. WebGPU TypeScript types are development-only and retain their upstream licence.

## Interaction and material references

The user supplied the source of [Nimbus Liquid Glass Navbar](https://21st.dev/@gughigug/components/liquid-glass-navbar) by Guglielmo Giannattasio and [Coffee Pour Menu](https://21st.dev/@aakashmehra/components/coffee-pour-menu) by Aakash. Their visible 21st.dev pages identify MIT licensing. Directional rim light, a damped ripple and a travelling spring selection informed the shared kit implementation. The kit continues to use UI SDK controls and its own shared WebGPU renderer; it does not package either complete reference component or add their runtime dependencies.

The [Liquid Glass Checkout](https://21st.dev/@gughigug/components/liquid-glass-checkout), [Glassmorphism Folder Cards](https://21st.dev/@kedhareswer/components/glass-folder-cards) and [Glassy Dashboard](https://21st.dev/@automateflows/components/glassy-dashboard) previews were inspected as visual references for layered reflections, underside shading and quieter surface depth. Their locked component source was not retrieved.

## Work and assistant pattern references

The Patterns and Assistant collections use familiar compositions described by [shadcn/ui Command](https://ui.shadcn.com/docs/components/radix/command), [Data Table](https://ui.shadcn.com/docs/components/radix/data-table), [Sheet](https://ui.shadcn.com/docs/components/base/sheet) and [Empty](https://ui.shadcn.com/docs/components/radix/empty), and by Vercel AI Elements [Prompt Input](https://elements.ai-sdk.dev/components/prompt-input), [Attachments](https://elements.ai-sdk.dev/components/attachments), [Suggestion](https://elements.ai-sdk.dev/components/suggestion), [Message](https://elements.ai-sdk.dev/components/message) and [Sources](https://elements.ai-sdk.dev/components/sources). The shadcn/ui repository is [MIT-licensed](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md), copyright 2023 shadcn. The AI Elements repository is [Apache-2.0-licensed](https://github.com/vercel/ai-elements/blob/main/LICENSE), copyright 2023 Vercel, Inc.

The public [21st.dev Aadi Prompt Input](https://21st.dev/@aadixc0de/components/prompt-input) and [Kokonut AI Input With File](https://21st.dev/@kokonutd/components/ai-input-with-file) listings also informed the composer arrangement. Both listings identify MIT licensing; Kokonut's [repository licence](https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE) is copyright 2025 kokonutUI. Account-gated source was not retrieved. These are pattern references: the additions contain no copied third-party component source. Quantive composes its existing UI SDK controls and shared material, without packaging those complete external components or their interaction dependencies. See [Established library patterns](docs/hci/standards/library-patterns.md) for the inspected sources, feature boundaries and evidence requirements. Preserve the relevant licence and notices if a later change directly copies or adapts third-party source.

## Apple visual reference

Apple's Liquid Glass and Human Interface Guidelines are visual and interaction references. No Apple framework, proprietary rendering implementation, endorsement or affiliation is represented by this web material. Apple names and marks remain their owners' property.

## Project licence

Original Quantitative HCI source and documentation remain under this repository's [MIT licence](LICENSE). A private workspace package does not change the upstream dependency licences or the repository's visibility.

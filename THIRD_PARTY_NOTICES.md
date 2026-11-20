# Third-party notices

## Vercel UI SDK

The Liquid Glass workspace depends on `@ui-sdk/core` and `@ui-sdk/react` version `0.1.0-beta.13` from [vercel-labs/ui](https://github.com/vercel-labs/ui). UI SDK is copyright 2026 Vercel, Inc. and licensed under the [Apache License 2.0](https://github.com/vercel-labs/ui/blob/b4dbe88209ecf4dc555225f630268095f510ad49/LICENSE).

The original Quantitative HCI layer uses published component APIs, state attributes and the upstream base stylesheet. Its component subpaths delegate to the upstream adapter rather than reproducing the core interaction engine. Upstream source was inspected at commit `b4dbe88209ecf4dc555225f630268095f510ad49` when preparing the 55-family catalogue. Preserve dependency licence notices when distributing a bundled application.

## React

React and React DOM are copyright Meta Platforms, Inc. and affiliates, under the [MIT licence](https://github.com/facebook/react/blob/main/LICENSE).

## Lucide

Lucide icons are provided under the [ISC licence](https://github.com/lucide-icons/lucide/blob/main/LICENSE). The gallery uses the pinned `lucide-react` dependency for interface icons.

## Reference WebGPU shader

The kit adapts the signed-distance shape, refraction, colour dispersion and Fresnel terms from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, copyright 2026 arya3d, under the MIT licence. The local renderer instances the adapted shader across actual SDK control and panel bounds, shares its GPU pipeline and backdrop texture, and uses local canvases for top-layer popups. It is not an unchanged shader in an isolated lens scene. The complete notice is retained at `packages/liquid-glass/LICENSES/arya3d-MIT.txt` and ships at `docs/hci/examples/liquid-glass/public/licenses/arya3d-liquid-glass-MIT.txt`.

`html2canvas-pro` version `2.6.3` is provided under MIT, copyright Niklas von Hertzen and contributors. Its notice is retained with the distribution. WebGPU TypeScript types are development-only and retain their upstream licence.

## Apple visual reference

Apple's Liquid Glass and Human Interface Guidelines are visual and interaction references. No Apple framework, proprietary rendering implementation, endorsement or affiliation is represented by this web material. Apple names and marks remain their owners' property.

## Project licence

Original Quantitative HCI source and documentation remain under this repository's [MIT licence](LICENSE). A private workspace package does not change the upstream dependency licences or the repository's visibility.

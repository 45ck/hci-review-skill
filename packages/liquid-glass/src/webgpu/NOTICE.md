# Liquid Glass renderer provenance

This renderer adapts the signed-distance lens, separate RGB samples, Fresnel approximation and edge-lighting approach from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, linked by the user's [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g).

Copyright © 2026 arya3d. The complete [MIT notice](../../LICENSES/arya3d-MIT.txt) must accompany redistributed substantial source portions. The original attribution credits Inigo Quilez for rounded-box distance and Christophe Schlick for the Fresnel approximation.

The kit changes the original single-pill shader into instanced rectangular DOM surfaces, uses measured CSS radii and clipping, supplies a transparent premultiplied output, limits bevel width on large panels, and shares a GPU device/pipeline across the viewport and top-layer popup canvases. Popup pixels include the light 42% material tint because their local canvas paints above the host's CSS background; normal viewport surfaces receive their tint from the live DOM. Optical edge-lighting remains above the tint. This is adapted source, not the unchanged reference shader or Apple's own implementation.

Only the explicitly supplied backdrop is captured with html2canvas-pro. Live SDK controls retain DOM semantics above the optical layer. Capture is refreshed after backdrop mutation or resizing, or through `refresh()`. Visible surface geometry updates for scrolling, UI state, pointer and focus changes; short transition tracking is disabled for reduced motion. Reduced transparency and forced colours select the readable CSS fallback. WebGPU absence or errors are reported truthfully.

The current budget is 256 visible surfaces and a device-limited pixel ratio capped at 2. Background capture is a snapshot and cannot reproduce arbitrary live videos, protected cross-origin media or unsupported DOM/CSS features. One provider owns a document. Screenshot and automated interaction evidence cannot establish human usability or exact optical equivalence.

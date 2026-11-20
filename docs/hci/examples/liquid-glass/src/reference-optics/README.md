# Reference optical lens

The shader and uniform definitions are from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, the source linked by the [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g). The WGSL shader is unchanged. Copyright © 2026 arya3d, MIT; the complete notice ships in `public/licenses/arya3d-liquid-glass-MIT.txt`.

The shader samples a captured DOM region, computes a rounded-box signed distance, bends RGB lookup coordinates, and adds colour dispersion, a Schlick Fresnel term, specular edge light and a rim. These are the source project's approximations, not a claim of a physically exact optical simulation or Apple implementation.

The refraction control ranges from 1 to 60 (the shader receives 0.01 to 0.60; the reference default is 0.30). The source divides by this value, and retains independent RGB spread and lighting terms. Zero is therefore not exposed as a misleading "no effect" setting.

The renderer and capture integration are adapted here for a bounded React example. Only the dedicated local backdrop is captured, using html2canvas-pro. It contains no external media or user-entered content. Capture runs on initialisation, region resize, sample changes or explicit refresh, never on every animation frame. Pixel ratio is capped at 2 and the GPU texture limit. Position and optical changes draw on demand. GPU textures, buffer, context, device, observer and queued frames are cleaned up on unmount.

Live UI SDK buttons remain DOM elements above the canvas; SDK sliders expose the same position and strength state used by the renderer. The canvas is decorative and never substitutes for control semantics. System reduced-transparency and forced-colour preferences suppress the effect. A browser without a usable WebGPU adapter reports that limitation and keeps controls usable.

This demonstrates the reference technique over one controlled region. Arbitrary live DOM capture has fidelity, refresh and performance limitations; this experiment is not a production renderer for every component or proof of better human usability.

# UI SDK and Liquid Glass experiments

**Status:** The upstream UI SDK is the component baseline. Frosted CSS and the reference WebGPU lens are optional, distinct experiments. This replaces the earlier requirement to apply Liquid Glass to every new high-fidelity interface.

The Quantitative HCI workbench demonstrates real component behavior, its agent-facing API and the effect of optional material treatments. A product's established design system and the fidelity required by a study take precedence. The appearance experiment is not evidence that glass improves usability.

## Sources and versions

| Layer | Source | Contract |
| --- | --- | --- |
| Component behavior and agent tools | `@ui-sdk/react` and `@ui-sdk/core`, both pinned to **0.1.0-beta.13** | Import documented upstream entries directly. Keep APIs and semantics intact. |
| Component catalogue reference | [vercel-labs/ui at b4dbe88209ecf4dc555225f630268095f510ad49](https://github.com/vercel-labs/ui/tree/b4dbe88209ecf4dc555225f630268095f510ad49) | Cover the 54 upstream example families and the exported Time Input family. |
| Baseline appearance | `@ui-sdk/core/web.css` from the pinned package | Retain its geometry and state treatments unless a specific example requires a documented change. |
| Optional Frosted CSS | `packages/liquid-glass/src/{tokens.css,styles.css,material.tsx}` | Scope every material rule and token to the explicit enabled root. This adds tint, blur and highlights, not the video's optical renderer. |
| Video refraction study | [arya3d/liquid-glass-webgpu at 90cb73931bbaf38bd54b3263cd3fda1daef1869c](https://github.com/arya3d/liquid-glass-webgpu/tree/90cb73931bbaf38bd54b3263cd3fda1daef1869c) | Retain attribution and the MIT notice. Identify source shader code separately from the local capture, rendering and React integration. |

The WebGPU source is the project linked by the [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g). The workbench keeps the shader study separate from the component appearance comparison. It does not claim to implement Apple's native renderer or physically exact optics.

## Follow the official installed workflow

Read `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` before building with UI SDK. The skill is distributed with the pinned core package; no separate, unpinned skill download is needed for this workspace. Read `node_modules/@ui-sdk/react/docs/llms.txt`, then only the relevant component pages and the skill's `references/build-interface.md`, `references/styles.md`, `references/agent-ready.md` and `references/testing.md` as needed.

Use the installed documentation and declaration types as the API reference. Consult the core behavior documentation only when the SDK does not already supply the required interaction. Do not reverse-engineer compiled implementation code or introduce a parallel behavior engine to implement an existing component.

New examples import upstream components directly:

```tsx
import { Input } from "@ui-sdk/react/input";
import "@ui-sdk/core/web.css";

export function Example() {
  return <Input aria-label="Project name" defaultValue="Atlas" />;
}
```

Declare `@layer ui-sdk;` at the start of the global stylesheet. Preserve the root/part composition, controlled callbacks and state attributes documented for each component. Do not use a local material wrapper as a prerequisite for using the SDK. The private `@quantitative-hci/liquid-glass` package retains per-component re-exports for existing consumers; the manifest's `exportPath` records those compatibility aliases, while new imports use `@ui-sdk/react/<id>`.

The workbench's neutral `src/sdk-layout.css` supplies the missing Timeline and Waterfall layout in this SDK release. It uses upstream `--ui-*` tokens and has no glass recipe. Keep that shim narrow and review it when updating the SDK.

## Agent contract

Create one client-side bridge with `createAgent` from `@ui-sdk/react/agent`. Register the same bridge with `registerTools` and an explicit `allow` policy when the browser exposes WebMCP. Unregister those tools when the integration is disposed. Browsers without that API still use the local bridge; report that distinction honestly.

The contract consists of the actual SDK `snapshot`, `query`, `act` and `subscribe` APIs. The workbench exposes a restricted facade at `window.quantitativeHciAgent` for local inspection and browser verification. The live inspector reads the bridge and its change notifications. It must not manufacture component state, actions or success results.

Every intended control must be discoverable by an appropriate name. Use SDK parts rather than native controls when the agent needs to operate them. Keep state synchronization in callbacks such as `onValueChange(value, details)`: an API action does not replay arbitrary pointer or keyboard handlers. Verify `details.source === "agent"` and the accepted state after an action; `ok: true` alone is insufficient if a callback cancelled a change.

Use the SDK's `data-agent-secret`, `data-agent-hidden` and `data-agent-confirm` contracts. The demonstration may permit harmless local changes and refuse marked confirmation actions. Do not add a confirmation flow to every interaction. Keep private values redacted and distinguish a disabled action from an action requiring a person.

An agent test must obtain component references and choice values from `snapshot` or `query`, perform actions through `act`, and check the resulting DOM/state. Include named controls, choice discovery, disabled-state refusal, secret redaction and observed source attribution. Test actual browser-tool registration separately from detecting the API's presence.

## Workbench requirements

`packages/liquid-glass/component-manifest.json` is the catalogue source of truth. All **55** families must remain searchable and selectable. Mount one selected specimen at a time, so the preview, keyboard sequence and active agent registry stay understandable. Component selection should use stable IDs; do not show a fabricated specimen when a component fails.

The default surface treatment is **UI SDK default**. The workbench also offers **Frosted CSS**, a live agent inspector and a separate **Video refraction** study. Keep component behavior and values tied to the same upstream APIs across treatments. Avoid repeated status labels, decorative metrics and explanations that do not help someone try the component or inspect its state.

The SDK remembers previously mounted components as `offPage`; the inspector may distinguish them from active entries, and must handle the SDK's `more` entry without pretending the snapshot is complete. Discoverability of all catalogue entries and the single mounted specimen are runtime requirements, not claims established by the manifest alone.

## Optional Frosted CSS

Use `GlassProvider` only when opting into the appearance experiment. Its existing default remains enabled for compatibility, so a workbench or comparison must pass an explicit boolean and initialize it to `false`:

```tsx
<GlassProvider enabled={frosted}>
  <Input aria-label="Project name" defaultValue="Atlas" />
</GlassProvider>
```

Only `:root[data-qg-material-enabled="true"]` activates the package's material tokens and rules. Disabling the provider removes its owned root attributes and inline properties and stops its pointer-lighting effect. Portalled overlays inherit the same root scope. Importing the stylesheet alone must leave the upstream baseline active.

The optional theme can set shared colour, radius, tint and blur tokens. It must preserve solid and destructive action variants, invalid borders, focus visibility, disabled state and selected state. A later CSS layer overrides an earlier layer regardless of selector specificity; preserve semantic states explicitly when adding generic material rules. Keep dense text and data on stable surfaces and avoid stacked opaque cards that obscure the material behind the actual control.

Respect reduced motion, reduced transparency, increased contrast and forced colours. Retain usable solid fallbacks and the same actions and layout in every mode. The legacy `refraction` preference remains accepted for compatibility, defaults to `false` and has no optical effect; the misleading turbulence displacement has been removed.

## Reference WebGPU study

Keep the source pin and attribution in `src/reference-optics/README.md`, the copied shader/uniform files and the shipped license notice. Describe any adaptation to the renderer, DOM capture, dimensions or redraw strategy. Do not substitute a blur, arbitrary noise displacement or the earlier canvas texture experiment and call it the video's technique.

The reference technique samples a captured backdrop through a shape-derived shader. The local study captures a bounded demonstration region and keeps real SDK controls above the canvas. That is a limited rendering contract: arbitrary live DOM, captured updates, GPU/browser support and capture fidelity require their own verification. Stop unneeded rendering and release resources when the study unmounts. Display an unavailable-renderer state truthfully while leaving controls usable.

A successful shader compile, visible lens or screenshot does not establish video equivalence. Compare the actual rendered result with the reference and report the backdrop, geometry, settings, browser and limitations. Keep labels and interaction targets as readable DOM content.

## Verification and evidence

| Check | Required evidence | Practical limit |
| --- | --- | --- |
| Catalogue and source checks | All 55 IDs, real demo entries, direct imports, compatibility aliases and SDK pins agree. | Static checks do not prove mounted behavior. |
| TypeScript and production build | The complete workbench compiles against the installed SDK. | A build does not establish visual fidelity. |
| Workbench navigation | All catalogue entries are discoverable; one selected specimen mounts; search and category changes work. | A manifest count does not establish discoverability. |
| Agent contract | Real snapshot/query/act results, accepted values, names, redaction, disabled handling and source attribution; browser-tool registration where supported or explicitly mocked. | API detection does not prove browser-agent execution. |
| Human interaction wiring | Keyboard operation, forms, popup placement, Escape dismissal and focus restoration. | Upstream behavior tests do not cover local wiring automatically. |
| Baseline and material modes | Baseline has no material scope; opt-in and disable work; variants, errors and preferences remain visible. | Token values alone do not establish painted contrast. |
| Reference optics | Renderer status, actual output, resize/movement behavior and reference comparison. | A passing build or CSS fallback is not optical equivalence. |
| Human evaluation, when needed | Matched tasks, completion/errors, time and preference using the existing HCI protocol. | Scripted checks do not establish improved human usability. |

From the repository root:

```sh
npm ci --ignore-scripts
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

With the preview running:

```sh
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

Report command exit codes, the tested browser and viewport, actual assertions and anything skipped or blocked. Keep source inspection, rendered screenshots, scripted measurements and observations from people separate. Do not claim WCAG conformance, source-video fidelity or better usability from a successful build or scan.

The workbench and material package are private workspace packages. Keep internal examples private by default and treat hosted access separately from repository visibility. The original settings/agent pilot remains on **0.1.0-beta.10**, with its own benchmark protocol and recorded evidence; do not overwrite it when updating this workbench.

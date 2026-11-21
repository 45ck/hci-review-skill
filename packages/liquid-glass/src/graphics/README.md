# Liquid graphic studio

An editable image, text and shape composition on the shared Liquid Glass viewport. This custom composition is **Unvalidated**: a human UI/UX team has not approved it. Vercel UI SDK controls and its agent bridge are the interaction foundation; this component is not an official Vercel component.

```tsx
import { LiquidGraphicStudio } from "@quantitative-hci/liquid-glass/graphics";
import "@quantitative-hci/liquid-glass/graphics.css";

<LiquidGraphicStudio
  model={document}
  assets={assets}
  onModelChange={setDocument}
  onAssetsChange={setAssets}
/>
```

Mount inside the existing Liquid Glass/SDK providers. Keep the studio mounted, or keep the controlled document and assets in the parent, when changing sections. Layer selection can also be controlled with `selectedId` and `onSelectionChange`. Undo history and saved directions belong to the mounted studio; uploads and variants are session data, with no remote persistence implied.

## Controlled acceptance and source

`onModelChange(next, details)` receives the proposed document and its reason, optional layer ID, original SDK `source`, optional DOM event, `cancel()`, `canceled` and an `AbortSignal`. Existing callbacks that only accept `next`, including a React state setter, continue to work. Button, Select, Switch and File Input sources come from their SDK callbacks; native canvas gesture/keyboard changes use the public `sourceOf` API. Async image decoding retains the original input source.

The editor waits for matching controlled `model` props before recording success, history or deferred add/duplicate/delete selection. A request does not optimistically replace the document; rendered content always follows the host's supplied props. Returning normally without updating the model does not mean acceptance. An equivalent JSON copy is accepted. A different document is an external replacement: any pending proposal is rejected and whole-document undo/redo history is cleared so an old checkpoint cannot overwrite the host's new data. An unchanged equivalent clone preserves history.

Published matching props are authoritative immediately, even if the callback's Promise is still pending. A later rejection is reported as an error **after application**, retaining the accepted document and its undo checkpoint. It does not report a rollback. Cancellation applies to a proposal that the host has not published.

Call `details.cancel()` before accepting an unwanted proposal. A throw or rejected callback Promise also refuses it. New document mutations are blocked while another proposal is pending. **Cancel pending graphic change** is a real SDK Button that releases the pending request and aborts its signal. A host that performs async work must check `details.signal.aborted` before applying the result; cancellation cannot roll back a host or server update that has already occurred. A late update after cancellation is an external host change, not an accepted pending request.

```tsx
<LiquidGraphicStudio
  model={document}
  assets={assets}
  onModelChange={(next, details) => {
    if (!canEdit) {
      details.cancel();
      return;
    }
    setDocument(next);
  }}
/>
```

The host still validates authorization and persistence. `source` describes interaction origin and is not authentication. A successfully dispatched SDK `act` is not evidence that the host accepted an edit; inspect the document revision/content and the pending or error feedback. The controller adds an undo checkpoint, or moves an undo/redo checkpoint, only after observed acceptance. All three content changes use a new revision.

## Model and editing

`GraphicDocument` has a stable ID, revision, artboard size/background and ordered layers. Layers are a discriminated union of `image`, `text` and `shape`, with stable IDs, names, geometry, opacity, visibility and locking. Array order runs from back to front. Assets retain source, description, dimensions and provenance separately from image layers.

Direct dragging, rotated resizing, keyboard movement, numeric property changes and structured JSON edits use the same validated document change path. Changes increment revision and can be undone/redone. A structured draft must match the current revision, keep the document ID and preserve locked layers until they are unlocked. Layer selection is independent of its visibility; the layer list can select hidden layers. Artboard presets resize the composition proportionally in each axis; an arbitrary layout should be reviewed after changing aspect ratio.

Defaults are deliberately bounded: 1–64 layers; artboards 256–4096 px; raster imports PNG/JPEG/WebP up to 5 MB and 8192 px per dimension; up to 24 assets, 12 saved directions and 40 undo steps. Imported images are decoded before use. SVG uploads are not accepted. Source data is not injected as HTML.

`validateGraphicDocument`, `graphicLayerBounds` and `graphicTextLines` are public pure helpers. Text wrapping is a deterministic character-width approximation, shared by the live artwork and SVG export. It is not a full typography layout engine. The editor offers portable sans-serif, serif and monospace families; exports do not embed font files.

## Human and agent controls

All interactive controls are actual SDK components. Use the SDK `snapshot`, `query` and `act` bridge. Useful names include:

- `Graphic layers` — select a stable layer ID.
- `Layer X`, `Layer Y`, `Layer width`, `Layer height`, `Layer rotation`, `Layer opacity`, `Layer text` — edit a property draft, then `Apply layer changes`.
- `Bring layer forward`, `Send layer backward`, `Duplicate layer`, `Delete layer`, `Undo graphic change`, `Redo graphic change`.
- `Graphic canvas` — the shared viewport provides zoom, pan, fit, focus selection and fullscreen.
- `Structured edits` → `Load current graphic JSON` → `Graphic JSON draft` → `Apply graphic JSON` for atomic multi-layer changes.

Canvas layer buttons support pointer dragging and arrow-key movement; Shift changes the movement step from 1 to 10 px. The resize handle uses the same geometry and has a constant screen target size across zoom levels. Layer IDs remain attached to the rendered artwork, list and properties form for verification. No separate global state mutation interface is added.

## AI image workflow and export

`createGraphicAgentContext` produces a typed composition request with selected-layer ID, current revision, editable document, asset metadata/provenance and the user's brief. Uploaded image bytes are not repeated inside that context packet. Use the image layer or exported SVG as a reference when calling a connected image tool.

The UI can copy a composition context or an image-edit request, then import a returned raster image. **There is no image-generation service configured in the demo.** It does not simulate a generation job or claim that copying a request generated an image. `onAssetsChange` is required to enable uploads. Applications can supply `onImageRequest(context): void | Promise<void>` to expose the SDK **Send image request** button. It stays pending during the callback, reports handoff success or failure, and does not replace an image until an application explicitly imports or supplies the returned asset. The selected layer and revision are captured when the request starts.

Raster import first calls `onAssetsChange`, which may return a Promise, and waits for the matching new asset to appear in the host's `assets` props. Property order does not affect matching. Only then may it propose a replacement through `onModelChange`, using the source and composition revision captured before decoding. Published asset props are authoritative even if the callback is still pending; a later callback failure is reported without implying a rollback. If that composition changed, the accepted asset remains available and no stale replacement is proposed. A failed model request does not remove an already accepted asset. **Cancel image import** stops local waiting/decoding work from proceeding; an asset update already requested from the host may still arrive. The asset callback and document callback are separate acceptance boundaries, not a distributed transaction.

`graphicToSvg` creates escaped SVG with editable text and the provided image references. `graphicToStandaloneSvg` embeds used raster assets as data URIs. The download button uses the latter. Remote images must permit a browser CORS fetch; failures are shown to the user rather than producing a falsely self-contained file. JSON copies the composition; keep its referenced asset catalogue when moving it between applications.

## Design references

The workflow uses structured context, typed edits and history as described in [tldraw's agent starter kit](https://tldraw.dev/starter-kits/agent). It keeps native editable layer data and design context, following the context-first integration approach documented by [Figma's MCP server](https://developers.figma.com/docs/figma-mcp-server/). These references inform the interaction pattern; this package does not depend on or impersonate either service.

## Verification

`node --test tests/test_graphics_controlled.mjs` exercises the internal controlled-request controller: ignored/refusing/throwing hosts, source/event forwarding, accepted-prop matching, cancellation signals, pending concurrency, selection deferral, async completion, history, conflicts and bounded revisions. The existing production-browser graphics contract exercises actual SDK controls, accepted edits, stale/invalid/locked rejection, imports, exports and undo/redo. Controller tests establish those state rules; they do not substitute for browser wiring checks or human UI/UX review.

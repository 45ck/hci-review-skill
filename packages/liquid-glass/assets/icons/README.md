# Quantive Glass icons

Twelve original object icons share a small isometric vocabulary: ice-blue faces, darker teal sides, a polished rim and selective peach accents. They sit above the kit's actual glass material as ordinary SVG artwork. The illustration itself does not simulate a refractive volume.

## Use in the kit

```tsx
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";

<Button aria-label="Save bookmark">
  <LiquidIcon name="bookmark" size={24} />
</Button>
```

`LiquidIcon` reads `iconSet` from the shared appearance context. `isometric` is the default; `line` uses the matching conventional glyph. Every instance owns unique gradient IDs through React `useId`, so multiple copies can appear together safely.

The wrapper is decorative and hidden from assistive technology. Give its containing control an accessible name, or keep the adjacent text. Icons do not supply their own action, label, state or hit target. Meaning, keyboard behaviour and agent semantics remain in the real UI SDK control.

| Object icons | Conventional operators |
| --- | --- |
| `layers`, `folder`, `grid`, `settings`, `bell`, `volume` | `plus`, `check`, `search`, `more`, `reset` |
| `bookmark`, `sparkles`, `activity`, `code`, `copy`, `inbox` | Operators retain a line treatment in either preset. |

Use 24px objects within controls and 32–40px objects beside headings. Below 20px, the renderer uses the line variant. Forced colours also display the line variant using the control's current foreground colour. Both presets occupy the same declared box; switching them must preserve names, task state and hit targets.

The SVG files in this directory are standalone object assets. `line/` contains all 17 line glyphs. They use real paths and gradients; none contains an embedded raster image or `foreignObject`. The live component is exported from `src/icons.tsx`.

## Generation and vector conversion

The initial 12-object art-direction sheet was generated with the session's `image_gen.imagegen` tool on 21 November 2026. The original transparent PNG and full prompt are preserved in `../icon-reference/`. It provided the silhouettes, shared perspective, lighting and material palette.

Production artwork was then **redrawn as compact SVG geometry**, retaining those visual cues while simplifying highlights and removing raster edge noise. This is a deliberate vector redraw rather than an automatic pixel trace or a PNG placed inside an SVG wrapper. The checked-in `vector-review.svg` shows the actual production paths at 96px, 36px and 24px.

The source of truth for the vector geometry is `../icon-reference/build-icons.py`. To regenerate the standalone SVGs, review sheet and React component from the repository root:

```sh
python3 packages/liquid-glass/assets/icon-reference/build-icons.py
```

The generator uses the Python standard library and does not call an image model. Runtime rendering requires only React and the shared appearance context. The generated raster is a design reference; it is not imported into the application bundle.

## Review criteria

Check the object at its intended size, alongside its label, over each supported backdrop. Confirm that the line toggle changes the visible pixels, forced colours show a clear glyph, and multiple instances have unique gradient IDs. Keep conventional operators and state marks clear. Distinctive art direction is not evidence that people identify an icon more quickly; measure recognition and task outcomes with the representative-task protocol before making that claim.

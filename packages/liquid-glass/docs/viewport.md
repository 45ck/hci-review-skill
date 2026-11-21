# Viewport presentation

`LiquidViewport` keeps its pan, zoom, fit, selection and fullscreen behaviour on the shared SDK primitive. Import it from `@quantitative-hci/liquid-glass/viewport` and load `viewport.css` after `kit.css`.

## Change presentation without replacing behaviour

The optional `slotProps` object exposes `controls`, `canvas`, `hint` and `fullscreen`. Each slot accepts `className` and React `style`. Classes are appended to the required package classes; styles apply to that slot. Required refs, events, labels, hint relationships and dialog focus behaviour remain owned by the component.

The fullscreen slot additionally accepts `data-liquid-glass` (`""` or `"off"`) and `data-liquid-intent` (`"control"`, `"navigation"`, `"reading"` or `"overlay"`). It defaults to the stable reading treatment. An explicit glass opt-out affects the fullscreen subtree only; the inline controls retain their normal policy.

```tsx
<LiquidViewport
  label="Article navigation"
  width={960}
  height={640}
  slotProps={{
    canvas: { className: "article-map" },
    hint: { className: "article-map-hint" },
    fullscreen: { "data-liquid-intent": "reading" },
  }}
>
  {diagram}
</LiquidViewport>
```

These slots are presentation hooks. They do not expose a replacement dialog, mutation API, arbitrary DOM event handlers or control state. Use `viewport`, `onViewportChange` and the documented handle for controlled navigation. Host callbacks can still cancel a proposed viewport change.

## Shared colour roles

Canvas, grid, border, hint and focus styles use `--liquid-canvas`, `--liquid-canvas-grid`, `--liquid-line`, `--liquid-muted` and `--liquid-focus`. They follow the provider's resolved theme. Forced colours retain system colours. Authored diagram notation and artwork remain the content author's responsibility.

## Verification

Check the same task inline and fullscreen: pan, zoom, fit, reveal a selection, Escape and focus restoration. Use the real SDK agent bridge and inspect the accepted viewport. Include a narrow layout and theme change while preserving the selected document. A styled fullscreen screenshot does not establish keyboard, agent or human usability outcomes.

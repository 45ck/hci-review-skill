# Optional frosted material

`@quantitative-hci/liquid-glass` is a private workspace package of tokens, scoped CSS and appearance preferences for UI SDK **0.1.0-beta.13**. New components import the upstream SDK directly. Existing package component re-exports remain as compatibility aliases.

## Use

```tsx
import { Button } from "@ui-sdk/react/button";
import { GlassProvider } from "@quantitative-hci/liquid-glass";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/styles.css";

export function App({ frosted = false }) {
  return (
    <GlassProvider enabled={frosted}>
      <Button data-variant="solid">Save changes</Button>
    </GlassProvider>
  );
}
```

The provider retains its historical `enabled=true` default for callers already using it. New applications should make the choice explicit and start from upstream behaviour/styles. The workbench passes `enabled=false` initially. The material stylesheet only applies beneath `html[data-qg-material-enabled="true"]`, including portalled overlays. Disabling it removes provider-owned root attributes and styles.

Preferences include appearance, material, blur, saturation, reduced motion and increased contrast. System reduced transparency and forced colours select solid rendering. The deprecated `refraction` preference is retained for stored-data compatibility, defaults to false and no longer activates a turbulence filter.

This package supplies **CSS tint and blur**, not the reference video's lens renderer. The separate [reference optics study](../../docs/hci/examples/liquid-glass/src/reference-optics/README.md) uses the video's actual shader over a captured local scene. It does not establish a production DOM-refraction solution for every component.

## Behaviour and agent access

Keyboard, focus, validation, forms and popup behaviour belong to UI SDK. Preserve variant, invalid, selected, disabled and focus states when styling. An application must initialize `createAgent` and, when available, `registerTools`; importing this material package or its `/agent` compatibility entry alone does not connect an agent.

The [55-family workbench](../../docs/hci/examples/liquid-glass/README.md) shows direct SDK imports, an actual bridge and a live state inspector. Follow the [project standard](../../docs/hci/standards/liquid-glass.md).

## Verification and licences

Run `npm run glass:verify` and the documented browser suite for behaviour or appearance changes. The beta.10 settings pilot remains independently measured.

Original material code is covered by the repository's [MIT licence](../../LICENSE). UI SDK remains Apache-2.0. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Apple is a visual reference, not an endorser or supplier of this implementation.

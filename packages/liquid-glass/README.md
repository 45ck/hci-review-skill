# Quantitative HCI Liquid Glass

Private React component material built over `@ui-sdk/react` and `@ui-sdk/core` **0.1.0-beta.13**. The package preserves the upstream APIs and supplies a shared Apple-inspired web glass treatment, tokens and display preferences.

The [component manifest](component-manifest.json) lists all 55 covered families. The [gallery](../../docs/hci/examples/liquid-glass/README.md) provides a working specimen for each family. The [standard](../../docs/hci/standards/liquid-glass.md) defines material selection, accessibility fallbacks and verification.

## Use

This package is a private workspace dependency; it is not a published npm package.

```tsx
import { GlassProvider } from "@quantitative-hci/liquid-glass";
import { Button } from "@quantitative-hci/liquid-glass/button";
import "@quantitative-hci/liquid-glass/styles.css";

export function App() {
  return (
    <GlassProvider>
      <Button type="submit">Save changes</Button>
    </GlassProvider>
  );
}
```

Use the material provider from `@quantitative-hci/liquid-glass/material` at the application boundary. The gallery's `src/main.tsx` is the complete integration example for its current props and preference controls. Import individual component subpaths to keep dependencies explicit.

The original SDK component props, composition and events remain available. Public subpaths delegate to the pinned upstream React adapter, while the shared stylesheet uses its `data-slot` and state attributes. Update the upstream dependency only with corresponding typecheck, gallery and interaction verification.

## Material and behaviour

Glass is the default for controls and navigation; text, data and form labels remain ordinary readable DOM content. Solid, motion and contrast preferences are part of the material contract. Do not create separate visual-only versions of the controls that drop the SDK behaviour.

The package does not promise physically accurate refraction through arbitrary DOM content. The retained GPU experiment is separate from the component material and has separate rendering requirements.

## Validate

From the repository root:

```sh
npm ci --ignore-scripts
npm run glass:verify
```

For interactive changes, also run the gallery browser checks described in its README. The repository's existing HCI pilot remains independently versioned and measured.

## Licence

The original Quantitative HCI material and examples use the repository's [MIT licence](../../LICENSE). UI SDK remains Apache-2.0; React and Lucide retain their respective licences. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Apple is a visual reference, not a supplier or endorser of this web implementation.

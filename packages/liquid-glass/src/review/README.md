# Review UI

An optional development overlay for the current rendered surface. It composes the existing UI SDK Dialog, Button, Radio and Textarea under the host's Liquid Glass provider and single agent bridge. It does not create a second action API or change reviewed content.

## Mount it deliberately

```tsx
import { useCallback, useState } from "react";
import { LiquidReviewOverlay } from "@quantitative-hci/liquid-glass/review";
import "@quantitative-hci/liquid-glass/review.css";

function DevelopmentReview() {
  const [open, setOpen] = useState(false);
  const root = useCallback(() => document.querySelector<HTMLElement>("#app-main"), []);
  return <LiquidReviewOverlay open={open} onOpenChange={setOpen} root={root} />;
}
```

Mount only in the host's intended development or owner-review context. A query parameter is a display preference, not authorization. Reuse an existing provider and bridge. The component scans only while open; observers and highlights are removed when closed. The gallery intentionally offers a visible **Review UI** action and supports `?review=1` alongside its collection parameter.

`root` is a stable callback returning the actual review surface. `open` and `onOpenChange` use the SDK's controlled Dialog contract, including cancellable changes. Optional `triggerLabel`, `shortcut`, `tools`, and `className` customize the launcher and toolbar. Set `data-review-scope` on the review surface to identify the current route or collection. Changing that identity invalidates an existing report. The gallery uses `#kit-main` and the current collection ID.

## Inspect and decide

Opening runs checks against the current visible DOM. **Refresh checks** rescans it. Findings include exact evidence, target, rule, severity, certainty and a proposed next step. **Show on page** draws a passive outline, scrolls the target into view and minimizes the panel; **Back to findings** restores it. These actions never rewrite content or its styles.

The panel uses a modeless SDK Dialog so the page remains usable. Escape closes it while focus is inside; closing returns focus to its trigger. On narrow screens the panel fits above the bottom edge, and minimizing it exposes the target. Text and controls use the kit's fonts, icons and tokens. Dense findings use a stable solid surface.

Where a finding has alternatives, a person can compare their descriptions and previews and choose an SDK radio option. Choices do not apply a patch or confer human validation. The group is marked `data-agent-confirm`, and its shared callback refuses agent-sourced choices. Agents may inspect findings and retrieve a person's selection; they must not synthesize the decision.

**Copy decisions JSON** includes the compact `OPTIONS` list, stable finding/option mapping and the report's content fingerprint. Nothing is sent externally. Clipboard failure exposes selectable JSON. A fresh scan is checked again immediately before selection or copy, so a delayed observer cannot export old choices. Changed content disables decisions until refreshed; refreshing a changed report clears previous choices. An unchanged refresh preserves them.

The optional gallery **Show lint example** action mounts a clearly labelled flawed sample and changes the scan scope to that sample only. **Review actual page** restores the real page scope. The sample is never merged into a real page report.

## Evidence boundaries

Measured rules, heuristic review candidates and contextual judgment are distinct. No-findings means only that the supplied checks produced no findings for the inspected surface; meaning and task clarity still need contextual review. The report lists its scope, viewport, element coverage, limitations and rule version. Custom UI remains **Unvalidated** until separately recorded human review.

The inspector excludes its own `[data-quantive-review-root]` surfaces. Respect the scanner's hidden, protected and editable-content exclusions. It does not read a server, iframe, unpublished route, source repository, client account or model service. Content fingerprints detect stale evidence; they are not authorization or tamper-proof signatures.

## Verification targets

Verify the visible and URL launch paths, SDK discovery/open/refresh, measured and contextual findings, target outline and cleanup, human option selection, agent refusal, exact JSON mapping, clipboard fallback, stale-content refusal, focus return, and 320/390 px layouts. Use the same scanner and rule engine for browser reports and CI fixtures; do not invent seeded results for the actual page.

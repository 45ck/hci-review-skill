# Synthetic product evidence for a review exercise

This fixture is authored test input. It is not a capture of a live product or a human study. Code excerpts and event traces below describe a fictional reporting interface. No browser session, screenshot, backend, or real user data is available.

## Task and existing components

An operations coordinator wants to create a report, save the setup, and return later. The product has an existing `Button` component with `primary`, `secondary`, and `danger` variants, `ProductIcon` for all custom icons, and a global theme and motion configuration. It uses keyboard-operable native form elements. The provided excerpts cover only the stated parts of the interface.

## Case A: report setup

### Main decision region

The region contains these six rendered buttons in DOM order, all with the `primary` variant:

| Label | Handler target |
| --- | --- |
| Create report | Opens the report editor |
| Start a report | Opens the same report editor |
| View sample | Opens an example report |
| Upgrade plan | Opens plan information |
| Contact support | Opens help |
| Cancel | Returns to the report list |

A separate directory contains 120 report templates. It has search, category filters, and a visible result count. No usability observations or timing measurements are supplied for the directory.

### Editor excerpt

```tsx
function ReportEditor() {
  const [phase, setPhase] = useState('editing');
  const [optionsOpen, setOptionsOpen] = useState(false);
  async function saveReport() {
    setPhase('saved');
    try {
      await fetch('/api/report', { method: 'POST' });
    } catch (_) {}
  }
  return <>
    <Button variant="primary" onClick={saveReport}>Save report</Button>
    <button aria-label="More save options"
      aria-expanded={optionsOpen} onClick={saveReport}>
      <ProductIcon name="chevron-down" />
    </button>
    {phase === 'saved' && <div className="celebration-overlay">
      <h2>Saved successfully</h2>
      <p>You can safely leave this page.</p>
    </div>}
  </>;
}
```

### Event trace supplied by the fixture

```text
0 ms    Report editor visible; local inputs contain unsaved changes.
40 ms   User activates the button named "More save options".
43 ms   POST /api/report begins.
45 ms   "Saved successfully" overlay appears; aria-expanded remains false.
920 ms  POST /api/report responds 503, body {saved: false}.
930 ms  The success overlay remains.
8000 ms Overlay closes on its timer; there is no visible dismiss control.
```

The fixture does not describe what a user felt, remembered, or expected. No later reload or persistence result is available for this report.

### Theme and layout excerpt

```css
:root {
  --surface: #ffffff;
  --surface-secondary: #f4f4f5;
  --text: #202124;
  --accent: #f97316;
  --error: #b91c1c;
  --font-body: system-ui, sans-serif;
}
.setup-card { font-family: Arial, sans-serif; }
.template-card { font-family: Georgia, serif; }
.primary { color: white; background: var(--accent); }
.celebration-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  animation: confetti 8s linear;
}
.invalid-input { border-color: var(--error); }
```

The fixture states that invalid inputs receive only that border-color change: no visible error text or other changed visual cue. A pricing comparison has three cards with the same shape, size, font, and position in a row; its recommended plan differs only by orange border color. The reason for recommending that plan is not supplied. The full CSS, font sizes, final screenshots, themes, opacity values, forced-colors state, and application-level reduced-motion handling are not supplied.

### Setup checklist and supplied state trace

```json
{
  "userGoal": "save and reopen a report",
  "required": ["name", "report-type", "timezone", "save-preferences"],
  "completedRequired": ["name", "report-type", "timezone", "save-preferences"],
  "optional": ["invite-colleague"],
  "completedOptional": [],
  "displayedProgress": "80% complete",
  "finishDisabledUntil": "invite-colleague",
  "savedChecklistStorage": "component-memory-only"
}
```

```text
10:00 All four required checklist items show completed; Finish is disabled.
10:02 User leaves for the report list.
10:03 User returns; the four completed marks are empty.
```

No session-survey, conversion, first-click, eye-tracking, or memory measurements exist for Case A.

## Case B: a different screen, screenshot description only

A dark dashboard screenshot is described as having a mostly dark background, restrained teal emphasis, a dense searchable table, a visible Export control, and a footer stating "All changes saved". It uses the product's regular custom icons and typeface. An author informally estimates the visible color areas as 85% base, 12% structure, and 3% accent. No color sampling, contrast measurements, source code, focus state, interaction history, or backend trace is available. No user task failure is reported.

Review only what this evidence supports. Do not assume Case A's code or traces apply to Case B.

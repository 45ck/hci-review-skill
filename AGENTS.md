# Quantitative HCI implementation standard

## New high-fidelity interfaces

Use the shared `@quantitative-hci/liquid-glass` package for new high-fidelity examples and internal prototypes that do not already have an established product design system. Read `docs/hci/standards/liquid-glass.md` before implementing or changing the material.

- Import components through the package's explicit component subpaths. Preserve the upstream UI SDK keyboard, focus, form and popup behaviour.
- Put reusable colour, spacing, shape, opacity, focus and motion choices in the shared tokens and material styles. Avoid component-local glass recipes.
- Use glass for controls and navigation. Keep dense content, charts, tables and long text on stable readable surfaces.
- Preserve the same actions and layout in solid, reduced-transparency, reduced-motion and forced-colour modes. Respect the user's system preferences.
- Give every control a visible label or an appropriate accessible name. Verify keyboard operation, Escape dismissal and focus restoration where relevant.
- Keep the component manifest and gallery aligned. Do not describe a partial gallery as complete.
- Keep internal examples private by default. Existing repository visibility and hosted-demo access are separate decisions; do not widen a demo's audience without instruction.

## Evidence and checks

Run `npm run glass:verify` for changes to the package or gallery. Run `python3 tests/test_glass_browser.py` against the production preview for interaction, accessibility-preference or layout changes. The runner's README documents its server and browser requirements.

Report the tested browser, viewport and actual checks. A successful build, automated interaction suite or accessibility scan does not prove WCAG conformance, photorealistic optics or improved human usability. Keep model predictions, scripted measurements and observations from people separate.

The original UI SDK settings pilot remains an independent experiment with its own pinned dependency versions and benchmark protocol. Do not overwrite its recorded evidence when changing the gallery.

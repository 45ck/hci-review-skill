# Quantitative HCI interface standard

## Use the installed UI SDK workflow

Before using UI SDK, follow `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` and read `node_modules/@ui-sdk/react/docs/llms.txt`. Then read the component pages, agent guidance and styling/testing references needed for the task. These are the official documents shipped with the installed version; prefer them to examples for another release.

The component workbench pins `@ui-sdk/react` and `@ui-sdk/core` to **0.1.0-beta.13**. Import components directly from their explicit `@ui-sdk/react/<component>` entries, and helpers from documented `@ui-sdk/core` entries. Preserve upstream composition, state, keyboard, focus, form and popup behavior. Do not require a local wrapper or fork behavior that the SDK already supplies. Existing `@quantitative-hci/liquid-glass/<component>` re-exports remain compatibility aliases.

Start with `@ui-sdk/core/web.css`. Prefer its tokens and documented state attributes to new component styles. Add layout only where the example needs it; document gaps in upstream CSS. A product's established design system takes precedence.

## Keep the interface usable by agents

- Create one client-side `createAgent` bridge from `@ui-sdk/react/agent`. Use `registerTools` with an explicit action policy for supported browser agents, and retain its cleanup function.
- Use SDK parts for the controls the agent should operate. Give every control a visible label or an appropriate accessible name. Keep state in the SDK change callbacks, so an action through `act` updates the same state as a person's interaction.
- Let the SDK provide `snapshot`, `query`, `act` and change subscriptions. Do not replace these with a handcrafted registry or DOM-click imitation. Respect its secret, hidden and confirmation attributes. A demo's policy may allow local state changes while refusing actions marked as requiring a person.
- The workbench must keep all **55** component families discoverable while mounting one selected specimen at a time. Its live inspector must show the actual registry, current values, available actions and observed changes. Preserve the manifest and compatibility aliases when changing presentation.
- Verify the browser agent contract: names, discoverable choices, actions, resulting state, disabled behavior, secret redaction and `source: "agent"`. A detected WebMCP API or an imported bridge is not evidence that an agent completed an action.

## Optional appearance and refraction experiments

Read `docs/hci/standards/liquid-glass.md` before changing the material or optical study. The workbench starts with the upstream baseline. **Frosted CSS is optional**, enabled only under `:root[data-qg-material-enabled="true"]`; it is not a default product design system or a reproduction of the video's refraction. `GlassProvider enabled={false}` must leave the upstream styles active without material side effects.

Keep material tokens and rules in the shared package and include portalled overlays in the explicit scope. Preserve solid/destructive variants, invalid states, focus visibility and system accessibility preferences. Keep dense content and text readable. Do not add component-local blur recipes or shrink controls merely to fit more specimens on screen.

The separate Video refraction study uses the source from `arya3d/liquid-glass-webgpu` at `90cb73931bbaf38bd54b3263cd3fda1daef1869c`. Retain its attribution and license, distinguish source shader code from the integration, and state actual renderer/capture limits. Keep SDK controls in the DOM. A CSS fallback, screenshot or successful build does not establish shader fidelity or optical equivalence.

Keep internal examples private by default. Repository visibility and hosted-demo access are separate decisions; do not widen the audience without instruction.

## Evidence and checks

Run `npm run glass:verify` for package or workbench changes. Run `python3 tests/test_glass_browser.py` against the production preview for interaction, agent, accessibility-preference or layout changes. The runner's README documents server and browser requirements. Check the real interface wiring; do not duplicate upstream tests for unchanged SDK behavior.

Report command exit codes, tested browser and viewport, actual checks and anything blocked or skipped. Keep source inspection, scripted measurements, screenshots and observations from people separate. A passing build, automation suite or accessibility scan does not prove WCAG conformance, video fidelity or improved human usability.

The original UI SDK settings/agent pilot remains independent on its **0.1.0-beta.10** dependency pins and benchmark protocol. Do not rewrite its dependencies, measurements or recorded evidence when changing the workbench.

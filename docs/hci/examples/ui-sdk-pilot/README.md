# UI SDK settings pilot

A small, runnable comparison of native React controls, UI SDK controls, and the SDK's structured agent interface. It uses synthetic settings and saves only to page memory. The package is isolated from the installed HCI skills and other examples.

| Page | Purpose |
| --- | --- |
| `/baseline.html` | Native selects, checkbox and submit button |
| `/sdk.html` | The same workflow with UI SDK Select, Checkbox and Button |
| `/sdk.html?readonly=1` | Disabled controls and denied bridge mutations |
| `/sdk.html?reject=1` | A deliberately cancelled 365-day retention change |

## Run the example

Use Node 22.12 or later. From this directory:

```sh
npm ci --ignore-scripts
npm run build
npm run preview
```

Open `http://127.0.0.1:4178/` to choose a variant. Settings, saved output and save count are visible on the page. Refreshing resets everything.

On the SDK page, a developer console can inspect and operate the controls:

```js
window.uiSdkAgent.snapshot()
await window.uiSdkAgent.act({
  steps: [
    { ref: 'Region', action: 'setValue', args: ['frankfurt'] },
    { ref: 'Save settings', action: 'press' },
  ],
})
```

Check the visible saved-state output after the action. A bridge response alone does not prove the requested result. The allowlist accepts only these settings' named actions and value domains; the shared application reducer also validates every mutation. This browser policy does not provide server authorization.

## Reproduce the measured comparison

Read the [fixed protocol](../../models/ui-sdk-pilot-protocol.md). Keep the preview server running, then run these commands from the repository root in another terminal:

```sh
python3 -m pip install playwright==1.65.2
python3 -m playwright install chromium
python3 -B docs/hci/models/run-ui-sdk-pilot.py \
  --output /tmp/ui-sdk-pilot/results.json \
  --screenshots /tmp/ui-sdk-pilot/screenshots
```

Use `--executable /path/to/chromium` for an existing browser. `--profile desktop --repeats 1` is a diagnostic subset; the full default is 162 routine attempts plus separate guardrails. GitHub Actions runs the same build and protocol and uploads raw JSON, per-attempt JSONL, screenshots and the runnable build.

The runner uses one semantic step per bridge request in its primary comparison. It preserves failures, checks application state outside the bridge response, rotates arm order and records source/fixture hashes. Timing includes the chosen driver and wait policies. Automation commands are not model tool calls; this fixture makes no model calls and measures no tokens, human usability, engineering productivity or production persistence.

## Pinned dependencies

The lockfile pins UI SDK React/core `0.1.0-beta.10`, React `19.3.1`, TypeScript `7.0.2` and Vite `8.3.8`. Build outputs keep baseline and SDK entry points separate. The size report distinguishes initial JS/CSS from all reachable assets, including deferred imports.

## Sources

- [UI SDK React installation](https://ui-sdk.dev/docs/react/installation)
- [Agent bridge reference](https://ui-sdk.dev/docs/agents/connect-an-agent/reference)
- [Agent permissions and change cancellation](https://ui-sdk.dev/docs/agents/connect-an-agent/permissions)
- [Playwright Python CI](https://playwright.dev/python/docs/ci)

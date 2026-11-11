# Run the Quantitative HCI browser benchmark

The benchmark captures browser geometry and timing for two versions of the same interface. It feeds observations into the [model calculator](measure.py) and saves both inputs and results. Use the [evaluation protocol](evaluation-protocol.md) to plan product comparisons and participant studies for all 20 models.

## Run it

Install Playwright for Python and its Chromium browser in your development environment.

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
python3 -B docs/hci/models/run-browser-benchmark.py > hci-browser-report.json
```

Use `--executable /path/to/chromium` with an existing Chromium installation. Run a single profile with `--profile desktop`, `--profile mobile` or `--profile reduced-motion`. The default runs three fresh page loads per variant per profile and alternates variant order between pairs. Increase `--repeats` to examine run-to-run variation.

You can also open the [fixture](browser/fixture.html) locally in Chromium, append `?variant=candidate` to switch designs, and select **Run this fixture** for raw measurements.

## What it measures

| Fixture | Models captured | Candidate change |
| --- | --- | --- |
| Late content above an action | Layout shift | Reserve space for the delayed content and track the action's exact position. |
| Type, play glyph, and currency column | Kerning, optical centre, tabular numbers, tracking, x-height, leading, widow, line length | Align decimal separators, move the play glyph toward its ink centre and adjust paragraph width and leading. The other typography metrics record the environment or reflow behaviour. |
| Like control with a simulated server | Optimistic update | Show the result before settlement and restore the prior state on rejection. |
| Staggered results | Stagger | Keep controls visible and usable during the animation. Honour the reduced-motion preference in both variants. |

The JSON records Chromium version, profile settings, fixture hashes, and raw inputs and metrics for every trial. Summaries use trial medians except for the reported percentiles. The layout summary uses p75 lab CLS and p95 target drift across trials. Each trial observes one lab shift window after the initial paint.

The fixture uses one simulated success and one rejection per trial. Its correction rate describes that scenario. Feedback latency uses a browser paint opportunity as a proxy for presentation. The mobile and reduced-motion profiles are emulated. Use actual hardware for device-specific safe areas, touch input and performance.

## Apply the output to a design decision

Inspect the raw trials before drawing conclusions. Three runs per variant exercise repeatability and produce descriptive results. They do not estimate population or production behaviour. Use the same Chromium build, installed fonts and machine for matched fixture comparisons.

For example, move each profile's trial inputs at `variants.baseline.trials[i].measurements["optimistic-update"]` and `variants.candidate.trials[i].measurements["optimistic-update"]` into the corresponding pair in the [comparison JSON](example-comparison.json). Use `analysis: "descriptive"`, `model: "optimistic-update"`, `metric: "feedback_ms"` and `direction: "lower"`. Set `min_improvement` to your own meaningful threshold in milliseconds. Run [the comparison tool](compare.py) to get the within-trial changes and their median. See the [evaluation protocol](evaluation-protocol.md) for study design and guardrails.

## References

- [Web Vitals, CLS session windows and eligibility](https://web.dev/articles/cls)
- [MDN, LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)
- [MDN, requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN, Range.getClientRects](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects)
- [Playwright, emulation](https://playwright.dev/python/docs/emulation)

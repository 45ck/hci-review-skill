# Finding components and examples

## Task

A developer knows the task they want to build, but may not know the component's exported name or collection. They need to find the component, try its accepted behavior, inspect the integration boundary and copy a complete example. The baseline menu exposed 55 SDK families and whole custom collections; individual custom exports and runnable recipes were difficult to discover.

Success is observable: the intended canonical entry is reachable, its actual export and contract are correct, a working example can be operated, and navigating back preserves the filter used to find it. A label or illustrative card alone does not establish working behavior.

## Content and navigation

The catalogue is generated from the existing foundation manifest, custom manifest, agent contracts and recipe registry. Counts follow those canonical sources. It distinguishes SDK foundations from Quantive custom entries, including passive decoration, providers and gallery compositions that do not have their own runtime action or standalone export.

| Entry | Destination | Available outcome |
| --- | --- | --- |
| All components | `?collection=catalogue` | Search by task or name; filter by origin and category. |
| SDK component | Existing `?collection=<family>` | Operate its genuine SDK specimen. |
| Custom component | `?collection=custom:<id>` | Read purpose, actual import, inputs, host state, operating contract and integration limits; open its complete working collection. |
| Examples | `?collection=examples` | Find every canonical recipe with its included components. |
| Example | `?collection=example:<id>` | Operate the compiled recipe, inspect exact source, copy the example or agent brief. |
| Standalone preview | `?example=<id>&embed=1` | Run only a known compiled recipe in an independent document. Unknown IDs fail visibly. |
| AI integrations | `?collection=integrations` | Inspect the runtime/provider connection and supported integration examples. |
| Image components | `?collection=visual&graphicsview=images` | Open the actual image-card, gallery and comparison view, including from their individual detail pages. |
| Chat workspace | `?collection=chat` | Operate the shared chat compositions in their controlled demonstration. |
| App layouts | `?collection=layouts` | Operate the responsive workspace and review task; reach the same collection from all nine layout entries. |

Sidebar search filters its options without changing the active page. Choosing an option navigates. This separates looking for a destination from entering it, preserving current work while a person explores names. Browser Back/Forward restores a valid route. The mounted catalogue retains its filters while viewing a component or working showcase.

## Presentation and state

Three clearly named SDK actions expose All components, Examples and AI integrations. The existing catalogue retains the SDK families and working collections. Custom search results reveal individual exports when a query is present.

Catalogue cards describe their actual task, category and review status. They do not use simulated component screenshots. Each custom detail explains where to see the component with its required surrounding state. The source panel uses a stable reading surface; the interface retains the existing provider, typography, icons, material preferences and forced-colour behavior.

A runnable recipe is loaded from its registered TSX file. Its same-origin preview uses a separate document because the standalone recipe already owns a provider. That document has one SDK bridge; the parent page has its own. A consuming application should take the recipe contents into its existing provider and bridge. Preview and source come from the same registered file; a copy action never substitutes a manually maintained excerpt.

## Evidence and next decision

`tests/glass_catalogue_navigation.py` checks exact manifest coverage, accepted SDK filtering, custom import/contract navigation, browser history, empty-state recovery, deliberate sidebar navigation, complete recipe discovery and an accepted request through the compiled assistant preview. Image component links select the actual Images tab and preserve it through browser Back/Forward. The test checks each registered recipe's own iframe document at the narrow width, plus 390px normal/forced-colour page fit, and records screenshots.

The production TypeScript build covers every recipe. The browser report, exact source revision and release publication establish which checks were actually run. These checks do not establish human discoverability, comprehension, speed or UX approval. The next human comparison is a task such as “find a prompt composer and submit a local example,” measuring completion, wrong destinations and time against the former collection-only menu. Custom entries remain Unvalidated pending that review.

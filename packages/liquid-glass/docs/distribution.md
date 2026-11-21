# Installing and publishing the private kit

Liquid Glass remains a private package. Version 0.5.0 adds a compiled ESM distribution, declarations and an agent-document publisher. React 19 with Vite is the tested consumer. A successful Vite build does not establish support for every server-rendering framework or a live model connection. Custom components retain their **Unvalidated** status.

## Build and install

From the repository root, with its locked dependencies installed:

```bash
npm run glass:pack
```

The command builds the package and creates `dist/packages/quantitative-hci-liquid-glass-0.5.0.tgz`. Install that file in the application:

```bash
npm install /absolute/path/to/quantitative-hci-liquid-glass-0.5.0.tgz \
  @ui-sdk/core@0.1.0-beta.13 @ui-sdk/react@0.1.0-beta.13
```

The host supplies React and React DOM 19 or newer. Keep one copy of the pinned UI SDK and one client-side bridge so package compositions and host controls share the same registry. The package is ESM; it does not publish a CommonJS entry.

Normal imports resolve to compiled JavaScript and `.d.ts` declarations. Consumers do not compile the kit's TSX, reach into its source tree, or add a library-specific JSX transform. JSX compilation happens during the package build. Client component modules retain explicit `"use client"` boundaries; pure utilities and typed chat projections remain separate modules. The two custom primitives describe their options, state, API and slots through public SDK types, without importing private SDK declaration paths.

CSS exports retain their public names, and bundled fonts stay relative to the emitted stylesheets. Source attribution, font licences and the reference renderer's MIT notice ship with the tarball. Load styles once:

```tsx
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/patterns.css";
```

The repository gallery deliberately opts into the `quantive-source` export condition in both Vite and TypeScript. That condition supports editing the checked-out package. Applications installing the tarball should use the ordinary ESM/type conditions. The public import names stay the same in both environments.

## Optional chat projections

The base `@quantitative-hci/liquid-glass/chat` entry has no provider or agent-harness dependency. Each typed projection is an independent subpath:

| Subpath | Optional peer | Reviewed version |
| --- | --- | --- |
| `chat/ai-sdk` | `ai` | 7.0.179 |
| `chat/ag-ui` | `@ag-ui/core` | 1.0.5 |
| `chat/openai` | `openai` | 7.62.0 |
| `chat/anthropic` | `@anthropic-ai/sdk` | 1.12.0 |

Install the peer for the adapter the application imports. Those provider imports are type-only in the projections; the host still owns its runtime, transport, credentials, execution, cancellation and accepted conversation state. Importing a projection neither configures a provider nor makes a network request.

The independent consumer checks both the base package without these peers and all four typed subpaths with their declared peers. Its strict optional-adapter check also installs `@types/node`, `@types/json-schema` and `@types/ws` as development dependencies because the provider declarations reference those types. It keeps `skipLibCheck: false` and includes invalid-input type assertions; it does not replace unresolved SDK types with `any`.

## Publish agent documentation in the host application

The Node-only entry `@quantitative-hci/liquid-glass/agent-documents` reads canonical files from the installed package. It requires no Git executable, repository checkout, source aliases, credentials or runtime dependency beyond Node 24's built-ins. Do not import it in browser component code.

For Vite, add the supplied plugin to the application's configuration:

```js
import { defineConfig } from "vite";
import { agentDocumentsPlugin } from "@quantitative-hci/liquid-glass/agent-documents";

export default defineConfig({
  base: "/studio/",
  plugins: [agentDocumentsPlugin()],
});
```

The plugin uses Vite's base path, serves documents during development, emits them in production, and links the page to its matching release identity. An explicitly provided plugin `basePath` must agree with Vite's `base`. Root-relative paths such as `/`, `/studio/` and `/products/design/` are supported; query strings, fragments, traversal segments and cross-origin CDN bases are rejected.

Keep the production artifact check in the application's build command:

```json
{
  "scripts": {
    "build": "tsc --noEmit && vite build && quantive-agent-documents check --output dist --base /studio/"
  }
}
```

For another static builder, run the CLI after the application's HTML exists:

```bash
npm exec -- quantive-agent-documents emit --output dist --base /studio/
npm exec -- quantive-agent-documents check --output dist --base /studio/
```

`emit` writes the canonical documents, replaces the page's agent metadata, and verifies the result. `--page` chooses another HTML file within the output directory; it defaults to `index.html`. The files are written as `dist/agent-index.json`, `dist/contracts/...` and related assets. The host serves that output directory at `/studio/`; the publisher does not create a second `dist/studio` directory.

The publication includes the compact index, complete registry, individual contracts, action inputs, schemas, guides, component recipe registry and release record. Index/envelope schema links, action schema links, release resources and guide links all follow the chosen prefix. The generated schemas are rebased from the same canonical schema files, including their path constraints.

## Node API

| Export | Result and boundary |
| --- | --- |
| `createAgentDocuments(options?)` | Returns a map of relative asset filenames to UTF-8 content. Does not write files. |
| `writeAgentDocuments({output, page?, ...options})` | Writes documents and updates an existing built HTML page. `page: false` emits documents only; the host must then bind its page before running verification. |
| `verifyAgentDocuments({output, page?, ...options})` | Returns errors, file and contract counts, contract-set identity and kit source identity. Does not repair or mutate output. |
| `validateDocumentSchemas(documents)` | Returns schema errors using the schemas included in that publication. References must resolve within its base path. |
| `agentDocumentsPlugin(options?)` | Provides the Vite development/build integration. |
| `normalizeBasePath(path?)` | Validates and normalizes a root-relative publication prefix. |
| `sha256(content)` | Returns the `sha256:` fingerprint used by the index and release records. |

Shared options are `basePath`, `packageRoot` and `source`. `packageRoot` defaults to the installed package directory, not the host application's working directory. `source` is an explicit kit-source override for repository build integration and controlled tests. Ordinary consumers should use the compiled package's recorded identity.

## Identity and provenance

The canonical `release.contractSet` hashes the package metadata and canonical documentation inputs. Moving an unchanged kit from `/` to `/studio/` preserves this identity. Individual emitted file fingerprints cover the actual mounted bytes, so rebased schemas, envelopes and links receive their own exact hashes.

The package build freezes `dist/source-identity.json` with its package version and kit source provenance. A clean source build records a commit and tree; a dirty build reports its base commit and dirty status; unavailable source information remains unavailable. The installed publisher reads this record and does not inspect the host's Git repository. A stale version in the compiled provenance file fails publication.

`release.source` identifies the kit source. It does not identify the consuming application's source or deployment; a host can publish its own build metadata separately. Content fingerprints do not establish authenticity, runtime correctness or human review.

The production check verifies exact canonical output, schema resolution, individual contract fingerprints, missing and orphan contracts, and the HTML page's matching identity and release link. A different base path or a stale document fails. Rebuild after changing canonical package inputs.

## Independent consumer evidence

The fixture in `tests/fixtures/liquid-glass-consumer` is copied outside the monorepo before installation. `glass:consumer` builds and packs the kit, installs the actual tarball, copies the gallery's exact starter source, checks that the app and package resolve one React/SDK registry, and performs a production build plus the installed documentation CLI check.

```bash
# Uses the package manager's cache.
npm run glass:consumer

# Allows fetching the same pinned dependencies for a fresh environment.
npm run glass:consumer -- --online

# Focused documentation regression tests.
node --test tests/test_agent_documents.mjs tests/test_liquid_glass_distribution.mjs
```

The fixture uses ordinary React/Vite settings, compiled package exports and no source aliases. The base build excludes optional provider peers. A second strict typecheck adds them and validates all four adapter subpaths. The script retains the consumer directory and records it in `test-results/package-consumer.json`; the report states that browser acceptance has not run until the browser contract is executed.

The browser contract verifies mounted provider/icons, the shared viewport, filter/layout compositions, accepted host state, host cancellation, confirmation refusal, keyboard input, the exact copied starter, effect teardown/remount, operation without WebMCP, and a real persisted BFCache return. Its development pass verifies React StrictMode's effect replay and an actual Vite hot update without duplicate tool registrations. WebMCP transport registration is instrumented in the fixture; control discovery and actions use the real SDK bridge.

In ordinary CI the harness can start its own production and development servers:

```bash
npm run glass:consumer:browser
```

When preview servers are managed externally, pass their existing URLs:

```bash
python3 tests/test_liquid_glass_consumer.py \
  --directory /absolute/path/to/consumer \
  --base-url http://127.0.0.1:4186/studio/ --skip-hmr

python3 tests/test_liquid_glass_consumer.py \
  --directory /absolute/path/to/consumer \
  --dev-url http://127.0.0.1:4187/studio/ --only-hmr
```

The managed Sites environment requires its preview daemon; the harness refuses to start a competing server there. Browser evidence is written separately from the build report. These checks establish the exercised consumer behavior, not live provider connectivity, human usability approval or support for untested frameworks.

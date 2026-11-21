# Standards catalogue and adapter coverage

The Standards section combines a complete snapshot of OMG's **current specification catalogue** with explicitly bounded interactive adapters. Inventory coverage and implementation coverage are separate. A link to a specification, a styled node, or a generic graph is not an implementation of that specification.

All custom views and adapters remain **Unvalidated**: a human UI/UX team has not approved this implementation. This label describes our UI work, not the publication status or quality of an OMG specification.

## Catalogue provenance and completeness

Source: [OMG — Catalogue of Specifications](https://www.omg.org/spec/), retrieved **21 November 2026**. The snapshot includes every row of the page's `all-table` table, including formal and beta versions. It preserves the displayed title, acronym, version, publication status, publication month, family URL, and version URL.

| Inventory | Entries | Meaning |
| --- | ---: | --- |
| Current OMG catalogue | 286 | Every specification-version row in the official full table |
| Unique current OMG families | 270 | Distinct canonical family URLs, not 286 independent families |
| Formal publications | 263 | Publication status from OMG |
| Beta publications | 23 | Publication status from OMG; beta is not treated as formal |
| Additional historical version | 1 | SysML 1.7, explicitly pinned for the legacy profile adapter |
| External research profile | 1 | UWE, attributed to LMU rather than OMG |
| Combined UI inventory | 288 | Current OMG rows plus the two explicitly marked additions |

“Complete” refers to the current full table, **not** all historical versions, work-in-progress RFPs, withdrawn documents, or the contents of every specification. The current catalogue lists SysML 2.0. SysML 1.7 is kept as an additional version because its UML-profile notation is materially different from SysML 2.0. UWE is outside OMG's catalogue and is identified separately.

The source HTML SHA-256 is `edcd0d540ca7351afbf722a6b94a9e50031ecc9a11ff1e2072321a4a63f54100`. The repository retains factual metadata and our coverage descriptions, not copies of specification prose or diagrams.

Files:

- `packages/liquid-glass/src/standards/catalogue.snapshot.json`: the versioned factual inventory and source metadata.
- `packages/liquid-glass/src/standards/catalogue.ts`: typed discovery API, editorial navigation groups, and exact-version adapter coverage.
- `packages/liquid-glass/src/standards/catalogue.refresh.py`: standard-library-only importer for the official full table.

The importer checks the official table's advertised total, row shape, unique version identities, publication statuses, and source URL authority before writing. Refreshing factual metadata does not grant new versions an adapter. A reviewer must separately review classifications, notation, compatibility, and supported views.

```sh
python packages/liquid-glass/src/standards/catalogue.refresh.py
```

For reproducible offline parsing of a saved official response:

```sh
python packages/liquid-glass/src/standards/catalogue.refresh.py \
  --input /path/to/omg-spec-catalogue.html \
  --retrieved-on 2026-11-21
```

## What the coverage labels mean

| Machine value | Human label | Contract |
| --- | --- | --- |
| `notation-subset` | Interactive notation subset | Dedicated structured views for a declared subset of a specific notation version. Does not imply complete metamodel, semantics, conformance, runtime, or interchange support. |
| `concept-projection` | Interactive concept projection | An application-defined view of concepts from the standard. The layout and symbols are not represented as an authority-prescribed concrete notation. |
| `reference-only` | Reference only | Searchable factual entry with a pinned primary-source link. No dedicated adapter, validator, runtime, or interchange support for that version. |

Publication `status` is a separate field: `formal`, `beta`, or `research-profile`. “Formal” means the authority formally published the specification; it does not mean our component is validated or conformant. Conversely, a reference-only standard can be formally published.

The current registry has **8 notation-subset entries, 3 concept-projection entries, and 277 reference-only entries**. Its implemented view contract comprises **27 view IDs**. These are bounds on the adapters, not counts of fully implemented standards.

## Interactive coverage by pinned version

| Authority and version | Coverage | Views and material limits |
| --- | --- | --- |
| [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1) | Notation subset | Examples for 14 diagram kinds: class, object, package, component, deployment, composite structure, profile, use case, activity, state machine, sequence, communication, interaction overview, timing. Each has a bounded symbol vocabulary. No full UML model validation, execution semantics, or XMI round trip. |
| [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2) | Notation subset | Process view: bounded events, activities, gateways and sequence flows. No process engine, full collaboration/choreography/conversation suite, or BPMN XML interchange. |
| [OMG DMN 1.6](https://www.omg.org/spec/DMN/1.6) | Notation subset | Decision requirements diagram and decision table. No FEEL evaluation, decision-service engine, full expressions, hit-policy execution, or DMN XML interchange. DMN 1.7 beta remains reference-only. |
| [OMG CMMN 1.1](https://www.omg.org/spec/CMMN/1.1) | Notation subset | Case plan view with bounded stage, task, milestone and criterion notation. No case lifecycle execution, complete sentry semantics, or CMMN XML interchange. |
| [OMG VDML 1.1](https://www.omg.org/spec/VDML/1.1) | Notation subset | Limited roles, deliverables and value concepts using Clause 8 notation. No full eight-view suite, operational value calculation, or metamodel interchange. |
| [OMG IFML 1.0](https://www.omg.org/spec/IFML/1.0) | Notation subset | View containers/components, events, actions and interaction flows. No platform generation, parameter-binding execution, full IFML semantics, or XMI interchange. |
| [OMG SysML 1.7](https://www.omg.org/spec/SysML/1.7) | Notation subset; historical pin | Legacy block and requirements views. No claim of all SysML v1 diagrams, simulation, or SysML v2 support. The current [SysML 2.0](https://www.omg.org/spec/SysML/2.0) entry is reference-only. |
| [LMU UWE tutorials](https://uwe.pst.ifi.lmu.de/) | Notation subset; external profile | Navigation and presentation profile examples. No claim of an OMG UWE specification, a tutorial version number, complete profile validation, or transformations. |
| [OMG BMM 1.3](https://www.omg.org/spec/BMM/1.3) | Concept projection | Motivation concepts and named relationships. BMM's notation independence is preserved: the visual layout is application-defined. |
| [OMG SBVR 1.5](https://www.omg.org/spec/SBVR/1.5) | Concept projection | Vocabulary and rule records in a structured text/table view. No formal logical parser, rule engine, or semantics validation. The table is not called normative SBVR graphical notation. |
| [OMG BACM 1.1](https://www.omg.org/spec/BACM/1.1) | Concept projection | Capability/outcome view with explicitly named concepts and relationships. No full BACM metamodel, framework compliance, or mandated capability-map notation. BACM 1.2 beta is reference-only. |

### Registered view identifiers

| Family | Stable IDs |
| --- | --- |
| UML | `uml-class`, `uml-object`, `uml-package`, `uml-component`, `uml-deployment`, `uml-composite`, `uml-profile`, `uml-use-case`, `uml-activity`, `uml-state`, `uml-sequence`, `uml-communication`, `uml-interaction-overview`, `uml-timing` |
| UWE | `uwe-navigation`, `uwe-presentation` |
| BPMN | `bpmn-process` |
| DMN | `dmn-requirements`, `dmn-table` |
| CMMN | `cmmn-case` |
| VDML | `vdml-value` |
| IFML | `ifml-interaction` |
| SysML 1.7 | `sysml-block`, `sysml-requirements` |
| BMM | `bmm-motivation` |
| SBVR | `sbvr-vocabulary` |
| BACM | `bacm-capabilities` |

The release check must ensure each advertised `viewId` resolves to an actual sample/adapter. Do not register placeholders as renderable support. Supporting a view does not make every element or relationship in its parent specification renderable.

## Primary notation decisions

Glass surfaces belong to the viewport, controls and optional presentation treatment. They must preserve the symbols, edge patterns, labels and compartments that carry notation meaning. Colour is supplemental; it cannot replace a required shape or line pattern.

### Business and decision notations

[DMN 1.6, Clauses 6.2 and 8.2](https://www.omg.org/spec/DMN/1.6/PDF) distinguish a rectangular decision, a capsule-shaped input, a business knowledge model with two clipped corners, and a knowledge source with a wavy edge. Information, knowledge, and authority requirements use different line and endpoint patterns. A generic directed edge must not silently substitute for all three. The decision table uses double separators between inputs and outputs, and between clause headers and rule entries. Its `U` policy occupies the policy header cell; the irrelevant-input wildcard is ASCII `-`. The displayed expressions are uninterpreted text. This view is not an executing decision service.

[CMMN 1.1, Clause 6](https://www.omg.org/spec/CMMN/1.1/PDF) uses case-plan/stage boundaries, rounded tasks, milestones, event listeners and entry/exit criteria. A case relation must not be drawn as a BPMN sequence-flow arrow merely because both relate work items. Sentry OnPart connectors are dotted and target a criterion owned by the affected plan item. General dependencies use dash-dot-dot lines. Neither has an arrowhead. The example's expanded stage has its minus marker and an expanded six-cell planning-table marker; the discretionary task is owned by that planning table. Required work has an exclamation decorator. The milestone's completion dependency ends at its entry criterion, not a generic sequence-flow attachment.

[VDML 1.1, Clause 8](https://www.omg.org/spec/VDML/1.1/PDF) specifies graphical conventions for eight views. In the implemented subset, roles use ovals; tangible and intangible deliverables use solid and dashed flows respectively, with filled arrowheads. Tangibility here distinguishes contractual deliverables from informal contributions; it does not require a physical object. Value propositions have their own square symbol and external label. Directed connectors run from provider to proposition and from proposition to recipient. Rendering this bounded combined role/value view does not implement VDML's complete semantic model.

[BMM 1.3](https://www.omg.org/spec/BMM/1.3/PDF) describes motivation concepts independently of a particular modelling notation. The custom view therefore exposes concept types and relationship names explicitly and is labelled a concept projection. It does not invent a mandatory BMM shape language.

[SBVR 1.5](https://www.omg.org/spec/SBVR/1.5) defines business vocabulary and rules. Its graphical concept notation and ORM material are listed among the informative documents. The custom vocabulary/rules presentation is a concept projection; no normative graphical or logical-conformance claim follows from its appearance.

[BACM 1.1, Clauses 5 and 7.1.1](https://www.omg.org/spec/BACM/1.1/PDF) uses UML to present its metamodel and describes capabilities in terms of outcomes they need or produce. The capability view renders those concepts and named relationships. It does not label an application-defined card layout as an OMG-prescribed capability-map notation.

### Interaction and systems notations

[IFML 1.0, Table 7.1 and Clauses 8.1.3–8.1.6](https://www.omg.org/spec/IFML/1.0/PDF) uses rectangular view containers with header compartments, rounded view components, circular events, hexagonal actions, solid navigation flows, and dashed data flows. `[XOR]`, `[L]`, and `[D]` are meaningful container modifiers. Navigation flows originate from events and update views or invoke actions. An IFML view must preserve containment and distinguish navigation from data passing. The selection event is explicitly owned by its component; the action owns a completion event whose navigation flow opens the destination view. The separate data flow passes context and does not itself open that view.

### UML example semantics

[UML 2.5.1, Clauses 11.2.4, 15.5.3, 17.4.4 and 17.9.1.3](https://www.omg.org/spec/UML/2.5.1/PDF) constrain more than the appearance of a generic box and arrow. Composite parts use property notation in an internal-structure compartment, rather than underlined instance names. The retry activity uses an explicit merge: two alternative control flows directly entering an action would imply a join and change its behavior. Communication messages have small arrows adjacent to their numbered labels on connectors between lifelines; the sequence expression preserves call nesting (`1`, `1.1`, `1.1.1`). The sequence example aligns execution ends with its reply messages, and the profile's referenced UML metaclass is outside the profile's owned elements. These corrections keep the examples meaningful within their declared subsets; they do not establish whole-language conformance.

[SysML 1.7](https://www.omg.org/spec/SysML/1.7) and [SysML 2.0](https://www.omg.org/spec/SysML/2.0) are separate registry records. A legacy `«block»` or `«requirement»` view cannot establish support for the new language simply by relabelling its version. [UAF 1.3](https://www.omg.org/spec/UAF/1.3), [KerML 1.0](https://www.omg.org/spec/KerML/1.0), and [Systems Modeling API and Services 1.0](https://www.omg.org/spec/SystemsModelingAPI/1.0) remain reference-only until their own concrete scope is implemented and checked.

UWE's [navigation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html) distinguishes navigation classes, menus, indexes, queries and process links. Its [presentation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html) describes pages/groups and elements such as text, inputs, buttons and images. These profile conventions are attributed to the LMU UWE project, separately from the underlying OMG UML specification.

## Coverage beyond the visual adapters

The full inventory includes business entries beyond the featured adapters: BPM+, Business Process Definition Metamodel, Business Process Maturity Model, Shared Data Model and Notation, Pedigree and Provenance Model and Notation, Production Rule Representation, Standard Business Report Model, IT portfolio and government-performance models, and others. They remain discoverable with explicit version and support status. A business-related family is not omitted merely because it lacks a diagram adapter.

Many OMG publications define languages, data exchange, middleware, APIs, ontologies, metrics, industry models, or profiles. Appropriate future support can mean a parser, schema validator, vocabulary browser, protocol implementation, serializer, or domain-specific editor. A node canvas alone would not supply those capabilities. For example:

| Standard area | Appropriate implementation work before expanding the support claim |
| --- | --- |
| XMI, ReqIF, Diagram Definition | Versioned import/export or validation against the appropriate specification, with round-trip and incompatibility checks |
| SBVR, OCL, FEEL-related DMN execution | A declared grammar and semantic/evaluation subset with meaningful positive and negative cases |
| DDS, CORBA, Systems Modeling API | An appropriate runtime/protocol/API implementation and interoperability evidence; drawing a service card is insufficient |
| Ontologies and vocabularies | Versioned concept/relationship interpretation, identifiers and structured query/export support |
| Business metamodels and architecture frameworks | Explicit model/view scope, metaclass and relationship handling, constraints and version-specific interoperability |
| Metrics and quality standards | Correct measurement definitions, executable analysis, and reproducible inputs/outputs |

## Agent-facing contract

`standardsCatalogue` and `findStandards()` are deterministic and serializable. Each entry has stable `id`, `family`, `version`, `authority`, `status`, `sourceUrl`, `coverage`, `coverageDescription`, `viewIds`, `inventory`, and `validation` fields. UI search uses the same data as an agent tool; it does not infer support from title keywords.

```ts
import {
  findStandards,
  standardsCatalogue,
  catalogueCounts,
  omgCatalogueSource,
} from './catalogue';

const business = findStandards({ category: 'business' });
const currentBeta = findStandards({ inventory: 'current-omg', status: 'beta' });
const diagramViews = findStandards({ coverage: 'notation-subset' });
const dmnVersions = findStandards({ query: 'DMN' });
```

Categories and kinds are **editorial navigation aids**, derived from family lists and conservative title rules. They are not official OMG classifications and do not promise a single exclusive type for a multifaceted specification. Every unmatched family remains in the inventory; classification never drops records. The source metadata is kept separate so a classification change cannot alter a fact from OMG.

Consumer requirements:

- Keep publication status, adapter coverage, and UI validation separate and visible.
- Open the pinned `sourceUrl` when explaining a specific version; a family URL can point to a newer release.
- Enable navigation to a demo only for entries with registered `viewIds`.
- Show unsupported versions and nonvisual standards as reference-only; do not produce a generic graph under a “supported” badge.
- Preserve model IDs and semantic relationship names in text/JSON alternatives so agents and assistive technology do not have to infer them from pixels.
- Preserve `ownerId` separately from visual `parentId`. Boundary events, criteria and ports may belong to an element while overlapping its outline; forcing them into interior containment would change their geometry. A CMMN discretionary item can be owned by a planning table while being displayed inside the containing stage.
- Treat custom model JSON as application data. It is not XMI, BPMN XML, DMN XML, or a claim of interoperable OMG model exchange.
- Keep new adapters Unvalidated until the requested human UI/UX review occurs, even after automated interaction and rendering checks pass.

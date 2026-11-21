import snapshot from './catalogue.snapshot.json';

/** Editorial navigation groups, not an OMG classification or conformance claim. */
export const standardCategories = [
  { id: 'business', label: 'Business & decisions' },
  { id: 'systems', label: 'Systems & architecture' },
  { id: 'software', label: 'Software & interaction' },
  { id: 'knowledge', label: 'Data & knowledge' },
  { id: 'interchange', label: 'Languages & interchange' },
  { id: 'middleware', label: 'Middleware & services' },
  { id: 'quality', label: 'Quality & measurement' },
  { id: 'industry', label: 'Industry & domain' },
] as const;

export const standardKinds = [
  { id: 'notation', label: 'Graphical notation' },
  { id: 'concept-model', label: 'Conceptual model' },
  { id: 'vocabulary', label: 'Vocabulary & ontology' },
  { id: 'metamodel', label: 'Language & metamodel' },
  { id: 'interchange', label: 'Data & interchange' },
  { id: 'runtime', label: 'Runtime & API' },
  { id: 'method', label: 'Method & measurement' },
  { id: 'domain', label: 'Domain specification' },
] as const;

export type StandardCategory = (typeof standardCategories)[number]['id'];
export type StandardKind = (typeof standardKinds)[number]['id'];
export type StandardCoverage = 'notation-subset' | 'concept-projection' | 'reference-only';
export type StandardPublicationStatus = 'formal' | 'beta' | 'research-profile' | 'published-method' | 'published-protocol' | 'application-pattern';
export type StandardInventory = 'current-omg' | 'additional-version' | 'external-profile';

export const coverageLabels: Record<StandardCoverage, string> = {
  'notation-subset': 'Interactive notation subset',
  'concept-projection': 'Interactive concept projection',
  'reference-only': 'Reference only',
};

export interface StandardCatalogueEntry {
  /** Stable identity includes the exact publication version. */
  id: string;
  authority: 'OMG' | 'LMU UWE' | 'C4 model' | 'A2A' | 'Quantitative HCI';
  title: string;
  acronym: string;
  displayAcronym: string;
  /** Canonical family identifier, without trademark characters. */
  family: string;
  version: string;
  /** Publication status from the authority; separate from our adapter coverage. */
  status: StandardPublicationStatus;
  publicationDate: string;
  /** Pinned version URL; does not silently redirect coverage to a newer release. */
  sourceUrl: string;
  familyUrl: string;
  category: StandardCategory;
  kind: StandardKind;
  coverage: StandardCoverage;
  coverageDescription: string;
  viewIds: readonly string[];
  inventory: StandardInventory;
  /** Applies to our custom UI/adapter, not to the authority's specification. */
  validation: 'unvalidated';
}

/** The full official catalogue table is versioned data, not a handpicked list. */
export const omgCatalogueSource = snapshot.source;

const families = (value: string): ReadonlySet<string> => new Set(value.trim().split(/\s+/));

const categoryFamilies: ReadonlyArray<readonly [StandardCategory, ReadonlySet<string>]> = [
  ['business', families(`BACM BMM BPDM BPMM BPMN BPMNProfile CMMN DMN SBVR VDML BKPMN
    PRR SBRM SDMN PPMN ITPMF MPG WfMF`)],
  ['systems', families(`SysML KerML UAF UPDM RAAML SACM DAF SysPhS SyM CSRM FACE FACEv2
    SystemsModelingAPI MARTE QFTP SPTP SoCP SPECTRA PSUM IEF-RA FTF UPR`)],
  ['software', families(`UML IFML ALF FUML PSCS PSSM SoaML SPEM ASTM KDM UCM EAI EDOC
    CORP CCMP CCCMP Essence UTP2 SPMS VOICP UWE`)],
  ['knowledge', families(`API4KP Commons DPROD DTV MVF ODM DOL LCC EDMC-FIBO/BE
    EDMC-FIBO/FBC EDMC-FIBO/FND EDMC-FIBO/IND FIGI IEPPV CWM MIPS EXPRESS`)],
  ['interchange', families(`ADA C CPP COBOL CPP11 I2JAV IDL4-CSHARP IDL4-CPP IDL4-Java
    JAV2I LISP PL1 PYTH RCLM ST XML IDL MOF XMI DD MOF2I MOF2RDF MOFM2T QVT SMOF
    MEF MOFVD MOFFOL ReqIF TestIF MDMI SPDX HUTN UMLDI OCL NIEM-UML SCE RAS TOIF`)],
  ['quality', families(`AEP AFP ASCMM ASCPEM ASCRM ASCSM ASCDPM ASCQM ASCRSM ATDM ATDM2
    SMM SFPM APP-INST AMSM`)],
  ['middleware', families(`OTS AMI4CCM AVSTR ATLAS CORBABINDING CCM CORBAe FTAM RFLEC
    SCRPT C2WSDL SCCP COLL CORBA CONC CURR DDS-JSON DDS-XML DDS-XTypes DDS-TSN DDS-XRCE
    DDS4CCM DDSI-RTPS DDS-Monitoring DDS-SECURITY DDS DDS-DLRL DPP DEPL DSS EVoT EVNT
    EXT FT ZIOP DDS-PSM-Cxx ITFAC TMN DDS-Java LIC LFCYC LWFT LtLOAD LtLOG LtSVC MED
    MOBFAC NAM NEG NOT NOTJMS DDS-OPCUA ONUP PARTY PSS PROP PKI QOSCCM QUER CORBA-REST
    DDS-RPC RT RMS REL RAD SEC ServD SDO TSKSES TIME TRADE TRANS DDS-WEB WATM`)],
];

const notationFamilies = families(`UML UWE BPMN CMMN DMN VDML IFML SysML UAF UPDM
  RAAML SACM SDMN PPMN BKPMN SoaML MARTE UTP2`);
const conceptFamilies = families('BACM BMM MPG ITPMF PC CSRM IEF-RA FTF');
const vocabularyFamilies = families(`SBVR DTV MVF ODM Commons DPROD DOL LCC IEPPV
  EDMC-FIBO/BE EDMC-FIBO/FBC EDMC-FIBO/FND EDMC-FIBO/IND ROSO`);
const methodFamilies = families(`BPMM Essence SPEM AEP AFP ASCMM ASCPEM ASCRM ASCSM
  ASCDPM ASCQM ASCRSM ATDM ATDM2 SMM SFPM`);
const metamodelFamilies = families(`ALF FUML PSCS PSSM ASTM KDM BPDM KerML MOF SMOF
  MEF QVT MOFM2T MOFVD MOFFOL OCL PRR SBRM EXPRESS CWM SPMS SCE DAF PSUM SOLM`);
const interchangeFamilies = families(`XMI DD UMLDI ReqIF TestIF MDMI SPDX MIPS
  MOF2I MOF2RDF HUTN TOIF RAS NIEM-UML DDS-JSON DDS-XML DDSI-RTPS DDS-XTypes
  C2MS TEX XTCE XUSP GDDI`);
const apiFamilies = families('API4KP SystemsModelingAPI DRAPI');

function categoryFor(family: string): StandardCategory {
  return categoryFamilies.find(([, group]) => group.has(family))?.[0] ?? 'industry';
}

function kindFor(family: string, title: string, category: StandardCategory): StandardKind {
  if (notationFamilies.has(family)) return 'notation';
  if (conceptFamilies.has(family)) return 'concept-model';
  if (vocabularyFamilies.has(family)) return 'vocabulary';
  if (methodFamilies.has(family)) return 'method';
  if (metamodelFamilies.has(family)) return 'metamodel';
  if (interchangeFamilies.has(family)) return 'interchange';
  if (apiFamilies.has(family)) return 'runtime';
  if (category === 'interchange') return 'interchange';
  if (category === 'middleware') return 'runtime';
  if (/\b(metamodel|profile|language)\b/i.test(title)) return 'metamodel';
  if (/\b(ontology|vocabulary)\b/i.test(title)) return 'vocabulary';
  if (/\b(service|services|interface|API)\b/i.test(title)) return 'runtime';
  return 'domain';
}

type CoverageDefinition = Pick<StandardCatalogueEntry, 'coverage' | 'coverageDescription' | 'viewIds'>;

/** Exact version pins are intentional: a beta/new language never inherits an adapter. */
const coverageByVersion: Readonly<Record<string, CoverageDefinition>> = {
  'UML@2.5.1': {
    coverage: 'notation-subset',
    coverageDescription: 'Bounded notation examples for all 14 UML diagram kinds. Structured SVG and text views; no complete UML metamodel validation, execution semantics, or XMI import/export.',
    viewIds: ['uml-class', 'uml-object', 'uml-package', 'uml-component', 'uml-deployment', 'uml-composite', 'uml-profile', 'uml-use-case', 'uml-activity', 'uml-state', 'uml-sequence', 'uml-communication', 'uml-interaction-overview', 'uml-timing'],
  },
  'BPMN@2.0.2': {
    coverage: 'notation-subset',
    coverageDescription: 'Process view with bounded event, activity, gateway and sequence-flow notation. No process engine, complete choreography/conversation coverage, or BPMN XML round trip.',
    viewIds: ['bpmn-process'],
  },
  'DMN@1.6': {
    coverage: 'notation-subset',
    coverageDescription: 'Decision requirements and decision table views. No FEEL evaluation, hit-policy execution, complete expression language, or DMN XML interchange.',
    viewIds: ['dmn-requirements', 'dmn-table'],
  },
  'CMMN@1.1': {
    coverage: 'notation-subset',
    coverageDescription: 'Case plan view with a bounded stage, task, milestone and criterion vocabulary. No case lifecycle engine, full sentry semantics, or CMMN XML interchange.',
    viewIds: ['cmmn-case'],
  },
  'VDML@1.1': {
    coverage: 'notation-subset',
    coverageDescription: 'Limited role, deliverable and value view informed by Clause 8 graphical notation. No complete eight-view coverage, value analysis, or VDML metamodel interchange.',
    viewIds: ['vdml-value'],
  },
  'IFML@1.0': {
    coverage: 'notation-subset',
    coverageDescription: 'Bounded view-container, component, event, action and interaction-flow notation. No IFML execution, platform generation, parameter-binding engine, or XMI interchange.',
    viewIds: ['ifml-interaction'],
  },
  'SysML@1.7': {
    coverage: 'notation-subset',
    coverageDescription: 'Pinned SysML v1.7 block and requirement views. This UML-profile subset does not implement SysML v2, simulation, complete v1 diagram coverage, or model interchange.',
    viewIds: ['sysml-block', 'sysml-requirements'],
  },
  'BMM@1.3': {
    coverage: 'concept-projection',
    coverageDescription: 'An application-defined projection of motivation concepts and named relationships. BMM is notation-independent; these boxes are not an OMG-prescribed concrete notation.',
    viewIds: ['bmm-motivation'],
  },
  'SBVR@1.5': {
    coverage: 'concept-projection',
    coverageDescription: 'Vocabulary and rule records presented as structured text. No SBVR logical-form parser, rule engine, formal semantics validation, or claim that this layout is normative SBVR notation.',
    viewIds: ['sbvr-vocabulary'],
  },
  'BACM@1.1': {
    coverage: 'concept-projection',
    coverageDescription: 'An application-defined capability/outcome concept view. No complete BACM metamodel implementation, framework compliance, or normative capability-map notation is claimed.',
    viewIds: ['bacm-capabilities'],
  },
  'UWE@profile': {
    coverage: 'notation-subset',
    coverageDescription: 'Eleven labelled UWE views: requirements, requirement activity, content, navigation, presentation, process structure and flow, user roles, basic rights, navigation states and application modes. Linked examples and bounded profile checks; no complete UWE metamodel/OCL conformance, XMI round trip, model transformation or access-control execution.',
    viewIds: ['uwe-requirements', 'uwe-requirement-activity', 'uwe-content', 'uwe-navigation', 'uwe-presentation', 'uwe-process-structure', 'uwe-process-flow', 'uwe-user-roles', 'uwe-basic-rights', 'uwe-navigation-states', 'uwe-application-modes'],
  },
};

function referenceCoverage(kind: StandardKind, status: StandardPublicationStatus): CoverageDefinition {
  const kindLabel = standardKinds.find((item) => item.id === kind)?.label.toLowerCase() ?? 'specification';
  return {
    coverage: 'reference-only',
    coverageDescription: `${status === 'beta' ? 'Beta publication. ' : ''}Catalogued ${kindLabel} with a versioned primary source. No dedicated adapter, validator, runtime or interchange support is implemented for this version.`,
    viewIds: [],
  };
}

const officialEntries: StandardCatalogueEntry[] = snapshot.entries.map((entry) => {
  const category = categoryFor(entry.acronym);
  const kind = kindFor(entry.acronym, entry.name, category);
  const status: StandardPublicationStatus = entry.status === 'beta' ? 'beta' : 'formal';
  return {
    id: entry.id,
    authority: 'OMG',
    title: entry.name,
    acronym: entry.acronym,
    displayAcronym: entry.displayAcronym,
    family: entry.acronym,
    version: entry.version,
    status,
    publicationDate: entry.publicationDate,
    sourceUrl: entry.versionUrl,
    familyUrl: entry.familyUrl,
    category,
    kind,
    ...coverageByVersion[entry.id] ?? referenceCoverage(kind, status),
    inventory: 'current-omg',
    validation: 'unvalidated',
  };
});

const additionalEntries: StandardCatalogueEntry[] = [
  {
    id: 'SysML@1.7',
    authority: 'OMG',
    title: 'OMG Systems Modeling Language — legacy v1 profile',
    acronym: 'SysML',
    displayAcronym: 'SysML®',
    family: 'SysML',
    version: '1.7',
    status: 'formal',
    publicationDate: 'June 2024',
    sourceUrl: 'https://www.omg.org/spec/SysML/1.7',
    familyUrl: 'https://www.omg.org/spec/SysML',
    category: 'systems',
    kind: 'notation',
    ...coverageByVersion['SysML@1.7'],
    inventory: 'additional-version',
    validation: 'unvalidated',
  },
  {
    id: 'UWE@profile',
    authority: 'LMU UWE',
    title: 'UML-based Web Engineering',
    acronym: 'UWE',
    displayAcronym: 'UWE',
    family: 'UWE',
    version: '3.0 (implemented subset)',
    status: 'research-profile',
    publicationDate: 'Sources checked 21 November 2026',
    sourceUrl: 'https://uwe.pst.ifi.lmu.de/publicationsMetamodelAndProfile.html',
    familyUrl: 'https://uwe.pst.ifi.lmu.de/',
    category: 'software',
    kind: 'notation',
    ...coverageByVersion['UWE@profile'],
    inventory: 'external-profile',
    validation: 'unvalidated',
  },
  {
    id: 'C4@2026-11', authority: 'C4 model', title: 'C4 model for visualising software architecture',
    acronym: 'C4', displayAcronym: 'C4', family: 'C4', version: '2026-11 reference snapshot',
    status: 'published-method', publicationDate: 'Sources checked 21 November 2026',
    sourceUrl: 'https://c4model.com/', familyUrl: 'https://c4model.com/', category: 'systems', kind: 'notation',
    coverage: 'notation-subset',
    coverageDescription: 'All seven C4 view types: landscape, context, container, component, code, dynamic and deployment. Typed elements, technology labels, directed relationships, legends and linked drill-downs. A local notation adapter; no Structurizr DSL parser or C4 certification claim.',
    viewIds: ['c4-landscape', 'c4-context', 'c4-container', 'c4-component', 'c4-code', 'c4-dynamic', 'c4-deployment'],
    inventory: 'external-profile', validation: 'unvalidated',
  },
  {
    id: 'A2A@0.3.0', authority: 'A2A', title: 'Agent2Agent task-state projection',
    acronym: 'A2A', displayAcronym: 'A2A', family: 'A2A', version: '0.3.0 (state projection)',
    status: 'published-protocol', publicationDate: 'Pinned protocol 0.3.0',
    sourceUrl: 'https://a2a-protocol.org/v0.3.0/specification/', familyUrl: 'https://a2a-protocol.org/', category: 'software', kind: 'concept-model',
    coverage: 'concept-projection',
    coverageDescription: 'All nine A2A TaskState values rendered with UML state notation. Illustrative transitions and cross-view links; no A2A network transport, Agent Card schema validator or protocol-conformance claim.',
    viewIds: ['agent-task-lifecycle'], inventory: 'external-profile', validation: 'unvalidated',
  },
  {
    id: 'Agent-patterns@1.0', authority: 'Quantitative HCI', title: 'Agent collaboration patterns',
    acronym: 'Agent patterns', displayAcronym: 'Agent patterns', family: 'Agent patterns', version: '1.0 (local projection)',
    status: 'application-pattern', publicationDate: '21 November 2026',
    sourceUrl: 'https://a2a-protocol.org/v0.3.0/specification/', familyUrl: 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools', category: 'software', kind: 'concept-model',
    coverage: 'concept-projection',
    coverageDescription: 'Application-defined architecture and reviewed tool-interaction views using established UML component and sequence notation. Informed by A2A task/artifact and MCP tool concepts; not an OMG profile or a normative protocol architecture.',
    viewIds: ['agent-architecture', 'agent-handoff'], inventory: 'external-profile', validation: 'unvalidated',
  },
];

/** Official OMG inventory plus explicitly attributed external profiles and methods. */
export const standardsCatalogue: readonly StandardCatalogueEntry[] = [...officialEntries, ...additionalEntries];

export const catalogueCounts = {
  officialEntries: omgCatalogueSource.entryCount,
  officialFamilies: omgCatalogueSource.familyCount,
  totalEntries: standardsCatalogue.length,
  notationSubsets: standardsCatalogue.filter((entry) => entry.coverage === 'notation-subset').length,
  conceptProjections: standardsCatalogue.filter((entry) => entry.coverage === 'concept-projection').length,
  referenceOnly: standardsCatalogue.filter((entry) => entry.coverage === 'reference-only').length,
  views: standardsCatalogue.reduce((count, entry) => count + entry.viewIds.length, 0),
} as const;

export interface StandardCatalogueQuery {
  query?: string;
  category?: StandardCategory;
  kind?: StandardKind;
  coverage?: StandardCoverage;
  status?: StandardPublicationStatus;
  authority?: StandardCatalogueEntry['authority'];
  inventory?: StandardInventory;
}

/** Serializable, deterministic discovery for agent tools and human catalogue controls. */
export function findStandards(filters: StandardCatalogueQuery = {}): StandardCatalogueEntry[] {
  const terms = (filters.query ?? '').toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
  return standardsCatalogue.filter((entry) => {
    if (filters.category && entry.category !== filters.category) return false;
    if (filters.kind && entry.kind !== filters.kind) return false;
    if (filters.coverage && entry.coverage !== filters.coverage) return false;
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.authority && entry.authority !== filters.authority) return false;
    if (filters.inventory && entry.inventory !== filters.inventory) return false;
    const text = [entry.id, entry.title, entry.acronym, entry.version, entry.authority,
      entry.category, entry.kind, entry.coverage, entry.coverageDescription].join(' ').toLocaleLowerCase('en');
    return terms.every((term) => text.includes(term));
  });
}

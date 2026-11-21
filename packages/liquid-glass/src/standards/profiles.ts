import type { DiagramEdgeKind, DiagramModel, DiagramNodeKind, DiagramNotation } from "../developer/types";

export interface DiagramProfile {
  id: string;
  name: string;
  family: "uwe" | "c4" | "agent" | "custom";
  authority: string;
  version: string;
  sourceUrl: string;
  notation: DiagramNotation;
  coverage: "notation-subset" | "concept-projection";
  scope: string;
  allowedNodeKinds: readonly DiagramNodeKind[];
  allowedEdgeKinds: readonly DiagramEdgeKind[];
  stereotypes?: Partial<Record<DiagramNodeKind, readonly string[]>>;
}

export interface DiagramProfileIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

const umlRelations: readonly DiagramEdgeKind[] = ["association", "composition", "aggregation", "generalization", "dependency", "realization", "commentLink"];
const activityNodes: readonly DiagramNodeKind[] = ["activity", "initial", "final", "decision", "merge", "fork", "objectNode", "port", "comment"];
const activityRelations: readonly DiagramEdgeKind[] = ["controlFlow", "objectFlow", "commentLink"];
const navigationStereotypes = ["navigationClass", "menu", "index", "query", "guidedTour", "externalNode", "processClass"];
const presentationStereotypes = ["presentationPage", "presentationGroup", "iteratedPresentationGroup", "presentationAlternatives", "inputForm", "text", "textInput", "button", "anchor", "image", "fileUpload", "customComponent", "selection", "mediaObject", "tab", "slider", "imageInput"];
const processStereotypes = ["userAction", "systemAction"];
const securitySource = "https://www.pst.ifi.lmu.de/~busch/thesisMarianneBusch.pdf";
const uwe = (id: string, name: string, notation: DiagramNotation, page: string, scope: string, allowedNodeKinds: readonly DiagramNodeKind[], allowedEdgeKinds: readonly DiagramEdgeKind[], stereotypes?: DiagramProfile["stereotypes"]): DiagramProfile => ({
  id, name, notation, family: "uwe", authority: "LMU — UML-based Web Engineering", version: "3.0 (implemented subset)",
  sourceUrl: page.startsWith("https:") ? page : `https://uwe.pst.ifi.lmu.de/${page}`, coverage: "notation-subset", scope,
  allowedNodeKinds, allowedEdgeKinds, stereotypes,
});
const c4Nodes: readonly DiagramNodeKind[] = ["c4Person", "c4Element", "c4Boundary", "c4Database", "comment"];
const c4 = (id: string, name: string, notation: DiagramNotation, page: string, scope: string, allowedNodeKinds = c4Nodes, allowedEdgeKinds: readonly DiagramEdgeKind[] = ["c4Relationship", "commentLink"]): DiagramProfile => ({
  id, name, notation, family: "c4", authority: "Simon Brown — C4 model", version: "2026-11 reference snapshot", sourceUrl: `https://c4model.com/diagrams/${page}`,
  coverage: "notation-subset", scope, allowedNodeKinds, allowedEdgeKinds,
});

export const diagramProfiles: readonly DiagramProfile[] = [
  uwe("uwe-requirements", "UWE · Requirements", "UWE requirements", "teachingTutorialRequirements.html", "Use cases distinguish browsing and processing. Actor associations and UML include/extend dependencies are editable; no requirements transformation engine.", ["actor", "useCase", "package", "comment"], ["association", "dependency", "generalization", "commentLink"], { useCase: ["browsing", "processing", "webUseCase"] }),
  uwe("uwe-requirement-activity", "UWE · Requirement activities", "UWE requirement activity", "teachingTutorialRequirements.html", "Detailed requirements use UML activities with UWE display, navigation, user and system actions; action pins identify input/output data. RIA tags are declarative.", activityNodes, activityRelations, { activity: [...processStereotypes, "displayAction", "navigationAction"], port: ["displayPin", "interactionPin"] }),
  uwe("uwe-content", "UWE · Content", "UWE content", "teachingTutorialContent.html", "Content is a UML class model: classifiers, attributes, operations, generalization, associations and multiplicities. No persistence or code generation.", ["class", "interface", "object", "package", "comment"], umlRelations),
  uwe("uwe-navigation", "UWE · Navigation structure", "UWE navigation", "teachingTutorialNavigation.html", "Navigation classes, menus, indexes, queries, guided tours, external nodes and process classes with navigation/process links. No routing generation.", ["uwe", "comment"], ["navigationLink", "processLink", "commentLink"], { uwe: navigationStereotypes }),
  uwe("uwe-presentation", "UWE · Presentation", "UWE presentation", "teachingTutorialPresentation.html", "Pages, groups, alternatives, repeated properties, forms and presentation controls. Multiplicity and RIA annotations are model data, not a generated application.", ["uwe", "comment"], ["association", "composition", "commentLink"], { uwe: presentationStereotypes }),
  uwe("uwe-process-structure", "UWE · Process structure", "UWE process structure", "teachingTutorialProcess.html", "Process classes and their structural dependencies are UML class diagrams linked to navigation entry points and detailed flows.", ["class", "uwe", "interface", "comment"], umlRelations, { uwe: ["processClass"] }),
  uwe("uwe-process-flow", "UWE · Process flow", "UWE process flow", "teachingTutorialProcess.html", "UML activity control/object flow with UWE userAction and systemAction. Decisions and merges are explicit; the diagram does not execute a process.", activityNodes, activityRelations, { activity: processStereotypes, port: ["displayPin", "interactionPin"] }),
  uwe("uwe-user-roles", "UWE · Users and roles", "UWE user and roles", securitySource, "UWE webUser and sessionClass classifiers plus Role classifiers and role instances. Links describe assignments; no authentication or authorization runtime.", ["class", "object", "comment"], umlRelations, { class: ["webUser", "sessionClass"] }),
  uwe("uwe-basic-rights", "UWE · Basic rights", "UWE basic rights", securitySource, "Role instances point to content classes through UWE create/readAll/updateAll/delete dependencies. authorizationConstraint comments express conditions without evaluating OCL or enforcing permissions.", ["object", "class", "comment"], ["dependency", "commentLink"]),
  uwe("uwe-navigation-states", "UWE · Navigation states", "UWE navigation states", securitySource, "UML state transitions with UWE session, navigationalNode, collection and search stereotypes. Role/entry guards are declarative; no session or security engine.", ["state", "initial", "final", "decision", "comment"], ["transition", "commentLink"], { state: ["session", "navigationalNode", "collection", "search"] }),
  uwe("uwe-application-modes", "UWE · Application modes", "UWE application modes", securitySource, "UWE appMode states describe application-wide operating modes and transitions. Mode-dependent access constraints remain model data.", ["state", "initial", "final", "comment"], ["transition", "commentLink"], { state: ["appMode"] }),
  c4("c4-landscape", "C4 · System landscape", "C4 system landscape", "system-landscape", "People and software systems across one organisation. Labels and links describe responsibilities; C4 is notation-independent.", ["c4Person", "c4Element", "comment"]),
  c4("c4-context", "C4 · System context", "C4 system context", "system-context", "One system in scope, its people and directly related external systems. Containers and components belong to lower-level views.", ["c4Person", "c4Element", "comment"]),
  c4("c4-container", "C4 · Containers", "C4 container", "container", "Applications and data stores inside one software system, with technology and inter-process protocols. A C4 container is not necessarily a Docker container."),
  c4("c4-component", "C4 · Components", "C4 component", "component", "Components inside one container, their responsibilities and implementation technology, with directly related external containers or systems."),
  c4("c4-code", "C4 · Code", "C4 code", "code", "A focused UML class view inside one component. This authored example is not reverse-engineered or synchronized with production source.", ["class", "interface", "object", "comment"], umlRelations),
  c4("c4-dynamic", "C4 · Dynamic interaction", "C4 dynamic", "dynamic", "Numbered directed relationships show one runtime scenario using the same entities as static C4 views. The example is a model, not a live execution trace."),
  c4("c4-deployment", "C4 · Deployment", "C4 deployment", "deployment", "One deployment environment with nested deployment nodes, infrastructure and instances linked to their logical containers. No infrastructure is provisioned.", [...c4Nodes, "c4Deployment"]),
  {
    id: "agent-architecture", name: "Agents · Shared command architecture", family: "agent", notation: "UML component",
    authority: "Quantitative HCI — local architecture projection", version: "1.0 (local projection)",
    sourceUrl: "https://a2a-protocol.org/v0.3.0/specification/", coverage: "concept-projection",
    scope: "A local architecture expressed with UML components and contracts. A2A is a design reference; this projection does not implement or certify protocol interoperability.",
    allowedNodeKinds: ["component", "interface", "port", "package", "comment"], allowedEdgeKinds: ["association", "dependency", "realization", "composition", "commentLink"],
  },
  {
    id: "agent-task-lifecycle", name: "Agents · Task lifecycle projection", family: "agent", notation: "UML state machine",
    authority: "Quantitative HCI — A2A state projection", version: "0.3.0 (state projection)",
    sourceUrl: "https://a2a-protocol.org/v0.3.0/specification/", coverage: "concept-projection",
    scope: "An illustrative UML projection of task states and interruption concepts from A2A v0.3.0. This is not a complete protocol state machine, transport or lifecycle runtime.",
    allowedNodeKinds: ["state", "initial", "final", "decision", "merge", "comment"], allowedEdgeKinds: ["transition", "commentLink"],
  },
  {
    id: "agent-handoff", name: "Agents · Review and handoff projection", family: "agent", notation: "UML sequence",
    authority: "Quantitative HCI — local interaction projection", version: "1.0 (local projection)",
    sourceUrl: "https://a2a-protocol.org/v0.3.0/specification/", coverage: "concept-projection",
    scope: "A local approval and handoff scenario expressed with UML lifelines and messages. Human review policy is application-specific; this is not a normative A2A interaction.",
    allowedNodeKinds: ["lifeline", "interaction", "actor", "comment"], allowedEdgeKinds: ["synchronousMessage", "returnMessage", "dependency", "commentLink"],
  },
];

export function getDiagramProfile(value: DiagramModel | string, profiles: readonly DiagramProfile[] = diagramProfiles): DiagramProfile | undefined {
  if (typeof value === "string") return profiles.find(profile => profile.id === value);
  return value.profileId ? profiles.find(profile => profile.id === value.profileId)
    : profiles.find(profile => profile.notation === value.notation && (profile.family === "uwe" || profile.family === "c4"));
}

export function validateDiagramProfile(model: DiagramModel, profiles: readonly DiagramProfile[] = diagramProfiles): DiagramProfileIssue[] {
  const profile = getDiagramProfile(model, profiles), issues: DiagramProfileIssue[] = [];
  const add = (code: string, message: string, details: Partial<DiagramProfileIssue> = {}) => issues.push({ severity: "error", code, message, ...details });
  if (!profile) return model.profileId ? [{ severity: "warning", code: "profile-unknown", message: `Profile ${model.profileId} is not registered. Structural checks remain active; no profile-specific semantic checks were applied.` }] : [];
  if (model.notation !== profile.notation) add("profile-notation", `${profile.name} requires notation ${profile.notation}.`);
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  for (const node of model.nodes) {
    if (!profile.allowedNodeKinds.includes(node.kind)) add("profile-node-kind", `${node.kind} is outside the ${profile.name} palette.`, { nodeId: node.id });
    const stereotypes = profile.stereotypes?.[node.kind];
    if (stereotypes && node.stereotype && !stereotypes.includes(node.stereotype)) add("profile-stereotype", `Stereotype ${node.stereotype} is outside this implemented ${profile.name} subset.`, { nodeId: node.id });
    if (profile.family === "uwe" && node.kind === "uwe" && !node.stereotype) add("uwe-stereotype-required", "Choose a UWE stereotype for this model element.", { nodeId: node.id });
    if (["uwe-process-flow", "uwe-requirement-activity"].includes(profile.id) && node.kind === "port" && nodes.get(node.ownerId ?? "")?.kind !== "activity") add("uwe-pin-owner", "An activity pin must have an owning action.", { nodeId: node.id });
    if (profile.family !== "c4" || !node.kind.startsWith("c4")) continue;
    const type = node.architecture?.type;
    if (!type) add("c4-type-required", "C4 elements must state their abstraction type.", { nodeId: node.id });
    if (node.kind === "c4Person" && type !== "Person") add("c4-person-type", "The person shape requires type Person.", { nodeId: node.id });
    if (type === "Person" && node.kind !== "c4Person") add("c4-person-shape", "Use the explicit person shape for a Person in this palette.", { nodeId: node.id });
    if (node.kind === "c4Boundary" && !["Software System", "Container"].includes(type ?? "")) add("c4-boundary-type", "This grouping boundary represents a Software System or Container.", { nodeId: node.id });
    if (node.kind === "c4Deployment" && type !== "Deployment Node") add("c4-deployment-type", "Deployment boundaries must be Deployment Nodes.", { nodeId: node.id });
    if (!node.description.trim()) add("c4-responsibility", "Describe this element's responsibility.", { nodeId: node.id });
    if (["Container", "Component", "Container Instance", "Software System Instance", "Deployment Node", "Infrastructure Node"].includes(type ?? "") && !node.architecture?.technology?.trim()) add("c4-technology", "Specify the element's technology or execution environment.", { nodeId: node.id });
    if (["c4-context", "c4-landscape"].includes(profile.id) && !["Person", "Software System"].includes(type ?? "")) add("c4-abstraction-level", "Context and landscape views contain people and software systems.", { nodeId: node.id });
    if (profile.id === "c4-container" && !["Person", "Software System", "Container"].includes(type ?? "")) add("c4-abstraction-level", "A container view must not mix components or deployment nodes into its application-level scope.", { nodeId: node.id });
    if (profile.id === "c4-container" && type === "Container" && !node.architecture?.external && nodes.get(node.parentId ?? "")?.architecture?.type !== "Software System") add("c4-container-owner", "Place in-scope containers inside their software-system boundary.", { nodeId: node.id });
    if (profile.id === "c4-component" && type === "Component" && nodes.get(node.parentId ?? "")?.architecture?.type !== "Container") add("c4-component-owner", "Place components within the container they belong to.", { nodeId: node.id });
    if (profile.id === "c4-deployment" && type?.endsWith("Instance") && nodes.get(node.parentId ?? "")?.kind !== "c4Deployment") add("c4-instance-owner", "Place instances inside a deployment node.", { nodeId: node.id });
  }
  for (const edge of model.edges) {
    if (!profile.allowedEdgeKinds.includes(edge.kind)) add("profile-edge-kind", `${edge.kind} is outside the ${profile.name} relationship palette.`, { edgeId: edge.id });
    if (profile.family === "c4" && edge.kind === "c4Relationship") {
      if (!edge.label?.trim()) add("c4-relationship-label", "C4 relationships need a directional description.", { edgeId: edge.id });
      if (edge.directed === false) add("c4-relationship-direction", "C4 relationships are unidirectional.", { edgeId: edge.id });
      const source = nodes.get(edge.source)?.architecture?.type, target = nodes.get(edge.target)?.architecture?.type;
      if ([source, target].every(type => type === "Container" || type === "Container Instance") && !edge.technology?.trim()) add("c4-relationship-protocol", "Relationships between containers need a protocol or technology.", { edgeId: edge.id });
      if (profile.id === "c4-dynamic" && edge.order === undefined) add("c4-interaction-order", "Dynamic interactions need explicit order numbers.", { edgeId: edge.id });
    }
    if (profile.id === "uwe-navigation" && edge.kind === "navigationLink" && [nodes.get(edge.source)?.stereotype, nodes.get(edge.target)?.stereotype].some(value => value === "processClass" || value === "query")) add("uwe-process-link", "Use a processLink when entering or leaving a process class or query.", { edgeId: edge.id });
    if (["uwe-process-flow", "uwe-requirement-activity"].includes(profile.id)) {
      const ends = [nodes.get(edge.source)?.kind, nodes.get(edge.target)?.kind];
      if (edge.kind === "objectFlow" && !ends.some(kind => kind === "objectNode" || kind === "port")) add("uwe-object-flow", "Object flow carries data through an activity object node or action pin.", { edgeId: edge.id });
      if (edge.kind === "controlFlow" && ends.some(kind => kind === "objectNode" || kind === "port")) add("uwe-control-flow", "Use object flow for data nodes and pins; control flow connects control nodes and actions.", { edgeId: edge.id });
    }
    if (profile.id === "uwe-requirements" && edge.kind === "dependency" && ["«include»", "«extend»"].includes(edge.label ?? "") && [nodes.get(edge.source)?.kind, nodes.get(edge.target)?.kind].some(kind => kind !== "useCase")) add("uwe-use-case-dependency", "Include and extend dependencies connect two use cases.", { edgeId: edge.id });
    if (profile.id === "uwe-basic-rights" && edge.kind === "dependency") {
      if (nodes.get(edge.source)?.kind !== "object" || nodes.get(edge.target)?.kind !== "class") add("uwe-rights-endpoints", "This basic-rights subset connects a role instance to a content class.", { edgeId: edge.id });
      if (!["«create»", "«readAll»", "«updateAll»", "«delete»", "«executeAll»"].includes(edge.label ?? "")) add("uwe-rights-access-type", "Choose the supported create, readAll, updateAll, delete or executeAll dependency stereotype.", { edgeId: edge.id });
    }
  }
  if (profile.family === "c4" && !model.legend?.length) add("c4-legend", "Add a notation key so this C4 view can be read on its own.", { severity: "warning" });
  return issues;
}

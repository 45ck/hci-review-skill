import type { DiagramEdge, DiagramModel, DiagramNode, DiagramNotation } from "@quantitative-hci/liquid-glass/developer";
import { diagramModels } from "./developer-models";

const node = (id: string, name: string, kind: DiagramNode["kind"], x: number, y: number, width: number, height: number, extra: Partial<DiagramNode> = {}): DiagramNode => ({ id, name, kind, x, y, width, height, description: name, ...extra });
const edge = (id: string, source: string, target: string, kind: DiagramEdge["kind"], label: string, extra: Partial<DiagramEdge> = {}): DiagramEdge => ({ id, source, target, kind, label, description: label || kind, ...extra });
const uml = (scope: string): NonNullable<DiagramModel["standard"]> => ({ acronym: "UML", version: "2.5.1", sourceUrl: "https://www.omg.org/spec/UML/2.5.1", coverage: "notation-subset", scope });
const standard = (acronym: string, version: string, scope: string, projection = false): NonNullable<DiagramModel["standard"]> => ({ acronym, version, sourceUrl: "https://www.omg.org/spec/" + acronym + "/" + version, coverage: projection ? "concept-projection" : "notation-subset", scope });
const model = (id: string, name: string, notation: DiagramNotation, description: string, nodes: DiagramNode[], edges: DiagramEdge[], spec: NonNullable<DiagramModel["standard"]> = uml(notation + " elements and relationships shown in this example."), height = 600): DiagramModel => ({ id, name, notation, description, width: 960, height, nodes, edges, standard: spec });

const business: DiagramModel[] = [
  model("bpmn-process", "BPMN · Review a software release", "BPMN process", "A release passes review or returns for changes. Events, tasks, an exclusive gateway and sequence flows show the process inside its participant boundary.", [
    node("release-team", "Release team", "pool", 20, 45, 920, 450),
    node("ready", "Ready", "startEvent", 100, 180, 44, 44, { parentId: "release-team", description: "The process starts when a candidate release is ready." }),
    node("review", "Review release", "task", 210, 155, 180, 94, { parentId: "release-team", description: "Review the candidate and its verification evidence." }),
    node("decision", "Approved?", "gateway", 450, 170, 64, 64, { parentId: "release-team", marker: "×", description: "An exclusive gateway follows exactly one outcome." }),
    node("publish", "Publish release", "task", 630, 155, 170, 94, { parentId: "release-team" }),
    node("complete", "Released", "endEvent", 850, 180, 44, 44, { parentId: "release-team" }),
    node("revise", "Revise candidate", "task", 430, 345, 180, 74, { parentId: "release-team" }),
  ], [
    edge("ready-review", "ready", "review", "sequenceFlow", "", { sourceSide: "right", targetSide: "left" }),
    edge("review-decision", "review", "decision", "sequenceFlow", "", { sourceSide: "right", targetSide: "left" }),
    edge("approved-publish", "decision", "publish", "sequenceFlow", "yes", { sourceSide: "right", targetSide: "left", labelPosition: { x: 570, y: 185 } }),
    edge("publish-complete", "publish", "complete", "sequenceFlow", "", { sourceSide: "right", targetSide: "left" }),
    edge("revise-route", "decision", "revise", "sequenceFlow", "no", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 470, y: 308 } }),
    edge("review-again", "revise", "review", "sequenceFlow", "updated candidate", { sourceSide: "left", targetSide: "bottom", waypoints: [{ x: 300, y: 382 }], labelPosition: { x: 292, y: 437 } }),
  ], standard("BPMN", "2.0.2", "Participant, start/end events, tasks, exclusive gateway and sequence flows. Model rendering; no process execution or BPMN XML interchange.")),
  model("dmn-requirements", "DMN · Decide release readiness", "DMN requirements", "A decision consumes test evidence and change risk, uses business knowledge and is governed by a release policy.", [
    node("policy", "Release policy", "knowledgeSource", 55, 65, 240, 100),
    node("knowledge", "Review rules", "businessKnowledge", 665, 65, 240, 100),
    node("readiness", "Release decision", "dmnDecision", 365, 270, 240, 90),
    node("tests", "Test evidence", "inputData", 165, 470, 230, 64),
    node("risk", "Change risk", "inputData", 565, 470, 230, 64),
  ], [
    edge("policy-authority", "policy", "readiness", "authorityRequirement", "authority", { sourceSide: "bottom", targetSide: "top", targetOffset: .22, labelPosition: { x: 250, y: 225 } }),
    edge("knowledge-use", "knowledge", "readiness", "knowledgeRequirement", "knowledge", { sourceSide: "bottom", targetSide: "top", targetOffset: .78, labelPosition: { x: 715, y: 225 } }),
    edge("test-input", "tests", "readiness", "informationRequirement", "", { sourceSide: "top", targetSide: "bottom", targetOffset: .22 }),
    edge("risk-input", "risk", "readiness", "informationRequirement", "", { sourceSide: "top", targetSide: "bottom", targetOffset: .78 }),
  ], standard("DMN", "1.6", "Decision requirements diagram: decisions, input data, business knowledge models, knowledge sources and the three requirement types.")),
  model("dmn-table", "DMN · Release decision table", "DMN decision table", "A Unique-hit decision table records non-overlapping release rules for test outcome and an enumerated risk level. The view displays rules; it does not run a FEEL engine.", [
    node("release-rules", "Release decision", "table", 55, 100, 850, 350, { table: { hitPolicy: "U", inputColumnCount: 2, columns: ["Rule", "Tests pass", "Risk", "Decision"], rows: [["1", "false", "-", "Hold"], ["2", "true", "low", "Ship"], ["3", "true", "medium", "Review"], ["4", "true", "high", "Review"]] }, description: "Unique hit policy: at most one rule matches the specified inputs. The ASCII dash means any risk value. Expressions are displayed as uninterpreted text; double lines distinguish inputs from outputs and clauses from rule entries." }),
  ], [], standard("DMN", "1.6", "Structured decision table with explicit inputs, output, rule rows and displayed hit policy; no FEEL evaluation.")),
  model("cmmn-case", "CMMN · Investigate an incident", "CMMN case", "An incident case contains a stage, required work, a discretionary task and a recovery milestone. A listener and entry criterion show when investigation can begin.", [
    node("incident", "Incident case", "casePlan", 25, 25, 910, 550),
    node("investigate", "Investigate", "stage", 130, 145, 750, 260, { parentId: "incident", marker: "-", description: "An expanded stage with an expanded planning table for its discretionary task." }),
    node("planning-table", "Investigation planning table", "planningTable", 487, 133, 36, 24, { parentId: "incident", ownerId: "investigate", marker: "-", description: "An expanded planning table on the stage boundary; its discretionary evidence task is visible." }),
    node("alarm", "Alert", "eventListener", 55, 230, 44, 44, { parentId: "incident" }),
    node("entry", "Entry", "criterion", 116, 238, 28, 28, { parentId: "incident", ownerId: "investigate", description: "An entry criterion owned by the investigation stage and attached to its boundary." }),
    node("inspect", "Inspect service", "task", 185, 245, 240, 85, { parentId: "investigate", marker: "!", description: "A required task, indicated by the exclamation decorator." }),
    node("collect", "Collect more evidence", "task", 555, 245, 265, 85, { parentId: "investigate", ownerId: "planning-table", discretionary: true, description: "A discretionary item owned by the stage's planning table; its dashed task outline distinguishes it from required work." }),
    node("restored", "Service restored", "milestone", 385, 475, 220, 60, { parentId: "incident" }),
    node("recovery-entry", "Recovery criterion", "criterion", 371, 491, 28, 28, { parentId: "incident", ownerId: "restored", description: "An entry criterion on the milestone, satisfied by completion of inspection." }),
  ], [
    edge("alert-entry", "alarm", "entry", "sentryOnPart", "", { sourceSide: "right", targetSide: "left", description: "The listener event satisfies an OnPart of the stage entry sentry; this dotted connector has no arrowhead." }),
    edge("inspect-recovery", "inspect", "recovery-entry", "sentryOnPart", "complete", { sourceSide: "bottom", targetSide: "left", waypoints: [{ x: 305, y: 505 }], labelPosition: { x: 265, y: 440 }, description: "The inspection task's complete event satisfies an OnPart of the milestone entry sentry." }),
  ], standard("CMMN", "1.1", "Case plan, stage, tasks, discretionary-task border, event listener, milestone and entry criterion. No case execution or XML interchange.")),
  model("bmm-motivation", "BMM · Connect purpose to action", "BMM motivation", "A concept projection connects desired results with the means used to pursue them. BMM is deliberately independent of a particular diagram notation.", [
    node("vision", "Software people trust", "class", 65, 75, 240, 94, { stereotype: "Vision" }),
    node("goal", "Reliable releases", "class", 365, 75, 240, 94, { stereotype: "Goal" }),
    node("objective", "Restore within four hours", "class", 665, 75, 240, 94, { stereotype: "Objective" }),
    node("mission", "Operate client software", "class", 65, 385, 240, 94, { stereotype: "Mission" }),
    node("strategy", "Automate verification", "class", 365, 385, 240, 94, { stereotype: "Strategy" }),
    node("tactic", "Review each release", "class", 665, 385, 240, 94, { stereotype: "Tactic" }),
  ], [
    edge("goal-vision", "goal", "vision", "association", "amplifies", { directed: true }),
    edge("objective-goal", "objective", "goal", "association", "quantifies", { directed: true }),
    edge("mission-vision", "mission", "vision", "association", "makes operative", { directed: true, labelPosition: { x: 270, y: 285 } }),
    edge("strategy-goal", "strategy", "goal", "association", "supports", { directed: true, labelPosition: { x: 550, y: 285 } }),
    edge("tactic-strategy", "tactic", "strategy", "association", "implements", { directed: true }),
  ], standard("BMM", "1.3", "Labelled motivation concepts and explanatory relations. This is a concept projection, not an OMG-mandated graphical notation.", true)),
  model("sbvr-vocabulary", "SBVR · Give rules a shared meaning", "SBVR vocabulary", "A structured vocabulary separates terms, fact types and rules before an agent or person acts on them. This is a readable concept projection of the example vocabulary.", [
    node("vocabulary", "Release vocabulary and rules", "table", 45, 95, 870, 390, { table: { columns: ["Kind", "Expression", "Meaning / rule"], rows: [["Noun concept", "release", "A candidate software version"], ["Noun concept", "reviewer", "A person assigned to assess a release"], ["Verb concept", "reviewer approves release", "An approval fact"], ["Rule", "high-risk release", "Each high-risk release must have a reviewer"]] }, description: "Vocabulary, fact-type wording and a business rule are kept as structured text. No SBVR parser or logical reasoner is supplied." }),
  ], [], standard("SBVR", "1.5", "Structured vocabulary and rule text, with explicit concept categories. No semantic interchange, parser or logical inference.", true)),
  model("vdml-value", "VDML · Follow value through delivery", "VDML value delivery", "Roles exchange deliverables. Tangible flows use solid lines, intangible flows use dashed lines, and the value proposition is a square with its label outside.", [
    node("client", "Client", "role", 60, 140, 190, 90),
    node("partner", "Delivery partner", "role", 385, 140, 190, 90),
    node("operations", "Operations", "role", 710, 140, 190, 90),
    node("value", "Reliable service", "valueProposition", 440, 405, 80, 80),
  ], [
    edge("need", "client", "partner", "intangibleFlow", "Design feedback", { sourceSide: "right", targetSide: "left", labelPosition: { x: 317, y: 165 }, description: "Informal, non-contractual design feedback is an intangible deliverable, shown with a dashed flow." }),
    edge("release", "partner", "operations", "deliverableFlow", "Release package", { sourceSide: "right", targetSide: "left", labelPosition: { x: 642, y: 165 }, description: "The release package is a contractual deliverable; tangible here does not mean it must be a physical object." }),
    edge("service", "operations", "client", "deliverableFlow", "Working service", { sourceSide: "bottom", targetSide: "bottom", waypoints: [{ x: 805, y: 335 }, { x: 155, y: 335 }], labelPosition: { x: 650, y: 320 }, description: "The client receives the contracted service as a tangible deliverable." }),
    edge("provider", "partner", "value", "valuePropositionFlow", "provider", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 527, y: 378 }, description: "The Delivery partner provides the Reliable service value proposition." }),
    edge("proposition", "value", "client", "valuePropositionFlow", "recipient", { sourceSide: "left", targetSide: "left", waypoints: [{ x: 30, y: 445 }, { x: 30, y: 185 }], labelPosition: { x: 255, y: 430 }, description: "The Client receives the Reliable service value proposition; the arrow points from the proposition to its recipient." }),
  ], standard("VDML", "1.1", "Limited graphical vocabulary from Clause 8: role ovals, deliverable-flow styles and value-proposition square. No VDML analytics or interchange.")),
  model("ifml-interaction", "IFML · Find and open a project", "IFML interaction", "View containers hold components. The list's selection event invokes an action; its completion event opens the Project view. A separate data flow passes selection context without navigating.", [
    node("library-view", "Library", "ifmlViewContainer", 35, 55, 500, 290),
    node("project-list", "Project list", "ifmlViewComponent", 75, 145, 330, 115, { parentId: "library-view", description: "A view component inside the library container; it owns the select event on its boundary." }),
    node("selected", "select", "ifmlEvent", 391, 189, 28, 28, { parentId: "library-view", ownerId: "project-list", description: "A selection event owned by the Project list component, attached to its right boundary." }),
    node("load", "Load project", "ifmlAction", 385, 430, 180, 80),
    node("loaded", "loaded", "ifmlEvent", 551, 456, 28, 28, { ownerId: "load", description: "An action completion event owned by Load project." }),
    node("detail-view", "Project", "ifmlViewContainer", 625, 55, 300, 290),
    node("detail", "Project details", "ifmlViewComponent", 655, 145, 240, 115, { parentId: "detail-view" }),
  ], [
    edge("select-load", "selected", "load", "navigationFlow", "projectId", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 495, y: 375 }, description: "The selection event's navigation flow triggers Load project and passes projectId." }),
    edge("loaded-project", "loaded", "detail-view", "navigationFlow", "loaded project", { sourceSide: "right", targetSide: "bottom", waypoints: [{ x: 775, y: 470 }], labelPosition: { x: 690, y: 450 }, description: "Completion of Load project navigates to the Project container and supplies the result." }),
    edge("selection-context", "project-list", "detail", "dataFlow", "selection context", { sourceSide: "top", targetSide: "top", waypoints: [{ x: 240, y: 115 }, { x: 775, y: 115 }], labelPosition: { x: 575, y: 105 }, description: "A data flow passes selection context to the detail component; this dashed flow does not itself navigate or open a view." }),
  ], standard("IFML", "1.0", "View containers/components, event, action, navigation flow and data flow. Example interaction model; not a running generated application.")),
  model("sysml-block", "SysML 1.7 · Release system blocks", "SysML block", "The UML-profile generation of SysML represents system blocks and their composition. This example is explicitly pinned to SysML 1.7, separate from SysML 2.0.", [
    node("system", "ReleaseSystem", "class", 345, 55, 270, 150, { stereotype: "block", compartments: [{ label: "values", entries: ["availability: Percentage"] }] }),
    node("pipeline", "Pipeline", "class", 95, 380, 270, 130, { stereotype: "block", compartments: [{ label: "operations", entries: ["verify(candidate)"] }] }),
    node("registry", "ArtifactRegistry", "class", 595, 380, 270, 130, { stereotype: "block", compartments: [{ label: "values", entries: ["retention: Duration"] }] }),
  ], [edge("has-pipeline", "system", "pipeline", "composition", "pipeline", { sourceSide: "bottom", sourceOffset: .2, targetSide: "top" }), edge("has-registry", "system", "registry", "composition", "registry", { sourceSide: "bottom", sourceOffset: .8, targetSide: "top" })], standard("SysML", "1.7", "Legacy SysML 1.7 block-definition subset. Does not implement SysML 2.0 syntax, semantics or API.")),
  model("sysml-requirements", "SysML 1.7 · Trace a requirement", "SysML requirements", "A system element satisfies a requirement and a test case verifies it. The requirement remains an identifiable model element.", [
    node("requirement", "Reviewable release", "class", 345, 55, 300, 180, { stereotype: "requirement", compartments: [{ entries: ['id = "REQ-01"', 'text = "Every release is reviewable"'] }] }),
    node("service", "ReleaseService", "class", 95, 390, 270, 100, { stereotype: "block" }),
    node("review-test", "ReviewEvidenceTest", "class", 595, 390, 270, 100, { stereotype: "testCase" }),
  ], [edge("satisfies", "service", "requirement", "dependency", "«satisfy»", { sourceSide: "top", targetSide: "bottom", targetOffset: .2, labelPosition: { x: 270, y: 315 } }), edge("verifies", "review-test", "requirement", "dependency", "«verify»", { sourceSide: "top", targetSide: "bottom", targetOffset: .8, labelPosition: { x: 700, y: 315 } })], standard("SysML", "1.7", "Legacy requirement, block, test-case, satisfy and verify relationships. No requirements solver or SysML 2.0 interchange.")),
  model("bacm-capabilities", "BACM · Connect capability to outcome", "BACM capabilities", "A capability is described by the outcomes it can produce, independently of the particular workflow used to do the work. This view is a labelled concept projection.", [
    node("capability", "Release management", "class", 345, 60, 270, 100, { stereotype: "Capability" }),
    node("outcome", "Repeatable releases", "class", 345, 390, 270, 100, { stereotype: "Outcome" }),
    node("organization", "Software partner", "class", 35, 225, 250, 100, { stereotype: "OrganizationUnit" }),
    node("value-stream", "Deliver software", "class", 675, 225, 250, 100, { stereotype: "ValueStream" }),
  ], [edge("produces", "capability", "outcome", "association", "produces", { directed: true, sourceSide: "bottom", targetSide: "top", labelPosition: { x: 525, y: 285 } }), edge("provides", "organization", "capability", "association", "provides", { directed: true }), edge("enables", "capability", "value-stream", "association", "enables", { directed: true })], standard("BACM", "1.1", "Capability, outcome, organization and value-stream concepts in an explanatory projection. No normative capability-map notation or BACM interchange claim.", true)),
];

const umlViews: DiagramModel[] = [
  model("uml-object", "UML · A release at one moment", "UML object", "Underlined instance specifications show a snapshot of objects and their slot values.", [
    node("release", "candidate: Release", "object", 95, 170, 300, 180, { compartments: [{ entries: ['version = "1.4"', 'state = "ready"'] }] }),
    node("reviewer", "calvin: Reviewer", "object", 565, 170, 300, 180, { compartments: [{ entries: ['assigned = true'] }] }),
  ], [edge("assigned", "release", "reviewer", "association", "reviewer", { sourceSide: "right", targetSide: "left", description: "This link connects two specific instances at the depicted moment." })]),
  model("uml-package", "UML · Organise a product", "UML package", "Packages group model elements. The dashed dependency points from the dependent package to the package it uses.", [
    node("interface", "Interface", "package", 65, 100, 330, 280),
    node("domain", "Domain", "package", 565, 100, 330, 280),
    node("screen", "ReleaseScreen", "class", 100, 215, 260, 100, { parentId: "interface" }),
    node("release", "Release", "class", 600, 215, 260, 100, { parentId: "domain" }),
  ], [edge("uses", "interface", "domain", "dependency", "«import»", { sourceSide: "right", targetSide: "left", sourceOffset: .22, targetOffset: .22, labelPosition: { x: 480, y: 145 } })]),
  model("uml-deployment", "UML · Deploy a release service", "UML deployment", "Three-dimensional nodes represent deployment targets; folded-corner artifacts identify deployed software.", [
    node("browser", "Client device", "device", 60, 85, 330, 360),
    node("server", "Application host", "device", 570, 85, 330, 360, { stereotype: "executionEnvironment" }),
    node("ui", "web-ui.js", "artifact", 95, 220, 250, 150, { parentId: "browser", compartments: [{ entries: ['version = "1.4"'] }] }),
    node("api", "release-api", "artifact", 605, 220, 250, 150, { parentId: "server" }),
  ], [edge("https", "browser", "server", "association", "HTTPS", { sourceSide: "right", targetSide: "left", sourceOffset: .28, targetOffset: .28, labelPosition: { x: 480, y: 168 } })]),
  model("uml-composite", "UML · Inside a release workspace", "UML composite structure", "A structured classifier contains typed parts and a connector. A small square on the boundary denotes a port.", [
    node("workspace", "ReleaseWorkspace", "class", 65, 70, 830, 390, { compartments: [{ label: "internal structure", entries: [] }] }),
    node("editor", "editor: Editor", "part", 125, 215, 260, 140, { parentId: "workspace", description: "A typed composite part, not an underlined instance specification." }),
    node("store", "store: ModelStore", "part", 575, 215, 260, 140, { parentId: "workspace", description: "A typed composite part within the internal structure compartment." }),
    node("commands", "commands", "port", 54, 270, 22, 22, { ownerId: "workspace", description: "A port owned by ReleaseWorkspace, drawn overlapping its boundary." }),
  ], [edge("shared-model", "editor", "store", "association", "model", { sourceSide: "right", targetSide: "left" }), edge("input", "commands", "editor", "association", "", { sourceSide: "right", targetSide: "left" })]),
  model("uml-profile", "UML · Extend a modelling vocabulary", "UML profile", "A profile groups stereotypes. The solid extension arrow points from the stereotype to its extended metaclass.", [
    node("profile", "DeliveryProfile", "package", 55, 55, 430, 440, { stereotype: "profile" }),
    node("audited", "AuditedElement", "class", 115, 205, 280, 180, { parentId: "profile", stereotype: "stereotype", compartments: [{ label: "attributes", entries: ["reviewDate: Date"] }] }),
    node("class", "Class", "class", 595, 205, 250, 100, { stereotype: "metaclass", description: "The referenced UML metaclass is outside the profile's owned elements." }),
  ], [edge("extends", "audited", "class", "extension", "", { sourceSide: "right", targetSide: "left", sourceOffset: .28 })]),
  model("uml-use-case", "UML · What a release reviewer does", "UML use case", "An actor participates in use cases inside a system boundary. An include relationship names shared required behaviour.", [
    node("system", "Release workspace", "class", 280, 60, 625, 440),
    node("reviewer", "Reviewer", "actor", 80, 210, 105, 120),
    node("inspect", "Review release", "useCase", 365, 170, 400, 95, { parentId: "system" }),
    node("evidence", "Inspect evidence", "useCase", 365, 350, 400, 95, { parentId: "system" }),
  ], [edge("participates", "reviewer", "inspect", "association", "", { sourceSide: "right", targetSide: "left" }), edge("includes", "inspect", "evidence", "dependency", "«include»", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 640, y: 315 } })]),
  model("uml-activity", "UML · Verify and publish", "UML activity", "An activity starts, verifies a candidate, selects a guarded path and finishes after publication. The failure path returns to the review action.", [
    node("start", "Start", "initial", 75, 200, 32, 32),
    node("merge", "Merge", "merge", 126, 196, 40, 40, { description: "An explicit merge accepts the initial path or a retry; it avoids an implicit join at Verify candidate." }),
    node("verify", "Verify candidate", "activity", 190, 174, 220, 84),
    node("choice", "Checks pass?", "decision", 485, 184, 62, 62),
    node("publish", "Publish", "activity", 645, 174, 170, 84),
    node("finish", "Finish", "final", 875, 200, 32, 32),
    node("revise", "Revise", "activity", 410, 385, 210, 78),
  ], [edge("begin", "start", "merge", "controlFlow", ""), edge("enter-verify", "merge", "verify", "controlFlow", ""), edge("verified", "verify", "choice", "controlFlow", ""), edge("pass", "choice", "publish", "controlFlow", "[pass]", { labelPosition: { x: 596, y: 196 } }), edge("done", "publish", "finish", "controlFlow", ""), edge("fail", "choice", "revise", "controlFlow", "[fail]", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 560, y: 337 } }), edge("retry", "revise", "merge", "controlFlow", "", { sourceSide: "left", targetSide: "bottom", waypoints: [{ x: 146, y: 424 }] })]),
  model("uml-state", "UML · A release changes state", "UML state machine", "Named states change in response to events and guards. The filled circle starts the machine and the bullseye ends it.", [
    node("start", "Initial", "initial", 60, 210, 30, 30),
    node("draft", "Draft", "state", 160, 180, 180, 90),
    node("review", "In review", "state", 420, 180, 210, 90),
    node("released", "Released", "state", 710, 180, 170, 90),
    node("end", "Final", "final", 785, 440, 30, 30),
  ], [edge("initial", "start", "draft", "transition", ""), edge("submit", "draft", "review", "transition", "submit", { labelPosition: { x: 380, y: 207 } }), edge("approve", "review", "released", "transition", "approve [checks pass]", { labelPosition: { x: 680, y: 158 } }), edge("archive", "released", "end", "transition", "archive", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 845, y: 370 } })]),
  model("uml-sequence", "UML · Publish through a shared command", "UML sequence", "Messages are ordered from top to bottom. Activation bars show execution; the response is dashed.", [
    node("person", "reviewer: Human", "lifeline", 80, 55, 210, 470, { activations: [{ y: 115, height: 250 }] }),
    node("workspace", "workspace: UI", "lifeline", 380, 55, 210, 470, { activations: [{ y: 125, height: 240 }] }),
    node("service", "service: API", "lifeline", 680, 55, 210, 470, { activations: [{ y: 230, height: 85 }] }),
  ], [
    edge("publish", "person", "workspace", "synchronousMessage", "publish(candidate)", { sourcePoint: { x: 192, y: 180 }, targetPoint: { x: 478, y: 180 }, waypoints: [], labelPosition: { x: 335, y: 164 } }),
    edge("verify", "workspace", "service", "synchronousMessage", "verifyAndPublish()", { sourcePoint: { x: 492, y: 285 }, targetPoint: { x: 778, y: 285 }, waypoints: [], labelPosition: { x: 635, y: 269 } }),
    edge("result", "service", "workspace", "returnMessage", "release receipt", { sourcePoint: { x: 778, y: 370 }, targetPoint: { x: 492, y: 370 }, waypoints: [], labelPosition: { x: 635, y: 354 } }),
    edge("confirmed", "workspace", "person", "returnMessage", "published", { sourcePoint: { x: 478, y: 420 }, targetPoint: { x: 192, y: 420 }, waypoints: [], labelPosition: { x: 335, y: 404 } }),
  ]),
  model("uml-communication", "UML · Number the collaboration", "UML communication", "Lifeline connectors carry numbered messages. Dot-separated terms express procedural nesting: the service's notification occurs within the workspace's call to the service.", [
    node("reviewer", "reviewer: Human", "lifeline", 65, 70, 270, 48),
    node("workspace", "workspace: UI", "lifeline", 625, 70, 270, 48),
    node("service", "service: API", "lifeline", 345, 385, 270, 48),
  ], [edge("one", "reviewer", "workspace", "communicationMessage", "1: publish(candidate)", { sourceSide: "right", targetSide: "left", labelPosition: { x: 480, y: 69 }, description: "Numbered message 1 from reviewer to workspace, shown by a small arrow beside their connector." }), edge("two", "workspace", "service", "communicationMessage", "1.1: verifyAndPublish()", { sourceSide: "bottom", targetSide: "top", targetOffset: .8, labelPosition: { x: 660, y: 225 }, description: "Nested message 1.1 from workspace to service; connector direction is not association navigability." }), edge("three", "service", "reviewer", "communicationMessage", "1.1.1: notify(receipt)", { sourceSide: "top", sourceOffset: .2, targetSide: "bottom", labelPosition: { x: 300, y: 225 }, description: "Message 1.1.1 from service to reviewer is nested inside call 1.1, as shown by its sequence expression." })]),
  model("uml-interaction-overview", "UML · Coordinate release interactions", "UML interaction overview", "An activity-style overview links references to separate interactions, preserving the distinction between control flow and the messages inside each interaction.", [
    node("start", "Start", "initial", 75, 214, 30, 30),
    node("review", "ReviewCandidate", "interaction", 190, 160, 260, 135, { marker: "ref" }),
    node("publish", "PublishCandidate", "interaction", 560, 160, 260, 135, { marker: "ref" }),
    node("end", "Finish", "final", 885, 214, 30, 30),
  ], [edge("begin", "start", "review", "controlFlow", ""), edge("next", "review", "publish", "controlFlow", ""), edge("finish", "publish", "end", "controlFlow", "")]),
  model("uml-timing", "UML · Observe a service over time", "UML timing", "A state lifeline shows the service switching between idle and active over a shared time direction. This example is a qualitative timing view, not measured telemetry.", [
    node("service", "releaseService: Service", "timing", 80, 130, 800, 320, { description: "The service is idle, becomes active while handling a release, then returns to idle. Horizontal distance is illustrative; no measured duration is asserted." }),
  ], []),
];

const existing = diagramModels.map(item => ({ ...item, standard: item.notation.startsWith("UWE") ? { acronym: "UWE", version: "Profile tutorials", sourceUrl: "https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html", coverage: "notation-subset" as const, scope: "LMU UWE navigation and presentation stereotypes. UWE is not an OMG specification; the presentation tutorial is https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html." } : uml(item.notation + " subset with stable identities and explicit relationship markers.") }));
export const standardsModels: DiagramModel[] = [business[0], ...existing, ...umlViews, ...business.slice(1)];

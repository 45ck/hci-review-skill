import type { DiagramEdge, DiagramModel, DiagramNode, DiagramReference } from "@quantitative-hci/liquid-glass/developer";

// Original examples of one proposed library application. These models do not
// claim that a backend, security policy or deployment has been implemented.
const ref = (modelId: string, nodeId: string, label: string, relation: DiagramReference["relation"] = "drill-down"): DiagramReference => ({ modelId, nodeId, relation, label });
const node = (id: string, name: string, kind: DiagramNode["kind"], x: number, y: number, width: number, height: number, description: string, extra: Partial<DiagramNode> = {}): DiagramNode => ({ id, name, kind, x, y, width, height, description, ...extra });
const edge = (id: string, source: string, target: string, kind: DiagramEdge["kind"], description: string, extra: Partial<DiagramEdge> = {}): DiagramEdge => ({ id, source, target, kind, description, ...extra });
const uwe = (value: Omit<DiagramModel, "standard">): DiagramModel => ({ ...value, profileId: value.id, standard: {
  acronym: "UWE", version: "3.0 (implemented subset)", sourceUrl: "https://uwe.pst.ifi.lmu.de/publicationsMetamodelAndProfile.html", coverage: "notation-subset",
  scope: "LMU UWE profile subset on UML. Linked requirements, content, navigation, presentation, processes and declarative security models. No XMI, transformations, OCL evaluation, aspect weaving or authorization runtime.",
} });
const c4 = (value: Omit<DiagramModel, "standard">): DiagramModel => ({ ...value, profileId: value.id, standard: {
  acronym: "C4", version: "2026-11 reference snapshot", sourceUrl: "https://c4model.com/", coverage: "notation-subset",
  scope: "Simon Brown's notation-independent C4 method. Original example with linked landscape, context, container, component, UML code, dynamic and deployment views. Not an OMG specification or a live architecture inventory.",
} });
const c4Key = ["Person silhouette = human role; rounded box = software element; cylinder = data store.", "[Type] names the abstraction. Pale grey + external label marks an external system.", "A labelled arrow is a directed relationship; [technology] states its protocol."];
const structuralKey = ["UML compartments list attributes and operations; multiplicities describe association ends.", "Filled diamond = composition at the owner; hollow triangle = generalization to the base type."];
const activityKey = ["Filled circle = start; bullseye = final; diamond = decision or explicit merge.", "Rounded rectangle = action. Arrow = control flow; [guard] chooses a branch."];
const c4Node = (id: string, name: string, type: NonNullable<DiagramNode["architecture"]>["type"], x: number, y: number, width: number, height: number, description: string, extra: Partial<DiagramNode> & { technology?: string; external?: boolean } = {}): DiagramNode => {
  const { technology, external, ...rest } = extra;
  return node(id, name, type === "Person" ? "c4Person" : type === "Deployment Node" ? "c4Deployment" : "c4Element", x, y, width, height, description, { architecture: { type, technology, external }, ...rest });
};
const relationship = (id: string, source: string, target: string, label: string, extra: Partial<DiagramEdge> = {}) => edge(id, source, target, "c4Relationship", label, { label, directed: true, ...extra });

export const extendedDiagramModels: DiagramModel[] = [
  uwe({
    id: "uwe-requirements", name: "UWE requirements · Library goals", notation: "UWE requirements",
    description: "A designer browses projects, finds assets, creates projects and adds assets. UWE browsing use cases are read-only; processing use cases change persistent content. Follow links into their content, navigation and process models.",
    width: 1000, height: 650,
    legend: ["Stick figure = actor; enclosing package = scope; ellipse = use case.", "«browsing» reads content; «processing» changes persistent content. Plain lines associate the actor."],
    nodes: [
      node("library", "Quantive Library", "package", 250, 35, 710, 580, "The library application's requirement scope."),
      node("designer", "Designer", "actor", 45, 265, 130, 130, "A person curates projects and their visual assets.", { entityId: "role:designer", references: [ref("uwe-user-roles", "designer-role", "Designer role", "traces")] }),
      node("browse", "Browse projects", "useCase", 300, 140, 270, 100, "Browse the project index and open project content without changing it.", { parentId: "library", stereotype: "browsing", entityId: "usecase:browse-projects", references: [ref("uwe-navigation", "projects", "Project index", "realizes"), ref("uwe-content", "project", "Project content", "traces")] }),
      node("find", "Find assets", "useCase", 650, 140, 250, 100, "Search project assets and inspect descriptions and previews.", { parentId: "library", stereotype: "browsing", entityId: "usecase:find-assets", references: [ref("uwe-presentation", "page", "Search presentation", "realizes")] }),
      node("create", "Create project", "useCase", 300, 440, 270, 100, "Provide a title and create a project owned by the current designer.", { parentId: "library", stereotype: "processing", entityId: "usecase:create-project", references: [ref("uwe-requirement-activity", "enter", "Detailed requirement"), ref("uwe-process-structure", "create", "Creation process", "realizes")] }),
      node("add", "Add asset", "useCase", 650, 440, 250, 100, "Add a visual asset and text alternative to an existing project.", { parentId: "library", stereotype: "processing", entityId: "usecase:add-asset", references: [ref("uwe-process-structure", "add", "Asset process", "realizes"), ref("uwe-basic-rights", "asset", "Asset rights", "traces")] }),
    ],
    edges: [
      edge("designer-browse", "designer", "browse", "association", "The designer can browse projects.", { sourceSide: "top", targetSide: "left", waypoints: [{ x: 110, y: 190 }] }),
      edge("designer-find", "designer", "find", "association", "The designer can find assets.", { sourceSide: "top", targetSide: "top", waypoints: [{ x: 110, y: 105 }, { x: 775, y: 105 }] }),
      edge("designer-create", "designer", "create", "association", "The designer can create a project.", { sourceSide: "bottom", targetSide: "left", waypoints: [{ x: 110, y: 490 }] }),
      edge("designer-add", "designer", "add", "association", "The designer can add assets.", { sourceSide: "bottom", targetSide: "bottom", waypoints: [{ x: 110, y: 580 }, { x: 775, y: 580 }] }),
    ],
  }),
  uwe({
    id: "uwe-requirement-activity", parentModelId: "uwe-requirements", name: "UWE requirements · Create project detail", notation: "UWE requirement activity",
    description: "The successful creation scenario separates display, user, system and navigation actions. An interaction pin carries title data to an object node. Validation and retry behavior are refined in the process flow.",
    width: 1040, height: 640,
    legend: [...activityKey, "A square on an action boundary is an interaction pin; object flow carries its data.", "UWE display, user, system and navigation action stereotypes state responsibility."],
    nodes: [
      node("start", "Start", "initial", 45, 177, 28, 28, "Begin the create-project requirement."),
      node("display", "Show project form", "activity", 140, 140, 235, 100, "Present the title field and submit action.", { stereotype: "displayAction", references: [ref("uwe-presentation", "toolbar", "Form structure example", "traces")] }),
      node("enter", "Enter project title", "activity", 440, 140, 235, 100, "The designer enters a title and submits it.", { stereotype: "userAction", entityId: "action:enter-project-title" }),
      node("title-pin", "title", "port", 548, 232, 18, 18, "An interactionPin supplies the title and is owned by the input action.", { ownerId: "enter", stereotype: "interactionPin" }),
      node("draft", "draft : ProjectInput", "objectNode", 425, 375, 265, 115, "Submitted data is an activity object token, not an instance-specification diagram or control action.", { references: [ref("uwe-process-structure", "input", "Project input type", "traces")] }),
      node("save", "Create project", "activity", 760, 140, 235, 100, "The system validates input and creates the new project.", { stereotype: "systemAction", references: [ref("uwe-process-flow", "validate", "Validation and retry", "refines")] }),
      node("open", "Open project page", "activity", 760, 390, 235, 100, "Navigate to the newly created project's page.", { stereotype: "navigationAction", references: [ref("uwe-navigation", "project", "Project destination", "realizes")] }),
      node("end", "Complete", "final", 864, 555, 28, 28, "The newly created project is visible."),
    ],
    edges: [
      edge("start-display", "start", "display", "controlFlow", "Show the creation form.", { sourceSide: "right", targetSide: "left" }),
      edge("display-enter", "display", "enter", "controlFlow", "Wait for the designer's input.", { sourceSide: "right", targetSide: "left" }),
      edge("enter-save", "enter", "save", "controlFlow", "Submission starts creation.", { sourceSide: "right", targetSide: "left" }),
      edge("title-draft", "title-pin", "draft", "objectFlow", "The title interaction pin creates the input token.", { sourceSide: "bottom", targetSide: "top", label: "title", labelPosition: { x: 600, y: 310 } }),
      edge("draft-save", "draft", "save", "objectFlow", "Creation consumes ProjectInput.", { sourceSide: "right", targetSide: "bottom", waypoints: [{ x: 720, y: 432 }, { x: 720, y: 310 }, { x: 878, y: 310 }], label: "input", labelPosition: { x: 825, y: 295 } }),
      edge("save-open", "save", "open", "controlFlow", "Successful creation opens the project page.", { sourceSide: "right", targetSide: "right", waypoints: [{ x: 1020, y: 190 }, { x: 1020, y: 440 }] }),
      edge("open-end", "open", "end", "controlFlow", "Complete this successful scenario.", { sourceSide: "bottom", targetSide: "top" }),
    ],
  }),
  uwe({
    id: "uwe-content", parentModelId: "uwe-requirements", name: "UWE content · Project and asset model", notation: "UWE content",
    description: "UWE content modelling reuses UML class notation. A user owns projects; each project composes assets; ImageAsset specializes Asset. Entity identities recur in navigation, presentation, processes and access models.",
    width: 1120, height: 650, legend: structuralKey,
    nodes: [
      node("user", "User", "class", 35, 70, 260, 190, "A library user owns projects.", { entityId: "content:user", compartments: [{ label: "attributes", entries: ["- id: UUID", "+ displayName: String"] }], references: [ref("uwe-user-roles", "user", "User and roles", "refines")] }),
      node("project", "Project", "class", 425, 70, 270, 225, "A project belongs to one user and owns its assets.", { entityId: "content:project", compartments: [{ label: "attributes", entries: ["- id: UUID", "+ title: String"] }, { label: "operations", entries: ["+ archive(): void"] }], references: [ref("uwe-navigation", "project", "Project navigation", "realizes"), ref("c4-code", "project", "Implementation example", "realizes")] }),
      node("asset", "Asset", "class", 825, 70, 260, 225, "An abstract asset provides text alternatives and previews.", { abstract: true, entityId: "content:asset", compartments: [{ label: "attributes", entries: ["- id: UUID", "+ altText: String"] }, { label: "operations", entries: ["+ preview(): URI"] }], references: [ref("uwe-presentation", "results", "Result presentation", "realizes")] }),
      node("image", "ImageAsset", "class", 825, 450, 260, 145, "A visual asset records pixel dimensions.", { entityId: "content:image-asset", compartments: [{ label: "attributes", entries: ["+ width: Integer", "+ height: Integer"] }], references: [ref("uwe-presentation", "image", "Image presentation", "realizes")] }),
    ],
    edges: [
      edge("user-projects", "user", "project", "association", "A user owns zero or more projects; each project has one owner.", { label: "owns", sourceSide: "right", targetSide: "left", sourceMultiplicity: "1", targetMultiplicity: "0..*", labelPosition: { x: 360, y: 145 } }),
      edge("project-assets", "project", "asset", "composition", "A project composes zero or more assets. The diamond is at the project end.", { label: "assets", sourceSide: "right", targetSide: "left", sourceMultiplicity: "1", targetMultiplicity: "0..*", labelPosition: { x: 760, y: 160 } }),
      edge("image-asset", "image", "asset", "generalization", "ImageAsset specializes Asset.", { sourceSide: "top", targetSide: "bottom" }),
    ],
  }),
  uwe({
    id: "uwe-process-structure", parentModelId: "uwe-requirements", name: "UWE process structure · Library changes", notation: "UWE process structure",
    description: "Process classes describe changes invoked from navigation. CreateProject uses ProjectInput and creates a Project; AddAsset operates on an existing project. A linked activity defines creation behavior.",
    width: 1050, height: 620, legend: [...structuralKey, "«processClass» identifies a UWE process. Dashed dependencies point to required types."],
    nodes: [
      node("create", "CreateProject", "uwe", 50, 60, 285, 165, "Validate ProjectInput and produce a Project owned by the current user.", { stereotype: "processClass", entityId: "process:create-project", compartments: [{ entries: ["+ execute(input): Project"] }], references: [ref("uwe-process-flow", "enter", "Creation process flow"), ref("uwe-navigation", "create", "Navigation entry", "traces")] }),
      node("input", "ProjectInput", "class", 705, 60, 285, 150, "Values required to create a project.", { entityId: "content:project-input", compartments: [{ label: "attributes", entries: ["+ title: String"] }] }),
      node("project", "Project", "class", 705, 395, 285, 170, "A persistent project defined in the content view.", { entityId: "content:project", compartments: [{ label: "attributes", entries: ["- id: UUID", "+ title: String"] }], references: [ref("uwe-content", "project", "Project content", "traces")] }),
      node("add", "AddAsset", "uwe", 50, 395, 285, 165, "A separate process adds an asset to an existing project.", { stereotype: "processClass", entityId: "process:add-asset", compartments: [{ entries: ["+ execute(project, file): Asset"] }], references: [ref("uwe-requirements", "add", "Add asset requirement", "traces"), ref("uwe-basic-rights", "asset", "Asset authorization", "traces")] }),
    ],
    edges: [
      edge("create-input", "create", "input", "dependency", "CreateProject uses ProjectInput.", { label: "«use»", sourceSide: "right", targetSide: "left", labelPosition: { x: 520, y: 125 } }),
      edge("create-project", "create", "project", "dependency", "CreateProject creates a new Project.", { label: "«create»", sourceSide: "bottom", targetSide: "top", waypoints: [{ x: 193, y: 305 }, { x: 848, y: 305 }], labelPosition: { x: 520, y: 289 } }),
      edge("add-project", "add", "project", "association", "AddAsset operates on exactly one Project.", { label: "target", sourceSide: "right", targetSide: "left", targetMultiplicity: "1", labelPosition: { x: 520, y: 460 } }),
    ],
  }),
  uwe({
    id: "uwe-process-flow", parentModelId: "uwe-process-structure", name: "UWE process flow · Create project", notation: "UWE process flow",
    description: "User input, system validation and persistence have distinct actions. Invalid input returns through an explicit merge, so retry and initial entry are alternatives rather than an accidental UML join.",
    width: 1060, height: 620, legend: [...activityKey, "«userAction» is performed by the operator; «systemAction» by the application."],
    nodes: [
      node("start", "Start", "initial", 40, 172, 28, 28, "Start CreateProject."),
      node("merge", "Initial or retry", "merge", 130, 168, 36, 36, "Merge initial and invalid-input alternatives."),
      node("enter", "Enter project title", "activity", 240, 140, 245, 100, "Collect or correct the project title.", { stereotype: "userAction", entityId: "action:enter-project-title", references: [ref("uwe-requirement-activity", "enter", "Input requirement", "traces")] }),
      node("validate", "Validate project input", "activity", 620, 140, 260, 100, "Check title and permitted project creation.", { stereotype: "systemAction", references: [ref("uwe-basic-rights", "project", "Creation rights", "traces")] }),
      node("valid", "Valid?", "decision", 724, 350, 52, 52, "Choose one guarded outcome."),
      node("save", "Save owned project", "activity", 235, 410, 270, 100, "Persist the project with the current user as owner.", { stereotype: "systemAction", references: [ref("uwe-content", "project", "Project content", "realizes"), ref("c4-dynamic", "api", "Runtime interaction", "realizes")] }),
      node("end", "Created", "final", 90, 446, 28, 28, "Creation has completed."),
    ],
    edges: [
      edge("start-merge", "start", "merge", "controlFlow", "Initial entry reaches the merge.", { sourceSide: "right", targetSide: "left" }),
      edge("merge-enter", "merge", "enter", "controlFlow", "Either entry path prompts for a title.", { sourceSide: "right", targetSide: "left" }),
      edge("enter-validate", "enter", "validate", "controlFlow", "Validate submitted input.", { sourceSide: "right", targetSide: "left" }),
      edge("validate-choice", "validate", "valid", "controlFlow", "Choose the validation outcome.", { sourceSide: "bottom", targetSide: "top" }),
      edge("invalid-retry", "valid", "merge", "controlFlow", "Rejected input returns to the merge.", { label: "[invalid] / show errors", sourceSide: "right", targetSide: "top", waypoints: [{ x: 990, y: 376 }, { x: 990, y: 70 }, { x: 148, y: 70 }], labelPosition: { x: 555, y: 55 } }),
      edge("valid-save", "valid", "save", "controlFlow", "Valid input continues to persistence.", { label: "[valid]", sourceSide: "bottom", targetSide: "right", waypoints: [{ x: 750, y: 460 }], labelPosition: { x: 640, y: 443 } }),
      edge("save-end", "save", "end", "controlFlow", "The created project completes the process.", { sourceSide: "left", targetSide: "right" }),
    ],
  }),
  uwe({
    id: "uwe-user-roles", parentModelId: "uwe-requirements", name: "UWE users and roles · Library access", notation: "UWE user and roles",
    description: "The UWE user model separates the web user, session data and role assignments. Role instances are reused by basic rights. These are declarative LMU profile concepts, not implemented authentication.",
    width: 1100, height: 630, legend: [...structuralKey, "«webUser» and «sessionClass» are UWE classifiers; underlined labels denote role instances."],
    nodes: [
      node("user", "User", "class", 55, 70, 285, 180, "A web user has an identity and one or more assigned roles.", { stereotype: "webUser", entityId: "content:user", compartments: [{ entries: ["- id: UUID", "+ displayName: String"] }], references: [ref("uwe-content", "user", "Domain user", "traces")] }),
      node("role", "Role", "class", 740, 70, 285, 155, "The classifier of the named role instances below.", { compartments: [{ entries: ["+ name: String"] }] }),
      node("session", "LibrarySession", "class", 55, 410, 285, 165, "Session-scoped data describes the selected project.", { stereotype: "sessionClass", compartments: [{ entries: ["+ selectedProject: UUID [0..1]"] }], references: [ref("uwe-navigation-states", "private", "Protected session", "realizes")] }),
      node("designer-role", "designer : Role", "object", 465, 410, 260, 100, "This instance of Role may create and update owned content.", { entityId: "role:designer", references: [ref("uwe-basic-rights", "designer", "Designer rights")] }),
      node("viewer-role", "viewer : Role", "object", 800, 410, 260, 100, "This instance of Role may read published content.", { entityId: "role:viewer", references: [ref("uwe-basic-rights", "viewer", "Viewer rights")] }),
    ],
    edges: [
      edge("user-roles", "user", "role", "association", "Each user has one or more roles; a role can be assigned to many users.", { label: "roles", sourceSide: "right", targetSide: "left", sourceMultiplicity: "0..*", targetMultiplicity: "1..*", labelPosition: { x: 540, y: 130 } }),
      edge("user-session", "user", "session", "association", "A user can have multiple sessions, each assigned to one user.", { label: "sessions", sourceSide: "bottom", targetSide: "top", sourceMultiplicity: "1", targetMultiplicity: "0..*", labelPosition: { x: 270, y: 335 } }),
    ],
  }),
  uwe({
    id: "uwe-basic-rights", parentModelId: "uwe-user-roles", name: "UWE basic rights · Content permissions", notation: "UWE basic rights",
    description: "Role instances depend on content classes through UWE access stereotypes. Class-wide readAll/updateAll rights have attached authorizationConstraint comments. Conditions are descriptive; they are not evaluated or enforced by this kit.",
    width: 1180, height: 720,
    legend: ["Underlined object = role instance; class rectangle = content type.", "Dashed dependency points from role to protected content; its stereotype states the right.", "Folded note + dashed connector = authorizationConstraint; no authorization runtime is provided."],
    nodes: [
      node("designer", "designer : Role", "object", 50, 85, 270, 100, "The designer can create projects and update owned assets.", { entityId: "role:designer", references: [ref("uwe-user-roles", "designer-role", "Role assignment", "traces")] }),
      node("viewer", "viewer : Role", "object", 50, 430, 270, 100, "The viewer can read published project and asset attributes.", { entityId: "role:viewer", references: [ref("uwe-user-roles", "viewer-role", "Role assignment", "traces")] }),
      node("project", "Project", "class", 730, 70, 330, 160, "Project content protected by role permissions and ownership conditions.", { entityId: "content:project", compartments: [{ entries: ["+ title: String", "+ published: Boolean"] }], references: [ref("uwe-content", "project", "Project content", "traces")] }),
      node("asset", "Asset", "class", 730, 430, 330, 160, "Asset content belongs to its owner's project.", { entityId: "content:asset", compartments: [{ entries: ["+ altText: String", "+ published: Boolean"] }], references: [ref("uwe-content", "asset", "Asset content", "traces")] }),
      node("ownership", "Owner restriction", "comment", 360, 280, 320, 100, "Update requires the current user to own the asset's project.", { stereotype: "authorizationConstraint" }),
      node("publication", "Publication restriction", "comment", 730, 280, 330, 100, "Viewer reads require published project and asset content.", { stereotype: "authorizationConstraint" }),
    ],
    edges: [
      edge("designer-create", "designer", "project", "dependency", "The designer role can create Project instances.", { label: "«create»", sourceSide: "right", targetSide: "left", labelPosition: { x: 520, y: 120 } }),
      edge("designer-update", "designer", "asset", "dependency", "The designer can update asset attributes when ownership holds.", { label: "«updateAll»", sourceSide: "bottom", targetSide: "left", targetOffset: 0.25, waypoints: [{ x: 185, y: 245 }, { x: 700, y: 245 }, { x: 700, y: 470 }], labelPosition: { x: 495, y: 230 } }),
      edge("viewer-project", "viewer", "project", "dependency", "The viewer can read published project attributes.", { label: "«readAll»", sourceSide: "top", targetSide: "left", targetOffset: 0.8, waypoints: [{ x: 185, y: 405 }, { x: 340, y: 405 }, { x: 340, y: 198 }], labelPosition: { x: 500, y: 187 } }),
      edge("viewer-asset", "viewer", "asset", "dependency", "The viewer can read published asset attributes.", { label: "«readAll»", sourceSide: "right", targetSide: "left", targetOffset: 0.75, labelPosition: { x: 520, y: 500 } }),
      edge("owner-note", "ownership", "asset", "commentLink", "The ownership condition applies to Asset update permissions.", { sourceSide: "bottom", targetSide: "top", waypoints: [{ x: 520, y: 405 }, { x: 895, y: 405 }] }),
      edge("published-project-note", "publication", "project", "commentLink", "Viewer access to Project is publication constrained.", { sourceSide: "top", targetSide: "bottom" }),
      edge("published-asset-note", "publication", "asset", "commentLink", "Viewer access to Asset is publication constrained.", { sourceSide: "bottom", targetSide: "top" }),
    ],
  }),
  uwe({
    id: "uwe-navigation-states", parentModelId: "uwe-user-roles", name: "UWE navigation states · Session boundaries", notation: "UWE navigation states",
    description: "Public and designer sessions are separate. A session role tag describes access to the whole protected region, while sign-in has an explicit guard. This models direct entry as well as ordinary navigation; it does not enforce access.",
    width: 1140, height: 690,
    legend: ["Rounded state = navigation/session state. Nested states belong to that session.", "{roles=...} describes session access; transition [guards] describe permitted navigation.", "LMU security annotations are declarative and do not implement authentication."],
    nodes: [
      node("start", "Entry", "initial", 35, 115, 28, 28, "Application entry."),
      node("public", "Public library", "state", 140, 75, 310, 190, "Published content is visible in the public session.", { stereotype: "session", constraints: ["isHome"], references: [ref("uwe-navigation", "home", "Home navigation", "traces")] }),
      node("private", "Designer session", "state", 600, 75, 495, 520, "Only the designer role can enter, including direct URL entry.", { stereotype: "session", compartments: [{ entries: [] }], constraints: ["roles=designer"], references: [ref("uwe-user-roles", "session", "Session data", "traces")] }),
      node("session-entry", "Initial collection", "initial", 833, 172, 28, 28, "Entering the protected session opens the project collection.", { parentId: "private" }),
      node("projects", "Project list", "state", 650, 245, 395, 115, "The session's collection of projects.", { parentId: "private", stereotype: "collection", references: [ref("uwe-navigation", "projects", "Navigation index", "traces")] }),
      node("project", "Project detail", "state", 650, 445, 395, 115, "The selected node retains the project identity.", { parentId: "private", stereotype: "navigationalNode", entityId: "content:project", references: [ref("uwe-navigation", "project", "Project navigation", "traces")] }),
      node("end", "Signed out", "final", 280, 530, 28, 28, "The authenticated session ends."),
    ],
    edges: [
      edge("entry-public", "start", "public", "transition", "Enter public browsing.", { sourceSide: "right", targetSide: "left", label: "open" }),
      edge("login", "public", "private", "transition", "A successful designer login enters the protected session.", { label: "sign in [designer]", sourceSide: "right", targetSide: "left", targetOffset: 0.16, labelPosition: { x: 520, y: 126 } }),
      edge("session-initial", "session-entry", "projects", "transition", "Default entry selects the project collection.", { sourceSide: "bottom", targetSide: "top" }),
      edge("select-project", "projects", "project", "transition", "Selection opens project detail.", { label: "select(project)", sourceSide: "bottom", targetSide: "top", labelPosition: { x: 935, y: 405 } }),
      edge("close-project", "project", "projects", "transition", "Closing detail returns to the collection.", { label: "close", sourceSide: "left", targetSide: "left", waypoints: [{ x: 620, y: 502 }, { x: 620, y: 302 }], labelPosition: { x: 580, y: 405 } }),
      edge("logout", "private", "end", "transition", "Sign out ends the protected session.", { label: "sign out", sourceSide: "bottom", targetSide: "bottom", waypoints: [{ x: 848, y: 640 }, { x: 294, y: 640 }], labelPosition: { x: 480, y: 625 } }),
    ],
  }),
  uwe({
    id: "uwe-application-modes", parentModelId: "uwe-user-roles", name: "UWE application modes · Operating policy", notation: "UWE application modes",
    description: "Application-wide appMode states distinguish editing, read-only operation and maintenance. These UWE security concepts describe operating policy. UWE's separate aspect-oriented adaptation and weaving mechanisms are not implemented.",
    width: 1100, height: 620,
    legend: ["«appMode» is an application-wide state in the LMU UWE profile.", "Event-labelled transitions describe changes of mode; access policy remains declarative."],
    nodes: [
      node("start", "Boot", "initial", 45, 175, 28, 28, "Application startup."),
      node("normal", "Normal", "state", 160, 130, 260, 120, "Browsing and permitted processing are available.", { stereotype: "appMode", references: [ref("uwe-requirements", "create", "Processing requirement", "traces")] }),
      node("readonly", "Read only", "state", 745, 130, 290, 120, "Browsing is available; state changes are disabled.", { stereotype: "appMode", references: [ref("uwe-requirements", "browse", "Browsing requirement", "traces")] }),
      node("maintenance", "Maintenance", "state", 440, 420, 290, 120, "Public access is paused during service work.", { stereotype: "appMode" }),
    ],
    edges: [
      edge("boot-normal", "start", "normal", "transition", "Start normal operation.", { sourceSide: "right", targetSide: "left" }),
      edge("freeze", "normal", "readonly", "transition", "A write freeze enters read-only operation.", { label: "freeze writes", sourceSide: "right", targetSide: "left", labelPosition: { x: 585, y: 170 } }),
      edge("resume", "readonly", "normal", "transition", "Restored writes return to normal.", { label: "restore writes", sourceSide: "top", targetSide: "top", waypoints: [{ x: 890, y: 65 }, { x: 290, y: 65 }], labelPosition: { x: 585, y: 50 } }),
      edge("maintain", "readonly", "maintenance", "transition", "Maintenance starts after writes freeze.", { label: "begin maintenance", sourceSide: "bottom", targetSide: "right", waypoints: [{ x: 890, y: 480 }], labelPosition: { x: 910, y: 355 } }),
      edge("restore", "maintenance", "normal", "transition", "A successful health check restores normal.", { label: "resume [healthy]", sourceSide: "left", targetSide: "bottom", waypoints: [{ x: 290, y: 480 }], labelPosition: { x: 320, y: 355 } }),
    ],
  }),
  c4({
    id: "c4-landscape", name: "C4 system landscape · Design organisation", notation: "C4 system landscape",
    description: "The example organisation uses Quantive Library for assets, an identity service for access and a review service for feedback. This portfolio view shows people and software systems without choosing a single system boundary.",
    width: 1140, height: 690, legend: c4Key,
    nodes: [
      c4Node("designer", "Designer", "Person", 35, 60, 240, 185, "Creates and curates project assets.", { entityId: "role:designer" }),
      c4Node("reviewer", "Reviewer", "Person", 35, 445, 240, 185, "Reviews work and records feedback.", { entityId: "role:reviewer" }),
      c4Node("library", "Quantive Library", "Software System", 445, 60, 280, 165, "Organises projects and visual assets.", { entityId: "system:library", references: [ref("c4-context", "library", "system context")] }),
      c4Node("identity", "Identity service", "Software System", 865, 60, 240, 165, "Authenticates organisation members.", { external: true, entityId: "system:identity" }),
      c4Node("review", "Review service", "Software System", 445, 445, 280, 165, "Collects review notes on published assets.", { external: true, entityId: "system:review" }),
    ],
    edges: [
      relationship("designer-library", "designer", "library", "Curates projects", { sourceSide: "right", targetSide: "left", labelPosition: { x: 360, y: 130 } }),
      relationship("library-identity", "library", "identity", "Delegates sign-in", { sourceSide: "right", targetSide: "left", labelPosition: { x: 795, y: 125 } }),
      relationship("reviewer-review", "reviewer", "review", "Reviews assets", { sourceSide: "right", targetSide: "left", labelPosition: { x: 360, y: 510 } }),
      relationship("library-review", "library", "review", "Shares published asset links", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 720, y: 340 } }),
    ],
  }),
  c4({
    id: "c4-context", parentModelId: "c4-landscape", name: "C4 system context · Quantive Library", notation: "C4 system context",
    description: "The library is the system in scope. Designers curate assets; directly related identity and review systems supply authentication and feedback. Implementation technologies belong to the linked lower-level views.",
    width: 1110, height: 650, legend: c4Key,
    nodes: [
      c4Node("designer", "Designer", "Person", 40, 205, 240, 190, "Creates projects and curates assets.", { entityId: "role:designer", references: [ref("uwe-requirements", "designer", "UWE goals", "traces")] }),
      c4Node("library", "Quantive Library", "Software System", 425, 220, 290, 170, "Organises owned projects and visual assets.", { entityId: "system:library", references: [ref("c4-container", "library", "containers")] }),
      c4Node("identity", "Identity service", "Software System", 835, 60, 240, 165, "Authenticates organisation members.", { external: true, entityId: "system:identity" }),
      c4Node("review", "Review service", "Software System", 835, 440, 240, 165, "Collects feedback on published assets.", { external: true, entityId: "system:review" }),
    ],
    edges: [
      relationship("designer-library", "designer", "library", "Curates projects and assets", { sourceSide: "right", targetSide: "left", labelPosition: { x: 350, y: 275 } }),
      relationship("library-identity", "library", "identity", "Delegates sign-in", { sourceSide: "top", targetSide: "left", waypoints: [{ x: 570, y: 143 }], labelPosition: { x: 700, y: 127 } }),
      relationship("library-review", "library", "review", "Shares published asset links", { sourceSide: "bottom", targetSide: "left", waypoints: [{ x: 570, y: 523 }], labelPosition: { x: 700, y: 505 } }),
    ],
  }),
  c4({
    id: "c4-container", parentModelId: "c4-context", name: "C4 containers · Quantive Library", notation: "C4 container",
    description: "A proposed React application calls a TypeScript API with project metadata and asset stores. The dashed system boundary contains applications and data stores. These are C4 containers; no Docker or existing deployed backend is implied.",
    width: 1430, height: 820, legend: [...c4Key, "Dashed boundary = software-system scope; nested elements are applications or data stores."],
    nodes: [
      c4Node("designer", "Designer", "Person", 35, 145, 225, 185, "Curates projects and visual assets.", { entityId: "role:designer" }),
      c4Node("library", "Quantive Library", "Software System", 340, 45, 1050, 730, "Groups applications and data stores in the system.", { kind: "c4Boundary", entityId: "system:library" }),
      c4Node("web", "Web application", "Container", 390, 145, 275, 165, "Presents the shared human and agent interface.", { parentId: "library", technology: "TypeScript / React", entityId: "container:web", references: [ref("uwe-presentation", "page", "Presentation model", "realizes")] }),
      c4Node("api", "Library API", "Container", 1040, 145, 300, 165, "Validates commands and controls library access.", { parentId: "library", technology: "TypeScript / HTTP", entityId: "container:api", references: [ref("c4-component", "api", "API components"), ref("c4-dynamic", "api", "Create-project interaction"), ref("c4-deployment", "api-instance", "Deployment example")] }),
      c4Node("store", "Project store", "Container", 1040, 535, 300, 175, "Stores project and asset metadata.", { kind: "c4Database", parentId: "library", technology: "PostgreSQL", entityId: "container:store", references: [ref("uwe-content", "project", "Content model", "traces")] }),
      c4Node("assets", "Asset object store", "Container", 390, 535, 275, 175, "Stores original images and previews.", { kind: "c4Database", parentId: "library", technology: "S3-compatible storage", entityId: "container:assets" }),
    ],
    edges: [
      relationship("designer-web", "designer", "web", "Uses library", { sourceSide: "right", targetSide: "left", technology: "HTTPS", labelPosition: { x: 325, y: 205 } }),
      relationship("web-api", "web", "api", "Submits queries and commands", { sourceSide: "right", targetSide: "left", technology: "HTTPS / JSON", labelPosition: { x: 850, y: 205 } }),
      relationship("api-store", "api", "store", "Reads and writes metadata", { sourceSide: "bottom", targetSide: "top", technology: "PostgreSQL / TLS", labelPosition: { x: 1190, y: 420 } }),
      relationship("api-assets", "api", "assets", "Stores and retrieves binaries", { sourceSide: "left", sourceOffset: 0.8, targetSide: "top", waypoints: [{ x: 850, y: 277 }, { x: 850, y: 425 }, { x: 528, y: 425 }], technology: "S3 API / HTTPS", labelPosition: { x: 670, y: 405 } }),
    ],
  }),
  c4({
    id: "c4-component", parentModelId: "c4-container", name: "C4 components · Library API", notation: "C4 component",
    description: "The API container contains a controller, project service and repository, each with a responsibility and technology. Neighbouring web and storage containers supply context. The service links to its UML code view.",
    width: 1460, height: 800, legend: [...c4Key, "Dashed boundary = the API container in scope; its components sit inside it."],
    nodes: [
      c4Node("web", "Web application", "Container", 35, 135, 250, 170, "Submits project commands from the shared UI.", { technology: "TypeScript / React", entityId: "container:web", references: [ref("c4-container", "web", "Container view", "traces")] }),
      c4Node("api", "Library API", "Container", 370, 45, 1040, 710, "The application boundary for the proposed API.", { kind: "c4Boundary", technology: "TypeScript / HTTP", entityId: "container:api" }),
      c4Node("controller", "Command controller", "Component", 415, 135, 290, 170, "Parses requests and forwards commands.", { parentId: "api", technology: "TypeScript", entityId: "component:controller" }),
      c4Node("service", "Project service", "Component", 1040, 135, 320, 170, "Applies ownership policy and creates projects.", { parentId: "api", technology: "TypeScript", entityId: "component:project-service", references: [ref("c4-code", "service", "service code model"), ref("uwe-process-flow", "save", "Process responsibility", "realizes")] }),
      c4Node("repository", "Project repository", "Component", 1040, 520, 320, 170, "Persists and retrieves project aggregates.", { parentId: "api", technology: "TypeScript / SQL", entityId: "component:repository", references: [ref("c4-code", "repository", "Repository contract", "realizes")] }),
      c4Node("store", "Project store", "Container", 35, 520, 250, 175, "Stores persistent project metadata.", { kind: "c4Database", technology: "PostgreSQL", entityId: "container:store", references: [ref("c4-container", "store", "Storage container", "traces")] }),
    ],
    edges: [
      relationship("web-controller", "web", "controller", "Submits project command", { sourceSide: "right", targetSide: "left", technology: "HTTPS / JSON", labelPosition: { x: 350, y: 195 } }),
      relationship("controller-service", "controller", "service", "Creates owned project", { sourceSide: "right", targetSide: "left", technology: "In-process call", labelPosition: { x: 870, y: 195 } }),
      relationship("service-repository", "service", "repository", "Saves project", { sourceSide: "bottom", targetSide: "top", technology: "In-process call", labelPosition: { x: 1200, y: 415 } }),
      relationship("repository-store", "repository", "store", "Writes metadata", { sourceSide: "left", targetSide: "right", technology: "PostgreSQL / TLS", labelPosition: { x: 650, y: 585 } }),
    ],
  }),
  c4({
    id: "c4-code", parentModelId: "c4-component", name: "C4 code · Project service design", notation: "C4 code",
    description: "A focused UML class view refines the Project service component through its input, domain object and required persistence contract. The repository implementation belongs to a separate component. This authored example is not reverse-engineered from the kit's source.",
    width: 1150, height: 680, legend: ["UML class compartments list attributes and operations; «interface» marks a required contract.", "Dashed open arrows are dependencies pointing to required types; «create» identifies creation."],
    nodes: [
      node("service", "ProjectService", "class", 55, 70, 310, 190, "Coordinates authorized project creation.", { entityId: "component:project-service", compartments: [{ label: "operations", entries: ["+ create(input, user): Project"] }], references: [ref("c4-component", "service", "Parent component", "refines")] }),
      node("repository", "ProjectRepository", "interface", 770, 70, 320, 190, "The persistence contract owned by ProjectService and implemented by the separate repository component.", { entityId: "contract:project-repository", compartments: [{ label: "operations", entries: ["+ save(project): void", "+ get(id): Project"] }], references: [ref("c4-component", "repository", "Repository implementation", "traces")] }),
      node("project", "Project", "class", 55, 420, 310, 200, "The domain object stores title and owner identity.", { entityId: "content:project", compartments: [{ label: "attributes", entries: ["+ id: UUID", "+ title: String", "+ ownerId: UUID"] }], references: [ref("uwe-content", "project", "UWE content", "realizes")] }),
      node("input", "ProjectInput", "class", 770, 440, 320, 170, "Input owned by the creation service. User identity comes separately from authenticated context.", { entityId: "content:project-input", compartments: [{ label: "attributes", entries: ["+ title: String"] }], references: [ref("uwe-process-structure", "input", "Process input", "realizes")] }),
    ],
    edges: [
      edge("service-repository", "service", "repository", "dependency", "ProjectService depends on the persistence interface.", { label: "«use»", sourceSide: "right", targetSide: "left", labelPosition: { x: 570, y: 145 } }),
      edge("service-project", "service", "project", "dependency", "ProjectService creates a Project.", { label: "«create»", sourceSide: "bottom", targetSide: "top", labelPosition: { x: 275, y: 345 } }),
      edge("service-input", "service", "input", "dependency", "ProjectService accepts ProjectInput.", { label: "«use»", sourceSide: "bottom", sourceOffset: 0.8, targetSide: "left", waypoints: [{ x: 620, y: 260 }, { x: 620, y: 525 }], labelPosition: { x: 675, y: 385 } }),
    ],
  }),
  c4({
    id: "c4-dynamic", parentModelId: "c4-container", name: "C4 dynamic · Create a project", notation: "C4 dynamic",
    description: "Numbered interactions describe one successful request across the same containers shown in the static architecture. Responses are explicit and order is inspectable data. This is an example scenario, not a captured trace.",
    width: 1260, height: 680, legend: [...c4Key, "Number prefixes give scenario order; separate directed relationships show requests and replies."],
    nodes: [
      c4Node("designer", "Designer", "Person", 40, 90, 260, 190, "Submits a title and receives the result.", { entityId: "role:designer" }),
      c4Node("web", "Web application", "Container", 460, 100, 300, 170, "Submits input and presents the new project.", { technology: "TypeScript / React", entityId: "container:web", references: [ref("c4-container", "web", "Static container", "traces")] }),
      c4Node("api", "Library API", "Container", 460, 450, 300, 170, "Validates input and creates an owned project.", { technology: "TypeScript / HTTP", entityId: "container:api", references: [ref("c4-component", "service", "Project service"), ref("uwe-process-flow", "validate", "UWE process", "realizes")] }),
      c4Node("store", "Project store", "Container", 950, 440, 270, 180, "Commits project metadata.", { kind: "c4Database", technology: "PostgreSQL", entityId: "container:store" }),
    ],
    edges: [
      relationship("submit", "designer", "web", "Submits title", { order: 1, technology: "HTTPS", sourceSide: "right", targetSide: "left", sourceOffset: 0.3, targetOffset: 0.3, labelPosition: { x: 380, y: 130 } }),
      relationship("request", "web", "api", "POST /projects", { order: 2, technology: "HTTPS / JSON", sourceSide: "bottom", targetSide: "top", sourceOffset: 0.25, targetOffset: 0.25, labelPosition: { x: 460, y: 350 } }),
      relationship("insert", "api", "store", "Inserts project", { order: 3, technology: "PostgreSQL / TLS", sourceSide: "right", targetSide: "left", sourceOffset: 0.3, targetOffset: 0.3, labelPosition: { x: 855, y: 470 } }),
      relationship("committed", "store", "api", "Confirms commit", { order: 4, technology: "PostgreSQL / TLS", sourceSide: "left", targetSide: "right", sourceOffset: 0.85, targetOffset: 0.85, labelPosition: { x: 855, y: 620 } }),
      relationship("created", "api", "web", "201 Created", { order: 5, technology: "HTTPS / JSON", sourceSide: "top", targetSide: "bottom", sourceOffset: 0.8, targetOffset: 0.8, labelPosition: { x: 770, y: 350 } }),
      relationship("shown", "web", "designer", "Shows new project", { order: 6, technology: "HTTPS", sourceSide: "left", targetSide: "right", sourceOffset: 0.85, targetOffset: 0.8, labelPosition: { x: 380, y: 265 } }),
    ],
  }),
  c4({
    id: "c4-deployment", parentModelId: "c4-container", name: "C4 deployment · Example production environment", notation: "C4 deployment",
    description: "A hypothetical production environment maps logical containers onto browser, application and data deployment nodes. A nested runtime contains an API instance. The model does not provision or describe an existing backend.",
    width: 1530, height: 940, legend: [...c4Key, "Extruded boundary = deployment node. Nested nodes describe execution environments.", "Container Instance identifies a running copy of a logical container in this example environment."],
    nodes: [
      c4Node("browser", "User device", "Deployment Node", 35, 60, 370, 350, "A user's browser execution environment.", { technology: "Desktop or mobile browser" }),
      c4Node("web-instance", "Web application", "Container Instance", 75, 180, 285, 175, "Runs the shared interface on the user's device.", { parentId: "browser", technology: "Browser / JavaScript", entityId: "container:web", references: [ref("c4-container", "web", "Logical web container", "traces")] }),
      c4Node("application", "Application host", "Deployment Node", 535, 60, 540, 570, "Hosts the API runtime for this example.", { technology: "Linux host" }),
      c4Node("runtime", "API runtime", "Deployment Node", 575, 165, 460, 405, "Runs one API service instance.", { parentId: "application", technology: "Node.js process" }),
      c4Node("api-instance", "Library API · instance 1", "Container Instance", 620, 290, 365, 195, "Accepts commands and manages persistence.", { parentId: "runtime", technology: "TypeScript / HTTP", entityId: "container:api", references: [ref("c4-container", "api", "Logical API container", "traces")] }),
      c4Node("database", "Database host", "Deployment Node", 1130, 60, 365, 570, "Runs persistent metadata storage.", { technology: "Managed PostgreSQL" }),
      c4Node("store-instance", "Project store · instance 1", "Container Instance", 1170, 285, 285, 200, "Persists library metadata in this environment.", { kind: "c4Database", parentId: "database", technology: "PostgreSQL", entityId: "container:store", references: [ref("c4-container", "store", "Logical database", "traces")] }),
      c4Node("edge", "HTTPS gateway", "Infrastructure Node", 70, 710, 295, 170, "Terminates HTTPS and routes API traffic.", { technology: "Reverse proxy / TLS" }),
    ],
    edges: [
      relationship("web-gateway", "web-instance", "edge", "Calls API", { sourceSide: "bottom", targetSide: "top", technology: "HTTPS / JSON", labelPosition: { x: 215, y: 550 } }),
      relationship("gateway-api", "edge", "api-instance", "Routes request", { sourceSide: "right", targetSide: "bottom", technology: "HTTPS / JSON", waypoints: [{ x: 802, y: 795 }], labelPosition: { x: 630, y: 775 } }),
      relationship("api-database", "api-instance", "store-instance", "Reads and writes metadata", { sourceSide: "right", targetSide: "left", technology: "PostgreSQL / TLS", labelPosition: { x: 1080, y: 370 } }),
    ],
  }),
];

/** Enrich the two original UWE views without replacing their stable identities. */
export function enrichUweModels(models: readonly DiagramModel[]): DiagramModel[] {
  return models.map(model => {
    if (model.id === "uwe-navigation") return uwe({ ...model, parentModelId: "uwe-requirements", legend: ["«navigationClass» = content; «index» = selectable list; «menu» = navigation choices.", "«query» and «processClass» are entered or exited through processLink relationships."], nodes: model.nodes.map(value => ({ ...value,
      ...(value.id === "project" ? { entityId: "content:project", references: [ref("uwe-content", "project", "Project content", "traces"), ref("uwe-navigation-states", "project", "Navigation state", "refines")] } : {}),
      ...(value.id === "create" ? { entityId: "process:create-project", references: [ref("uwe-process-structure", "create", "Creation process"), ref("uwe-requirements", "create", "Creation requirement", "traces")] } : {}),
      ...(value.id === "home" ? { references: [ref("uwe-presentation", "page", "Library presentation", "realizes")] } : {}),
      ...(value.id === "projects" ? { references: [ref("uwe-requirements", "browse", "Browsing requirement", "traces")] } : {}),
    })) });
    if (model.id === "uwe-presentation") return uwe({ ...model, parentModelId: "uwe-navigation", legend: ["Nested UWE presentation properties describe a page, its form and result groups.", "The * multiplicity repeats a group; image and text properties present the same asset."], nodes: model.nodes.map(value => ({ ...value,
      ...(value.id === "page" ? { references: [ref("uwe-navigation", "home", "Library navigation", "traces"), ref("c4-container", "web", "Web application", "realizes")] } : {}),
      ...(value.id === "results" ? { entityId: "content:asset", references: [ref("uwe-content", "asset", "Asset content", "traces")] } : {}),
      ...(value.id === "image" ? { entityId: "content:image-asset", references: [ref("uwe-content", "image", "Image content", "traces")] } : {}),
      ...(value.id === "search-button" ? { references: [ref("uwe-requirements", "find", "Find assets requirement", "traces")] } : {}),
    })) });
    return model;
  });
}

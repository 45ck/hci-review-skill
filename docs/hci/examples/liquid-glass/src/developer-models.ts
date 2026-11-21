import type { DiagramModel } from "@quantitative-hci/liquid-glass/developer";

export const diagramModels: DiagramModel[] = [
  {
    id: "uml-class",
    name: "A library, modelled",
    notation: "UML class",
    description: "A project owns its assets. ImageAsset specializes the abstract Asset class. Inspect each element to read its attributes, operations and relationships.",
    width: 960,
    height: 560,
    nodes: [
      {
        id: "project", name: "Project", kind: "class", x: 60, y: 70, width: 270, height: 200,
        description: "A project is the composite owner of zero or more assets. The filled diamond sits at the Project end.",
        compartments: [{ label: "attributes", entries: ["- id: UUID", "+ title: String"] }, { label: "operations", entries: ["+ archive(): void"] }],
      },
      {
        id: "asset", name: "Asset", kind: "class", abstract: true, x: 630, y: 70, width: 270, height: 200,
        description: "An abstract asset belongs to one project. Its italic name denotes an abstract classifier.",
        compartments: [{ label: "attributes", entries: ["- id: UUID", "+ name: String"] }, { label: "operations", entries: ["+ preview(): URI"] }],
      },
      {
        id: "image-asset", name: "ImageAsset", kind: "class", x: 630, y: 380, width: 270, height: 130,
        description: "A specialized asset with pixel dimensions. The hollow triangle points to its general classifier, Asset.",
        compartments: [{ label: "attributes", entries: ["+ width: Integer", "+ height: Integer"] }],
      },
    ],
    edges: [
      {
        id: "project-assets", source: "project", target: "asset", kind: "composition", label: "assets",
        sourceSide: "right", targetSide: "left", sourceMultiplicity: "1", targetMultiplicity: "0..*",
        labelPosition: { x: 480, y: 150 },
        description: "Project composes Asset. Each project owns zero or more assets; each asset belongs to one project.",
      },
      {
        id: "image-specializes-asset", source: "image-asset", target: "asset", kind: "generalization",
        sourceSide: "top", targetSide: "bottom",
        description: "ImageAsset specializes Asset. A solid line ends in a hollow triangle at Asset.",
      },
    ],
  },
  {
    id: "uml-component",
    name: "One interface, two operators",
    notation: "UML component",
    description: "People and agents work through the same command interface. Components declare their boundary; realization and usage dependencies make the direction of the contract explicit.",
    width: 960,
    height: 510,
    nodes: [
      {
        id: "interface", name: "WorkspaceCommands", kind: "interface", x: 345, y: 55, width: 270, height: 155,
        description: "The shared contract for selecting an element and renaming it. Both a person's UI and an agent adapter depend on this contract.",
        compartments: [{ entries: ["+ select(id: String): void", "+ rename(name: String): void"] }],
      },
      {
        id: "workspace", name: "Workspace", kind: "component", x: 345, y: 350, width: 270, height: 105,
        description: "The workspace realizes WorkspaceCommands and keeps one application state for every operator.",
      },
      {
        id: "agent", name: "Agent adapter", kind: "component", x: 35, y: 55, width: 230, height: 105,
        description: "The agent adapter requires WorkspaceCommands. It uses the same named controls and callbacks as the person.",
      },
      {
        id: "renderer", name: "Human interface", kind: "component", x: 695, y: 55, width: 230, height: 105,
        description: "The human interface requires WorkspaceCommands through keyboard and pointer controls. The diagram is an architectural example, not a runtime trace.",
      },
    ],
    edges: [
      {
        id: "agent-uses-contract", source: "agent", target: "interface", kind: "dependency", label: "«use»",
        sourceSide: "right", targetSide: "left", sourceOffset: 0.72, targetOffset: 0.49, labelPosition: { x: 305, y: 115 },
        description: "Agent adapter has a usage dependency on WorkspaceCommands. The dashed open arrow points to the required interface.",
      },
      {
        id: "human-uses-contract", source: "renderer", target: "interface", kind: "dependency", label: "«use»",
        sourceSide: "left", targetSide: "right", sourceOffset: 0.72, targetOffset: 0.49, labelPosition: { x: 655, y: 115 },
        description: "Human interface has a usage dependency on WorkspaceCommands. It requires the same operations as Agent adapter.",
      },
      {
        id: "workspace-realizes-contract", source: "workspace", target: "interface", kind: "realization",
        sourceSide: "top", targetSide: "bottom",
        description: "Workspace realizes WorkspaceCommands. The dashed line ends in a hollow triangle at the interface.",
      },
    ],
  },
  {
    id: "uwe-navigation",
    name: "From browsing to creating",
    notation: "UWE navigation",
    description: "The UWE navigation model distinguishes content, a menu, an index, a query and a creation process. A process link marks the transition into work; a navigation link marks browsing.",
    width: 960,
    height: 680,
    nodes: [
      {
        id: "home", name: "Library", kind: "uwe", stereotype: "navigationClass", x: 35, y: 50, width: 230, height: 95,
        description: "The library is the home navigation unit.", constraints: ["isHome"],
      },
      {
        id: "menu", name: "LibraryMenu", kind: "uwe", stereotype: "menu", x: 365, y: 50, width: 230, height: 80,
        description: "The menu gives access to browsing projects, searching and creating a project.",
      },
      {
        id: "projects", name: "ProjectList", kind: "uwe", stereotype: "index", x: 695, y: 50, width: 230, height: 80,
        description: "An index lists projects and lets a person or agent choose one.",
      },
      {
        id: "search", name: "FindProject", kind: "uwe", stereotype: "query", x: 365, y: 300, width: 230, height: 80,
        description: "The query searches the project collection and presents a matching project index.",
      },
      {
        id: "project", name: "Project", kind: "uwe", stereotype: "navigationClass", x: 695, y: 545, width: 230, height: 80,
        description: "The selected or newly created project's navigation unit.",
      },
      {
        id: "create", name: "CreateProject", kind: "uwe", stereotype: "processClass", x: 35, y: 545, width: 230, height: 80,
        description: "A project creation process. Its directed result link leads to the created project; it does not imply running creation again when navigating back.",
      },
    ],
    edges: [
      {
        id: "home-menu", source: "home", target: "menu", kind: "navigationLink",
        sourceSide: "right", targetSide: "left", sourceOffset: 0.42, labelPosition: { x: 315, y: 38 },
        description: "Library opens LibraryMenu through a navigationLink.",
      },
      {
        id: "menu-projects", source: "menu", target: "projects", kind: "navigationLink",
        sourceSide: "right", targetSide: "left", labelPosition: { x: 645, y: 38 },
        description: "LibraryMenu opens ProjectList through a navigationLink.",
      },
      {
        id: "menu-search", source: "menu", target: "search", kind: "processLink",
        sourceSide: "bottom", targetSide: "top", labelPosition: { x: 543, y: 220 },
        description: "LibraryMenu invokes FindProject through a processLink.",
      },
      {
        id: "search-results", source: "search", target: "projects", kind: "processLink",
        sourceSide: "right", targetSide: "bottom", waypoints: [{ x: 810, y: 340 }], labelPosition: { x: 730, y: 325 },
        description: "FindProject produces ProjectList through a directed processLink.",
      },
      {
        id: "list-project", source: "projects", target: "project", kind: "navigationLink",
        sourceSide: "right", targetSide: "right", sourceOffset: 0.7, waypoints: [{ x: 948, y: 106 }, { x: 948, y: 585 }], labelPosition: { x: 875, y: 450 },
        description: "ProjectList lets the operator navigate to a Project through a navigationLink.",
      },
      {
        id: "menu-create", source: "menu", target: "create", kind: "processLink",
        sourceSide: "bottom", sourceOffset: 0.2, targetSide: "top", waypoints: [{ x: 411, y: 230 }, { x: 150, y: 230 }], labelPosition: { x: 215, y: 215 },
        description: "LibraryMenu invokes CreateProject through a processLink.",
      },
      {
        id: "create-result", source: "create", target: "project", kind: "processLink",
        sourceSide: "right", targetSide: "left", labelPosition: { x: 480, y: 570 },
        description: "CreateProject produces a Project through a directed processLink.",
      },
    ],
  },
  {
    id: "uwe-presentation",
    name: "From model to page",
    notation: "UWE presentation",
    description: "A presentation page contains a search form and a repeated result group. The nested properties describe what appears together; these stereotypes express presentation structure, not pixel styling.",
    width: 960,
    height: 570,
    nodes: [
      {
        id: "page", name: "LibraryPage", kind: "uwe", stereotype: "presentationPage", x: 35, y: 30, width: 890, height: 510,
        description: "The page contains the search form and one result group per matching asset.",
      },
      {
        id: "toolbar", name: "searchForm", kind: "uwe", stereotype: "inputForm", x: 65, y: 115, width: 830, height: 165, parentId: "page",
        description: "An input form groups the search criterion and the action that submits it.",
      },
      {
        id: "search-input", name: "query", kind: "uwe", stereotype: "textInput", x: 90, y: 190, width: 455, height: 65, parentId: "toolbar",
        description: "A text input accepts the criterion for finding assets.",
      },
      {
        id: "search-button", name: "findAssets", kind: "uwe", stereotype: "button", x: 610, y: 190, width: 260, height: 65, parentId: "toolbar",
        description: "The form's action submits the search criterion.",
      },
      {
        id: "results", name: "result", kind: "uwe", stereotype: "presentationGroup", multiplicity: "*", x: 65, y: 310, width: 830, height: 200, parentId: "page",
        description: "A repeated presentation group describes each result. The star multiplicity means any number of result groups.",
      },
      {
        id: "image", name: "preview", kind: "uwe", stereotype: "image", x: 90, y: 390, width: 300, height: 90, parentId: "results",
        description: "The asset's visual preview, paired with a text description.",
      },
      {
        id: "caption", name: "description", kind: "uwe", stereotype: "text", x: 455, y: 390, width: 415, height: 90, parentId: "results",
        description: "A descriptive caption communicates the asset's meaning alongside its preview.",
      },
    ],
    edges: [],
  },
];

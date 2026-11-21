/** Task/navigation state for the Quantive application-layout example.
 * The backend remains the source of truth for identity, membership and data.
 * This reducer deliberately does not grant access or persist an organisation. */
export type LayoutSpaceId = "northstar" | "fieldworks";
export type LayoutRouteId = "reviews" | "projects" | "people" | "workspace" | "account";
export type LayoutFilter = "open" | "all" | "reviewed";
export type LayoutScenario = "ready" | "loading" | "error" | "empty";

export type LayoutNavigationState = Readonly<{
  spaceId: LayoutSpaceId;
  route: LayoutRouteId;
  selectedId: string | null;
  detailOpen: boolean;
  filter: LayoutFilter;
  query: string;
  projectFilter: string;
  scenario: LayoutScenario;
}>;

export type LayoutNavigationAction =
  | { type: "navigate"; route: LayoutRouteId }
  | { type: "switch-space"; spaceId: LayoutSpaceId; firstRecordId: string | null }
  | { type: "inspect"; recordId: string }
  | { type: "close-detail" }
  | { type: "filter"; value: LayoutFilter }
  | { type: "query"; value: string }
  | { type: "clear-project" }
  | { type: "open-project"; name: string }
  | { type: "scenario"; value: LayoutScenario }
  | { type: "show-all" };

export const initialLayoutNavigation: LayoutNavigationState = {
  spaceId: "northstar",
  route: "reviews",
  selectedId: "REL-204",
  detailOpen: false,
  filter: "open",
  query: "",
  projectFilter: "",
  scenario: "ready"
};

export function transitionLayout(
  state: LayoutNavigationState,
  action: LayoutNavigationAction
): LayoutNavigationState {
  switch (action.type) {
    case "navigate":
      return { ...state, route: action.route, detailOpen: false };
    case "switch-space":
      // One atomic transition prevents stale selection, filters or scenario
      // from continuing into a different workspace context.
      return {
        ...initialLayoutNavigation,
        spaceId: action.spaceId,
        selectedId: action.firstRecordId
      };
    case "inspect":
      return { ...state, selectedId: action.recordId, detailOpen: true };
    case "close-detail":
      return { ...state, detailOpen: false };
    case "filter":
      return { ...state, filter: action.value };
    case "query":
      return { ...state, query: action.value };
    case "clear-project":
      return { ...state, projectFilter: "", filter: "open" };
    case "open-project":
      return {
        ...state, route: "reviews", detailOpen: false,
        projectFilter: action.name, filter: "all", query: ""
      };
    case "scenario":
      return { ...state, scenario: action.value, detailOpen: false };
    case "show-all":
      return {
        ...state, query: "", projectFilter: "", filter: "all",
        scenario: "ready", detailOpen: false
      };
  }
}

export function canRecordReview(
  role: "Owner" | "Viewer",
  id: string,
  reviewed: readonly string[]
): boolean {
  return role === "Owner" && id.length > 0 && !reviewed.includes(id);
}

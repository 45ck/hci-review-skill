import { standardsModels } from "./standards-models";
import { enrichUweModels, extendedDiagramModels } from "./extended-models";
import { agentDiagramModels } from "./agent-models";

/** Every advertised view has a real, editable model; the initial business view stays first. */
export const allDiagramModels = [...enrichUweModels(standardsModels), ...extendedDiagramModels, ...agentDiagramModels];

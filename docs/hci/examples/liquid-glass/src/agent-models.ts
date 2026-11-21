import type { DiagramEdge, DiagramModel, DiagramNode } from "@quantitative-hci/liquid-glass/developer";

const patterns: NonNullable<DiagramModel["standard"]> = {
  acronym: "Agent patterns", version: "1.0 (local projection)",
  sourceUrl: "https://a2a-protocol.org/v0.3.0/specification/", coverage: "concept-projection",
  scope: "Application-defined agent collaboration views using UML component and sequence notation, informed by A2A task/artifact concepts and MCP tool contracts. This is not an OMG agent profile, a protocol transport, or a normative A2A/MCP architecture.",
};
const node = (id: string, name: string, kind: DiagramNode["kind"], x: number, y: number, width: number, height: number, description: string, rest: Partial<DiagramNode> = {}): DiagramNode => ({ id, name, kind, x, y, width, height, description, ...rest });
const edge = (id: string, source: string, target: string, kind: DiagramEdge["kind"], label: string, description: string, rest: Partial<DiagramEdge> = {}): DiagramEdge => ({ id, source, target, kind, label, description, ...rest });

const architecture: DiagramModel = {
  id: "agent-architecture", profileId: "agent-architecture", name: "Agents · One model, shared commands", notation: "UML component",
  description: "A person and an agent inspect the same revisioned model. The command boundary validates changes, the host controls authorization, and the task service returns inspectable artifacts.",
  width: 1200, height: 800, standard: patterns,
  legend: ["UML component notation describes application responsibilities.", "Dashed open arrows show usage dependencies; a dashed hollow triangle shows realization.", "Review and host authorization are separate responsibilities. This diagram is a local design projection."],
  nodes: [
    node("agent", "Agent adapter", "component", 45, 55, 255, 110, "Discovers named UI SDK components and submits revision-aware transactions through the shared command boundary.", { entityId: "agent.adapter", references: [{ modelId: "agent-handoff", nodeId: "agent", relation: "traces", label: "the agent interaction" }] }),
    node("commands", "ModelCommands", "interface", 460, 55, 280, 185, "The inspect, preview and apply contract is shared by both operators. An expected revision makes stale edits explicit.", { entityId: "agent.commands", compartments: [{ entries: ["+ inspect(): Document", "+ preview(change): Result", "+ apply(change, revision): Result"] }], references: [{ modelId: "agent-handoff", nodeId: "commands", relation: "traces", label: "the command exchange" }] }),
    node("human", "Human interface", "component", 900, 55, 255, 110, "Keyboard, touch and pointer controls invoke the same commands and render the same current state."),
    node("document", "Model document", "component", 460, 365, 280, 130, "Owns the model revision, selection and bounded history. It atomically applies valid operations or retains the previous document.", { entityId: "agent.document" }),
    node("policy", "Host authorization", "component", 45, 365, 255, 130, "The host verifies operator permissions and review decisions before accepting a write. UI hints are not authorization.", { references: [{ modelId: "agent-handoff", nodeId: "host", relation: "traces", label: "the host boundary" }] }),
    node("tasks", "Task service", "component", 900, 365, 255, 130, "Tracks ordered progress events and interruption or terminal states for a task.", { entityId: "agent.task-service", references: [{ modelId: "agent-task-lifecycle", relation: "drill-down", label: "the A2A task-state projection" }] }),
    node("artifacts", "Artifact store", "component", 460, 650, 280, 100, "Retains the produced model and its identity, media type and producer so a person or agent can inspect the result."),
  ],
  edges: [
    edge("agent-commands", "agent", "commands", "dependency", "«use»", "The agent uses the same commands as the human interface.", { sourceSide: "right", targetSide: "left", labelPosition: { x: 380, y: 105 } }),
    edge("human-commands", "human", "commands", "dependency", "«use»", "Human controls depend on the shared command contract.", { sourceSide: "left", targetSide: "right", labelPosition: { x: 820, y: 105 } }),
    edge("document-realizes", "document", "commands", "realization", "", "The model document realizes the revision-aware command contract.", { sourceSide: "top", targetSide: "bottom" }),
    edge("document-policy", "document", "policy", "dependency", "checks permission", "The host's authorization decision controls whether a mutation is accepted.", { sourceSide: "left", targetSide: "right", labelPosition: { x: 380, y: 415 } }),
    edge("tasks-document", "tasks", "document", "dependency", "reads result", "Task progress observes accepted changes and resulting revisions.", { sourceSide: "left", targetSide: "right", labelPosition: { x: 820, y: 415 } }),
    edge("document-artifact", "document", "artifacts", "dependency", "produces", "A completed operation exposes a model artifact.", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 650, y: 575 } }),
  ],
};

const lifecycle: DiagramModel = {
  id: "agent-task-lifecycle", profileId: "agent-task-lifecycle", parentModelId: "agent-architecture", name: "A2A · Task states and interruptions", notation: "UML state machine",
  description: "All nine A2A 0.3.0 TaskState values are named. The arrows illustrate selected application flows; they do not define an exhaustive protocol transition table.",
  width: 1150, height: 830,
  standard: { acronym: "A2A", version: "0.3.0 (state projection)", sourceUrl: "https://a2a-protocol.org/v0.3.0/specification/", coverage: "concept-projection", scope: "All nine TaskState enum values, presented with UML state notation and illustrative transitions. This is a state projection, not an A2A transport, Agent Card validator or protocol-conformance implementation." },
  legend: ["State names come from A2A 0.3.0 TaskState.", "Completed, canceled, failed and rejected are terminal. Input-required pauses for input; auth-required requests out-of-band authentication.", "Arrows are selected application examples. Unknown describes an indeterminate status, not a completed task."],
  nodes: [
    node("submitted", "submitted", "state", 45, 65, 250, 95, "The task has been submitted and is awaiting work."),
    node("working", "working", "state", 450, 65, 250, 95, "The task is actively being processed.", { references: [{ modelId: "agent-handoff", relation: "traces", label: "a reviewed tool call" }] }),
    node("unknown", "unknown", "state", 855, 65, 250, 95, "The current task state is unknown or indeterminate. It is retained as a distinct status."),
    node("input", "input-required", "state", 45, 345, 250, 110, "Processing is interrupted while the task needs additional input."),
    node("auth", "auth-required", "state", 450, 345, 250, 110, "Out-of-band authentication is required. A2A distinguishes this from its interrupted input-required state; credentials belong in the host authentication flow."),
    node("rejected", "rejected", "state", 855, 345, 250, 110, "The task was rejected and is terminal.", { constraints: ["terminal"] }),
    node("completed", "completed", "state", 45, 690, 250, 95, "The task completed successfully and may have produced artifacts.", { constraints: ["terminal"] }),
    node("canceled", "canceled", "state", 450, 690, 250, 95, "The task was canceled and is terminal.", { constraints: ["terminal"] }),
    node("failed", "failed", "state", 855, 690, 250, 95, "The task failed and is terminal.", { constraints: ["terminal"] }),
  ],
  edges: [
    edge("start", "submitted", "working", "transition", "begin", "A submitted task begins processing.", { sourceSide: "right", targetSide: "left", labelPosition: { x: 370, y: 95 } }),
    edge("ask", "working", "input", "transition", "request input", "Processing pauses for additional input.", { sourceSide: "left", sourceOffset: .78, targetSide: "top", waypoints: [{ x: 350, y: 140 }, { x: 350, y: 270 }, { x: 170, y: 270 }], labelPosition: { x: 250, y: 250 } }),
    edge("resume-input", "input", "working", "transition", "input supplied", "Processing resumes after the host accepts additional input.", { sourceSide: "right", targetSide: "bottom", targetOffset: .2, waypoints: [{ x: 500, y: 400 }], labelPosition: { x: 390, y: 385 } }),
    edge("authenticate", "working", "auth", "transition", "request authentication", "The task requests an authentication step.", { sourceSide: "bottom", sourceOffset: .8, targetSide: "top", targetOffset: .8, labelPosition: { x: 780, y: 260 } }),
    edge("resume-auth", "auth", "working", "transition", "authenticated", "Processing resumes once the host accepts authentication.", { sourceSide: "top", sourceOffset: .45, targetSide: "bottom", targetOffset: .45, labelPosition: { x: 480, y: 235 } }),
    edge("decline", "working", "rejected", "transition", "reject", "A task may be rejected by the agent or host policy.", { sourceSide: "right", targetSide: "top", waypoints: [{ x: 770, y: 110 }, { x: 770, y: 220 }, { x: 980, y: 220 }], labelPosition: { x: 910, y: 205 } }),
    edge("succeed", "working", "completed", "transition", "complete", "Accepted work finishes successfully.", { sourceSide: "bottom", sourceOffset: .05, targetSide: "top", waypoints: [{ x: 462.5, y: 580 }, { x: 170, y: 580 }], labelPosition: { x: 290, y: 565 } }),
    edge("cancel", "auth", "canceled", "transition", "cancel", "A task awaiting authentication can be canceled.", { sourceSide: "bottom", targetSide: "top", labelPosition: { x: 620, y: 580 } }),
    edge("failure", "working", "failed", "transition", "fail", "A processing error finishes the task with failed status.", { sourceSide: "right", sourceOffset: .8, targetSide: "top", waypoints: [{ x: 800, y: 141 }, { x: 800, y: 580 }, { x: 980, y: 580 }], labelPosition: { x: 900, y: 565 } }),
  ],
};

const message = (id: string, source: string, target: string, label: string, y: number, description: string, reply = false): DiagramEdge => {
  const positions: Record<string, number> = { agent: 150, commands: 450, reviewer: 750, host: 1050 };
  return edge(id, source, target, reply ? "returnMessage" : "synchronousMessage", label, description, { sourcePoint: { x: positions[source], y }, targetPoint: { x: positions[target], y }, waypoints: [], labelPosition: { x: (positions[source] + positions[target]) / 2, y: y - 16 } });
};

const handoff: DiagramModel = {
  id: "agent-handoff", profileId: "agent-handoff", parentModelId: "agent-architecture", name: "Agents · Review a tool request", notation: "UML sequence",
  description: "A revision-aware request becomes an inspectable proposal. A person reviews it; the host verifies permission and revision before returning a result and model artifact.",
  width: 1200, height: 840, standard: patterns,
  legend: ["UML sequence notation orders messages from top to bottom.", "Solid filled arrows are calls; dashed open arrows are replies.", "The flow illustrates a local host design informed by MCP tools and A2A artifacts. It is not a protocol message transcript."],
  nodes: [
    node("agent", "operator: Agent", "lifeline", 45, 45, 210, 745, "Discovers the command and current revision, proposes a change, then inspects the returned artifact.", { entityId: "agent.adapter", activations: [{ y: 110, height: 620 }], references: [{ modelId: "agent-architecture", nodeId: "agent", relation: "traces", label: "the agent component" }] }),
    node("commands", "commands: UI", "lifeline", 345, 45, 210, 745, "Previews the proposed change and makes the before/after state available for review.", { entityId: "agent.commands", activations: [{ y: 130, height: 610 }] }),
    node("reviewer", "reviewer: Person", "lifeline", 645, 45, 210, 745, "Reviews the exact proposed change. A UI confirmation is distinct from host-side authorization.", { activations: [{ y: 355, height: 120 }] }),
    node("host", "executor: Host", "lifeline", 945, 45, 210, 745, "Validates authorization and expected revision, then atomically applies the change or returns a conflict.", { activations: [{ y: 545, height: 105 }] }),
  ],
  edges: [
    message("inspect", "agent", "commands", "inspect()", 170, "The agent requests the current structured model and revision."),
    message("snapshot", "commands", "agent", "model + revision", 240, "The same current model used by the human UI is returned.", true),
    message("proposal", "agent", "commands", "preview(change, revision)", 310, "The proposed change names the element and expected revision."),
    message("request-review", "commands", "reviewer", "review(before, after)", 390, "The person inspects the exact field change before deciding."),
    message("review-decision", "reviewer", "commands", "decision", 470, "The review decision is returned to the host-controlled workflow.", true),
    message("apply", "commands", "host", "apply(change, revision)", 570, "The host checks authorization and revision before committing."),
    message("result", "host", "commands", "new revision / conflict", 650, "The command returns the resulting revision, or a conflict without a partial edit.", true),
    message("artifact", "commands", "agent", "result + artifact", 730, "The agent receives the actual resulting artifact and can inspect its identity and contents.", true),
  ],
};

export const agentDiagramModels: DiagramModel[] = [architecture, lifecycle, handoff];

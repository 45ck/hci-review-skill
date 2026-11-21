import { AGENT_TASK_STATES, type AgentTask, type AgentTaskEvent, type AgentTaskResult, type AgentTaskState, type AgentTaskUpdate, type AgentJson, type AgentToolCall } from "./types";

export const agentTaskSources = {
  lifecycle: { label: "A2A 0.3.0 task states", url: "https://a2a-protocol.org/v0.3.0/specification/#63-taskstate-enum" },
  tools: { label: "MCP 2025-06-18 tools", url: "https://modelcontextprotocol.io/specification/2025-06-18/server/tools" },
} as const;

export const agentTaskStateLabels: Record<AgentTaskState, string> = {
  submitted: "Submitted", working: "Working", "input-required": "Needs input", "auth-required": "Needs authentication",
  completed: "Completed", canceled: "Canceled", failed: "Failed", rejected: "Rejected", unknown: "Unknown",
};

const terminal = new Set<AgentTaskState>(["completed", "canceled", "failed", "rejected"]);
const allowed: Record<AgentTaskState, readonly AgentTaskState[]> = {
  submitted: ["submitted", "working", "input-required", "auth-required", "rejected", "canceled", "failed", "unknown"],
  working: ["working", "input-required", "auth-required", "completed", "canceled", "failed", "rejected", "unknown"],
  "input-required": ["input-required", "working", "canceled", "failed", "rejected", "unknown"],
  "auth-required": ["auth-required", "working", "canceled", "failed", "rejected", "unknown"],
  completed: [], canceled: [], failed: [], rejected: [],
  unknown: ["submitted", "working", "input-required", "auth-required", "completed", "canceled", "failed", "rejected", "unknown"],
};

export const isAgentTaskTerminal = (state: AgentTaskState) => terminal.has(state);
export const isAgentTaskInterrupted = (state: AgentTaskState) => state === "input-required";
const text = (value: unknown, maximum = 2000): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= maximum && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const callStates = new Set(["proposed", "approved", "running", "succeeded", "failed", "denied"]);
const callTransitions: Record<AgentToolCall["state"], readonly AgentToolCall["state"][]> = {
  proposed: ["proposed", "approved", "denied"], approved: ["approved", "running", "succeeded", "failed"],
  running: ["running", "succeeded", "failed"], succeeded: ["succeeded"], failed: ["failed"], denied: ["denied"],
};
const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;

function serializable(value: unknown, depth = 0, seen = new Set<object>()): boolean {
  if (depth > 16) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.length <= 2000 && value.every(item => serializable(item, depth + 1, seen))
    : Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length <= 2000 && Object.values(value).every(item => serializable(item, depth + 1, seen));
  seen.delete(value);
  return valid;
}

function validCall(call: unknown): call is AgentToolCall {
  return record(call) && text(call.id, 120) && text(call.name, 120) && text(call.title, 200) && text(call.description)
    && typeof call.state === "string" && callStates.has(call.state) && (call.review === "required" || call.review === "not-required")
    && (call.effect === "read" || call.effect === "write") && serializable(call.arguments)
    && (call.result === undefined || serializable(call.result)) && (call.error === undefined || text(call.error))
    && (call.changes === undefined || (Array.isArray(call.changes) && call.changes.length <= 100 && call.changes.every(change => record(change) && text(change.path, 200) && typeof change.before === "string" && change.before.length <= 2000 && typeof change.after === "string" && change.after.length <= 2000)));
}

function validEvent(event: unknown): event is AgentTaskEvent {
  return record(event) && text(event.id, 120) && Number.isSafeInteger(event.sequence) && Number(event.sequence) > 0
    && typeof event.at === "string" && /^\d{4}-\d\d-\d\dT/.test(event.at) && Number.isFinite(Date.parse(event.at))
    && AGENT_TASK_STATES.includes(event.state as AgentTaskState) && text(event.title, 200) && text(event.description) && text(event.actor, 120)
    && (event.call === undefined || validCall(event.call))
    && (event.artifact === undefined || (record(event.artifact) && text(event.artifact.id, 120) && text(event.artifact.name, 200) && text(event.artifact.description) && text(event.artifact.mediaType, 120) && text(event.artifact.producedBy, 120) && serializable(event.artifact.content)));
}

const equivalent = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => equivalent(value, right[index]));
  if (!record(left) || !record(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && equivalent(left[key], right[key]));
};

function callTransitionIssue(previous: AgentToolCall | undefined, call: AgentToolCall): { code: "conflict" | "transition"; message: string } | null {
  if (previous && (previous.name !== call.name || previous.review !== call.review || previous.effect !== call.effect || !equivalent(previous.arguments, call.arguments))) return { code: "conflict", message: "A tool call's identity, arguments and review policy cannot change after it is proposed." };
  if (previous && ["succeeded", "failed", "denied"].includes(previous.state) && !equivalent(previous, call)) return { code: "conflict", message: "A completed tool call cannot be rewritten." };
  if (previous && !callTransitions[previous.state].includes(call.state)) return { code: "transition", message: `Cannot change a ${previous.state} tool call to ${call.state}.` };
  if (!previous && call.review === "required" && call.state !== "proposed") return { code: "transition", message: "A tool requiring review must first be proposed." };
  return null;
}

export function validateAgentTask(value: unknown): string[] {
  if (!record(value) || !serializable(value)) return ["Task data must be a JSON object."];
  if (jsonBytes(value) > 2_000_000) return ["Task data exceeds the 2 MB UTF-8 display limit."];
  if (!text(value.id, 120) || !text(value.title, 200) || !AGENT_TASK_STATES.includes(value.state as AgentTaskState)) return ["Task identity, title or state is invalid."];
  if (!Array.isArray(value.events) || value.events.length > 100 || !value.events.every(validEvent)
    || !Array.isArray(value.calls) || !value.calls.every(validCall) || !Array.isArray(value.artifacts)) return ["Task collections contain invalid data."];
  if (!Number.isSafeInteger(value.revision) || value.revision !== value.events.length) return ["Task revision must match its ordered event count."];
  if (new Set(value.events.map(event => event.id)).size !== value.events.length || new Set(value.calls.map(call => call.id)).size !== value.calls.length) return ["Task event and call IDs must be unique."];
  const events = value.events;
  if (events.some((event, index) => event.sequence !== index + 1 || index > 0 && Date.parse(event.at) < Date.parse(events[index - 1].at))) return ["Task history must remain in sequence and time order."];
  if (events.length && events.at(-1)!.state !== value.state) return ["Current task state differs from its latest event."];
  for (const artifact of value.artifacts) {
    if (!record(artifact) || !text(artifact.id, 120) || !text(artifact.name, 200) || !text(artifact.description) || !text(artifact.mediaType, 120) || !text(artifact.producedBy, 120) || !serializable(artifact.content)) return ["Task artifacts contain invalid data."];
  }
  if (new Set(value.artifacts.map(artifact => artifact.id)).size !== value.artifacts.length) return ["Task artifact IDs must be unique."];
  let state: AgentTaskState = "submitted";
  const calls = new Map<string, AgentToolCall>();
  const artifacts = new Map<string, AgentTask["artifacts"][number]>();
  for (const event of events) {
    if (terminal.has(state)) return ["Task history cannot continue after a terminal event."];
    if (!allowed[state].includes(event.state)) return [`Task history cannot move from ${state} to ${event.state}.`];
    if (event.call) {
      const error = callTransitionIssue(calls.get(event.call.id), event.call);
      if (error) return [error.message];
      calls.delete(event.call.id);
      calls.set(event.call.id, event.call);
    }
    if (event.state === "completed" && [...calls.values()].some(call => ["proposed", "approved", "running"].includes(call.state))) return ["Task history cannot complete while a tool call is pending."];
    if (event.artifact) {
      artifacts.delete(event.artifact.id);
      artifacts.set(event.artifact.id, event.artifact);
    }
    state = event.state;
  }
  if (value.state !== state) return ["Current task state must match its event history, starting from submitted."];
  if (!equivalent(value.calls, [...calls.values()])) return ["Current tool calls must match the latest call events in task history."];
  if (!equivalent(value.artifacts, [...artifacts.values()])) return ["Current artifacts must match the latest artifact events in task history."];
  return [];
}

export function createAgentTask(id: string, title: string): AgentTask {
  if (!text(id, 120) || !text(title, 200)) throw new Error("A task needs a non-empty ID and title.");
  return { id, title, revision: 0, state: "submitted", events: [], calls: [], artifacts: [] };
}

export function applyAgentTaskUpdate(task: AgentTask, update: AgentTaskUpdate): AgentTaskResult {
  const reject = (code: NonNullable<AgentTaskResult["code"]>, message: string): AgentTaskResult => ({ ok: false, changed: false, task, code, message });
  const currentIssues = validateAgentTask(task);
  if (currentIssues.length) return reject("invalid", currentIssues[0]);
  if (!record(update) || !validEvent(update.event) || !Number.isSafeInteger(update.expectedRevision) || update.expectedRevision < 0) return reject("invalid", "Invalid task update. The current task was retained.");
  if (!serializable(update) || jsonBytes(update) > 256_000) return reject("invalid", "Task updates must be JSON data smaller than 256 KB in UTF-8.");
  if (update.taskId !== task.id) return reject("conflict", "This event belongs to a different task.");
  const duplicate = task.events.find(event => event.id === update.event.id);
  if (duplicate) return equivalent(duplicate, update.event)
    ? { ok: true, changed: false, task, message: "Duplicate event ignored." }
    : reject("conflict", "An existing event ID was reused with different content.");
  if (update.expectedRevision !== task.revision) return reject("conflict", `Task revision ${task.revision} is current. Read it again before sending this update.`);
  if (update.event.sequence !== task.revision + 1) return reject("out-of-order", "Task events must arrive in sequence.");
  if (terminal.has(task.state)) return reject("terminal", "This task has finished. Start a new task for further work.");
  if (!allowed[task.state].includes(update.event.state)) return reject("transition", `Cannot move from ${task.state} to ${update.event.state}.`);
  if (task.events.length >= 100) return reject("invalid", "This task reached its 100-event display limit. Archive it and start a new task.");
  if (task.events.length && Date.parse(update.event.at) < Date.parse(task.events.at(-1)!.at)) return reject("out-of-order", "Event time cannot precede the previous event.");
  const event = structuredClone(update.event);
  const previousCall = event.call && task.calls.find(call => call.id === event.call!.id);
  if (event.call) {
    const error = callTransitionIssue(previousCall, event.call);
    if (error) return reject(error.code, error.message);
  }
  const calls = event.call ? [...task.calls.filter(call => call.id !== event.call!.id), event.call] : task.calls;
  if (event.state === "completed" && calls.some(call => ["proposed", "approved", "running"].includes(call.state))) return reject("transition", "A task cannot complete while a tool call is pending.");
  const artifacts = event.artifact ? [...task.artifacts.filter(artifact => artifact.id !== event.artifact!.id), event.artifact] : task.artifacts;
  const nextTask: AgentTask = { ...task, revision: event.sequence, state: event.state, events: [...task.events, event], calls, artifacts };
  if (jsonBytes(nextTask) > 2_000_000) return reject("invalid", "The task reached its 2 MB UTF-8 display limit. Archive its events before continuing.");
  return { ok: true, changed: true, task: nextTask, message: event.title };
}

// Display redaction is a final defence; hosts must omit credentials before supplying component data.
export function redactAgentData(value: unknown): AgentJson {
  const seen = new WeakSet<object>();
  const visit = (item: unknown, depth: number): AgentJson => {
    if (depth > 12) return "[Depth limit]";
    if (typeof item === "string") return item.slice(0, 4000).replace(/\bBearer\s+[^\s"']+/gi, "Bearer [Redacted]");
    if (item === null || typeof item === "boolean") return item;
    if (typeof item === "number") return Number.isFinite(item) ? item : "[Invalid number]";
    if (typeof item !== "object") return "[Unsupported value]";
    if (seen.has(item)) return "[Repeated reference]";
    seen.add(item);
    if (Array.isArray(item)) return item.slice(0, 100).map(child => visit(child, depth + 1));
    const result: Record<string, AgentJson> = Object.create(null);
    for (const [key, child] of Object.entries(item).slice(0, 100)) result[key] = /password|secret|token|authorization|api.?key|credential|cookie/i.test(key) ? "[Redacted]" : visit(child, depth + 1);
    return result;
  };
  return visit(value, 0);
}

export function createAgentTaskContext(task: AgentTask) {
  return {
    schemaVersion: 1, kind: "quantive-agent-task", task: redactAgentData(task),
    terminal: terminal.has(task.state), interrupted: isAgentTaskInterrupted(task.state), authenticationRequired: task.state === "auth-required",
    reviewRequired: terminal.has(task.state) ? [] : task.calls.filter(call => call.review === "required" && call.state === "proposed").map(call => call.id),
    source: agentTaskSources.lifecycle,
  };
}

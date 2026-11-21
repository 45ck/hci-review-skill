export const AGENT_TASK_STATES = [
  "submitted", "working", "input-required", "auth-required", "completed", "canceled", "failed", "rejected", "unknown",
] as const;
export type AgentTaskState = typeof AGENT_TASK_STATES[number];
export type AgentCallState = "proposed" | "approved" | "running" | "succeeded" | "failed" | "denied";
export type AgentJson = null | boolean | number | string | AgentJson[] | { [key: string]: AgentJson };

export interface AgentCapability {
  id: string;
  name: string;
  version: string;
  description: string;
  skills: { id: string; name: string; description: string; inputModes: string[]; outputModes: string[] }[];
  source: { label: string; url: string };
}

export interface AgentToolCall {
  id: string;
  name: string;
  title: string;
  description: string;
  state: AgentCallState;
  review: "required" | "not-required";
  effect: "read" | "write";
  arguments: AgentJson;
  result?: AgentJson;
  error?: string;
  changes?: { path: string; before: string; after: string }[];
}

export interface AgentArtifact {
  id: string;
  name: string;
  description: string;
  mediaType: string;
  content: AgentJson;
  producedBy: string;
}

export interface AgentTaskEvent {
  id: string;
  sequence: number;
  at: string;
  state: AgentTaskState;
  title: string;
  description: string;
  actor: string;
  call?: AgentToolCall;
  artifact?: AgentArtifact;
}

export interface AgentTask {
  id: string;
  title: string;
  revision: number;
  state: AgentTaskState;
  events: AgentTaskEvent[];
  calls: AgentToolCall[];
  artifacts: AgentArtifact[];
}

export interface AgentTaskUpdate {
  taskId: string;
  expectedRevision: number;
  event: AgentTaskEvent;
}

export interface AgentTaskResult {
  ok: boolean;
  changed: boolean;
  task: AgentTask;
  code?: "invalid" | "conflict" | "out-of-order" | "terminal" | "transition";
  message: string;
}

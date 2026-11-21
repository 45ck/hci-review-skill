import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { AgentCapabilityCard, AgentTaskPanel, applyAgentTaskUpdate, createAgentTask, type AgentCapability, type AgentTask, type AgentTaskEvent, type AgentToolCall, type AgentReviewDetails } from "@quantitative-hci/liquid-glass/agents";
import "@quantitative-hci/liquid-glass/agents.css";
import "./agents-showcase.css";

const capability: AgentCapability = {
  id: "model-steward", name: "Model steward", version: "1.0",
  description: "Inspect a model, propose a precise change, and return the revised artifact for review.",
  skills: [
    { id: "inspect-model", name: "Inspect the current model", description: "Read stable element identities, relationships and the current revision.", inputModes: ["application/json"], outputModes: ["application/json"] },
    { id: "propose-change", name: "Propose a model change", description: "Describe the affected field and preserve the original value until the host accepts the change.", inputModes: ["text/plain", "application/json"], outputModes: ["application/json"] },
  ],
  source: { label: "A2A agent-card concepts", url: "https://a2a-protocol.org/v0.3.0/specification/#5-agent-discovery-the-agent-card" },
};

const proposedCall: AgentToolCall = {
  id: "rename-release", name: "model.rename_element", title: "Rename the review activity",
  description: "Make the activity label identify the object being reviewed. The element ID and its relationships stay unchanged.",
  state: "proposed", review: "required", effect: "write",
  arguments: { modelId: "sample-release", elementId: "review", expectedRevision: 0, name: "Review release candidate" },
  changes: [{ path: "review.name", before: "Review release", after: "Review release candidate" }],
};

export function AgentsShowcase() {
  const [task, setTask] = useState<AgentTask>(() => createAgentTask("sample-task-1", "Clarify a release model"));
  const [sample, setSample] = useState({ id: "sample-release", revision: 0, element: { id: "review", name: "Review release" } });
  const [error, setError] = useState("");
  const [run, setRun] = useState(1);
  const submit = (event: Omit<AgentTaskEvent, "id" | "sequence" | "at">) => {
    const result = applyAgentTaskUpdate(task, { taskId: task.id, expectedRevision: task.revision,
      event: { ...event, id: `${task.id}-event-${task.revision + 1}`, sequence: task.revision + 1, at: new Date().toISOString() } });
    if (!result.ok) { setError(result.message); return false; }
    setTask(result.task); setError(""); return true;
  };
  const review = (decision: "approved" | "denied", details: AgentReviewDetails) => {
    if (decision === "approved" && details.source === "agent") throw new Error("A person must approve this sample change.");
    const call = task.calls.find(item => item.id === details.callId && item.state === "proposed");
    if (!call || task.state !== "input-required") throw new Error("The review is no longer pending. Read the current task again.");
    submit({ state: decision === "approved" ? "working" : "rejected", actor: decision === "approved" ? "Person" : details.source === "agent" ? "Agent" : "Person",
      title: decision === "approved" ? "Change approved" : "Change rejected",
      description: decision === "approved" ? "The proposed label is approved. Apply the change to produce the local sample artifact." : "The original sample model was retained.",
      call: { ...call, state: decision } });
  };
  const writeCall = task.calls.find(call => call.id === proposedCall.id);
  const apply = () => {
    if (sample.revision !== 0 || writeCall?.state !== "approved" || task.state !== "working") { setError("The sample or its approval has changed. Start a new sample task."); return; }
    const next = { ...sample, revision: 1, element: { ...sample.element, name: "Review release candidate" } };
    if (submit({ state: "completed", actor: "Sample host", title: "Model artifact produced", description: "The local model now contains the reviewed label, with the same element identity.",
      call: { ...writeCall, state: "succeeded", result: { revision: 1, changedElementIds: ["review"] } },
      artifact: { id: `${task.id}-artifact`, name: "Revised release model", description: "The actual local sample after the approved edit.", mediaType: "application/json", producedBy: "Sample host", content: next } })) setSample(next);
  };
  return <div className="agents-showcase" data-kit-view="agents" data-validation="unvalidated">
    <header className="agents-intro"><div><p className="agents-eyebrow">Tasks · tools · artifacts</p><h2>Make agent work inspectable.</h2></div><p>Follow a task, inspect its proposed change, and decide what happens next.</p></header>
    <div className="agents-sample-note"><strong>Interactive local sample</strong><span>Uses fixture data and real component state. No model provider or remote tool is called.</span></div>
    <div className="agents-workspace"><AgentCapabilityCard capability={capability} /><div>
      <AgentTaskPanel task={task} onReview={review} onCancel={() => { submit({ state: "canceled", actor: "User", title: "Task canceled", description: "The sample stopped without applying any pending change." }); }}>
        {task.state === "submitted" && <Button data-variant="primary" onClick={() => submit({ state: "working", actor: "Sample host", title: "Current model inspected", description: "Read model sample-release at revision 0 and located the review activity.", call: { id: "inspect-release", name: "model.inspect", title: "Inspect release model", description: "Read the current sample model.", state: "succeeded", review: "not-required", effect: "read", arguments: { modelId: "sample-release" }, result: sample } })}>Start sample task</Button>}
        {task.state === "working" && !writeCall && <Button data-variant="primary" onClick={() => submit({ state: "input-required", actor: "Sample host", title: "Label change proposed", description: "The task is waiting for a person to review one field change.", call: proposedCall })}>Propose label change</Button>}
        {task.state === "working" && writeCall?.state === "approved" && <Button data-variant="primary" onClick={apply}>Apply approved change</Button>}
        <Button onClick={() => { const nextRun = run + 1; setRun(nextRun); setTask(createAgentTask(`sample-task-${nextRun}`, "Clarify a release model")); setSample({ id: "sample-release", revision: 0, element: { id: "review", name: "Review release" } }); setError(""); }}>New sample task</Button>
      </AgentTaskPanel>
      <p className="agents-current-model" data-sample-revision={sample.revision}><span>Local model</span><strong>{sample.element.name}</strong><span>revision {sample.revision}</span></p>
      {error && <p className="qga-error" role="alert">{error}</p>}
    </div></div>
    <p className="agents-package">Compose capability, task status, timeline, tool request, artifact and context components from <code>@quantitative-hci/liquid-glass/agents</code>.</p>
  </div>;
}

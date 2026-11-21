"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Textarea } from "@ui-sdk/react/textarea";
import { Timeline, TimelineItem, TimelineMarker, TimelineConnector, TimelineTitle, TimelineTime, TimelineDescription } from "@ui-sdk/react/timeline";
import { ValidationBadge } from "../validation";
import { agentTaskSources, agentTaskStateLabels, createAgentTaskContext, isAgentTaskTerminal, redactAgentData } from "./task";
import type { AgentArtifact, AgentCapability, AgentTask, AgentTaskState, AgentToolCall } from "./types";

export function AgentTaskStatus({ state }: { state: AgentTaskState }) {
  return <span className="qga-status" data-state={state} data-validation="unvalidated" role="status">{agentTaskStateLabels[state] ?? "Unknown"}</span>;
}

export function AgentCapabilityCard({ capability }: { capability: AgentCapability }) {
  return <section className="qga-capability qga-surface" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated" aria-label={`${capability.name} capabilities`}>
    <header><div><p className="qga-eyebrow">Agent capability</p><h2>{capability.name}</h2></div><ValidationBadge /></header>
    <p>{capability.description}</p>
    <dl className="qga-metadata"><div><dt>Identity</dt><dd>{capability.id}</dd></div><div><dt>Version</dt><dd>{capability.version}</dd></div></dl>
    <ul className="qga-skills">{capability.skills.map(skill => <li key={skill.id} data-agent-skill={skill.id}>
      <h3>{skill.name}</h3><p>{skill.description}</p><p className="qga-modes">Accepts {skill.inputModes.join(", ")} · Returns {skill.outputModes.join(", ")}</p>
    </li>)}</ul>
    <p className="qga-source"><a href={capability.source.url} target="_blank" rel="noreferrer">{capability.source.label}</a></p>
  </section>;
}

export function AgentTaskTimeline({ task, label = "Agent task history" }: { task: AgentTask; label?: string }) {
  return <section className="qga-history" aria-label={label} data-validation="unvalidated">
    <header><h3>Task history</h3><span>{task.events.length} events</span></header>
    {!task.events.length && <p className="qga-empty">The task is ready. Its events will appear here.</p>}
    <Timeline aria-label={`${label} events`} loop={false}>
      {task.events.map((event, index) => <TimelineItem value={event.id} key={event.id} status={index === task.events.length - 1 && !isAgentTaskTerminal(task.state) ? "current" : "complete"} data-task-event={event.id}>
        <TimelineMarker /><TimelineConnector />
        <TimelineTitle>{event.title}</TimelineTitle>
        <TimelineTime dateTime={event.at}>Event {event.sequence} · {event.actor}</TimelineTime>
        <TimelineDescription>{event.description}</TimelineDescription>
      </TimelineItem>)}
    </Timeline>
  </section>;
}

export interface AgentReviewDetails { callId: string; source: string }
export interface AgentToolRequestProps {
  call: AgentToolCall;
  onReview?: (decision: "approved" | "denied", details: AgentReviewDetails) => void | Promise<void>;
  disabled?: boolean;
}

export function AgentToolRequest({ call, onReview, disabled = false }: AgentToolRequestProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const reviewable = call.review === "required" && call.state === "proposed" && Boolean(onReview) && !disabled && !pending;
  const review = async (decision: "approved" | "denied", source: string) => {
    if (!reviewable || inFlight.current) return;
    inFlight.current = true;
    setPending(true); setError("");
    try { await onReview?.(decision, { callId: call.id, source }); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "The review could not be saved. Try again."); }
    finally { inFlight.current = false; setPending(false); }
  };
  return <section className="qga-tool qga-surface" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated" data-tool-call={call.id} data-call-state={call.state} aria-label={call.title}>
    <header><div><p className="qga-eyebrow">{call.effect === "read" ? "Read request" : "Proposed change"}</p><h3>{call.title}</h3></div><span className="qga-call-state" data-state={call.state}>{call.state}</span><ValidationBadge /></header>
    <p>{call.description}</p>
    <p className="qga-tool-name"><code>{call.name}</code> · {call.review === "required" ? "Human review required" : "No review required by host policy"}</p>
    {call.changes?.length ? <table className="qga-changes"><caption>Proposed changes</caption><thead><tr><th scope="col">Field</th><th scope="col">Current</th><th scope="col">Proposed</th></tr></thead><tbody>{call.changes.map((change, index) => <tr key={`${change.path}-${index}`}><th scope="row">{change.path}</th><td>{String((redactAgentData({ [change.path]: change.before }) as Record<string, unknown>)[change.path])}</td><td>{String((redactAgentData({ [change.path]: change.after }) as Record<string, unknown>)[change.path])}</td></tr>)}</tbody></table> : null}
    <Collapsible aria-label={`${call.title} data`} className="qga-details"><CollapsibleTrigger>Request and result</CollapsibleTrigger><CollapsiblePanel>
      <Field><FieldLabel>{call.title} arguments</FieldLabel><Textarea readOnly value={JSON.stringify(redactAgentData(call.arguments), null, 2)} rows={4} spellCheck={false} /></Field>
      {call.result !== undefined && <Field><FieldLabel>{call.title} result</FieldLabel><Textarea readOnly value={JSON.stringify(redactAgentData(call.result), null, 2)} rows={4} spellCheck={false} /></Field>}
    </CollapsiblePanel></Collapsible>
    {call.error && <p className="qga-error" role="alert">{call.error}</p>}
    {call.review === "required" && call.state === "proposed" && <div className="qga-review-actions">
      <Button disabled={!reviewable} data-variant="primary" data-agent-confirm={`Approves ${call.title}. A person must review the proposed changes.`} onClick={(_, details) => review("approved", details.source)} pendingAnnouncement="Saving approval">Approve proposed change</Button>
      <Button disabled={!reviewable} onClick={(_, details) => review("denied", details.source)} pendingAnnouncement="Saving rejection">Reject proposed change</Button>
    </div>}
    {error && <p className="qga-error" role="alert">{error}</p>}
  </section>;
}

export function AgentArtifactCard({ artifact, onOpen }: { artifact: AgentArtifact; onOpen?: (artifact: AgentArtifact) => void | Promise<void> }) {
  return <section className="qga-artifact qga-surface" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated" data-agent-artifact={artifact.id} aria-label={artifact.name}>
    <header><div><p className="qga-eyebrow">Result artifact</p><h3>{artifact.name}</h3></div><ValidationBadge /></header>
    <p>{artifact.description}</p><p className="qga-source">{artifact.mediaType} · Produced by {artifact.producedBy}</p>
    <Collapsible aria-label={`${artifact.name} contents`} className="qga-details"><CollapsibleTrigger>View artifact</CollapsibleTrigger><CollapsiblePanel><Field><FieldLabel>{artifact.name} content</FieldLabel><Textarea readOnly value={JSON.stringify(redactAgentData(artifact.content), null, 2)} rows={5} spellCheck={false} /></Field></CollapsiblePanel></Collapsible>
    {onOpen && <Button onClick={() => onOpen(artifact)}>Open {artifact.name}</Button>}
  </section>;
}

export function AgentContextPanel({ task }: { task: AgentTask }) {
  const [copied, setCopied] = useState("");
  const context = JSON.stringify(createAgentTaskContext(task), null, 2);
  return <Collapsible className="qga-context qga-details" aria-label="Agent task context" data-validation="unvalidated">
    <CollapsibleTrigger>Agent context</CollapsibleTrigger><CollapsiblePanel>
      <Field><FieldLabel>Current agent task JSON</FieldLabel><Textarea readOnly value={context} rows={9} spellCheck={false} /></Field>
      <Button onClick={async () => { try { await navigator.clipboard.writeText(context); setCopied("Current task context copied."); } catch { setCopied("Clipboard unavailable. Select the context above to copy it."); } }}>Copy agent task context</Button>
      <output aria-live="polite">{copied}</output>
    </CollapsiblePanel>
  </Collapsible>;
}

export function AgentTaskPanel({ task, children, onCancel, onReview }: {
  task: AgentTask;
  children?: ReactNode;
  onCancel?: () => void | Promise<void>;
  onReview?: AgentToolRequestProps["onReview"];
}) {
  const [error, setError] = useState("");
  return <section className="qga-task qga-surface" aria-label={task.title} data-agent-task={task.id} data-task-revision={task.revision} data-task-state={task.state} data-validation="unvalidated" data-liquid-glass="" data-liquid-kind="panel">
    <header className="qga-task-heading"><div><p className="qga-eyebrow">Task · revision {task.revision}</p><h2>{task.title}</h2></div><AgentTaskStatus state={task.state} /></header>
    <div className="qga-task-actions">{children}{onCancel && <Button disabled={isAgentTaskTerminal(task.state)} onClick={async () => { setError(""); try { await onCancel(); } catch (problem) { setError(problem instanceof Error ? problem.message : "Cancellation failed. Try again."); } }}>Cancel task</Button>}</div>
    {error && <p className="qga-error" role="alert">{error}</p>}
    <div className="qga-task-body"><AgentTaskTimeline task={task} /><div className="qga-task-results">
      {task.calls.filter(call => call.effect === "write").map(call => <AgentToolRequest key={call.id} call={call} onReview={onReview} disabled={isAgentTaskTerminal(task.state)} />)}
      {task.artifacts.map(artifact => <AgentArtifactCard key={artifact.id} artifact={artifact} />)}
      {!task.calls.some(call => call.effect === "write") && !task.artifacts.length && <div className="qga-empty-result"><p className="qga-eyebrow">Ready for a result</p><p>Proposed changes and artifacts will appear here as the task progresses.</p></div>}
    </div></div>
    <AgentContextPanel task={task} />
    <footer className="qga-task-footer"><ValidationBadge /><a href={agentTaskSources.lifecycle.url} target="_blank" rel="noreferrer">{agentTaskSources.lifecycle.label}</a><span>State model, without a network transport.</span></footer>
  </section>;
}

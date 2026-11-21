import { useState } from "react";
import { Toggle } from "@ui-sdk/react/toggle";
import {
  LiquidMotionScene, LiquidMotionState, LiquidTextTransition,
  type LiquidMotionGraph, type LiquidMotionSceneDefinition,
} from "@quantitative-hci/liquid-glass/motion";

const graph: LiquidMotionGraph = {
  id: "workflow", initial: "idle",
  states: [
    { id: "idle", label: "Ready" }, { id: "running", label: "Running" },
    { id: "paused", label: "Paused" }, { id: "complete", label: "Complete" },
    { id: "failed", label: "Needs attention" },
  ],
  transitions: [
    { from: "idle", event: "start", to: "running", label: "Start workflow" },
    { from: "running", event: "pause", to: "paused", label: "Pause workflow" },
    { from: "running", event: "complete", to: "complete", label: "Complete workflow" },
    { from: "running", event: "fail", to: "failed", label: "Fail workflow" },
    { from: "paused", event: "resume", to: "running", label: "Resume workflow" },
    { from: "paused", event: "reset", to: "idle", label: "Reset workflow" },
    { from: "complete", event: "reset", to: "idle", label: "Reset workflow" },
    { from: "failed", event: "retry", to: "running", label: "Retry workflow" },
    { from: "failed", event: "reset", to: "idle", label: "Reset workflow" },
  ],
};

const scene: LiquidMotionSceneDefinition = {
  id: "workflow-scene", label: "Workflow layers", states: graph.states.map(state => state.id),
  layers: [
    { id: "work", icon: "layers", poses: {
      idle: { x: -50, y: 15, scale: .85, depth: 4 },
      running: { x: -40, y: -8, rotation: -8, scale: 1, depth: 16 },
      paused: { x: -40, y: 4, scale: .9, depth: 5 },
      complete: { x: -25, y: 8, rotation: 0, scale: 1, depth: 8 },
      failed: { x: -40, y: 12, rotation: -6, scale: .9, depth: 3 },
    } },
    { id: "signal", icon: "activity", poses: {
      idle: { x: 48, y: 15, opacity: .45, scale: .65, depth: 2 },
      running: { x: 48, y: -12, opacity: 1, scale: .85, depth: 12 },
      paused: { x: 48, y: 5, opacity: .55, scale: .7, depth: 3 },
      complete: { x: 48, y: 0, opacity: .3, scale: .6, depth: 2 },
      failed: { x: 48, y: 12, rotation: 12, opacity: 1, scale: .8, depth: 3 },
    } },
    { id: "result", icon: "sparkles", poses: {
      idle: { x: 0, y: -50, opacity: 0, scale: .3 },
      running: { x: 0, y: -50, opacity: .35, scale: .5 },
      paused: { x: 0, y: -45, opacity: .2, scale: .45 },
      complete: { x: 24, y: -38, opacity: 1, scale: .8, depth: 12 },
      failed: { x: 0, y: -50, opacity: 0, scale: .3 },
    } },
  ],
};

export function MotionStateExample() {
  const [value, setValue] = useState(graph.initial);
  const [allow, setAllow] = useState(true);
  const [acceptance, setAcceptance] = useState("Ready for a workflow action.");
  return <section className="mg-card" data-liquid-glass="" data-liquid-kind="panel" aria-label="State graph study">
    <h3>A shared state graph</h3>
    <p>Start, pause and finish a workflow. Its layered scene follows the accepted state.</p>
    <Toggle pressed={allow} onPressedChange={setAllow}>Allow workflow changes</Toggle>
    <LiquidMotionState label="Motion workflow" graph={graph} value={value} onValueChange={(next, details) => {
      if (!allow) { details.cancel(); setAcceptance("Change refused. Workflow state is unchanged."); return; }
      setValue(next);
      setAcceptance(`Accepted ${next}.`);
    }}>
      {state => <LiquidMotionScene scene={scene} state={state} />}
    </LiquidMotionState>
    <output aria-label="Workflow acceptance" aria-live="polite"><LiquidTextTransition text={acceptance} /></output>
    <p className="mg-caption">This is a local workflow study. Completion follows the chosen action.</p>
  </section>;
}

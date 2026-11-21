"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@ui-sdk/react/button";
import { Toggle } from "@ui-sdk/react/toggle";
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@ui-sdk/react/progress";
import { LiquidIcon, LIQUID_ICON_NAMES, type LiquidIconName } from "@quantitative-hci/liquid-glass/icons";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import {
  LiquidMotionProvider, useLiquidMotionPolicy, LiquidMorphIcon, LiquidAnimatedIcon,
  LiquidMotion, LiquidPresence, LiquidMotionList, LiquidMotionNumber, LiquidTextTransition,
  LiquidSharedIndicator, LiquidMotionFeedback, LiquidDepth,
  liquidMotionRegistry, liquidMotionRecipes, selectLiquidMotionRecipe, type LiquidMotionIntent,
} from "@quantitative-hci/liquid-glass/motion";
import motionRecipeSource from "./recipes/motion-system.tsx?raw";
import "@quantitative-hci/liquid-glass/motion.css";
import "./motion-showcase.css";

type MorphPair = ComponentProps<typeof LiquidMorphIcon>["pair"];
type IconEffect = ComponentProps<typeof LiquidAnimatedIcon>["effect"];
type MotionPreset = "calm" | "responsive" | "expressive";
type MotionMode = "system" | "reduced" | "off";
type GallerySection = "icons" | "interface" | "work" | "recipes";

const sections: { id: GallerySection; label: string }[] = [
  { id: "icons", label: "Icons" }, { id: "interface", label: "Interface" },
  { id: "work", label: "Agent work" }, { id: "recipes", label: "Recipes" },
];
const morphs: { id: MorphPair; label: string; states: [string, string] }[] = [
  { id: "play-pause", label: "Playback", states: ["Play", "Pause"] },
  { id: "menu-close", label: "Menu", states: ["Menu", "Close"] },
  { id: "plus-minus", label: "Disclosure", states: ["Plus", "Minus"] },
  { id: "chevron", label: "Direction", states: ["Down", "Up"] },
  { id: "volume-mute", label: "Sound", states: ["Sound", "Muted"] },
  { id: "lock-unlock", label: "Access", states: ["Locked", "Unlocked"] },
  { id: "bookmark-saved", label: "Bookmark", states: ["Unsaved", "Saved"] },
  { id: "eye-hidden", label: "Visibility", states: ["Visible", "Hidden"] },
  { id: "expand-restore", label: "View size", states: ["Expand", "Restore"] },
  { id: "heart-saved", label: "Favourite", states: ["Unsaved", "Saved"] },
];
const effects: IconEffect[] = ["lift", "draw", "ring", "spin", "pulse", "tilt", "bounce", "shake", "spark"];
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function MotionChoice({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  return <div className="mg-choice"><Select value={value} items={options} onValueChange={(next, details) => {
    if (!next || !options.some(option => option.value === next)) { details.cancel(); return; }
    onChange(next);
  }}><SelectLabel>{label}</SelectLabel><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
    {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
  </SelectContent></Select></div>;
}

function MotionPolicyNote() {
  const { effective } = useLiquidMotionPolicy();
  return <span className="mg-policy" data-motion-effective={effective}><span aria-hidden="true" />
    {effective === "enabled" ? "Motion on" : effective === "reduced" ? "Reduced motion" : "Motion off"}
  </span>;
}

function MotionSelectionIndicator() {
  return <span className="mg-selection-viewport" aria-hidden="true"><SegmentedControlIndicator /></span>;
}

function MotionCard({ title, children, className = "", description }: {
  title: string; children: ReactNode; className?: string; description?: string;
}) {
  return <section className={`mg-card ${className}`} data-liquid-glass>
    <header className="mg-card-heading"><h3>{title}</h3>{description && <p>{description}</p>}</header>
    {children}
  </section>;
}

function IconStudies() {
  const [playing, setPlaying] = useState(false);
  const [states, setStates] = useState<Partial<Record<MorphPair, boolean>>>({});
  const [effect, setEffect] = useState<IconEffect>("lift");
  const [replays, setReplays] = useState<Partial<Record<LiquidIconName, number>>>({});
  const [revision, setRevision] = useState(0);
  return <div className="mg-studies">
    <section className="mg-hero" data-liquid-glass>
      <div className="mg-hero-copy">
        <p className="mg-kicker">01 / State transitions</p>
        <h3>One control.<br />Two clear states.</h3>
        <p>Press play. Reverse it halfway through. The shape follows the state.</p>
        <div className="mg-hero-foot"><span>Play ↔ Pause</span><output data-playback-state={playing ? "playing" : "paused"}>{playing ? "Playing" : "Paused"}</output></div>
      </div>
      <div className="mg-play-stage">
        <div className="mg-stage-grid" aria-hidden="true" />
        <div className="mg-stage-disc mg-stage-disc-back" aria-hidden="true" />
        <div className="mg-stage-disc" aria-hidden="true" />
        <Toggle className="mg-play-button" aria-label="Preview playback" pressed={playing} onPressedChange={setPlaying}>
          <LiquidMorphIcon pair="play-pause" active={playing} size={96} />
        </Toggle>
        <span className="mg-stage-caption">Local playback study</span>
      </div>
    </section>

    <div className="mg-section-heading"><h3>Shape follows intent.</h3><span>10 reversible pairs</span></div>
    <div className="mg-morph-grid">
      {morphs.map(pair => <Toggle key={pair.id} className="mg-morph-tile" aria-label={`Preview ${pair.label.toLowerCase()} morph`}
        pressed={Boolean(states[pair.id])} onPressedChange={next => setStates(current => ({ ...current, [pair.id]: next }))}>
        <span className="mg-morph-art"><LiquidMorphIcon pair={pair.id} active={Boolean(states[pair.id])} size={38} /></span>
        <strong>{pair.label}</strong><span className="mg-morph-caption">{pair.states.join(" / ")}</span>
      </Toggle>)}
    </div>

    <div className="mg-section-heading mg-section-heading-controls"><div><h3>Our icons, in motion.</h3><p>Hover, focus, or press an icon to replay.</p></div>
      <div className="mg-inline-controls"><MotionChoice label="Icon effect" value={effect} options={effects.map(value => ({ value, label: titleCase(value) }))} onChange={value => setEffect(value as IconEffect)} />
        <Button onClick={() => setRevision(value => value + 1)}><LiquidIcon name="reset" size={18} />Replay all icons</Button></div>
    </div>
    <div className="mg-icon-grid">
      {LIQUID_ICON_NAMES.map(name => <Button key={name} className="mg-icon-tile" aria-label={`Replay ${name} icon`}
        onClick={() => setReplays(current => ({ ...current, [name]: (current[name] ?? 0) + 1 }))}>
        <LiquidAnimatedIcon name={name} effect={effect} trigger="hover" revision={revision + (replays[name] ?? 0)} size={52} />
        <span>{titleCase(name)}</span>
      </Button>)}
    </div>
  </div>;
}

const viewItems = [{ id: "list", label: "List" }, { id: "grid", label: "Grid" }, { id: "board", label: "Board" }];
const originalRows = [
  { id: "coast", label: "Coastal study", icon: "folder" },
  { id: "material", label: "Material system", icon: "layers" },
  { id: "review", label: "Interface review", icon: "grid" },
] satisfies { id: string; label: string; icon: LiquidIconName }[];

function InterfaceStudies() {
  const [view, setView] = useState<string | null>("list");
  const [locked, setLocked] = useState(false);
  const [selectionResult, setSelectionResult] = useState("");
  const [visible, setVisible] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<{ id: string; label: string; icon: LiquidIconName }[]>(originalRows);
  const rowSequence = useRef(0);
  const [total, setTotal] = useState(128);
  const [progress, setProgress] = useState(25);
  const [depth, setDepth] = useState("layers");
  const focusReturn = useRef<HTMLButtonElement>(null);
  return <div className="mg-interface-grid">
    <MotionCard title="Keep your place." description="A shared indicator connects each selection.">
      <div className="mg-demo-stage"><LiquidSharedIndicator label="Motion layout selection" value={view} items={viewItems}
        onValueChange={(next, details) => {
          if (locked) { details.cancel(); setSelectionResult("Selection held. Unlock to change the layout."); return; }
          setView(next); setSelectionResult("");
        }} />
        <div className="mg-layout-preview" data-view={view} aria-hidden="true">{["a", "b", "c", "d", "e", "f"].map(id => <span key={id} />)}</div>
      </div>
      <div className="mg-card-actions"><Toggle pressed={locked} onPressedChange={setLocked} aria-label="Lock motion layout selection"><LiquidMorphIcon pair="lock-unlock" active={!locked} size={18} />Lock selection</Toggle>
        <output aria-live="polite">{selectionResult || `${titleCase(view ?? "list")} selected`}</output></div>
    </MotionCard>

    <MotionCard title="Open a closer view." description="The SDK owns dismissal, focus and return.">
      <div className="mg-demo-stage"><Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger className="mg-detail-trigger" aria-label="Open material study details"><LiquidIcon name="layers" size={62} /><span><strong>Material study</strong><span>Open details</span></span><ArrowUpRight size={18} aria-hidden="true" /></DialogTrigger>
        <DialogBackdrop />
        <DialogContent className="mg-detail-dialog" data-liquid-glass>
          <LiquidMotion transitionKey={dialogOpen ? "open" : "closed"} recipe="scale">
            <div className="mg-detail-art"><LiquidIcon name="layers" size={116} /></div>
            <DialogTitle>Material study details</DialogTitle>
            <DialogDescription>Original Quantive artwork, carried into a focused view.</DialogDescription>
            <dl className="mg-detail-facts"><div><dt>Collection</dt><dd>Material system</dd></div><div><dt>Status</dt><dd>Ready for review</dd></div><div><dt>Motion</dt><dd>Finite reveal</dd></div></dl>
            <div className="mg-card-actions"><ValidationBadge /><DialogClose>Close material details</DialogClose></div>
          </LiquidMotion>
        </DialogContent>
      </Dialog></div>
      <p className="mg-caption">Open the study, then return to the same control.</p>
    </MotionCard>

    <MotionCard title="Make changes traceable." description="Add, remove and reorder stable items.">
      <div className="mg-list-stage"><LiquidMotionList label="Motion study collection" items={rows.map(row => ({ id: row.id, content: <div className="mg-list-row"><LiquidIcon name={row.icon} size={28} /><span>{row.label}</span></div> }))} /></div>
      <div className="mg-card-actions mg-wrap"><Button disabled={rows.length >= 6} onClick={() => { const id = ++rowSequence.current; setRows(current => [...current, { id: `new-${id}`, label: `New study ${id}`, icon: "sparkles" }]); }}><LiquidIcon name="plus" size={17} />Add study</Button>
        <Button disabled={rows.length === 0} onClick={() => setRows(current => current.slice(0, -1))}>Remove last study</Button>
        <Button disabled={rows.length < 2} onClick={() => setRows(current => [...current].reverse())}>Reverse studies</Button></div>
      <output className="mg-caption" data-motion-row-count={rows.length}>{rows.length} studies</output>
    </MotionCard>

    <MotionCard title="Arrive. Leave. Return." description="Presence follows the same controlled value.">
      <div className="mg-demo-stage mg-presence-stage"><LiquidPresence present={visible} recipe="slide" restoreFocusRef={focusReturn}>
        <div className="mg-notice"><LiquidIcon name="check" size={32} /><span><strong>Your study is ready</strong><span>Saved in this local preview</span></span></div>
      </LiquidPresence></div>
      <div className="mg-card-actions"><Toggle ref={focusReturn} aria-label="Show motion notice" pressed={visible} onPressedChange={setVisible}><LiquidMorphIcon pair="eye-hidden" active={!visible} size={19} />Show notice</Toggle><span className="mg-caption">{visible ? "Visible" : "Hidden"}</span></div>
    </MotionCard>

    <MotionCard title="Let the value lead." description="Numbers and labels resolve to real values.">
      <div className="mg-metrics"><div><span>Processed records</span><LiquidMotionNumber value={total} label="Processed records" format={value => Math.round(value).toLocaleString("en-AU")} /></div>
        <LiquidTextTransition text={progress === 100 ? "Batch complete" : "Preparing the next batch"} /></div>
      <Progress value={progress} className="mg-progress"><ProgressLabel>Sample batch progress</ProgressLabel><ProgressValue /><ProgressTrack><ProgressIndicator /></ProgressTrack></Progress>
      <div className="mg-card-actions"><Button onClick={() => { setTotal(value => value + 32); setProgress(value => value === 100 ? 25 : value + 25); }}>Advance sample batch</Button></div>
    </MotionCard>

    <MotionCard title="Give selection depth." description="The artwork moves. The target stays still.">
      <div className="mg-depth-grid">{(["layers", "folder", "grid"] as LiquidIconName[]).map(name => <Toggle key={name} className="mg-depth-choice" pressed={depth === name} aria-label={`Select ${name} study`} onPressedChange={(next, details) => {
        if (!next) { details.cancel(); return; } setDepth(name);
      }}><LiquidDepth active={depth === name}><LiquidIcon name={name} size={68} /></LiquidDepth><span>{titleCase(name)}</span></Toggle>)}</div>
      <output className="mg-caption">{titleCase(depth)} selected</output>
    </MotionCard>
  </div>;
}

type WorkPhase = "idle" | "pending" | "success" | "error" | "cancelled";
type WorkEvent = { id: string; label: string; state: "working" | "complete" | "error" };

function AgentWorkStudy({ active, stateExample }: { active: boolean; stateExample?: ReactNode }) {
  const [phase, setPhase] = useState<WorkPhase>("idle");
  const [outcome, setOutcome] = useState<"success" | "error">("success");
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [artifact, setArtifact] = useState<string | null>(null);
  const { preset, mode, effective } = useLiquidMotionPolicy();
  const generation = useRef(0);
  const pending = useRef<{ timers: ReturnType<typeof setTimeout>[]; resolve: () => void } | null>(null);
  const cancel = (announce = true) => {
    generation.current += 1;
    const previous = pending.current;
    if (!previous) return;
    previous.timers.forEach(clearTimeout); previous.resolve(); pending.current = null;
    if (announce) { setArtifact(null); setPhase("cancelled"); setEvents(current => current.map(item => item.state === "working" ? { ...item, label: "Run cancelled", state: "error" } : item)); }
  };
  useEffect(() => { if (!active) cancel(); }, [active]);
  useEffect(() => () => cancel(false), []);

  const run = (result: "success" | "error") => {
    if (pending.current || !active) return;
    const id = ++generation.current;
    setArtifact(null); setPhase("pending"); setProgress(0);
    setEvents([{ id: `${id}-inspect`, label: "Inspecting local fixture", state: "working" }]);
    return new Promise<void>((resolve, reject) => {
      const schedule = (ms: number, effect: () => void) => setTimeout(() => { if (generation.current === id) effect(); }, ms);
      pending.current = { resolve, timers: [
        schedule(500, () => { setProgress(34); setEvents([{ id: `${id}-inspect`, label: "Context inspected", state: "complete" }, { id: `${id}-prepare`, label: "Preparing sample artifact", state: "working" }]); }),
        schedule(1100, () => { setProgress(67); setEvents([{ id: `${id}-inspect`, label: "Context inspected", state: "complete" }, { id: `${id}-prepare`, label: "Sample artifact prepared", state: "complete" }, { id: `${id}-verify`, label: "Checking the local result", state: "working" }]); }),
        schedule(1800, () => {
          pending.current = null; setPhase(result);
          if (result === "success") {
            const requests: { intent: LiquidMotionIntent; target: string }[] = [
              { intent: "state", target: "playback" },
              { intent: "continuity", target: "list" },
              { intent: "presence", target: "dialog" },
              { intent: "progress", target: "number" },
              { intent: "feedback", target: "async-action" },
            ];
            setArtifact(JSON.stringify({
              schemaVersion: 1,
              kind: "quantive-motion-plan",
              name: "Material study",
              source: "local-motion-fixture",
              registry: { schemaVersion: liquidMotionRegistry.schemaVersion, recipeCount: liquidMotionRecipes.length },
              policyAtRunStart: { preset, mode, effective },
              steps: requests.map(request => ({ ...request, ...selectLiquidMotionRecipe({ ...request, reducedMotion: effective !== "enabled" }) })),
            }, null, 2));
            setProgress(100);
          } else setArtifact(null);
          setEvents(current => current.map(item => item.id === `${id}-verify` ? { ...item, label: result === "success" ? "Local result ready" : "Fixture check failed", state: result === "success" ? "complete" : "error" } : item));
          if (result === "success") resolve(); else reject(new Error("The selected local failure fixture completed. Retry is available."));
        }),
      ] };
    });
  };
  const phaseText: Record<WorkPhase, string> = {
    idle: "Ready for a local run", pending: "Preparing your artifact", success: "Artifact ready", error: "A check needs another pass", cancelled: "Run cancelled",
  };
  return <div className="mg-work-layout">
    <div className="mg-local-note"><LiquidIcon name="code" size={22} /><span><strong>Local fixture</strong> Real component state. No model, upload or external tool is called.</span></div>
    <MotionCard title="Make progress understandable." className="mg-work-card">
      <div className="mg-work-header"><div><span className="mg-kicker">Material study / 01</span><LiquidTextTransition text={phaseText[phase]} /></div>
        <LiquidMotionFeedback status={phase === "cancelled" ? "idle" : phase} label={`Sample run ${phase}`} />
      </div>
      <Progress value={progress} className="mg-progress"><ProgressLabel>Local fixture progress</ProgressLabel><ProgressValue /><ProgressTrack><ProgressIndicator /></ProgressTrack></Progress>
      <div className="mg-work-events"><LiquidMotionList label="Local fixture events" items={events.map(event => ({ id: event.id, content: <div className="mg-event" data-event-state={event.state}>
        <span className="mg-event-marker" aria-hidden="true">{event.state === "complete" ? "✓" : event.state === "error" ? "!" : "·"}</span><span>{event.label}</span>
      </div> }))} />{events.length === 0 && <p>Start a run to follow each step.</p>}</div>
      <div className="mg-card-actions mg-wrap">
        <Button disabled={!active} data-variant="primary" pendingAnnouncement="The local sample is running" onClick={() => run(outcome)}><LiquidIcon name="sparkles" size={22} />Run local sample</Button>
        <Button disabled={phase !== "pending"} onClick={() => cancel()}>Cancel local sample</Button>
        {phase === "error" && <Button pendingAnnouncement="Retrying the local sample" onClick={() => run("success")}>Retry local sample</Button>}
        {phase === "success" && artifact && <Button data-motion-artifact="material-study" render={<a href={`data:application/json;charset=utf-8,${encodeURIComponent(artifact)}`} download="material-study.json" />}>Download sample artifact</Button>}
      </div>
      <output className="mg-work-status" aria-live="polite" data-sample-phase={phase}>{phase === "success" ? "The local fixture produced material-study.json." : phase === "error" ? "The failure is intentional. Retry runs the success fixture." : phase === "cancelled" ? "Pending work was stopped. Its later callbacks cannot replace this state." : ""}</output>
    </MotionCard>
    <MotionCard title="Choose the outcome." className="mg-work-settings">
      <SegmentedControl aria-label="Local sample outcome" value={outcome} disabled={phase === "pending"} onValueChange={(next, details) => {
        if (next !== "success" && next !== "error") { details.cancel(); return; } setOutcome(next);
      }}><MotionSelectionIndicator /><SegmentedControlItem value="success">Success</SegmentedControlItem><SegmentedControlItem value="error">Error</SegmentedControlItem></SegmentedControl>
      <dl className="mg-work-rules"><div><dt>Started</dt><dd>Show pending while work is running.</dd></div><div><dt>Accepted</dt><dd>Show success after the result arrives.</dd></div><div><dt>Interrupted</dt><dd>Cancel stale work and preserve the latest state.</dd></div></dl>
      <p className="mg-caption">Every action uses the page’s existing SDK bridge.</p>
    </MotionCard>
    {stateExample && <div className="mg-state-example">{stateExample}</div>}
  </div>;
}

const decisions = [
  ["An action changes state", "Icon morph", "play-pause · menu-close · bookmark-saved"],
  ["A selection moves", "Shared indicator", "Tabs, segmented choices and navigation"],
  ["Content arrives or leaves", "Presence", "A short reveal with an accessible final state"],
  ["A collection changes", "List motion", "Stable IDs; one owner for layout animation"],
  ["A value changes", "Number or text transition", "Expose the actual value immediately"],
  ["Work takes time", "Feedback", "Pending, accepted result, cancellation and retry"],
  ["A surface needs emphasis", "Depth", "Move decoration inside a fixed hit target"],
];
const sources = [
  { name: "useAnimations", url: "https://useanimations.com/" }, { name: "Lucide Animated", url: "https://lucide-animated.com/" },
  { name: "PulsoIcon", url: "https://github.com/CityPulso/PulsoIcon-Package" }, { name: "ItsHover", url: "https://itshover.com/" },
  { name: "Animate UI", url: "https://animate-ui.com/" }, { name: "Motion", url: "https://motion.dev/" },
  { name: "Motion Primitives", url: "https://motion-primitives.com/" }, { name: "AutoAnimate", url: "https://auto-animate.formkit.com/" },
  { name: "Flubber", url: "https://github.com/veltman/flubber" }, { name: "Rive", url: "https://rive.app/" },
  { name: "Glyphrise", url: "https://glyphrise.vercel.app/" },
];

function MotionRecipes() {
  const [copied, setCopied] = useState("");
  const [intent, setIntent] = useState<LiquidMotionIntent>("state");
  const [target, setTarget] = useState("playback");
  const [meaningfulChange, setMeaningfulChange] = useState(true);
  const [frequent, setFrequent] = useState(false);
  const { effective } = useLiquidMotionPolicy();
  const targets = Array.from(new Set(liquidMotionRecipes.filter(recipe => recipe.intent === intent).flatMap(recipe => recipe.targets)));
  const choice = selectLiquidMotionRecipe({ intent, target, meaningfulChange, frequent, reducedMotion: effective !== "enabled" });
  const copy = async (text: string, success: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(success); }
    catch { setCopied("Clipboard unavailable. Select the example below to copy it."); }
  };
  const agentBrief = {
    objective: "Compose state-driven motion using the existing Quantive components and UI SDK bridge.",
    import: "@quantitative-hci/liquid-glass/motion", stylesheet: "@quantitative-hci/liquid-glass/motion.css",
    registry: liquidMotionRegistry,
    selection: { intent, target, meaningfulChange, frequent, effectiveMotion: effective, result: choice },
    rules: ["Business state owns the outcome", "Keep controls named and cancellable", "Honor effective motion preferences", "Retarget interrupted motion", "No independent mutation endpoint"],
    contracts: "/agent-index.json", example: motionRecipeSource,
  };
  return <div className="mg-recipes">
    <MotionCard title="What should move?" description={`${liquidMotionRecipes.length} recipe records. One shared selection function.`}>
      <div className="mg-recipe-chooser">
        <MotionChoice label="Motion purpose" value={intent} options={[
          { value: "state", label: "State change" }, { value: "continuity", label: "Keep continuity" },
          { value: "presence", label: "Show or hide" }, { value: "progress", label: "Value change" },
          { value: "feedback", label: "Work feedback" }, { value: "attention", label: "Draw attention" },
        ]} onChange={value => {
          const next = value as LiquidMotionIntent;
          setIntent(next);
          setTarget(liquidMotionRecipes.find(recipe => recipe.intent === next)?.targets[0] ?? "");
        }} />
        <MotionChoice label="Motion target" value={target} options={targets.map(value => ({ value, label: titleCase(value.replaceAll("-", " ")) }))} onChange={setTarget} />
        <Toggle aria-label="Explain accepted change" pressed={meaningfulChange} onPressedChange={setMeaningfulChange}>Accepted change</Toggle>
        <Toggle aria-label="Frequent motion" pressed={frequent} onPressedChange={setFrequent}>Repeats often</Toggle>
      </div>
      <div className="mg-recipe-result" data-recipe-id={choice.recipe?.id ?? "none"} data-recipe-presentation={choice.presentation}>
        <div><span className="mg-kicker">{choice.presentation === "animate" ? "Animate" : choice.presentation === "instant" ? "Show endpoint" : "Keep still"}</span>
          <h4>{choice.recipe?.title ?? "No motion needed"}</h4><p>{choice.reason}</p></div>
        {choice.recipe && <dl><div><dt>Component</dt><dd>{choice.recipe.component}</dd></div><div><dt>Use</dt><dd>{choice.recipe.implementation === "host-adapter" ? "Supply an external runtime" : choice.recipe.implementation === "existing-sdk" ? "Existing SDK behaviour" : "Native motion"}</dd></div></dl>}
      </div>
    </MotionCard>
    <MotionCard title="Choose by purpose." description="A small decision table for people and agents.">
      <div className="mg-table-scroll"><table className="mg-recipe-table"><thead><tr><th>When</th><th>Use</th><th>Keep</th></tr></thead><tbody>
        {decisions.map(([when, use, keep]) => <tr key={when}><td>{when}</td><td>{use}</td><td>{keep}</td></tr>)}
      </tbody></table></div>
    </MotionCard>
    <MotionCard title="Use this in a project.">
      <div className="mg-card-actions mg-wrap"><Button onClick={() => copy(motionRecipeSource, "Motion example copied.")}><LiquidIcon name="copy" size={19} />Copy motion example</Button>
        <Button onClick={() => copy(JSON.stringify(agentBrief, null, 2), "Motion agent brief copied.")}>Copy motion agent brief</Button>
        <Button render={<a href="/agent-index.json" target="_blank" rel="noreferrer" />}>Agent contracts</Button></div>
      <output className="mg-caption" aria-live="polite">{copied}</output>
      <Collapsible><CollapsibleTrigger>Read the compiled example</CollapsibleTrigger><CollapsiblePanel><pre className="mg-source" tabIndex={0} aria-label="Motion system example source"><code>{motionRecipeSource}</code></pre></CollapsiblePanel></Collapsible>
    </MotionCard>
    <MotionCard title="Source studies." description="Eleven libraries informed this native layer.">
      <div className="mg-source-links">{sources.map(source => <Button key={source.name} render={<a href={source.url} target="_blank" rel="noreferrer" />}>{source.name}<ArrowUpRight size={16} aria-hidden="true" /></Button>)}</div>
      <p className="mg-caption">Original Quantive implementations. Rive authoring, arbitrary SVG extrusion and full timeline editors remain separate capabilities.</p>
    </MotionCard>
  </div>;
}

export function MotionShowcase({ active = true, stateExample }: { active?: boolean; stateExample?: ReactNode }) {
  const [section, setSection] = useState<GallerySection>("icons");
  const [preset, setPreset] = useState<MotionPreset>("responsive");
  const [mode, setMode] = useState<MotionMode>("system");
  return <LiquidMotionProvider preset={preset} mode={mode}>
    <div className="motion-gallery" data-kit-view="motion" data-validation="unvalidated" data-motion-section={section}>
      <header className="mg-intro"><div><p className="mg-kicker">Motion</p><h2>Every change has a shape.</h2></div><ValidationBadge /></header>
      <div className="mg-toolbar">
        <SegmentedControl className="mg-section-nav" aria-label="Motion study category" value={section} onValueChange={(next, details) => {
          if (!sections.some(item => item.id === next)) { details.cancel(); return; } setSection(next as GallerySection);
        }}><MotionSelectionIndicator />{sections.map(item => <SegmentedControlItem key={item.id} value={item.id}>{item.label}</SegmentedControlItem>)}</SegmentedControl>
        <div className="mg-toolbar-settings"><MotionChoice label="Motion character" value={preset} options={[{ value: "calm", label: "Calm" }, { value: "responsive", label: "Responsive" }, { value: "expressive", label: "Expressive" }]} onChange={value => setPreset(value as MotionPreset)} />
          <MotionChoice label="Motion preference" value={mode} options={[{ value: "system", label: "Follow device" }, { value: "reduced", label: "Reduced" }, { value: "off", label: "Off" }]} onChange={value => setMode(value as MotionMode)} /></div>
      </div>
      <div className="mg-overview-line"><span>{section === "icons" ? "10 morph pairs · 17 icon names · 9 effects" : section === "interface" ? "Selection, surfaces, collections and values" : section === "work" ? "Progress, interruption and recovery" : "Selection rules and source examples"}</span><MotionPolicyNote /></div>
      {section === "icons" && <IconStudies />}
      {section === "interface" && <InterfaceStudies />}
      {section === "work" && <AgentWorkStudy active={active} stateExample={stateExample} />}
      {section === "recipes" && <MotionRecipes />}
    </div>
  </LiquidMotionProvider>;
}

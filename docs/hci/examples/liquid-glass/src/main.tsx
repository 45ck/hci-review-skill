import { createRoot } from "react-dom/client";
import { Component, lazy, Suspense, useMemo, useState } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import {
  Code2,
  Copy,
  ExternalLink,
  Layers3,
  RotateCcw,
  Search,
  Settings2,
} from "lucide-react";
import { Button } from "@ui-sdk/react/button";
import { Input, InputClear, InputGroup } from "@ui-sdk/react/input";
import {
  Listbox,
  ListboxItem,
  ListboxItemIndicator,
} from "@ui-sdk/react/listbox";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@ui-sdk/react/dialog";
import {
  Slider,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
  SliderValue,
} from "@ui-sdk/react/slider";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Toggle } from "@ui-sdk/react/toggle";
import { GlassProvider, useGlass } from "@quantitative-hci/liquid-glass";
import { AgentInspector } from "./agent-inspector";
import { hasWebMcp } from "./agent-bridge";
import { inputDemos } from "./demos-inputs";
import { surfaceDemos } from "./demos-surfaces";
import manifest from "../../../../../packages/liquid-glass/component-manifest.json";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/styles.css";
import "./sdk-layout.css";
import "./gallery.css";

const ReferenceLens = lazy(() =>
  import("./reference-lens").then((module) => ({
    default: module.ReferenceLens,
  })),
);

const demos: Record<string, ComponentType> = { ...inputDemos, ...surfaceDemos };
const categories = [
  ...new Set(manifest.components.map((item) => item.category)),
];
const hints: Record<string, string> = {
  button:
    "Compare primary, secondary and disabled actions. Activate the working button and check its result.",
  input:
    "Edit the field. The visible value and the agent snapshot should agree.",
  switch:
    "Change Ambient light. The locked setting should stay unavailable to people and agents.",
  select:
    "Open the choices with the keyboard, or ask the agent to query them and set a value.",
  slider:
    "Focus the slider and use the arrow keys. Its value should also be available to the agent.",
  dialog:
    "Open the dialog, then press Escape. Focus should return to the trigger.",
  "alert-dialog":
    "Open the confirmation. A final action should be distinguishable from opening or cancelling.",
  "password-input":
    "Enter a sample password. The agent snapshot must redact its value.",
  field:
    "Compare valid and invalid fields. Errors must remain visible in both surface treatments.",
  tabs: "Use the arrow keys to move between tabs. Inspect the selected value and available choices.",
};

class SpecimenBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, details: ErrorInfo) {
    console.error(`Specimen ${this.props.name}:`, error, details);
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="demo-error">
        This specimen could not load. Reset it to retry.
      </p>
    ) : (
      this.props.children
    );
  }
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="workbench-choice">
      <Select
        value={value}
        items={options}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
      >
        <SelectLabel>{label}</SelectLabel>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MaterialControls() {
  const {
    preferences,
    update,
    reset,
    reducedTransparency,
    reducedMotion,
    highContrast,
  } = useGlass();
  return (
    <div className="material-controls">
      <Choice
        label="Appearance"
        value={preferences.theme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
        onChange={(value) =>
          update({ theme: value as typeof preferences.theme })
        }
      />
      <Choice
        label="Frosted material"
        value={preferences.material}
        options={[
          { value: "regular", label: "Regular" },
          { value: "clear", label: "Clear" },
          { value: "solid", label: "Solid" },
        ]}
        onChange={(value) =>
          update({ material: value as typeof preferences.material })
        }
      />
      <div className="setting-range">
        <Slider
          aria-label="Frost amount"
          min={0}
          max={32}
          value={preferences.blur}
          onValueChange={(value) => update({ blur: Number(value) })}
        >
          <div className="setting-label">
            Frost{" "}
            <span>
              <SliderValue /> px
            </span>
          </div>
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label="Frost amount" />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </div>
      <div className="setting-range">
        <Slider
          aria-label="Colour saturation"
          min={100}
          max={200}
          value={preferences.saturation}
          onValueChange={(value) => update({ saturation: Number(value) })}
        >
          <div className="setting-label">
            Saturation{" "}
            <span>
              <SliderValue />%
            </span>
          </div>
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label="Colour saturation" />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </div>
      <label className="setting-toggle">
        Reduce motion
        <Switch
          checked={preferences.reduceMotion}
          onCheckedChange={(value) => update({ reduceMotion: value })}
        >
          <SwitchThumb />
        </Switch>
      </label>
      <label className="setting-toggle">
        Increase contrast
        <Switch
          checked={preferences.increaseContrast}
          onCheckedChange={(value) => update({ increaseContrast: value })}
        >
          <SwitchThumb />
        </Switch>
      </label>
      {(reducedTransparency || reducedMotion || highContrast) && (
        <p className="demo-muted">
          System accessibility preferences also apply.
        </p>
      )}
      <Button onClick={reset}>Reset appearance preferences</Button>
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("button");
  const [view, setView] = useState("components");
  const [frosted, setFrosted] = useState(false);
  const [inspecting, setInspecting] = useState(true);
  const [revision, setRevision] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const filtered = useMemo(
    () =>
      manifest.components.filter(
        (item) =>
          (category === "all" || item.category === category) &&
          `${item.name} ${item.id}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [query, category],
  );
  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0];
  const Demo = selected ? demos[selected.id] : null;
  const importLine = selected
    ? `import { ${selected.name.replaceAll(" ", "")} } from "@ui-sdk/react/${selected.id}";`
    : "";
  const copyImport = async () => {
    try {
      await navigator.clipboard.writeText(importLine);
      setCopyMessage("Import copied.");
    } catch {
      setCopyMessage("Select the import text below to copy it.");
    }
  };
  return (
    <GlassProvider enabled={frosted && view === "components"}>
      <a className="skip-link" href="#workbench-main">
        Skip to component preview
      </a>
      <header className="workbench-header">
        <div className="workbench-brand">
          <span className="brand-symbol" aria-hidden="true">
            <Layers3 size={21} />
          </span>
          <div>
            <strong>Quantitative HCI</strong>
            <span>UI SDK workbench</span>
          </div>
        </div>
        <SegmentedControl
          aria-label="Workbench view"
          value={view}
          onValueChange={(value) => {
            if (value) setView(value);
          }}
        >
          <SegmentedControlIndicator />
          <SegmentedControlItem value="components">
            Components
          </SegmentedControlItem>
          <SegmentedControlItem value="refraction">
            Video refraction
          </SegmentedControlItem>
        </SegmentedControl>
        <a
          className="source-link"
          href="https://github.com/vercel-labs/ui"
          target="_blank"
          rel="noreferrer"
        >
          UI SDK <ExternalLink size={14} aria-hidden="true" />
        </a>
      </header>
      <div
        className={`workbench-layout ${view === "refraction" ? "is-reference" : ""} ${inspecting ? "with-inspector" : ""}`}
      >
        {view === "components" && (
          <aside className="catalogue" aria-label="Component library">
            <div className="catalogue-heading">
              <h2>Components</h2>
              <span>{manifest.components.length}</span>
            </div>
            <InputGroup className="catalogue-search">
              <Search size={16} aria-hidden="true" />
              <Input
                aria-label="Search components"
                type="search"
                placeholder="Find a component…"
                value={query}
                onValueChange={setQuery}
              />
              <InputClear aria-label="Clear component search" />
            </InputGroup>
            <Choice
              label="Component category"
              value={category}
              options={[
                { value: "all", label: "All categories" },
                ...categories.map((value) => ({ value, label: value })),
              ]}
              onChange={setCategory}
            />
            <Listbox
              aria-label="Component catalogue"
              className="catalogue-list"
              value={selected?.id ?? null}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setSelectedId(value);
                  setCopyMessage("");
                }
              }}
            >
              {filtered.map((item) => (
                <ListboxItem
                  key={item.id}
                  value={item.id}
                  data-catalogue-id={item.id}
                >
                  <span>{item.name}</span>
                  <ListboxItemIndicator />
                </ListboxItem>
              ))}
            </Listbox>
            <p className="catalogue-footnote">
              {filtered.length} of {manifest.components.length} families · SDK{" "}
              {manifest.sdkVersion}
            </p>
          </aside>
        )}
        <main id="workbench-main" className="workbench-main" tabIndex={-1}>
          {view === "components" ? (
            <>
              <div className="workbench-intro">
                <div>
                  <p className="eyebrow">Component behaviour</p>
                  <h1>One component. Its actual state.</h1>
                  <p>
                    Try the control, inspect its choices, and compare the same
                    behaviour with an optional frosted surface.
                  </p>
                </div>
              </div>
              <div className="preview-toolbar">
                <SegmentedControl
                  aria-label="Preview appearance"
                  value={frosted ? "frosted" : "sdk"}
                  onValueChange={(value) => setFrosted(value === "frosted")}
                >
                  <SegmentedControlIndicator />
                  <SegmentedControlItem value="sdk">
                    UI SDK default
                  </SegmentedControlItem>
                  <SegmentedControlItem value="frosted">
                    Frosted CSS
                  </SegmentedControlItem>
                </SegmentedControl>
                <div className="toolbar-actions">
                  <Toggle pressed={inspecting} onPressedChange={setInspecting}>
                    <Code2 size={15} aria-hidden="true" /> Inspect agent state
                  </Toggle>
                  {frosted && (
                    <Dialog>
                      <DialogTrigger>
                        <Settings2 size={15} aria-hidden="true" /> Appearance
                        settings
                      </DialogTrigger>
                      <DialogContent className="appearance-dialog">
                        <DialogTitle>Frosted appearance settings</DialogTitle>
                        <DialogDescription>
                          This changes tint and blur. The WebGPU lens from the
                          video is in Video refraction.
                        </DialogDescription>
                        <MaterialControls />
                        <DialogClose>Done</DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              {selected && Demo ? (
                <article
                  className="component-card"
                  data-component-id={selected.id}
                >
                  <div className="component-heading">
                    <div>
                      <p className="eyebrow">{selected.category}</p>
                      <h2>{selected.name}</h2>
                    </div>
                    <Button onClick={() => setRevision((value) => value + 1)}>
                      <RotateCcw size={14} aria-hidden="true" /> Restart
                      selected demo
                    </Button>
                  </div>
                  <p className="component-instruction">
                    {hints[selected.id] ??
                      "Interact with the specimen using its controls and keyboard. Inspect the state and actions exposed by the SDK."}
                  </p>
                  <div
                    className={`component-stage ${frosted ? "frosted-stage" : ""}`}
                  >
                    <SpecimenBoundary
                      key={`${selected.id}-${revision}`}
                      name={selected.name}
                    >
                      <Demo />
                    </SpecimenBoundary>
                  </div>
                  <div className="component-import">
                    <code>{importLine}</code>
                    <Button
                      aria-label="Copy component import"
                      onClick={copyImport}
                    >
                      <Copy size={15} aria-hidden="true" />
                    </Button>
                  </div>
                  {copyMessage && (
                    <p role="status" className="copy-result">
                      {copyMessage}
                    </p>
                  )}
                </article>
              ) : (
                <div className="empty-search">
                  <h2>No matching components</h2>
                  <p>Try another name or category.</p>
                  <Button
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                    }}
                  >
                    Clear catalogue filters
                  </Button>
                </div>
              )}
              <div className="material-explanation">
                <strong>
                  {frosted ? "Frosted CSS comparison" : "The upstream baseline"}
                </strong>
                <p>
                  {frosted
                    ? "Tint, blur and highlights are applied to real SDK controls. This is a CSS appearance experiment, not the refractive technique in the video."
                    : "Components use UI SDK behaviour and its default stylesheet. Names, values, choices and actions are exposed through the same runtime used by the agent."}
                </p>
              </div>
            </>
          ) : (
            <Suspense
              fallback={<p role="status">Loading the reference lens…</p>}
            >
              <ReferenceLens />
            </Suspense>
          )}
          <footer className="workbench-footer">
            <span>
              {hasWebMcp
                ? "Browser tool API detected"
                : "Local agent bridge active · browser tools unavailable"}
            </span>
            <span>Changes stay in this demonstration.</span>
          </footer>
        </main>
        {inspecting && (
          <aside className="agent-panel" aria-label="Agent inspector">
            <div className="agent-panel-heading">
              <span className="live-dot" />
              <h2>Agent view</h2>
            </div>
            <p className="agent-panel-description">
              Live state from UI SDK. This is what an agent can read and act on.
            </p>
            <AgentInspector
              refreshKey={`${view}-${selected?.id}-${revision}-${frosted}`}
            />
          </aside>
        )}
      </div>
    </GlassProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

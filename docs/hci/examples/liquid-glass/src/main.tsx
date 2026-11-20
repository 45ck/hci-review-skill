import {
  Component,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bell,
  Bookmark,
  Check,
  Code2,
  Copy,
  Folder,
  Grid2X2,
  Layers3,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Listbox, ListboxItem } from "@ui-sdk/react/listbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Toggle } from "@ui-sdk/react/toggle";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@ui-sdk/react/popover";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import {
  LiquidGlassProvider,
  useLiquidGlass,
} from "@quantitative-hci/liquid-glass/webgpu";
import { inputDemos } from "./demos-inputs";
import { surfaceDemos } from "./demos-surfaces";
import { KitBackdrop, type BackdropName } from "./kit-backdrop";
import starterSource from "./starter-template.tsx?raw";
import manifest from "../../../../../packages/liquid-glass/component-manifest.json";
import "./agent-bridge";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "./sdk-layout.css";
import "./gallery.css";

const demos: Record<string, ComponentType> = { ...inputDemos, ...surfaceDemos };
const groups = [...new Set(manifest.components.map((item) => item.category))];
const accessOptions = [
  { value: "private", label: "Private" },
  { value: "team", label: "Team" },
  { value: "public", label: "Public" },
];
const backdropOptions = [
  { value: "coast", label: "Coast" },
  { value: "dawn", label: "Dawn" },
  { value: "grid", label: "Grid" },
];

class SpecimenBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(this.props.name, error, info);
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="demo-error">
        This component could not load. Try restarting it.
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
    <div className="kit-choice">
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

function Range({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Slider
      aria-label={label}
      min={min}
      max={max}
      value={value}
      onValueChange={(next) => onChange(Number(next))}
    >
      <div className="kit-range-label">
        <span>{label}</span>
        <SliderValue />
      </div>
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          <SliderThumb aria-label={label} />
        </SliderTrack>
      </SliderControl>
    </Slider>
  );
}

function Panel({
  title,
  children,
  probe,
  className = "",
}: {
  title: string;
  children: ReactNode;
  probe?: string;
  className?: string;
}) {
  return (
    <section
      className={"kit-panel " + className}
      data-liquid-glass=""
      data-liquid-kind="panel"
      data-optics-probe={probe}
    >
      <h2>{title}</h2>
      <div className="kit-panel-body">{children}</div>
    </section>
  );
}

function Overview() {
  const [projectName, setProjectName] = useState("Coastal studio");
  const [access, setAccess] = useState("private");
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(64);
  const [workspace, setWorkspace] = useState("files");
  const [createdProject, setCreatedProject] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionResult, setCollectionResult] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [menuResult, setMenuResult] = useState("");
  const CheckboxDemo = demos.checkbox;
  const RadioDemo = demos.radio;
  const ToastDemo = demos.toast;
  return (
    <div className="kit-overview" data-kit-view="overview">
      <Panel title="Buttons" probe="panel" className="kit-actions-panel">
        <div className="kit-button-row">
          <Button
            data-optics-probe="button"
            onClick={() =>
              setCreatedProject(projectName.trim() || "Untitled project")
            }
          >
            <Plus size={18} aria-hidden="true" />
            Create project
          </Button>
        </div>
        <div className="kit-button-row">
          <Button
            data-variant="solid"
            onClick={() => setMenuResult("Library opened")}
          >
            <Folder size={17} aria-hidden="true" />
            Open library
          </Button>
          <Button disabled>Unavailable</Button>
        </div>
        <div className="kit-button-row">
          <Toggle aria-label="Bookmark project">
            <Bookmark size={18} aria-hidden="true" />
          </Toggle>
          <Toggle aria-label="Favourite project">
            <Sparkles size={18} aria-hidden="true" />
          </Toggle>
          <Button
            aria-label="Duplicate project"
            onClick={() => setCreatedProject(projectName + " copy")}
          >
            <Copy size={18} aria-hidden="true" />
          </Button>
        </div>
        <output aria-label="Project result" className="kit-result">
          {createdProject ? "Created " + createdProject : ""}
        </output>
      </Panel>
      <Panel title="Inputs">
        <Field>
          <FieldLabel>Project name</FieldLabel>
          <Input
            data-optics-probe="input"
            value={projectName}
            onValueChange={setProjectName}
          />
        </Field>
        <Choice
          label="Project access"
          value={access}
          options={accessOptions}
          onChange={setAccess}
        />
      </Panel>
      <Panel title="Preferences">
        <div className="kit-setting-row">
          <span>
            <Bell size={17} aria-hidden="true" />
            Notifications
          </span>
          <Switch
            aria-label="Notifications"
            checked={notifications}
            onCheckedChange={setNotifications}
          >
            <SwitchThumb />
          </Switch>
        </div>
        <div className="kit-setting-row">
          <span>
            <Volume2 size={17} aria-hidden="true" />
            Sound
          </span>
          <Switch aria-label="Sound" checked={sound} onCheckedChange={setSound}>
            <SwitchThumb />
          </Switch>
        </div>
        <Range label="Volume" value={volume} onChange={setVolume} />
      </Panel>
      <Panel title="Navigation">
        <SegmentedControl
          aria-label="Workspace view"
          value={workspace}
          onValueChange={(value) => {
            if (typeof value === "string") setWorkspace(value);
          }}
        >
          <SegmentedControlItem value="files">Files</SegmentedControlItem>
          <SegmentedControlItem value="activity">Activity</SegmentedControlItem>
          <SegmentedControlItem value="settings">Settings</SegmentedControlItem>
        </SegmentedControl>
        <div className="kit-navigation-content" aria-live="polite">
          {workspace === "files" ? (
            <>
              <div>
                <Folder size={20} aria-hidden="true" />
                <span>Components</span>
                <span>55</span>
              </div>
              <div>
                <Layers3 size={20} aria-hidden="true" />
                <span>Templates</span>
                <span>1</span>
              </div>
              <div>
                <Grid2X2 size={20} aria-hidden="true" />
                <span>Assets</span>
                <span>3</span>
              </div>
            </>
          ) : workspace === "activity" ? (
            <div>
              <Activity size={20} aria-hidden="true" />
              <span>No recent changes</span>
            </div>
          ) : (
            <div>
              <Settings2 size={20} aria-hidden="true" />
              <span>Workspace preferences</span>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Overlays">
        <div className="kit-button-row">
          <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
            <DialogTrigger>
              <Plus size={18} aria-hidden="true" />
              New collection
            </DialogTrigger>
            <DialogBackdrop />
            <DialogContent className="kit-create-dialog">
              <DialogTitle>Create a collection</DialogTitle>
              <DialogDescription>
                Give your collection a name.
              </DialogDescription>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!collectionName.trim()) {
                    setCollectionError("Enter a collection name.");
                    return;
                  }
                  setCollectionResult("Created " + collectionName.trim());
                  setCollectionError("");
                  setCollectionOpen(false);
                }}
              >
                <Field invalid={Boolean(collectionError)}>
                  <FieldLabel>Collection name</FieldLabel>
                  <Input
                    value={collectionName}
                    onValueChange={(value) => {
                      setCollectionName(value);
                      setCollectionError("");
                    }}
                    aria-invalid={Boolean(collectionError)}
                  />
                </Field>
                {collectionError && (
                  <p role="alert" className="demo-error">
                    {collectionError}
                  </p>
                )}
                <div className="kit-dialog-actions">
                  <DialogClose>Cancel</DialogClose>
                  <Button type="submit" data-variant="solid">
                    Create collection
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Menu>
            <MenuTrigger aria-label="More actions">
              <MoreHorizontal size={20} aria-hidden="true" />
            </MenuTrigger>
            <MenuContent>
              <MenuItem onClick={() => setMenuResult("Collection duplicated")}>
                Duplicate collection
              </MenuItem>
              <MenuItem onClick={() => setMenuResult("Collection pinned")}>
                Pin collection
              </MenuItem>
              <MenuItem onClick={() => setMenuResult("Collection archived")}>
                Archive collection
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <ToastDemo />
        <output aria-label="Collection result" className="kit-result">
          {collectionResult}
        </output>
        <output aria-label="Action result" className="kit-result">
          {menuResult}
        </output>
      </Panel>
      <Panel title="Selection">
        <CheckboxDemo />
        <div className="kit-panel-divider" />
        <RadioDemo />
      </Panel>
    </div>
  );
}

function MaterialSettings({
  refraction,
  setRefraction,
  dispersion,
  setDispersion,
  backdrop,
  setBackdrop,
}: {
  refraction: number;
  setRefraction: (v: number) => void;
  dispersion: number;
  setDispersion: (v: number) => void;
  backdrop: BackdropName;
  setBackdrop: (v: BackdropName) => void;
}) {
  const { status, refresh } = useLiquidGlass();
  return (
    <Popover>
      <PopoverTrigger aria-label="Material settings">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>Material settings</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="kit-material-popover"
      >
        <PopoverTitle>Glass material</PopoverTitle>
        <div className="kit-material-controls">
          <Range
            label="Refraction strength"
            value={refraction}
            min={1}
            max={60}
            onChange={setRefraction}
          />
          <Range
            label="Colour dispersion"
            value={dispersion}
            max={30}
            onChange={setDispersion}
          />
          <Choice
            label="Backdrop"
            value={backdrop}
            options={backdropOptions}
            onChange={(value) => setBackdrop(value as BackdropName)}
          />
        </div>
        <div className="kit-dialog-actions">
          <Button
            onClick={() => {
              setRefraction(30);
              setDispersion(8);
              setBackdrop("coast");
            }}
          >
            Reset material
          </Button>
          <PopoverClose>Done</PopoverClose>
        </div>
        {status === "ready" ? (
          <Button className="kit-refresh" onClick={refresh}>
            <RotateCcw size={14} aria-hidden="true" />
            Refresh backdrop
          </Button>
        ) : (
          <p className="kit-support-note">
            {status === "loading"
              ? "Preparing WebGPU…"
              : status === "reduced"
                ? "Solid surfaces follow your accessibility preferences."
                : "This browser is showing the compatibility material. WebGPU is unavailable."}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function KitShell(props: Parameters<typeof MaterialSettings>[0]) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("overview");
  const [restart, setRestart] = useState(0);
  const [copied, setCopied] = useState("");
  const { status } = useLiquidGlass();
  const matches = manifest.components.filter((item) =>
    (item.name + " " + item.category)
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const active =
    selected === "overview" && !search
      ? "overview"
      : matches.some((item) => item.id === selected)
        ? selected
        : matches[0]?.id;
  const component = manifest.components.find((item) => item.id === active);
  const Demo = active ? demos[active] : undefined;
  const copy = async (value: string, result: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(result);
    } catch {
      setCopied(
        "Clipboard unavailable. The starter is included in the source package.",
      );
    }
  };
  const importLine = component
    ? "import { " +
      component.name.replaceAll(" ", "") +
      ' } from "@ui-sdk/react/' +
      component.id +
      '";'
    : "";
  return (
    <div className="kit-shell">
      <a href="#kit-main" className="skip-link">
        Skip to components
      </a>
      <header className="kit-header">
        <div className="kit-brand">
          <span className="kit-brand-symbol" data-liquid-glass="">
            <Layers3 size={22} aria-hidden="true" />
          </span>
          <strong>Quantive</strong>
          <span className="kit-brand-divider" />
          <span>UI kit</span>
        </div>
        <div className="kit-header-actions">
          <span className="kit-renderer-status" data-renderer-status={status}>
            {status === "ready"
              ? "WebGPU"
              : status === "loading"
                ? "Loading material"
                : status === "reduced"
                  ? "Solid material"
                  : "Compatibility mode"}
          </span>
          <Button onClick={() => copy(starterSource, "Starter copied")}>
            <Code2 size={17} aria-hidden="true" />
            Copy starter
          </Button>
        </div>
      </header>
      <div className="kit-layout">
        <aside className="kit-sidebar" aria-label="Component library">
          <div className="kit-search">
            <Search size={17} aria-hidden="true" />
            <Input
              aria-label="Search components"
              placeholder="Find a component"
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <Listbox
            aria-label="Component catalogue"
            className="kit-catalogue"
            value={active ?? null}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setSelected(value);
                setRestart(0);
                setCopied("");
              }
            }}
            items={[
              ...(!search ? [{ value: "overview", label: "Overview" }] : []),
              ...matches.map((item) => ({ value: item.id, label: item.name })),
            ]}
          >
            {!search && (
              <ListboxItem
                value="overview"
                data-catalogue-id="overview"
                className="kit-overview-item"
              >
                <Grid2X2 size={17} aria-hidden="true" />
                Overview
              </ListboxItem>
            )}
            {groups.map((group) => {
              const items = matches.filter((item) => item.category === group);
              return items.length > 0 ? (
                <div className="kit-catalogue-group" key={group}>
                  <p>{group}</p>
                  {items.map((item) => (
                    <ListboxItem
                      key={item.id}
                      value={item.id}
                      data-catalogue-id={item.id}
                    >
                      {item.name}
                      <span className="kit-active-mark">
                        <Check size={14} aria-hidden="true" />
                      </span>
                    </ListboxItem>
                  ))}
                </div>
              ) : null;
            })}
          </Listbox>
          <p className="kit-catalogue-count">55 components</p>
        </aside>
        <main className="kit-main" id="kit-main" tabIndex={-1}>
          <div className="kit-title-row">
            <div>
              <p className="kit-eyebrow">
                {active === "overview"
                  ? "The component collection"
                  : (component?.category ?? "Components")}
              </p>
              <h1>
                {active === "overview"
                  ? "Liquid Glass"
                  : (component?.name ?? "No matching components")}
              </h1>
            </div>
            <MaterialSettings {...props} />
          </div>
          {active === "overview" ? (
            <Overview />
          ) : component && Demo ? (
            <section
              className="kit-specimen"
              data-component-id={component.id}
              data-liquid-glass=""
              data-liquid-kind="panel"
            >
              <div className="kit-specimen-toolbar">
                <span>{component.name}</span>
                <Button onClick={() => setRestart((value) => value + 1)}>
                  <RotateCcw size={15} aria-hidden="true" />
                  Restart component
                </Button>
              </div>
              <div className="component-stage">
                <SpecimenBoundary
                  key={component.id + restart}
                  name={component.name}
                >
                  <Demo />
                </SpecimenBoundary>
              </div>
              <div className="component-import">
                <code>{importLine}</code>
                <Button
                  aria-label="Copy component import"
                  onClick={() => copy(importLine, "Import copied")}
                >
                  <Copy size={16} aria-hidden="true" />
                </Button>
              </div>
            </section>
          ) : (
            <p className="kit-empty">
              Try a component name, such as Button or Dialog.
            </p>
          )}
          <output className="kit-copy-result" aria-live="polite">
            {copied}
          </output>
          <footer className="kit-footer">
            <span>Quantive Liquid Glass</span>
            <span>React · UI SDK · WebGPU</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [refraction, setRefraction] = useState(30);
  const [dispersion, setDispersion] = useState(8);
  const [backdrop, setBackdrop] = useState<BackdropName>("coast");
  const backdropNode = useMemo(
    () => <KitBackdrop variant={backdrop} />,
    [backdrop],
  );
  return (
    <LiquidGlassProvider
      backdrop={backdropNode}
      refraction={refraction / 100}
      dispersion={dispersion / 1000}
    >
      <KitShell
        refraction={refraction}
        setRefraction={setRefraction}
        dispersion={dispersion}
        setDispersion={setDispersion}
        backdrop={backdrop}
        setBackdrop={setBackdrop}
      />
    </LiquidGlassProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

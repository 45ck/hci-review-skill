import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { LiquidIcon, type LiquidIconName } from "@quantitative-hci/liquid-glass/icons";
import { FoundationBadge, ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
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
import { Tabs, TabsList, TabsPanel, TabsTab, TabsIndicator } from "@ui-sdk/react/tabs";
import {
  SegmentedControl,
  SegmentedControlIndicator,
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
import {
  DEFAULT_LIQUID_APPEARANCE,
  type LiquidFontSet,
  type LiquidIconSet,
} from "@quantitative-hci/liquid-glass/appearance";
import { inputDemos } from "./demos-inputs";
import { surfaceDemos } from "./demos-surfaces";
import { KitBackdrop, type BackdropName } from "./kit-backdrop";
import { StandardsShowcase } from "./standards-showcase";
import { standardsModels } from "./standards-models";
import { GraphicsShowcase, initialGraphicDocument, initialGraphicAssets } from "./graphics-showcase";
import type { GraphicAsset } from "@quantitative-hci/liquid-glass/graphics";
import { VisualShowcase, visualAssets } from "./visual-showcase";
import starterSource from "./starter-template.tsx?raw";
import manifest from "../../../../../packages/liquid-glass/component-manifest.json";
import "./agent-bridge";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "./sdk-layout.css";
import "./gallery.css";

const demos: Record<string, ComponentType> = { ...inputDemos, ...surfaceDemos };
const groups = [...new Set(manifest.components.map((item) => item.category))];
const collections = [
  { id: "visual", name: "Graphics", keywords: "image layers design canvas ai agent media gallery carousel card comparison photo showcase" },
  { id: "standards", name: "Standards", keywords: "omg business bpmn dmn cmmn bmm sbvr vdml bacm ifml sysml uml uwe diagram class component navigation presentation model" },
];
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
const appearanceOptions = [
  { value: "system", label: "Follow device" },
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];
const fontOptions = [
  { value: "studio", label: "Studio — Manrope" },
  { value: "editorial", label: "Editorial — Fraunces" },
  { value: "system", label: "System" },
];
const iconOptions = [
  { value: "isometric", label: "Isometric" },
  { value: "line", label: "Line" },
];
type MotionPreference = boolean | "system";
type TransparencyPreference = "system" | "glass" | "solid";

function readMotionPreference(): MotionPreference {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("qg-kit-motion") ?? '"system"',
    );
    return typeof value === "boolean" ? value : "system";
  } catch {
    return "system";
  }
}

function readTransparencyPreference(): TransparencyPreference {
  try {
    const value = localStorage.getItem("qg-kit-transparency");
    return value === "glass" || value === "solid" ? value : "system";
  } catch {
    return "system";
  }
}

function readFontPreference(): LiquidFontSet {
  try {
    const value = localStorage.getItem("qg-kit-font");
    return value === "editorial" || value === "system" ? value : DEFAULT_LIQUID_APPEARANCE.fontSet;
  } catch {
    return DEFAULT_LIQUID_APPEARANCE.fontSet;
  }
}

function readIconPreference(): LiquidIconSet {
  try {
    return localStorage.getItem("qg-kit-icons") === "line" ? "line" : DEFAULT_LIQUID_APPEARANCE.iconSet;
  } catch {
    return DEFAULT_LIQUID_APPEARANCE.iconSet;
  }
}

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
  icon,
  children,
  probe,
  className = "",
}: {
  title: string;
  icon: LiquidIconName;
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
      <h2><LiquidIcon name={icon} size={36} /><span>{title}</span></h2>
      <div className="kit-panel-body">{children}</div>
    </section>
  );
}

function Overview({ onExplore }: { onExplore: (id: string) => void }) {
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
      <Panel title="Buttons" icon="sparkles" probe="panel" className="kit-actions-panel">
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
            <LiquidIcon name="folder" />
            Open library
          </Button>
          <Button disabled>Unavailable</Button>
        </div>
        <div className="kit-button-row">
          <Toggle aria-label="Bookmark project">
            <LiquidIcon name="bookmark" />
          </Toggle>
          <Toggle aria-label="Favourite project">
            <LiquidIcon name="sparkles" />
          </Toggle>
          <Button
            aria-label="Duplicate project"
            onClick={() => setCreatedProject(projectName + " copy")}
          >
            <LiquidIcon name="copy" />
          </Button>
        </div>
        <output aria-label="Project result" className="kit-result">
          {createdProject ? "Created " + createdProject : ""}
        </output>
      </Panel>
      <Panel title="Inputs" icon="inbox">
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
      <Panel title="Preferences" icon="settings">
        <div className="kit-setting-row">
          <span>
            <LiquidIcon name="bell" />
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
            <LiquidIcon name="volume" />
            Sound
          </span>
          <Switch aria-label="Sound" checked={sound} onCheckedChange={setSound}>
            <SwitchThumb />
          </Switch>
        </div>
        <Range label="Volume" value={volume} onChange={setVolume} />
      </Panel>
      <Panel title="Navigation" icon="folder">
        <SegmentedControl
          aria-label="Workspace view"
          value={workspace}
          onValueChange={(value) => {
            if (typeof value === "string") setWorkspace(value);
          }}
        >
          <SegmentedControlIndicator />
          <SegmentedControlItem value="files">Files</SegmentedControlItem>
          <SegmentedControlItem value="activity">Activity</SegmentedControlItem>
          <SegmentedControlItem value="settings">Settings</SegmentedControlItem>
        </SegmentedControl>
        <div className="kit-navigation-content" aria-live="polite">
          {workspace === "files" ? (
            <>
              <div>
                <LiquidIcon name="folder" />
                <span>Components</span>
                <span>55</span>
              </div>
              <div>
                <LiquidIcon name="layers" />
                <span>Templates</span>
                <span>1</span>
              </div>
              <div>
                <LiquidIcon name="grid" />
                <span>Assets</span>
                <span>3</span>
              </div>
            </>
          ) : workspace === "activity" ? (
            <div>
              <LiquidIcon name="activity" />
              <span>No recent changes</span>
            </div>
          ) : (
            <div>
              <LiquidIcon name="settings" />
              <span>Workspace preferences</span>
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Overlays" icon="layers">
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
      <Panel title="Selection" icon="grid">
        <CheckboxDemo />
        <div className="kit-panel-divider" />
        <RadioDemo />
      </Panel>
      <section className="kit-extension-preview" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated">
        <div className="kit-preview-images" aria-hidden="true">
          {visualAssets.slice(0, 2).map((asset) => (
            <img key={asset.id} src={asset.src} srcSet={asset.srcSet} sizes="(max-width: 760px) 160px, 280px" width={asset.width} height={asset.height} alt="" loading="lazy" />
          ))}
        </div>
        <div className="kit-preview-description">
          <ValidationBadge />
          <h2>Shape your next direction</h2>
          <p>An editable design canvas, image layers, agent briefs and reusable media components.</p>
          <Button onClick={() => onExplore("visual")}>Explore graphics</Button>
        </div>
      </section>
      <section className="kit-extension-preview kit-developer-preview" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated">
        <div className="kit-preview-model" aria-hidden="true">
          <div><small>«component»</small><strong>Interface</strong><span>Shared actions</span></div>
          <svg viewBox="0 0 100 32"><path d="M2 16H93M85 10l10 6-10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" /></svg>
          <div><small>«interface»</small><strong>Model</strong><span>Visible state</span></div>
        </div>
        <div className="kit-preview-description">
          <ValidationBadge />
          <h2>Make the model tangible</h2>
          <p>Business processes, decisions, systems and interaction models. Pan, zoom, inspect and edit together.</p>
          <Button onClick={() => onExplore("standards")}>Explore standards</Button>
        </div>
      </section>
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
  setMotion,
  transparency,
  setTransparency,
  fontSet,
  setFontSet,
  iconSet,
  setIconSet,
}: {
  refraction: number;
  setRefraction: (v: number) => void;
  dispersion: number;
  setDispersion: (v: number) => void;
  backdrop: BackdropName;
  setBackdrop: (v: BackdropName) => void;
  setMotion: (v: MotionPreference) => void;
  transparency: TransparencyPreference;
  setTransparency: (v: TransparencyPreference) => void;
  fontSet: LiquidFontSet;
  setFontSet: (v: LiquidFontSet) => void;
  iconSet: LiquidIconSet;
  setIconSet: (v: LiquidIconSet) => void;
}) {
  const { status, refresh, motion: resolvedMotion } = useLiquidGlass();
  return (
    <Popover>
      <PopoverTrigger aria-label="Material settings">
        <LiquidIcon name="settings" />
        <span>Material settings</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="kit-material-popover"
      >
        <PopoverTitle>Glass material</PopoverTitle>
        <div className="kit-material-controls">
          <Choice
            label="Font set"
            value={fontSet}
            options={fontOptions}
            onChange={(value) => setFontSet(value as LiquidFontSet)}
          />
          <Choice
            label="Icon style"
            value={iconSet}
            options={iconOptions}
            onChange={(value) => setIconSet(value as LiquidIconSet)}
          />
          <Choice
            label="Appearance"
            value={transparency}
            options={appearanceOptions}
            onChange={(value) => setTransparency(value as TransparencyPreference)}
          />
          <div className="kit-motion-setting">
            <div className="kit-setting-row">
              <span>Animate glass</span>
              <Switch
                aria-label="Animate glass"
                checked={resolvedMotion === "enabled"}
                onCheckedChange={setMotion}
                aria-describedby="kit-motion-description"
              >
                <SwitchThumb />
              </Switch>
            </div>
            <p id="kit-motion-description">
              {resolvedMotion === "reduced"
                ? "Your device reduces motion. Turn this on to preview animations in this kit."
                : resolvedMotion === "off"
                  ? "Animations paused. Glass keeps its static reflections."
                  : "Moving highlights, ripples and selection."}
            </p>
          </div>
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
              setMotion("system");
              setTransparency("system");
              setFontSet(DEFAULT_LIQUID_APPEARANCE.fontSet);
              setIconSet(DEFAULT_LIQUID_APPEARANCE.iconSet);
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
                ? transparency === "solid"
                  ? "Solid material is selected."
                  : "A device preference is using solid surfaces. Choose Glass to preview transparency; forced colours remain solid."
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
  const [models, setModels] = useState(() => structuredClone(standardsModels));
  const [graphicDocument, setGraphicDocument] = useState(() => structuredClone(initialGraphicDocument));
  const [graphicAssets, setGraphicAssets] = useState<readonly GraphicAsset[]>(initialGraphicAssets);
  const [visitedCollections, setVisitedCollections] = useState<string[]>([]);
  const { status, motion: effectiveMotion } = useLiquidGlass();
  const matches = manifest.components.filter((item) =>
    (item.name + " " + item.category)
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const collectionMatches = collections.filter((item) =>
    (item.name + " " + item.keywords).toLowerCase().includes(search.toLowerCase().trim()),
  );
  const active =
    selected === "overview" && !search
      ? "overview"
      : [...collectionMatches, ...matches].some((item) => item.id === selected)
        ? selected
        : collectionMatches[0]?.id ?? matches[0]?.id;
  const collection = collections.find((item) => item.id === active);
  useEffect(() => {
    if (active === "visual" || active === "standards") setVisitedCollections(current => current.includes(active) ? current : [...current, active]);
  }, [active]);
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
            <LiquidIcon name="layers" size={28} />
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
          <Button onClick={() => copy(
            starterSource
              .replace('fontSet="studio"', `fontSet="${props.fontSet}"`)
              .replace('iconSet="isometric"', `iconSet="${props.iconSet}"`),
            "Starter copied",
          )}>
            <LiquidIcon name="code" />
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
            data-liquid-glass="off"
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
              ...collectionMatches.map((item) => ({ value: item.id, label: item.name })),
              ...matches.map((item) => ({ value: item.id, label: item.name })),
            ]}
          >
            {!search && (
              <ListboxItem
                value="overview"
                data-catalogue-id="overview"
                className="kit-overview-item"
              >
                <LiquidIcon name="grid" />
                Overview
              </ListboxItem>
            )}
            {collectionMatches.length > 0 && (
              <div className="kit-catalogue-group kit-custom-collection">
                <p>Custom components</p>
                {collectionMatches.map((item) => (
                  <ListboxItem key={item.id} value={item.id} data-catalogue-id={item.id}>
                    {item.name}
                    <span className="kit-active-mark"><Check size={14} aria-hidden="true" /></span>
                  </ListboxItem>
                ))}
              </div>
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
          <p className="kit-catalogue-count">55 SDK families · 2 custom collections</p>
        </aside>
        <main className="kit-main" id="kit-main" tabIndex={-1}>
          <div className="kit-title-row">
            <div>
              <p className="kit-eyebrow">
                {active === "overview"
                  ? "The component collection"
                  : collection ? "Custom collection" : (component?.category ?? "Components")}
              </p>
              <h1>
                {active === "overview"
                  ? "Liquid Glass"
                  : (collection?.name ?? component?.name ?? "No matching components")}
              </h1>
              {active === "overview" && (
                <p className="kit-intro">
                  {status === "reduced"
                    ? "Open Material settings to choose glass or follow your device preferences."
                    : effectiveMotion !== "enabled"
                      ? "Turn on Animate glass in Material settings to explore light and motion."
                      : "Light follows your pointer. Press a control or change a selection."}
                </p>
              )}
            </div>
            <MaterialSettings {...props} />
          </div>
          {(active === "visual" || visitedCollections.includes("visual")) && <div hidden={active !== "visual"}>
            <SpecimenBoundary key="visual" name="Graphics">
              <Tabs className="kit-graphics-tabs" defaultValue="canvas">
                <TabsList aria-label="Graphics views"><TabsTab value="canvas">Design canvas</TabsTab><TabsTab value="images">Image components</TabsTab><TabsIndicator /></TabsList>
                <TabsPanel value="canvas" keepMounted><GraphicsShowcase model={graphicDocument} assets={graphicAssets} onModelChange={setGraphicDocument} onAssetsChange={setGraphicAssets} /></TabsPanel>
                <TabsPanel value="images" keepMounted><VisualShowcase /></TabsPanel>
              </Tabs>
            </SpecimenBoundary>
          </div>}
          {(active === "standards" || visitedCollections.includes("standards")) && <div hidden={active !== "standards"}>
            <SpecimenBoundary key="standards" name="Standards"><StandardsShowcase models={models} onModelsChange={setModels} /></SpecimenBoundary>
          </div>}
          {active === "overview" ? (
            <Overview onExplore={(id) => { setSelected(id); document.getElementById("kit-main")?.focus(); }} />
          ) : active === "visual" || active === "standards" ? null
          : component && Demo ? (
            <section
              className="kit-specimen"
              data-component-id={component.id}
              data-liquid-glass=""
              data-liquid-kind="panel"
            >
              <div className="kit-specimen-toolbar">
                <span className="kit-foundation-label">{component.name}<FoundationBadge /></span>
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
                  <LiquidIcon name="copy" size={20} />
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
          <div className="kit-provenance-note">
            <p><FoundationBadge /> Behaviour from Vercel UI SDK.</p>
            <p><ValidationBadge /> Custom components, glass styling and compositions have not been reviewed or approved by a human UI/UX team.</p>
          </div>
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
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);
  const [transparency, setTransparency] = useState<TransparencyPreference>(
    readTransparencyPreference,
  );
  const [fontSet, setFontSet] = useState<LiquidFontSet>(readFontPreference);
  const [iconSet, setIconSet] = useState<LiquidIconSet>(readIconPreference);
  useEffect(() => {
    try {
      localStorage.setItem("qg-kit-motion", JSON.stringify(motion));
      localStorage.setItem("qg-kit-transparency", transparency);
      localStorage.setItem("qg-kit-font", fontSet);
      localStorage.setItem("qg-kit-icons", iconSet);
    } catch {
      // Storage can be unavailable in embedded or private browser contexts.
    }
  }, [motion, transparency, fontSet, iconSet]);
  const backdropNode = useMemo(
    () => <KitBackdrop variant={backdrop} />,
    [backdrop],
  );
  return (
    <LiquidGlassProvider
      backdrop={backdropNode}
      refraction={refraction / 100}
      dispersion={dispersion / 1000}
      motion={motion}
      transparency={transparency}
      fontSet={fontSet}
      iconSet={iconSet}
    >
      <KitShell
        refraction={refraction}
        setRefraction={setRefraction}
        dispersion={dispersion}
        setDispersion={setDispersion}
        backdrop={backdrop}
        setBackdrop={setBackdrop}
        setMotion={setMotion}
        transparency={transparency}
        setTransparency={setTransparency}
        fontSet={fontSet}
        setFontSet={setFontSet}
        iconSet={iconSet}
        setIconSet={setIconSet}
      />
    </LiquidGlassProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

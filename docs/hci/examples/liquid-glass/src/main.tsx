import { createRoot } from "react-dom/client";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import {
  ExternalLink,
  Check,
  Code2,
  Droplets,
  Grid2X2,
  Layers3,
  Monitor,
  Moon,
  Search,
  Sun,
  X,
  SlidersHorizontal,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  RotateCcw,
  MousePointer2,
  Contrast,
  Shapes,
  Type,
  CalendarDays,
  GalleryHorizontalEnd,
  PanelTop,
  ChevronDown,
} from "lucide-react";
import {
  GlassProvider,
  GlassSurface,
  useGlass,
} from "@quantitative-hci/liquid-glass";
import { Button } from "@quantitative-hci/liquid-glass/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@quantitative-hci/liquid-glass/dialog";
import { Switch, SwitchThumb } from "@quantitative-hci/liquid-glass/switch";
import { inputDemos } from "./demos-inputs";
import { surfaceDemos } from "./demos-surfaces";
import manifest from "../../../../../packages/liquid-glass/component-manifest.json";
import "@quantitative-hci/liquid-glass/styles.css";
import "./gallery.css";

const demos: Record<string, ComponentType> = { ...inputDemos, ...surfaceDemos };
const categories = [
  "All",
  ...new Set(manifest.components.map((item) => item.category)),
];
const categoryIcons = [
  Grid2X2,
  MousePointer2,
  Type,
  PanelTop,
  Layers3,
  CalendarDays,
  GalleryHorizontalEnd,
];
const usage = `import { GlassProvider } from '@quantitative-hci/liquid-glass';\nimport { Button } from '@quantitative-hci/liquid-glass/button';\nimport '@quantitative-hci/liquid-glass/styles.css';\n\nexport function App() {\n  return (\n    <GlassProvider>\n      <Button>Save changes</Button>\n    </GlassProvider>\n  );\n}`;

class SpecimenBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, details: ErrorInfo) {
    console.error(`Gallery specimen ${this.props.name}:`, error, details);
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="demo-error">
        This specimen could not load. Refresh to retry.
      </p>
    ) : (
      this.props.children
    );
  }
}

function Landscape({ variant }: { variant: string }) {
  return (
    <div className={`landscape landscape-${variant}`} aria-hidden="true">
      <div className="landscape-sun" />
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="land-back" x2="0" y2="1">
            <stop stopColor="#9bc4c4" />
            <stop offset="1" stopColor="#568f9c" />
          </linearGradient>
          <linearGradient id="land-mid" x2="0" y2="1">
            <stop stopColor="#729c9d" />
            <stop offset="1" stopColor="#356875" />
          </linearGradient>
          <linearGradient id="land-front" x2=".3" y2="1">
            <stop stopColor="#447b86" />
            <stop offset="1" stopColor="#244e63" />
          </linearGradient>
        </defs>
        <path
          d="M-40 520 C210 480 315 100 600 310 S1030 610 1340 290 S1680 335 1720 300 V1100 H-40Z"
          fill="url(#land-back)"
        />
        <path
          d="M-50 660 C180 270 520 415 700 610 S1050 470 1230 440 S1480 650 1690 350 V1100 H-50Z"
          fill="url(#land-mid)"
        />
        <path
          d="M-50 900 C210 680 340 625 610 780 S1020 830 1140 670 S1440 480 1690 650 V1100 H-50Z"
          fill="url(#land-front)"
        />
        <path
          d="M-50 1050 C225 820 420 910 750 965 S1190 705 1680 960 V1100 H-50Z"
          fill="#204c5e"
        />
      </svg>
      <div className="landscape-haze" />
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
      <label className="setting-field">
        Appearance
        <select
          aria-label="Appearance"
          value={preferences.theme}
          onChange={(e) =>
            update({ theme: e.target.value as typeof preferences.theme })
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
      <label className="setting-field">
        Material
        <select
          aria-label="Material"
          value={preferences.material}
          onChange={(e) =>
            update({ material: e.target.value as typeof preferences.material })
          }
        >
          <option value="regular">Regular glass</option>
          <option value="clear">Clear glass</option>
          <option value="solid">Solid</option>
        </select>
      </label>
      <label className="setting-range">
        <span>
          Frost <output>{preferences.blur}px</output>
        </span>
        <input
          aria-label="Frost"
          type="range"
          min="0"
          max="32"
          value={preferences.blur}
          onChange={(e) => update({ blur: Number(e.target.value) })}
        />
      </label>
      <label className="setting-range">
        <span>
          Saturation <output>{preferences.saturation}%</output>
        </span>
        <input
          aria-label="Saturation"
          type="range"
          min="100"
          max="200"
          value={preferences.saturation}
          onChange={(e) => update({ saturation: Number(e.target.value) })}
        />
      </label>
      <div className="settings-divider" />
      <label className="setting-toggle">
        <span>
          <Droplets size={17} />
          Optical refraction
        </span>
        <Switch
          aria-label="Optical refraction"
          checked={preferences.refraction}
          onCheckedChange={(v) => update({ refraction: v })}
        >
          <SwitchThumb />
        </Switch>
      </label>
      <label className="setting-toggle">
        <span>
          <MousePointer2 size={17} />
          Reduce motion
        </span>
        <Switch
          aria-label="Reduce motion"
          checked={preferences.reduceMotion}
          onCheckedChange={(v) => update({ reduceMotion: v })}
        >
          <SwitchThumb />
        </Switch>
      </label>
      <label className="setting-toggle">
        <span>
          <Contrast size={17} />
          Increase contrast
        </span>
        <Switch
          aria-label="Increase contrast"
          checked={preferences.increaseContrast}
          onCheckedChange={(v) => update({ increaseContrast: v })}
        >
          <SwitchThumb />
        </Switch>
      </label>
      {(reducedTransparency ||
        (reducedMotion && !preferences.reduceMotion) ||
        (highContrast && !preferences.increaseContrast)) && (
        <p className="preference-note">
          Your system accessibility preferences also apply.
        </p>
      )}
      <Button onClick={reset} className="reset-material">
        <RotateCcw size={15} />
        Reset material
      </Button>
    </div>
  );
}

function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Material settings"
        className="settings-trigger"
      >
        <SlidersHorizontal size={17} />
        <span>Material</span>
      </DialogTrigger>
      <DialogContent className="settings-dialog">
        <div className="dialog-heading">
          <div>
            <DialogTitle>Material settings</DialogTitle>
            <DialogDescription>
              Applies across the entire library.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close material settings"
            className="icon-button"
          >
            <X size={18} />
          </DialogClose>
        </div>
        <MaterialControls />
      </DialogContent>
    </Dialog>
  );
}

function UsageDialog() {
  return (
    <Dialog>
      <DialogTrigger className="nav-footer-button">
        <Code2 size={17} />
        Use the library
      </DialogTrigger>
      <DialogContent className="usage-dialog">
        <div className="dialog-heading">
          <div>
            <DialogTitle>Use Liquid Glass</DialogTitle>
            <DialogDescription>
              Internal React package, backed by Vercel UI SDK.
            </DialogDescription>
          </div>
          <DialogClose aria-label="Close usage" className="icon-button">
            <X size={18} />
          </DialogClose>
        </div>
        <pre>
          <code>{usage}</code>
        </pre>
        <p className="demo-muted">
          Use the shared package for new HCI prototypes. The installed SDK
          version is pinned; existing product design systems take precedence.
        </p>
        <a
          href="https://github.com/45ck/hci-review-skill/tree/main/packages/liquid-glass"
          target="_blank"
          rel="noreferrer"
        >
          Package and standard <ExternalLink size={16} />
        </a>
      </DialogContent>
    </Dialog>
  );
}

function Playground() {
  const { preferences, highContrast, reducedTransparency } = useGlass();
  const material =
    highContrast || reducedTransparency ? "solid" : preferences.material;
  const [focus, setFocus] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  return (
    <section className="playground" aria-label="Glass surface playground">
      <div className="playground-label">
        <span>LIVE MATERIAL</span>
        <span>Drag the floating control</span>
      </div>
      <div className="playground-orbit" />
      <GlassSurface
        className="floating-dock"
        style={{ transform: `translate(${offset.x}px,${offset.y}px)` }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button,input,[role="switch"]'))
            return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            startX: offset.x,
            startY: offset.y,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({
            x: Math.max(
              -90,
              Math.min(90, drag.current.startX + e.clientX - drag.current.x),
            ),
            y: Math.max(
              -25,
              Math.min(40, drag.current.startY + e.clientY - drag.current.y),
            ),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="dock-symbol">
          <Droplets size={23} />
        </div>
        <div className="dock-title">
          <strong>Focus mode</strong>
          <span>
            {focus ? "A little less distraction" : "Everything in view"}
          </span>
        </div>
        <Switch
          aria-label="Focus mode"
          checked={focus}
          onCheckedChange={setFocus}
        >
          <SwitchThumb />
        </Switch>
      </GlassSurface>
      <div className="playground-pills">
        <span>
          <Layers3 size={14} />
          {material === "solid"
            ? "Solid surface"
            : material === "clear"
              ? "Clear glass"
              : "Regular glass"}
        </span>
        <span>
          <Check size={14} />
          Real components
        </span>
      </div>
    </section>
  );
}

function Gallery() {
  const { theme, update } = useGlass();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [backdrop, setBackdrop] = useState("coast");
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [density, setDensity] = useState("comfortable");
  const searchRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);
  const filtered = useMemo(
    () =>
      manifest.components.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.name} ${item.category}`
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
      ),
    [category, search],
  );
  const copyImport = async (id: string, path: string) => {
    try {
      await navigator.clipboard.writeText(
        `import * as ${id
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("")} from '${path}';`,
      );
      setCopied(id);
    } catch {
      setCopied("failed");
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1800);
  };
  return (
    <div
      className={`gallery-shell ${navOpen ? "nav-open" : ""}`}
      data-density={density}
    >
      <a className="skip-link" href="#main-content">
        Skip to components
      </a>
      <Landscape variant={backdrop} />
      {navOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        id="library-navigation"
        className="sidebar"
        aria-label="Library navigation"
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setCategory("All");
            setSearch("");
          }}
        >
          <span className="brand-mark">
            <Droplets size={22} />
          </span>
          <span>
            <strong>Quantitative HCI</strong>
            <small>Design library</small>
          </span>
        </a>
        <div className="sidebar-heading">LIBRARY</div>
        <button
          className="library-active"
          onClick={() => {
            setCategory("All");
            setSearch("");
            setNavOpen(false);
          }}
        >
          <Layers3 size={17} />
          Liquid Glass
          <span className="nav-badge">{manifest.components.length}</span>
        </button>
        <div className="sidebar-heading category-heading">COMPONENTS</div>
        <nav className="category-nav" aria-label="Component categories">
          {categories.map((name, index) => {
            const Icon = categoryIcons[index] || Shapes;
            const count =
              name === "All"
                ? manifest.components.length
                : manifest.components.filter((x) => x.category === name).length;
            return (
              <button
                key={name}
                data-category={name === "All" ? "all" : name}
                aria-pressed={category === name}
                onClick={() => {
                  setCategory(name);
                  setNavOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{name === "All" ? "All components" : name}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <UsageDialog />
          <a
            className="nav-footer-button"
            href="./refraction-lab.html"
            target="_blank"
            rel="noreferrer"
          >
            <Sparkles size={17} />
            GPU material study
            <ExternalLink size={14} />
          </a>
          <a
            className="nav-footer-button"
            href="../"
            target="_blank"
            rel="noreferrer"
          >
            <Monitor size={17} />
            HCI demo lab
            <ExternalLink size={14} />
          </a>
          <div className="sidebar-version">
            <span>Internal standard</span>
            <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-controls="library-navigation"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(!navOpen)}
            >
              {navOpen ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>
            <span>Design library</span>
            <ChevronRight size={13} />
            <strong>Liquid Glass</strong>
          </div>
          <div className="topbar-actions">
            <span className="sdk-badge">
              UI SDK <span>β.13</span>
            </span>
            <button
              className="icon-button theme-toggle"
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() =>
                update({ theme: theme === "dark" ? "light" : "dark" })
              }
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <SettingsDialog />
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="collection-label">
                <span className="collection-line" />
                THE COMPONENT COLLECTION
              </div>
              <h1>
                Liquid Glass<span className="heading-dot">.</span>
              </h1>
              <p>55 components. One material. Yours to shape.</p>
            </div>
            <div className="backdrop-picker" aria-label="Background">
              <span>Scene</span>
              {["coast", "dawn", "dusk"].map((v) => (
                <button
                  key={v}
                  className={`scene-swatch scene-${v}`}
                  aria-pressed={backdrop === v}
                  aria-label={`${v} background`}
                  onClick={() => setBackdrop(v)}
                />
              ))}
              <ChevronDown size={13} />
            </div>
          </div>
          {category === "All" && !search && <Playground />}
          <div className="collection-toolbar">
            <div className="collection-title">
              <h2>{category === "All" ? "All components" : category}</h2>
              <span data-testid="component-count">{filtered.length}</span>
            </div>
            <div className="collection-tools">
              <label className="search-field">
                <Search size={16} />
                <input
                  ref={searchRef}
                  aria-label="Search components"
                  placeholder="Find a component…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd>⌘ K</kbd>
                )}
              </label>
              <button
                className="icon-button density-toggle"
                aria-label={
                  density === "comfortable"
                    ? "Compact grid"
                    : "Comfortable grid"
                }
                onClick={() =>
                  setDensity(
                    density === "comfortable" ? "compact" : "comfortable",
                  )
                }
              >
                <Grid2X2 size={17} />
              </button>
            </div>
          </div>
          <div className="component-grid">
            {filtered.map((item) => {
              const Demo = demos[item.id];
              return (
                <article
                  className="component-card qg-surface"
                  key={item.id}
                  id={`component-${item.id}`}
                  data-component-id={item.id}
                >
                  <div className="card-heading">
                    <div>
                      <h3>{item.name}</h3>
                      <span>{item.category}</span>
                    </div>
                    <button
                      className="copy-import"
                      aria-label={`Copy ${item.name} import`}
                      title="Copy import"
                      onClick={() => void copyImport(item.id, item.exportPath)}
                    >
                      {copied === item.id ? (
                        <Check size={15} />
                      ) : (
                        <Code2 size={16} />
                      )}
                    </button>
                  </div>
                  <div className="component-stage">
                    <SpecimenBoundary name={item.id}>
                      {Demo ? (
                        <Demo />
                      ) : (
                        <p role="alert">Missing component: {item.id}</p>
                      )}
                    </SpecimenBoundary>
                  </div>
                  <div className="card-footer">
                    <span className="specimen-status">Live specimen</span>
                    <code>{item.id}</code>
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <GlassSurface className="empty-search">
              <Search size={25} />
              <h2>No matching components</h2>
              <p>Try a component name or a different category.</p>
              <Button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Show all components
              </Button>
            </GlassSurface>
          )}
          <footer className="gallery-footer">
            <span>
              <Droplets size={14} />
              Quantitative HCI / Liquid Glass
            </span>
            <span>UI SDK {manifest.sdkVersion} · Apple-inspired material</span>
            <a
              href="https://github.com/45ck/hci-review-skill"
              target="_blank"
              rel="noreferrer"
            >
              Source <ExternalLink size={14} />
            </a>
          </footer>
        </main>
      </div>
      {copied && (
        <div className="copy-feedback" role="status">
          {copied === "failed"
            ? "Clipboard unavailable in this browser"
            : "Import copied"}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <GlassProvider>
    <Gallery />
  </GlassProvider>,
);

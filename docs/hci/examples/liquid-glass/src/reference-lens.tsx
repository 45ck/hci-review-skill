import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import {
  capturePixelRatio,
  captureRegion,
} from "./reference-optics/capture-region";
import { ReferenceGlassRenderer } from "./reference-optics/renderer";
import "./reference-lens.css";

type LensStatus = "loading" | "ready" | "unavailable" | "error" | "reduced";
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function LensSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={1}
        value={value}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      >
        <div className="reference-lens-slider-label">
          <FieldLabel>{label}</FieldLabel>
          <SliderValue />
        </div>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label={label} />
          </SliderTrack>
        </SliderControl>
      </Slider>
    </Field>
  );
}

export function ReferenceLens() {
  const backdrop = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReferenceGlassRenderer | null>(null);
  const draw = useRef<() => void>(() => {});
  const refresh = useRef<() => Promise<void>>(async () => {});
  const [position, setPosition] = useState({ x: 50, y: 46 });
  const [strength, setStrength] = useState(30);
  const [sample, setSample] = useState(1);
  const [size, setSize] = useState({ width: 640, height: 340 });
  const [status, setStatus] = useState<LensStatus>("loading");
  const [detail, setDetail] = useState("Preparing the local reference scene…");
  const [reduced, setReduced] = useState(false);
  const strengthRef = useRef(strength);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  strengthRef.current = strength;

  const lensWidth = Math.min(360, Math.max(160, size.width - 32));
  const lensHeight = lensWidth * 0.4;
  const left = ((size.width - lensWidth) * position.x) / 100;
  const top = ((size.height - lensHeight) * position.y) / 100;

  useEffect(() => {
    const preference = matchMedia(
      "(prefers-reduced-transparency: reduce), (forced-colors: active)",
    );
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const region = backdrop.current;
    const target = canvas.current;
    if (!region || !target) return;
    let disposed = false;
    let device: GPUDevice | undefined;
    let localRenderer: ReferenceGlassRenderer | undefined;
    let frame = 0;
    let resizeTimer = 0;
    let pixelRatio = 1;
    let capturing: Promise<void> | null = null;
    let captureAgain = false;
    const controller = new AbortController();

    const fail = (message: string) => {
      if (disposed) return;
      setStatus("error");
      setDetail(message);
    };

    const paint = () => {
      if (disposed || !localRenderer) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !localRenderer) return;
        const box = target.getBoundingClientRect();
        const page = region.getBoundingClientRect();
        const width = Math.max(1, Math.round(box.width * pixelRatio));
        const height = Math.max(1, Math.round(box.height * pixelRatio));
        if (target.width !== width) target.width = width;
        if (target.height !== height) target.height = height;
        try {
          localRenderer.render(
            {
              x: (box.left - page.left) * pixelRatio,
              y: (box.top - page.top) * pixelRatio,
              width,
              height,
            },
            strengthRef.current / 100,
          );
        } catch {
          fail(
            "The WebGPU renderer stopped. The SDK controls remain available.",
          );
        }
      });
    };
    draw.current = paint;

    const recapture = (): Promise<void> => {
      if (disposed || !device || !localRenderer) return Promise.resolve();
      captureAgain = true;
      if (capturing) return capturing;
      capturing = (async () => {
        while (captureAgain && !disposed && device && localRenderer) {
          captureAgain = false;
          pixelRatio = capturePixelRatio(region, device);
          const texture = await captureRegion(
            region,
            pixelRatio,
            device,
            controller.signal,
          );
          if (disposed) {
            texture.destroy();
            return;
          }
          localRenderer.showPage(texture);
          setStatus("ready");
          setDetail(
            "WebGPU active · captured local backdrop · original reference shader",
          );
          paint();
        }
      })()
        .catch(() => {
          fail(
            "The local backdrop could not be captured. The SDK controls remain available.",
          );
        })
        .finally(() => {
          capturing = null;
        });
      return capturing;
    };
    refresh.current = recapture;

    const measure = () => {
      setSize({ width: region.clientWidth, height: region.clientHeight });
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => void recapture(), 150);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);

    const start = async () => {
      if (reduced) {
        setStatus("reduced");
        setDetail(
          "Solid controls follow your reduced-transparency or forced-colour preference.",
        );
        return;
      }
      setStatus("loading");
      setDetail("Preparing the local reference scene…");
      if (!navigator.gpu) {
        setStatus("unavailable");
        setDetail(
          "WebGPU is unavailable in this browser. The live SDK controls still work.",
        );
        return;
      }
      const adapter = await navigator.gpu.requestAdapter();
      if (disposed) return;
      if (!adapter) {
        setStatus("unavailable");
        setDetail(
          "No WebGPU adapter is available. The live SDK controls still work.",
        );
        return;
      }
      device = await adapter.requestDevice();
      if (disposed) {
        device.destroy();
        return;
      }
      device.addEventListener("uncapturederror", () => {
        fail(
          "WebGPU reported a rendering error. The SDK controls remain available.",
        );
      });
      void device.lost.then((info) => {
        if (info.reason !== "destroyed")
          fail("The WebGPU device was lost. Reopen this reference to retry.");
      });
      localRenderer = new ReferenceGlassRenderer(device, target);
      renderer.current = localRenderer;
      await recapture();
    };
    void start().catch(() => {
      fail("WebGPU could not initialise. The live SDK controls still work.");
    });

    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(resizeTimer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      draw.current = () => {};
      refresh.current = async () => {};
      renderer.current = null;
      localRenderer?.destroy();
      device?.destroy();
    };
  }, [reduced]);

  useEffect(() => draw.current(), [position, strength, size]);
  useEffect(() => {
    void refresh.current();
  }, [sample]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("button"))
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from || from.id !== event.pointerId) return;
    setPosition({
      x: clamp(
        from.startX +
          ((event.clientX - from.x) / Math.max(1, size.width - lensWidth)) *
            100,
      ),
      y: clamp(
        from.startY +
          ((event.clientY - from.y) / Math.max(1, size.height - lensHeight)) *
            100,
      ),
    });
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  return (
    <section
      className="reference-optics"
      aria-labelledby="reference-lens-title"
    >
      <header className="reference-lens-header">
        <div>
          <p className="reference-lens-eyebrow">The actual video technique</p>
          <h2 id="reference-lens-title">A lens that bends the page</h2>
          <p>
            Move the lens over the type and stripes. Its controls stay live DOM
            components.
          </p>
        </div>
        <a
          href="https://github.com/arya3d/liquid-glass-webgpu"
          target="_blank"
          rel="noreferrer"
        >
          Original source ↗
        </a>
      </header>
      <div className="reference-lens-stage" data-lens-status={status}>
        <div className="reference-lens-backdrop" ref={backdrop}>
          <div className="reference-lens-scene-heading">
            <span>OPTICAL STUDY / 01</span>
            <span>Sample {String(sample).padStart(2, "0")}</span>
          </div>
          <p className="reference-lens-display">LIQUID</p>
          <div className="reference-lens-stripes" />
          <p className="reference-lens-scene-caption">
            Refraction · colour separation · edge light
          </p>
        </div>
        <div
          className="reference-lens-object"
          style={
            {
              "--lens-x": `${left}px`,
              "--lens-y": `${top}px`,
              "--lens-width": `${lensWidth}px`,
              "--lens-height": `${lensHeight}px`,
            } as CSSProperties
          }
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          <canvas
            ref={canvas}
            aria-hidden="true"
            className="reference-lens-canvas"
          />
          <div className="reference-lens-live-controls">
            <Button
              onClick={() => setSample((value) => Math.max(1, value - 1))}
              disabled={sample === 1}
            >
              Previous sample
            </Button>
            <Button onClick={() => setSample((value) => value + 1)}>
              Next sample
            </Button>
          </div>
        </div>
      </div>
      <p className="reference-lens-status" role="status" aria-live="polite">
        {detail}
      </p>
      <div className="reference-lens-controls">
        <LensSlider
          label="Lens horizontal position"
          value={position.x}
          onChange={(x) => setPosition((value) => ({ ...value, x }))}
        />
        <LensSlider
          label="Lens vertical position"
          value={position.y}
          onChange={(y) => setPosition((value) => ({ ...value, y }))}
        />
        <LensSlider
          label="Lens refraction strength"
          value={strength}
          min={1}
          max={60}
          onChange={setStrength}
        />
      </div>
      <div className="reference-lens-footer">
        <div className="reference-lens-actions">
          <Button
            onClick={() => {
              setPosition({ x: 50, y: 46 });
              setStrength(30);
            }}
          >
            Reset lens
          </Button>
          <Button
            onClick={() => refresh.current()}
            disabled={status !== "ready"}
            pendingAnnouncement="Capturing the local backdrop"
          >
            Refresh captured backdrop
          </Button>
        </div>
        <p>
          Original shader by arya3d, MIT. Capture is limited to this scene and
          updates on changes.{" "}
          <a href="./licenses/arya3d-liquid-glass-MIT.txt">License</a>
        </p>
      </div>
    </section>
  );
}

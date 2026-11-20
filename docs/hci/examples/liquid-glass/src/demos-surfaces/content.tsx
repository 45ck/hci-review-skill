import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quantitative-hci/liquid-glass/avatar";
import { Button } from "@quantitative-hci/liquid-glass/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
} from "@quantitative-hci/liquid-glass/carousel";
import { createPreference } from "@quantitative-hci/liquid-glass/core";
import { cropImage } from "@quantitative-hci/liquid-glass/image";
import {
  ImageCropper,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperSelection,
  ImageCropperViewport,
  type ImageCrop,
} from "@quantitative-hci/liquid-glass/image-cropper";
import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@quantitative-hci/liquid-glass/meter";
import {
  Preferences,
  usePreference,
} from "@quantitative-hci/liquid-glass/preferences";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@quantitative-hci/liquid-glass/progress";
import {
  Resizable,
  ResizableHandle,
  ResizablePanel,
} from "@quantitative-hci/liquid-glass/resizable";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "@quantitative-hci/liquid-glass/scroll-area";
import { Separator } from "@quantitative-hci/liquid-glass/separator";
import {
  Timeline,
  TimelineConnector,
  TimelineDescription,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
} from "@quantitative-hci/liquid-glass/timeline";
import {
  Waterfall,
  WaterfallAxis,
  WaterfallBar,
  WaterfallColumnHeader,
  WaterfallHeaderRow,
  WaterfallRow,
  WaterfallRowHeader,
  type WaterfallData,
} from "@quantitative-hci/liquid-glass/waterfall";

const landscape = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="a" x2="0" y2="1"><stop stop-color="#b9d4df"/><stop offset=".62" stop-color="#f1c7ad"/><stop offset="1" stop-color="#d1b7cc"/></linearGradient><linearGradient id="b" x2="0" y2="1"><stop stop-color="#7597a8"/><stop offset="1" stop-color="#4c647c"/></linearGradient></defs><path fill="url(#a)" d="M0 0h640v420H0z"/><circle cx="460" cy="110" r="47" fill="#fff0cf"/><path d="M0 253 110 169 209 270 358 123 467 223 570 161 640 210v210H0z" fill="url(#b)"/><path d="m0 316 110-53 140 73 140-53 164 50 86-24v111H0z" fill="#758f9a"/><path d="M0 354q160-22 320 5t320-6v67H0z" fill="#bdd4d4"/><path d="M0 381q180-18 320 2t320-4" fill="none" stroke="#e4eeee" stroke-width="3"/></svg>')}`;
const portrait = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#e8c8b8"/><stop offset="1" stop-color="#b9b7d8"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><circle cx="48" cy="35" r="18" fill="#f9eee2"/><path d="M15 96V80a33 33 0 0 1 66 0v16" fill="#5e627e"/></svg>')}`;

export function AvatarDemo() {
  return (
    <div className="demo-stack">
      <div className="demo-row surface-avatar-group">
        <Avatar>
          <AvatarImage src={portrait} alt="Illustrated team member" />
          <AvatarFallback>TM</AvatarFallback>
        </Avatar>
        <Avatar aria-label="Design team">
          <AvatarFallback>DS</AvatarFallback>
        </Avatar>
        <Avatar aria-label="Research team">
          <AvatarFallback>RX</AvatarFallback>
        </Avatar>
        <span className="surface-avatar-count">+4</span>
      </div>
      <p className="demo-muted">Images, initials and shared presence.</p>
    </div>
  );
}

export function CarouselDemo() {
  return (
    <Carousel className="surface-carousel" aria-label="Material moodboard">
      <div className="demo-row surface-carousel-row">
        <CarouselPrevious aria-label="Previous moodboard image">
          <ChevronLeft aria-hidden />
        </CarouselPrevious>
        <CarouselViewport>
          <CarouselContent>
            {["Dawn", "Mist", "Dusk"].map((name, index) => (
              <CarouselItem key={name}>
                <figure className={`surface-slide surface-slide-${index}`}>
                  <img
                    src={landscape}
                    alt={`${name} colour study, illustrated mountain landscape`}
                  />
                  <figcaption>{name}</figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
        </CarouselViewport>
        <CarouselNext aria-label="Next moodboard image">
          <ChevronRight aria-hidden />
        </CarouselNext>
      </div>
    </Carousel>
  );
}

const cropHandles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
export function ImageCropperDemo() {
  const [crop, setCrop] = useState<ImageCrop>({
    x: 160,
    y: 75,
    width: 320,
    height: 240,
  });
  const [result, setResult] = useState<string>();
  const [message, setMessage] = useState(
    "Drag a handle or use its arrow keys.",
  );
  const [saving, setSaving] = useState(false);
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result);
    },
    [result],
  );
  async function saveCrop() {
    if (!crop || saving) return;
    setSaving(true);
    try {
      const file = await cropImage(landscape, crop);
      setResult(URL.createObjectURL(file));
      setMessage("Crop preview ready.");
    } catch {
      setMessage("This browser could not create the crop preview.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="demo-stack">
      <ImageCropper
        aria-label="Crop illustrated landscape"
        src={landscape}
        minWidth={64}
        minHeight={64}
        aspectRatio={4 / 3}
        crop={crop}
        onCropChange={setCrop}
      >
        <ImageCropperViewport className="surface-crop-viewport">
          <ImageCropperImage alt="Illustrated mountains at sunrise" />
          <ImageCropperSelection>
            <ImageCropperGrid />
          </ImageCropperSelection>
          {cropHandles.map((position) => (
            <ImageCropperHandle key={position} position={position} />
          ))}
        </ImageCropperViewport>
      </ImageCropper>
      <div className="demo-row">
        <Button disabled={!crop || saving} onClick={() => void saveCrop()}>
          {saving ? "Preparing…" : "Preview crop"}
        </Button>
        {result ? (
          <img
            className="surface-crop-result"
            src={result}
            alt="Cropped landscape preview"
          />
        ) : null}
      </div>
      <output className="demo-muted" aria-live="polite">
        {message}
      </output>
    </div>
  );
}

export function MeterDemo() {
  const [used, setUsed] = useState(38);
  return (
    <div className="demo-stack">
      <Meter value={used}>
        <MeterLabel>Specimen storage</MeterLabel>
        <MeterValue />
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <Button
        onClick={() =>
          setUsed((value) => (value >= 98 ? 38 : Math.min(value + 12, 100)))
        }
      >
        <Plus aria-hidden />
        {used >= 98 ? "Reset storage" : "Add sample asset"}
      </Button>
    </div>
  );
}

export function PreferencesDemo() {
  const [density] = useState(() =>
    createPreference({
      values: ["comfortable", "compact"],
      defaultValue: "comfortable",
      attribute: "data-specimen-density",
    }),
  );
  const { value } = usePreference(density);
  return (
    <Preferences preferences={[density]}>
      <div className="demo-stack">
        <div className="demo-row" role="group" aria-label="Specimen density">
          {(["comfortable", "compact"] as const).map((mode) => (
            <Button
              key={mode}
              aria-pressed={value === mode}
              onClick={(event) =>
                density.set(mode, { reason: "press", event: event.nativeEvent })
              }
            >
              {mode === "comfortable" ? "Comfortable" : "Compact"}
            </Button>
          ))}
        </div>
        <ul
          className="surface-preference-list"
          aria-label="Collection previews"
        >
          <li>
            <span className="surface-mini-dot" />
            Morning light<span>Regular</span>
          </li>
          <li>
            <span className="surface-mini-dot" />
            Evening mist<span>Clear</span>
          </li>
        </ul>
        <output className="demo-muted">Local preference: {value}</output>
      </div>
    </Preferences>
  );
}

export function ProgressDemo() {
  const [value, setValue] = useState(45);
  return (
    <div className="demo-stack">
      <Progress value={value}>
        <ProgressLabel>Sample export</ProgressLabel>
        <ProgressValue />
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <Button
        onClick={() =>
          setValue((current) =>
            current === 100 ? 0 : Math.min(100, current + 15),
          )
        }
      >
        {value === 100 ? "Start again" : "Advance export"}
      </Button>
      <p className="demo-muted">Controlled progress; no background upload.</p>
    </div>
  );
}

export function ResizableDemo() {
  return (
    <Resizable className="surface-resizable">
      <ResizablePanel defaultSize={38} minSize={25}>
        <div className="demo-stack">
          <strong>Library</strong>
          <span className="demo-muted">Materials</span>
          <span className="demo-muted">Components</span>
        </div>
      </ResizablePanel>
      <ResizableHandle aria-label="Resize library panel" />
      <ResizablePanel defaultSize={62} minSize={30}>
        <div className="demo-stack">
          <strong>Canvas</strong>
          <div className="surface-canvas-tile" aria-hidden />
          <span className="demo-muted">Drag the divider</span>
        </div>
      </ResizablePanel>
    </Resizable>
  );
}

const collectionNames = [
  "Morning light",
  "Sea glass",
  "Warm slate",
  "Soft rose",
  "Arctic blue",
  "Midnight",
  "Pale copper",
  "Lavender",
  "Ocean mist",
  "Stone",
  "Pearl",
  "Deep forest",
];
export function ScrollAreaDemo() {
  return (
    <ScrollArea className="surface-scroll-area">
      <ScrollAreaViewport
        role="region"
        aria-label="Scrollable material collection"
        tabIndex={0}
      >
        <ScrollAreaContent>
          <ul className="surface-scroll-list">
            {collectionNames.map((name, index) => (
              <li key={name}>
                <span
                  className="surface-swatch"
                  style={{
                    background: `hsl(${190 + index * 23} 30% ${70 - index * 2}%)`,
                  }}
                  aria-hidden
                />
                <span>{name}</span>
                <span className="demo-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </li>
            ))}
          </ul>
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar>
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollArea>
  );
}

export function SeparatorDemo() {
  return (
    <div className="demo-stack">
      <div>
        <strong>Material collection</strong>
        <p className="demo-muted">A small, considered set.</p>
      </div>
      <Separator />
      <div className="demo-row">
        <span>12 surfaces</span>
        <Separator orientation="vertical" />
        <span className="demo-muted">3 families</span>
      </div>
    </div>
  );
}

const timelineEvents = [
  {
    title: "Material selected",
    time: "09:00",
    description: "Regular glass with balanced tint.",
  },
  {
    title: "Layout adjusted",
    time: "09:05",
    description: "Controls grouped above the content.",
  },
  {
    title: "Interaction reviewed",
    time: "09:12",
    description: "Focus and recovery states checked.",
  },
];
export function TimelineDemo() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="demo-stack">
      <Timeline aria-label="Illustrative design session">
        {timelineEvents.slice(0, expanded ? 3 : 2).map((item) => (
          <TimelineItem key={item.title}>
            <TimelineMarker />
            <TimelineConnector />
            <TimelineTitle>{item.title}</TimelineTitle>
            <TimelineTime dateTime={`2026-11-20T${item.time}:00+11:00`}>
              {item.time}
            </TimelineTime>
            <TimelineDescription>{item.description}</TimelineDescription>
          </TimelineItem>
        ))}
      </Timeline>
      <Button onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Show less" : "Show final step"}
      </Button>
    </div>
  );
}

const requests: WaterfallData = [
  { value: "markup", label: "Document", start: 0, duration: 48 },
  { value: "css", label: "Styles", start: 20, duration: 72 },
  { value: "logic", label: "Components", start: 48, duration: 138 },
  { value: "image", label: "Landscape", start: 80, duration: 110 },
];
export function WaterfallDemo() {
  return (
    <div className="demo-stack">
      <Waterfall
        className="surface-waterfall"
        aria-label="Illustrative resource loading, milliseconds"
        items={requests}
        getBarLabel={(request, { start, duration }) =>
          `${request.label}: begins at ${start}, duration ${duration}`
        }
      >
        <WaterfallHeaderRow>
          <WaterfallColumnHeader>Resource</WaterfallColumnHeader>
          <WaterfallColumnHeader aria-label="Time in milliseconds">
            <WaterfallAxis maxTicks={3} />
          </WaterfallColumnHeader>
        </WaterfallHeaderRow>
        {requests.map((request) => (
          <WaterfallRow key={request.value} value={request.value}>
            <WaterfallRowHeader>{request.label}</WaterfallRowHeader>
            <WaterfallBar />
          </WaterfallRow>
        ))}
      </Waterfall>
      <p className="demo-muted">Illustrative timings, not benchmark results.</p>
    </div>
  );
}

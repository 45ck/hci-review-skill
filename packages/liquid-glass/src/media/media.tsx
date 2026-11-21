"use client";

import { useId, type CSSProperties } from "react";
import { Button } from "@ui-sdk/react/button";
import {
  Carousel,
  CarouselContent,
  CarouselIndicator,
  CarouselIndicatorGroup,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
} from "@ui-sdk/react/carousel";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/react/dialog";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import { Toggle } from "@ui-sdk/react/toggle";
import { LiquidIcon } from "../icons";
import { ValidationBadge } from "../validation";

export interface LiquidMediaAsset {
  id: string;
  title: string;
  src: string;
  srcSet?: string;
  alt: string;
  description: string;
  kind: string;
  width: number;
  height: number;
  credit?: string;
}

function ArtworkImage({
  asset,
  className,
  decorative = false,
  eager = false,
  sizes = "(max-width: 720px) 100vw, 70vw",
}: {
  asset: LiquidMediaAsset;
  className?: string;
  decorative?: boolean;
  eager?: boolean;
  sizes?: string;
}) {
  return (
    <img
      className={className}
      src={asset.src}
      srcSet={asset.srcSet}
      sizes={sizes}
      alt={decorative ? "" : asset.alt}
      width={asset.width}
      height={asset.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}

export interface LiquidImageCardProps {
  asset: LiquidMediaAsset;
  headline?: string;
  summary?: string;
  eyebrow?: string;
}

export function LiquidImageCard({
  asset,
  headline = asset.title,
  summary = asset.description,
  eyebrow = "Featured story",
}: LiquidImageCardProps) {
  return (
    <article className="qg-media-feature" data-custom-component="image-card" data-validation="unvalidated">
      <div className="qg-media-feature-image">
        <ArtworkImage asset={asset} eager />
        <span className="qg-media-image-caption">{asset.kind}</span>
      </div>
      <div className="qg-media-feature-copy" data-liquid-glass="" data-liquid-kind="panel">
        <div className="qg-media-heading-line"><span className="qg-media-eyebrow">{eyebrow}</span><ValidationBadge /></div>
        <h3>{headline}</h3>
        <p>{summary}</p>
        <Dialog>
          <DialogTrigger data-variant="solid">Explore {asset.title}</DialogTrigger>
          <DialogBackdrop />
          <DialogContent className="qg-media-dialog" keepMounted>
            <div className="qg-media-heading-line"><DialogTitle>{asset.title} story</DialogTitle><ValidationBadge /></div>
            <DialogDescription>{asset.description}</DialogDescription>
            <ArtworkImage asset={asset} className="qg-media-dialog-image" />
            {asset.credit && <p className="qg-media-credit">{asset.credit}</p>}
            <DialogClose>Close image story</DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

export interface LiquidMediaGalleryProps {
  assets: readonly LiquidMediaAsset[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  savedIds: readonly string[];
  onSavedChange: (id: string, saved: boolean) => void;
  label?: string;
}

export function LiquidMediaGallery({
  assets,
  selectedId,
  onSelectedIdChange,
  savedIds,
  onSavedChange,
  label = "Artwork collection",
}: LiquidMediaGalleryProps) {
  const selectedIndex = Math.max(0, assets.findIndex((asset) => asset.id === selectedId));
  const selected = assets[selectedIndex];
  const captionId = useId();
  if (!selected) return <div className="qg-media-empty" data-custom-component="media-gallery" data-validation="unvalidated"><ValidationBadge /><p>No images in this collection.</p></div>;
  const saved = savedIds.includes(selected.id);

  return (
    <article
      className="qg-media-gallery"
      data-custom-component="media-gallery"
      data-validation="unvalidated"
      data-selected-image={selected.id}
    >
      <div className="qg-media-heading-line"><h3>Image gallery</h3><ValidationBadge /></div>
      <p className="qg-media-lead">A collection with thumbnails, a closer look, and a saved state.</p>
      <Carousel
        aria-label={label}
        className="qg-media-carousel"
        page={selectedIndex + 1}
        playing={false}
        onPageChange={(page) => {
          const next = assets[page - 1];
          if (next) onSelectedIdChange(next.id);
        }}
      >
        <CarouselViewport className="qg-media-viewport">
          <CarouselContent className="qg-media-slides">
            {assets.map((asset) => (
              <CarouselItem key={asset.id} className="qg-media-slide" aria-label={asset.title}>
                <ArtworkImage asset={asset} eager={asset.id === selected.id} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </CarouselViewport>
        <div className="qg-media-gallery-caption" id={captionId}>
          <div><span className="qg-media-eyebrow">{selected.kind} · {selectedIndex + 1} / {assets.length}</span><h4>{selected.title}</h4></div>
          <div className="qg-media-paging">
            <CarouselPrevious aria-label="Previous artwork">Previous</CarouselPrevious>
            <CarouselNext aria-label="Next artwork">Next</CarouselNext>
          </div>
        </div>
        <CarouselIndicatorGroup aria-label="Choose artwork" className="qg-media-thumbnails">
          {assets.map((asset, index) => (
            <CarouselIndicator key={asset.id} page={index + 1} aria-label={asset.title} className="qg-media-thumbnail">
              <ArtworkImage asset={asset} decorative sizes="160px" />
              <span>{asset.title}</span>
            </CarouselIndicator>
          ))}
        </CarouselIndicatorGroup>
      </Carousel>
      <div className="qg-media-actions">
        <Dialog>
          <DialogTrigger aria-describedby={captionId}>Inspect selected image</DialogTrigger>
          <DialogBackdrop />
          <DialogContent className="qg-media-dialog" keepMounted>
            <div className="qg-media-heading-line"><DialogTitle>Artwork details</DialogTitle><ValidationBadge /></div>
            <DialogDescription>Inspect the selected artwork and its description.</DialogDescription>
            <ArtworkImage asset={selected} className="qg-media-dialog-image" />
            <h3 className="qg-media-dialog-artwork-title">{selected.title}</h3>
            <p>{selected.description}</p>
            <dl className="qg-media-metadata"><div><dt>Format</dt><dd>{selected.width} × {selected.height}</dd></div><div><dt>Collection</dt><dd>{selected.kind}</dd></div></dl>
            {selected.credit && <p className="qg-media-credit">{selected.credit}</p>}
            <DialogClose>Close artwork details</DialogClose>
          </DialogContent>
        </Dialog>
        <Toggle aria-label="Save selected artwork" pressed={saved} onPressedChange={(next) => onSavedChange(selected.id, next)}>
          <LiquidIcon name={saved ? "check" : "bookmark"} size={20} />
          <span>{saved ? "Saved artwork" : "Save artwork"}</span>
        </Toggle>
      </div>
      <p className="qg-media-save-status" role="status" aria-live="polite">{saved ? `${selected.title} saved for this visit.` : `${savedIds.length} saved in this visit.`}</p>
    </article>
  );
}

export interface LiquidImageComparisonProps {
  before: LiquidMediaAsset;
  after: LiquidMediaAsset;
  value: number;
  onValueChange: (value: number) => void;
  beforeLabel?: string;
  afterLabel?: string;
  label?: string;
}

export function LiquidImageComparison({
  before,
  after,
  value,
  onValueChange,
  beforeLabel = before.title,
  afterLabel = after.title,
  label = "Image reveal",
}: LiquidImageComparisonProps) {
  const boundedValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
  const descriptionId = useId();
  return (
    <article className="qg-media-comparison" data-custom-component="image-comparison" data-validation="unvalidated" data-reveal={boundedValue}>
      <div className="qg-media-heading-line"><h3>Image comparison</h3><ValidationBadge /></div>
      <p className="qg-media-lead">Explore two visual directions with a shared reveal control.</p>
      <figure className="qg-media-reveal" style={{ "--qg-reveal": `${boundedValue}%` } as CSSProperties} aria-describedby={descriptionId}>
        <ArtworkImage asset={after} className="qg-media-reveal-after" />
        <ArtworkImage asset={before} className="qg-media-reveal-before" />
        <div className="qg-media-reveal-divider" aria-hidden="true"><span>↔</span></div>
        <figcaption className="qg-media-reveal-labels"><span>{beforeLabel}</span><span>{afterLabel}</span></figcaption>
      </figure>
      <Field>
        <Slider value={boundedValue} onValueChange={(next) => { if (typeof next === "number") onValueChange(next); }} min={0} max={100} step={1}>
          <div className="qg-media-heading-line"><FieldLabel>{label}</FieldLabel><span className="qg-media-reveal-value"><SliderValue />%</span></div>
          <SliderControl><SliderTrack><SliderIndicator /><SliderThumb /></SliderTrack></SliderControl>
        </Slider>
        <FieldDescription id={descriptionId}>{beforeLabel} covers {boundedValue}% of the frame. Use arrow keys or choose a preset.</FieldDescription>
      </Field>
      <div className="qg-media-reveal-presets">
        <Button onClick={() => onValueChange(100)}>Show {beforeLabel.toLowerCase()}</Button>
        <Button onClick={() => onValueChange(50)}>Split evenly</Button>
        <Button onClick={() => onValueChange(0)}>Show {afterLabel.toLowerCase()}</Button>
      </div>
    </article>
  );
}

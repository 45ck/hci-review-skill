import { useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Bookmark, Check, Layers2, MousePointer2, Sparkles } from "lucide-react";
import { LiquidClickFeedback, LiquidContextMenu, LiquidCursor, LiquidMagnetic, type LiquidClickEffect, type LiquidCursorVariant } from "@quantitative-hci/liquid-glass/interactions";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/interactions.css";
import "./interactions-showcase.css";

export function InteractionsShowcase() {
  const [cursor, setCursor] = useState<LiquidCursorVariant>("glass");
  const [effect, setEffect] = useState<LiquidClickEffect>("ripple");
  const [palette, setPalette] = useState("cool");
  const [saved, setSaved] = useState(false);
  const [copies, setCopies] = useState(1);
  const [name, setName] = useState("Coastal study");
  const [drafts, setDrafts] = useState(0);
  const pending = useRef(false);
  const title = name.trim() || "Untitled study";
  const reset = () => { setPalette("cool"); setSaved(false); setCopies(1); };
  const saveDraft = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      setDrafts(value => value + 1);
    } finally { pending.current = false; }
  };

  return <div className="interaction-showcase" data-kit-view="interactions" data-validation="unvalidated">
    <header className="interaction-intro">
      <div><p className="interaction-eyebrow">Cursors · clicks · context</p><h2>Make every action feel deliberate.</h2></div>
      <div className="interaction-intro-note"><p>Move over the scene. Try a right-click. Give the controls a different feel.</p><ValidationBadge /></div>
    </header>
    <div className="interaction-settings" data-liquid-glass="" data-liquid-kind="panel">
      <Field><FieldLabel>Cursor style</FieldLabel><SegmentedControl value={cursor} onValueChange={value => { if (value === "glass" || value === "precision" || value === "native") setCursor(value); }}>
        <SegmentedControlIndicator /><SegmentedControlItem value="glass">Glass</SegmentedControlItem><SegmentedControlItem value="precision">Precision</SegmentedControlItem><SegmentedControlItem value="native">Native</SegmentedControlItem>
      </SegmentedControl></Field>
      <Field><FieldLabel>Click response</FieldLabel><SegmentedControl value={effect} onValueChange={value => { if (value === "ripple" || value === "spark" || value === "none") setEffect(value); }}>
        <SegmentedControlIndicator /><SegmentedControlItem value="ripple">Ripple</SegmentedControlItem><SegmentedControlItem value="spark">Spark</SegmentedControlItem><SegmentedControlItem value="none">None</SegmentedControlItem>
      </SegmentedControl></Field>
    </div>
    <LiquidCursor variant={cursor}>
      <LiquidClickFeedback effect={effect}>
        <div className="interaction-workspace">
          <LiquidContextMenu label={title} triggerLabel="Scene actions" actions={[
            { id: "palette", label: "Change scene palette" },
            { id: "save", label: "Save scene to collection", disabled: saved },
            { id: "duplicate", label: "Duplicate scene", disabled: copies >= 3 },
            { id: "reset", label: "Reset scene", disabled: palette === "cool" && !saved && copies === 1 },
            { id: "publish", label: "Publish scene", disabled: true },
          ]} onAction={action => {
            if (action === "palette") setPalette(value => value === "cool" ? "warm" : "cool");
            if (action === "save") setSaved(true);
            if (action === "duplicate") setCopies(value => Math.min(3, value + 1));
            if (action === "reset") reset();
          }}>
            <div className="interaction-scene" data-palette={palette} data-scene-count={copies} data-cursor-media="" data-cursor-label="Explore">
              <img className="interaction-landscape" src="/media/emerald-coast.webp" alt="An emerald coast with limestone cliffs and turquoise water." width="1200" height="800" />
              <div className="interaction-scene-top"><span>Landscape collection</span><span className="interaction-scene-count"><Layers2 size={15} aria-hidden="true" />{copies} {copies === 1 ? "study" : "studies"}</span></div>
              <div className="interaction-scene-caption"><span>Concept artwork</span><h3>{title}</h3><p>{palette === "cool" ? "Sea glass & morning light" : "Amber light & warm stone"}</p></div>
              {saved && <span className="interaction-saved"><Check size={15} aria-hidden="true" />In your collection</span>}
              {copies > 1 && <div className="interaction-copies" aria-hidden="true">{Array.from({ length: copies - 1 }, (_, index) => index + 2).map(copy => <span key={`study-${copy}`}><img src="/media/emerald-coast-small.webp" alt="" />Study {copy}</span>)}</div>}
            </div>
          </LiquidContextMenu>
          <aside className="interaction-controls" data-liquid-glass="" data-liquid-kind="panel" aria-label="Study controls">
            <div className="interaction-controls-heading"><MousePointer2 size={22} aria-hidden="true" /><h3>Try it on real controls.</h3></div>
            <Field><FieldLabel>Study name</FieldLabel><Input value={name} onValueChange={(value, details) => { if (value.length > 70) { details.cancel(); return; } setName(value); }} maxLength={70} /></Field>
            <Button data-variant="primary" data-cursor-label="Save" disabled={saved} focusableWhenDisabled onClick={() => setSaved(true)}>
              <LiquidMagnetic><Bookmark size={20} /></LiquidMagnetic>Save study
            </Button>
            <Button data-cursor-label="Change" onClick={() => setPalette(value => value === "cool" ? "warm" : "cool")}><LiquidMagnetic><Sparkles size={20} /></LiquidMagnetic>Switch light</Button>
            <Button data-cursor-label="Draft" onClick={saveDraft} pendingAnnouncement="Saving local sample"><span data-show="idle">Save local draft</span><span data-show="pending">Saving local draft…</span></Button>
            <Button disabled>Publish study</Button>
            <output className="interaction-state" aria-label="Scene changes" aria-live="polite" data-scene-count={copies} data-scene-saved={saved}>
              <strong>{palette === "cool" ? "Cool" : "Warm"} palette</strong><span>{copies} {copies === 1 ? "study" : "studies"} · {saved ? "Saved to collection" : "Not saved"}</span>
            </output>
            <output className="interaction-draft-count" aria-label="Saved draft count" aria-live="polite">{drafts} local {drafts === 1 ? "draft" : "drafts"} saved</output>
            <p className="interaction-local-note">A local sample. Changes stay in this page.</p>
          </aside>
        </div>
      </LiquidClickFeedback>
    </LiquidCursor>
    <div className="interaction-footnote"><p>Keyboard: focus the scene and press <kbd>Shift</kbd> + <kbd>F10</kbd>. Touch: hold the scene or use <strong>Scene actions</strong>.</p><p>The cursor is decorative. Text fields keep their native pointer, and every action works without an effect.</p></div>
  </div>;
}

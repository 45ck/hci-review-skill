import { useState } from "react";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import "@quantitative-hci/liquid-glass/kit.css";

export default function LiquidGlassTemplate() {
  const [name, setName] = useState("My project");
  const [saved, setSaved] = useState("");
  return (
    <LiquidGlassProvider
      backdrop={
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(ellipse at 80% 20%, #92c8df 0%, transparent 55%), linear-gradient(145deg, #e3f0f8 10%, #bad9e7 55%, #eed9c6 100%)",
          }}
        />
      }
      refraction={0.3}
      dispersion={0.008}
      motion="system"
      transparency="system"
      fontSet="studio"
      iconSet="isometric"
    >
      <main style={{ maxWidth: 540, margin: "10vh auto", padding: 24 }}>
        <section
          data-liquid-glass=""
          data-liquid-kind="panel"
          style={{ padding: 28, display: "grid", gap: 20 }}
        >
          <h1 style={{ margin: 0 }}>Your workspace</h1>
          <Field>
            <FieldLabel>Project name</FieldLabel>
            <Input value={name} onValueChange={setName} />
          </Field>
          <Button onClick={() => setSaved(name)}>
            <LiquidIcon name="folder" />
            Save project
          </Button>
          <output aria-live="polite">{saved ? "Saved " + saved : ""}</output>
        </section>
      </main>
    </LiquidGlassProvider>
  );
}

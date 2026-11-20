import { useState } from "react";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
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
              "repeating-linear-gradient(125deg, #c2dfee 0px, #8db7cc 100px, #e7cfb6 210px, #dcebf2 320px)",
          }}
        />
      }
      refraction={0.3}
      dispersion={0.008}
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
          <Button onClick={() => setSaved(name)}>Save project</Button>
          <output aria-live="polite">{saved ? "Saved " + saved : ""}</output>
        </section>
      </main>
    </LiquidGlassProvider>
  );
}

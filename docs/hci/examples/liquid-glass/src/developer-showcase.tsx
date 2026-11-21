import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Textarea } from "@ui-sdk/react/textarea";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { LiquidDiagram, diagramToSvg, type DiagramModel } from "@quantitative-hci/liquid-glass/developer";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import { diagramModels } from "./developer-models";
import "@quantitative-hci/liquid-glass/developer.css";
import "./developer-showcase.css";

export function DeveloperShowcase({ models, onModelsChange }: {
  models: DiagramModel[];
  onModelsChange: Dispatch<SetStateAction<DiagramModel[]>>;
}) {
  const [modelId, setModelId] = useState(diagramModels[0].id);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const model = models.find((item) => item.id === modelId) ?? models[0];
  const selectedId = selection[model.id] ?? model.nodes[0]?.id;
  const selected = model.nodes.find((node) => node.id === selectedId) ?? model.nodes[0];
  const draftKey = `${model.id}/${selected?.id}`;
  const draft = drafts[draftKey] ?? selected?.name ?? "";
  const modelJson = JSON.stringify(model, null, 2);

  const applyLabel = () => {
    const name = draft.trim();
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
      setError("Enter a label of 1–80 characters without control characters.");
      setFeedback("");
      return;
    }
    if (model.nodes.some((node) => node.id !== selected?.id && node.name === name)) {
      setError("Use a distinct label within this model.");
      setFeedback("");
      return;
    }
    onModelsChange((current) => current.map((item) => item.id === model.id ? {
      ...item,
      nodes: item.nodes.map((node) => node.id === selected.id ? { ...node, name } : node),
    } : item));
    setDrafts((current) => ({ ...current, [draftKey]: name }));
    setError("");
    setFeedback(`Applied label: ${name}. Relationships keep the same element IDs.`);
  };

  return (
    <div className="developer-showcase" data-kit-view="developer" data-validation="unvalidated">
      <div className="developer-intro">
        <p>Make architecture tangible. Select an element, follow its relationships, and adapt the model with the same controls a person or agent uses.</p>
        <p className="developer-validation-note"><ValidationBadge /> These custom components have not been reviewed or approved by a human UI/UX team.</p>
      </div>
      <section className="developer-model-panel" data-liquid-glass="" data-liquid-kind="panel" aria-label="Diagram examples">
        <div className="developer-model-controls">
          <div className="developer-model-choice">
            <Select value={model.id} items={models.map((item) => ({ value: item.id, label: item.name }))} onValueChange={(value) => {
              if (typeof value === "string" && models.some((item) => item.id === value)) {
                setModelId(value);
                setError("");
                setFeedback("");
              }
            }}>
              <SelectLabel>Diagram model</SelectLabel>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="developer-export-actions">
            <Button onClick={async () => {
              try {
                await navigator.clipboard.writeText(modelJson);
                setFeedback("Diagram JSON copied. It contains the current element labels and relationships.");
              } catch {
                setFeedback("Clipboard unavailable. Open Model data to select and copy the JSON.");
              }
            }}><LiquidIcon name="copy" size={20} />Copy diagram JSON</Button>
            <Button onClick={() => {
              const url = URL.createObjectURL(new Blob([diagramToSvg(model)], { type: "image/svg+xml;charset=utf-8" }));
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `${model.id}.svg`;
              document.body.append(anchor);
              anchor.click();
              anchor.remove();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              setFeedback("Diagram SVG download prepared from the current model.");
            }}>Download diagram SVG</Button>
          </div>
        </div>
        <LiquidDiagram
          model={model}
          selectedId={selected?.id}
          onSelectionChange={(id) => {
            setSelection((current) => ({ ...current, [model.id]: id }));
            setError("");
            setFeedback("");
          }}
        />
      </section>
      <section className="developer-edit-panel" data-liquid-glass="" data-liquid-kind="panel" data-validation="unvalidated" aria-labelledby="developer-edit-heading">
        <div className="developer-edit-heading">
          <h2 id="developer-edit-heading">Adapt this example</h2>
          <ValidationBadge />
        </div>
        <p>Rename the selected element. Diagram labels, element choices, relationship endpoint names and JSON/SVG exports update together. Example descriptions remain as written. Your model changes stay while you explore the kit; reloading starts fresh.</p>
        <form className="developer-label-form" onSubmit={(event) => { event.preventDefault(); applyLabel(); }} noValidate>
          <Field invalid={Boolean(error)}>
            <FieldLabel>Element label</FieldLabel>
            <Input value={draft} maxLength={80} onValueChange={(value) => {
              setDrafts((current) => ({ ...current, [draftKey]: value }));
              setError("");
              setFeedback("");
            }} />
            <FieldDescription>Selected element: {selected?.id}. Use 1–80 characters.</FieldDescription>
            {error && <FieldError role="alert" data-developer-error="">{error}</FieldError>}
          </Field>
          <Button type="submit" data-variant="solid">Apply element label</Button>
        </form>
        <output className="developer-feedback" data-developer-feedback="" aria-live="polite">{feedback}</output>
      </section>
      <Collapsible className="developer-data-panel" aria-label="Model data">
        <CollapsibleTrigger><LiquidIcon name="code" size={20} />Model data</CollapsibleTrigger>
        <CollapsiblePanel>
          <Field>
            <FieldLabel>Diagram JSON</FieldLabel>
            <Textarea readOnly value={modelJson} rows={12} spellCheck={false} />
            <FieldDescription>The same typed model drives the picture and its text. This example schema is not UML XMI.</FieldDescription>
          </Field>
          <code>import {"{ LiquidDiagram }"} from "@quantitative-hci/liquid-glass/developer";</code>
        </CollapsiblePanel>
      </Collapsible>
      <div className="developer-notation-note">
        <strong>Notation sources</strong>
        <p>A focused subset of <a href="https://www.omg.org/spec/UML/2.5.1" target="_blank" rel="noreferrer">OMG UML 2.5.1</a> and the LMU UWE <a href="https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html" target="_blank" rel="noreferrer">navigation</a> and <a href="https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html" target="_blank" rel="noreferrer">presentation</a> profiles. Supports the notation shown in the examples; it is not a complete UML editor or an OMG certification claim.</p>
      </div>
    </div>
  );
}

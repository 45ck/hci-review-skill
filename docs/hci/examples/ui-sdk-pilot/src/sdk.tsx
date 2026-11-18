import { createRoot } from "react-dom/client";
import { createAgent } from "@ui-sdk/react/agent";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { acceptsChange, policyFromSearch, regions, retentions } from "./model";
import { Layout, useSettings } from "./shared";
import "./styles.css";

const policy = policyFromSearch(window.location.search);
const bridge = createAgent({
  allow: (step) => {
    if (policy.readOnly || step.confirm) return false;
    if (step.component === "button" && step.label === "Save settings") {
      return step.action === "press" && step.args.length === 0;
    }
    if (step.args.length !== 1) return false;
    if (step.component === "select" && step.action === "setValue") {
      if (step.label === "Region") return regions.some((item) => item.value === step.args[0]);
      if (step.label === "Retention") return retentions.some((item) => item.value === step.args[0]);
    }
    return step.component === "checkbox" && step.label === "Weekly digest" && step.action === "setChecked" && typeof step.args[0] === "boolean";
  },
});

Object.defineProperty(window, "uiSdkAgent", {
  value: Object.freeze({ snapshot: bridge.snapshot, act: bridge.act }),
  writable: false,
});

function App() {
  const { state, dispatch, canSave } = useSettings(policy);
  return (
    <Layout variant="UI SDK controls" policy={policy} state={state}>
      <form aria-label="Project settings" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "save" }); }}>
        <div className="field">
          <Select name="region" items={regions.map((item) => ({ ...item }))} value={state.draft.region} disabled={policy.readOnly} onValueChange={(value, details) => {
            const change = { field: "region" as const, value };
            if (!acceptsChange(policy, change)) { details.cancel(); return; }
            dispatch({ type: "change", change });
          }}>
            <SelectLabel>Region</SelectLabel>
            <SelectTrigger className="glass-control select-trigger"><SelectValue /><span aria-hidden="true">⌄</span></SelectTrigger>
            <SelectContent className="select-content">
              {regions.map((item) => <SelectItem className="select-item" key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="field">
          <Select name="retention" items={retentions.map((item) => ({ ...item }))} value={state.draft.retention} disabled={policy.readOnly} onValueChange={(value, details) => {
            const change = { field: "retention" as const, value };
            if (!acceptsChange(policy, change)) { details.cancel(); return; }
            dispatch({ type: "change", change });
          }}>
            <SelectLabel>Retention</SelectLabel>
            <SelectTrigger className="glass-control select-trigger"><SelectValue /><span aria-hidden="true">⌄</span></SelectTrigger>
            <SelectContent className="select-content">
              {retentions.map((item) => <SelectItem className="select-item" key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="checkbox-row">
          <Checkbox name="digest" className="checkbox-control sdk-checkbox" disabled={policy.readOnly} checked={state.draft.digest} onCheckedChange={(value, details) => {
            const change = { field: "digest" as const, value };
            if (!acceptsChange(policy, change)) { details.cancel(); return; }
            dispatch({ type: "change", change });
          }}><CheckboxIndicator aria-hidden="true">✓</CheckboxIndicator></Checkbox>
          <span>Weekly digest</span>
        </label>
        <Button type="submit" className="glass-control save-button" disabled={!canSave}>Save settings</Button>
      </form>
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

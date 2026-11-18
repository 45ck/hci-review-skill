import { createRoot } from "react-dom/client";
import { policyFromSearch, regions, retentions } from "./model";
import { Layout, useSettings } from "./shared";
import "./styles.css";

const policy = policyFromSearch(window.location.search);

function App() {
  const { state, dispatch, canSave } = useSettings(policy);
  return (
    <Layout variant="Native controls" policy={policy} state={state}>
      <form aria-label="Project settings" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "save" }); }}>
        <div className="field">
          <label htmlFor="region">Region</label>
          <select id="region" name="region" className="glass-control" disabled={policy.readOnly} value={state.draft.region} onChange={(event) => dispatch({ type: "change", change: { field: "region", value: event.target.value } })}>
            {regions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="retention">Retention</label>
          <select id="retention" name="retention" className="glass-control" disabled={policy.readOnly} value={state.draft.retention} onChange={(event) => dispatch({ type: "change", change: { field: "retention", value: event.target.value } })}>
            {retentions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <label className="checkbox-row" htmlFor="digest">
          <input id="digest" name="digest" type="checkbox" className="checkbox-control" disabled={policy.readOnly} checked={state.draft.digest} onChange={(event) => dispatch({ type: "change", change: { field: "digest", value: event.target.checked } })} />
          <span>Weekly digest</span>
        </label>
        <button type="submit" className="glass-control save-button" disabled={!canSave}>Save settings</button>
      </form>
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

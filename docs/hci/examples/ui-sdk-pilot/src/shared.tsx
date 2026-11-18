import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";
import { initialState, isDirty, reduceSettings } from "./model";
import type { Policy, State } from "./model";

declare global {
  interface Window {
    pilotReady: boolean;
  }
}

export function useSettings(policy: Policy) {
  const [state, dispatch] = useReducer(
    (state: State, action: Parameters<typeof reduceSettings>[1]) =>
      reduceSettings(state, action, policy),
    undefined,
    initialState,
  );
  useEffect(() => {
    window.pilotReady = true;
  }, []);
  return { state, dispatch, canSave: !policy.readOnly && isDirty(state) };
}

export function Layout({
  variant,
  policy,
  state,
  children,
}: {
  variant: string;
  policy: Policy;
  state: State;
  children: ReactNode;
}) {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Quantitative HCI / UI SDK pilot</p>
        <h1>Project settings</h1>
        <p className="intro">Choose where this example project runs and what it keeps.</p>
        <p className="variant">{variant} · Synthetic project</p>
      </header>
      <div className="workbench">
        <section className="settings-panel" aria-label="Settings">
          <h2>Preferences</h2>
          {policy.readOnly && <p className="policy-note">Read-only view. Changes and saves are unavailable.</p>}
          {policy.rejectLongRetention && <p className="policy-note">This project allows up to 90 days of retention.</p>}
          {children}
          <p className="local-note">Changes stay in this browser tab. Reload to start again.</p>
        </section>
        <section className="evidence-panel" aria-labelledby="evidence-title">
          <h2 id="evidence-title">Saved project</h2>
          <p className="status" role="status">{isDirty(state) ? "Unsaved changes" : "All changes saved"}</p>
          <dl className="summary">
            <div><dt>Successful saves</dt><dd><output data-testid="save-count">{state.saveCount}</output></dd></div>
          </dl>
          <h3>Saved settings</h3>
          <output className="state-output" data-testid="saved-state">{JSON.stringify(state.saved)}</output>
          <h3>Current selections</h3>
          <output className="state-output" data-testid="draft-state">{JSON.stringify(state.draft)}</output>
        </section>
      </div>
    </main>
  );
}

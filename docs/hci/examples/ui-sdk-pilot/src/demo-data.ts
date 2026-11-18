export type View = "compare" | "agent" | "readonly" | "rejection" | "results";
export type Settings = { region: string; retention: string; digest: boolean };
export type Step = { ref: string; action: "setValue" | "setChecked" | "press"; args?: (string | boolean)[] };
export type Task = { id: string; title: string; description: string; steps: Step[]; expected: Settings; saves: number };
export const INITIAL: Settings = { region: "sydney", retention: "30", digest: false };
const FULL: Settings = { region: "singapore", retention: "90", digest: true };
const select = (ref: string, value: string): Step => ({ ref, action: "setValue", args: [value] });
const digest = (value: boolean): Step => ({ ref: "Weekly digest", action: "setChecked", args: [value] });
const save: Step = { ref: "Save settings", action: "press" };
const setFull = [select("Region", "singapore"), select("Retention", "90"), digest(true)];
export const TASKS: Task[] = [
  { id: "T1", title: "Change region", description: "Move the project to Frankfurt, then save once.", steps: [select("Region", "frankfurt"), save], expected: { ...INITIAL, region: "frankfurt" }, saves: 1 },
  { id: "T2", title: "Change retention", description: "Keep data for 90 days, then save once.", steps: [select("Retention", "90"), save], expected: { ...INITIAL, retention: "90" }, saves: 1 },
  { id: "T3", title: "Enable digest", description: "Turn on the weekly digest, then save once.", steps: [digest(true), save], expected: { ...INITIAL, digest: true }, saves: 1 },
  { id: "T4", title: "Change everything", description: "Choose Singapore, 90 days and a weekly digest, then save.", steps: [...setFull, save], expected: FULL, saves: 1 },
  { id: "T5", title: "Restore without saving", description: "Change all three fields, then restore the originals without saving. Save is disabled at the end.", steps: [...setFull, select("Region", "sydney"), select("Retention", "30"), digest(false)], expected: INITIAL, saves: 0 },
  { id: "T6", title: "Save twice", description: "Save all three changes, then return the region to Sydney and save again.", steps: [...setFull, save, select("Region", "sydney"), save], expected: { ...FULL, region: "sydney" }, saves: 2 },
];
export const NAV: { id: View; label: string; number: string }[] = [
  { id: "compare", label: "Compare controls", number: "01" },
  { id: "agent", label: "Agent actions", number: "02" },
  { id: "readonly", label: "Read-only", number: "03" },
  { id: "rejection", label: "Rejected change", number: "04" },
  { id: "results", label: "All results", number: "05" },
];
export const REPO = "https://github.com/45ck/hci-review-skill";
export const REPORT = `${REPO}/blob/1cc2e82d2f75dfcd1366c377cb69667baede1ea5/docs/hci/models/ui-sdk-pilot-results.md`;
export const CANONICAL_RUN = `${REPO}/actions/runs/44400965977`;
export const METRICS = [
  { id: "desktop", name: "Desktop", dimensions: "1280 × 800", native: 97.3, sdk: 171.9, bridge: 256.9 },
  { id: "mobile", name: "Mobile", dimensions: "390 × 844", native: 96.5, sdk: 172.3, bridge: 258.5 },
  { id: "reduced-motion", name: "Reduced motion", dimensions: "390 × 844", native: 97.8, sdk: 161.8, bridge: 259.2 },
];

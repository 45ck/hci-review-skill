export const regions = [
  { value: "sydney", label: "Sydney" },
  { value: "frankfurt", label: "Frankfurt" },
  { value: "singapore", label: "Singapore" },
] as const;

export const retentions = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "365 days" },
] as const;

export type Settings = {
  region: string;
  retention: string;
  digest: boolean;
};

export type Policy = { readOnly: boolean; rejectLongRetention: boolean };
export type State = { draft: Settings; saved: Settings; saveCount: number };
export type Change = { field: keyof Settings; value: unknown };
export type Action = { type: "change"; change: Change } | { type: "save" };

export function policyFromSearch(search: string): Policy {
  const params = new URLSearchParams(search);
  return {
    readOnly: params.get("readonly") === "1",
    rejectLongRetention: params.get("reject") === "1",
  };
}

export function initialState(): State {
  const initial = { region: "sydney", retention: "30", digest: false };
  return { draft: { ...initial }, saved: { ...initial }, saveCount: 0 };
}

export function acceptsChange(policy: Policy, change: Change): boolean {
  if (policy.readOnly) return false;
  if (change.field === "region") {
    return regions.some((item) => item.value === change.value);
  }
  if (change.field === "retention") {
    return (
      retentions.some((item) => item.value === change.value) &&
      !(policy.rejectLongRetention && change.value === "365")
    );
  }
  return change.field === "digest" && typeof change.value === "boolean";
}

export function isDirty(state: State): boolean {
  return (
    state.draft.region !== state.saved.region ||
    state.draft.retention !== state.saved.retention ||
    state.draft.digest !== state.saved.digest
  );
}

export function reduceSettings(state: State, action: Action, policy: Policy): State {
  if (action.type === "change") {
    if (!acceptsChange(policy, action.change)) return state;
    return {
      ...state,
      draft: { ...state.draft, [action.change.field]: action.change.value },
    };
  }
  if (policy.readOnly || !isDirty(state)) return state;
  if (
    !acceptsChange(policy, { field: "region", value: state.draft.region }) ||
    !acceptsChange(policy, { field: "retention", value: state.draft.retention }) ||
    !acceptsChange(policy, { field: "digest", value: state.draft.digest })
  ) return state;
  return { ...state, saved: { ...state.draft }, saveCount: state.saveCount + 1 };
}

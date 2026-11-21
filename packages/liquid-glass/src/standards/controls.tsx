"use client";

import type { ChangeDetails } from "@ui-sdk/core";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";

export interface ModelChoiceItem {
  value: string;
  label: string;
}

export interface ModelChoiceProps {
  label: string;
  value: string | null;
  items: readonly ModelChoiceItem[];
  onChange: (value: string, details: ChangeDetails<string>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

export function ModelChoice({ label, value, items, onChange, disabled, readOnly, placeholder = "Choose a view" }: ModelChoiceProps) {
  return <Select value={value} items={[...items]} disabled={disabled} readOnly={readOnly}
    onValueChange={(next, details) => { if (typeof next === "string") onChange(next, details); }}>
    <SelectLabel>{label}</SelectLabel>
    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}

export const modelKindLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());

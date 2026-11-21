"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button, type ButtonActionDetails } from "@ui-sdk/react/button";
import { Command, CommandEmpty, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandItemText, CommandList, CommandShortcut, type CommandActionDetails, type CommandOptions } from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogShortcut, DialogTitle, DialogTrigger, createDialogController } from "@ui-sdk/react/dialog";
import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger, type DrawerProps } from "@ui-sdk/react/drawer";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input, type InputOptions } from "@ui-sdk/react/input";
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue, type SelectProps } from "@ui-sdk/react/select";
import { Toolbar, ToolbarButton } from "@ui-sdk/react/toolbar";

export type LiquidCommand = {
  id: string;
  label: string;
  icon?: ReactNode;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  requiresConfirmation?: string;
};
export type LiquidCommandGroup = { id: string; label: string; items: readonly LiquidCommand[] };
export type LiquidCommandPaletteProps = {
  title: string;
  triggerLabel: string;
  searchLabel: string;
  groups: readonly LiquidCommandGroup[];
  onAction: (id: string, details: CommandActionDetails) => unknown;
  description?: string;
  placeholder?: string;
  shortcut?: string | null;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: ComponentProps<typeof Dialog>["onOpenChange"];
  query?: string;
  onQueryChange?: CommandOptions["onQueryChange"];
  className?: string;
};

export function LiquidCommandPalette({ title, triggerLabel, searchLabel, groups, onAction, description, placeholder = "Type a command…", shortcut = "mod+k", open, defaultOpen, onOpenChange, query, onQueryChange, className = "" }: LiquidCommandPaletteProps) {
  const [controller] = useState(() => createDialogController());
  const search = useRef<HTMLInputElement>(null);
  return <Dialog controller={controller} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
    <DialogTrigger className={`qgp-command-trigger ${className}`} shortcut={shortcut ?? undefined}>{triggerLabel}<DialogShortcut /></DialogTrigger>
    <DialogBackdrop className="qgp-backdrop" />
    <DialogContent className="qgp-command-dialog" data-validation="unvalidated" initialFocus={() => search.current} keepMounted>
      <header className="qgp-dialog-heading"><div><DialogTitle>{title}</DialogTitle>{description?.trim() && <DialogDescription>{description}</DialogDescription>}</div><DialogClose aria-label={`Close ${title}`}>×</DialogClose></header>
      <Command aria-label={searchLabel} query={query} onQueryChange={onQueryChange} onAction={async (id, details) => {
        const command = groups.flatMap(group => group.items).find(item => item.id === id);
        if (!command || command.disabled) throw new Error("This command is unavailable.");
        await onAction(id, details);
        controller.close();
      }}>
        <CommandInput ref={search} aria-label={searchLabel} placeholder={placeholder} />
        <CommandEmpty className="qgp-command-empty">No commands match this search.</CommandEmpty>
        <CommandList>
          {groups.map(group => <CommandGroup key={group.id}>
            <CommandGroupLabel>{group.label}</CommandGroupLabel>
            {group.items.map(item => <CommandItem key={item.id} value={item.id} label={item.label} keywords={item.keywords} shortcut={item.shortcut} disabled={item.disabled} data-agent-confirm={item.requiresConfirmation}>
              {state => <><span className="qgp-command-icon" aria-hidden="true">{item.icon}</span><span className="qgp-command-copy"><CommandItemText>{item.label}</CommandItemText>{state.error != null && <small role="status">{state.error instanceof Error ? state.error.message : "The action was not accepted."}</small>}</span>{state.pending ? <span className="qgp-command-pending">Working…</span> : <CommandShortcut />}</>}
            </CommandItem>)}
          </CommandGroup>)}
        </CommandList>
      </Command>
      <footer className="qgp-command-hint"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Run</span><span><kbd>Esc</kbd> Back</span></footer>
    </DialogContent>
  </Dialog>;
}

export type LiquidFilterFacet = {
  id: string;
  label: string;
  value: string[];
  options: readonly { id: string; label: string; disabled?: boolean }[];
  onValueChange: NonNullable<SelectProps<string, true>["onValueChange"]>;
  disabled?: boolean;
};
export type LiquidFilterBarProps = {
  searchLabel: string;
  query: string;
  onQueryChange: NonNullable<InputOptions["onValueChange"]>;
  facets?: readonly LiquidFilterFacet[];
  onReset: (details: ButtonActionDetails) => unknown;
  resetLabel?: string;
  placeholder?: string;
  resultCount?: number;
  disabled?: boolean;
  className?: string;
};

export function LiquidFilterBar({ searchLabel, query, onQueryChange, facets = [], onReset, resetLabel = "Reset filters", placeholder = "Search…", resultCount, disabled = false, className = "" }: LiquidFilterBarProps) {
  const active = query.length > 0 || facets.some(facet => facet.value.length > 0);
  return <div className={`qgp-filter-bar ${className}`} data-validation="unvalidated">
    <Field className="qgp-filter-search"><FieldLabel>{searchLabel}</FieldLabel><Input value={query} onValueChange={onQueryChange} placeholder={placeholder} disabled={disabled} /></Field>
    {facets.map(facet => <Field className="qgp-filter-facet" key={facet.id}><FieldLabel>{facet.label}</FieldLabel>
      <Select<string, true> multiple value={facet.value} onValueChange={facet.onValueChange} disabled={disabled || facet.disabled} placeholder="All" items={facet.options.map(option => ({ value: option.id, label: option.label, disabled: option.disabled }))}>
        <SelectTrigger><SelectValue maxLabels={1} /></SelectTrigger>
        <SelectContent className="qgp-filter-popup" collisionPadding={16}>
          {facet.options.map(option => <SelectItem key={option.id} value={option.id} disabled={option.disabled}>{option.label}<SelectItemIndicator>✓</SelectItemIndicator></SelectItem>)}
        </SelectContent>
      </Select>
    </Field>)}
    <Button className="qgp-filter-reset" onClick={(_, details) => onReset(details)} disabled={disabled || !active}>{resetLabel}</Button>
    {resultCount !== undefined && <output className="qgp-filter-count" aria-live="polite">{resultCount} {resultCount === 1 ? "result" : "results"}</output>}
  </div>;
}

export type LiquidSelectionAction = { id: string; label: string; disabled?: boolean; requiresConfirmation?: string };
export type LiquidSelectionBarProps = {
  label: string;
  selectedCount: number;
  actions: readonly LiquidSelectionAction[];
  onAction: (id: string, details: ButtonActionDetails) => unknown;
  onClear: (details: ButtonActionDetails) => unknown;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function LiquidSelectionBar({ label, selectedCount, actions, onAction, onClear, clearLabel = "Clear selection", disabled = false, className = "" }: LiquidSelectionBarProps) {
  if (selectedCount < 1) return null;
  return <div className={`qgp-selection-bar ${className}`} data-validation="unvalidated" data-liquid-glass="" data-liquid-kind="panel">
    <output aria-live="polite"><strong>{selectedCount}</strong> selected</output>
    <Toolbar aria-label={label} disabled={disabled}>
      {actions.map(action => <Button key={action.id} render={<ToolbarButton />} disabled={disabled || action.disabled} data-agent-confirm={action.requiresConfirmation} onClick={(_, details) => {
        if (disabled || action.disabled || selectedCount < 1) throw new Error("This selection action is unavailable.");
        return onAction(action.id, details);
      }}>{action.label}</Button>)}
      <Button render={<ToolbarButton />} disabled={disabled} onClick={(_, details) => onClear(details)}>{clearLabel}</Button>
    </Toolbar>
  </div>;
}

export type LiquidDetailSheetProps = Pick<DrawerProps, "open" | "defaultOpen" | "onOpenChange" | "controller" | "side"> & {
  title: string;
  triggerLabel: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function LiquidDetailSheet({ title, triggerLabel, description, children, footer, disabled, className = "", side = "end", ...options }: LiquidDetailSheetProps) {
  return <Drawer side={side} {...options}>
    <DrawerTrigger disabled={disabled} className="qgp-detail-trigger">{triggerLabel}</DrawerTrigger>
    <DrawerBackdrop className="qgp-backdrop" />
    <DrawerContent className={`qgp-detail-sheet ${className}`} data-validation="unvalidated" keepMounted>
      <header className="qgp-dialog-heading"><div><DrawerTitle>{title}</DrawerTitle>{description && <DrawerDescription>{description}</DrawerDescription>}</div><DrawerClose aria-label={`Close ${title}`}>×</DrawerClose></header>
      <div className="qgp-detail-body">{children}</div>
      <footer className="qgp-detail-footer">{footer}<DrawerClose>Done</DrawerClose></footer>
    </DrawerContent>
  </Drawer>;
}

export type LiquidEmptyStateProps = { title: string; description?: string; media?: ReactNode; actions?: ReactNode; className?: string };

export function LiquidEmptyState({ title, description, media, actions, className = "" }: LiquidEmptyStateProps) {
  return <div className={`qgp-empty-state ${className}`} data-validation="unvalidated">
    {media && <div className="qgp-empty-media" aria-hidden="true">{media}</div>}
    <h3>{title}</h3>{description && <p>{description}</p>}{actions && <div className="qgp-empty-actions">{actions}</div>}
  </div>;
}

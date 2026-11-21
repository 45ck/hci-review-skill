"use client";

import type { ReactNode } from "react";
import { Menu, MenuContent, MenuContextTrigger, MenuGroup, MenuGroupLabel, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import type { MenuActionDetails } from "@ui-sdk/react/menu";

export type LiquidContextAction = {
  id: string;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  requiresConfirmation?: string;
};
export type LiquidContextMenuProps = {
  children: ReactNode;
  label: string;
  actions: readonly LiquidContextAction[];
  onAction: (id: string, details: MenuActionDetails) => unknown;
  triggerLabel?: string;
  disabled?: boolean;
  className?: string;
  areaClassName?: string;
};

export function LiquidContextMenu({ children, label, actions, onAction, triggerLabel = `Actions for ${label}`, disabled = false, className = "", areaClassName = "" }: LiquidContextMenuProps) {
  return <div className={`qgi-context ${className}`} data-validation="unvalidated">
    <Menu onAction={(id, details) => {
      const action = actions.find(item => item.id === id);
      if (!action || action.disabled || disabled) throw new Error("This action is unavailable.");
      return onAction(id, details);
    }}>
      <MenuContextTrigger disabled={disabled} tabIndex={disabled ? -1 : 0} aria-label={`${label} context area`} className={`qgi-context-area ${areaClassName}`}>
        {children}
      </MenuContextTrigger>
      <div className="qgi-context-toolbar">
        <span>Right-click, long-press or use Actions.</span>
        <MenuTrigger disabled={disabled} aria-label={triggerLabel} data-cursor-label="Actions">{triggerLabel}</MenuTrigger>
      </div>
      <MenuContent className="qgi-context-menu" sideOffset={8} collisionPadding={16} keepMounted>
        <MenuGroup>
          <MenuGroupLabel>{label}</MenuGroupLabel>
          {actions.map(action => <MenuItem key={action.id} value={action.id} disabled={disabled || action.disabled} destructive={action.destructive} data-agent-confirm={action.requiresConfirmation}>
            {action.label}
          </MenuItem>)}
        </MenuGroup>
      </MenuContent>
    </Menu>
  </div>;
}

"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import { LiquidIcon, type LiquidIconName } from "../icons";

/**
 * These compositions provide regions and SDK-backed navigation, not routing,
 * authentication, tenant authorisation or persistence. The host remains the
 * source of truth for the active route and approved workspace membership.
 */
type RegionProps = HTMLAttributes<HTMLElement> & { children: ReactNode };
type ShellProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function LiquidAppShell({ children, className = "", ...props }: ShellProps) {
  return <div className={["qg-application-shell", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}

export function LiquidAppWorkarea({ children, className = "", ...props }: ShellProps) {
  return <div className={["qg-application-workarea", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}

export function LiquidAppRail({ children, className = "", ...props }: RegionProps) {
  return <aside className={["qg-application-rail", className].filter(Boolean).join(" ")}
    aria-label={props["aria-label"] ?? "Workspace navigation"} {...props}>{children}</aside>;
}

export function LiquidAppHeader({ children, className = "", ...props }: RegionProps) {
  return <header className={["qg-application-header", className].filter(Boolean).join(" ")}
    data-liquid-glass="" data-liquid-kind="panel" {...props}>{children}</header>;
}

export function LiquidAppContent({ children, className = "", ...props }: RegionProps) {
  return <main className={["qg-application-content", className].filter(Boolean).join(" ")} {...props}>{children}</main>;
}

export function LiquidAppInspector({ children, className = "", ...props }: RegionProps) {
  return <aside className={["qg-application-inspector", className].filter(Boolean).join(" ")}
    aria-label={props["aria-label"] ?? "Selected item"} {...props}>{children}</aside>;
}

export function LiquidAppDock({ children, className = "", ...props }: RegionProps) {
  return <nav className={["qg-application-dock", className].filter(Boolean).join(" ")}
    aria-label={props["aria-label"] ?? "Mobile navigation"}
    data-liquid-glass="" data-liquid-kind="panel" {...props}>{children}</nav>;
}

export type LiquidAppNavigationItem = Readonly<{
  id: string;
  label: string;
  icon?: LiquidIconName;
  count?: number;
  disabled?: boolean;
}>;

export function LiquidAppNavigation({
  items, activeId, onNavigate, label = "Workspace pages", className = "",
}: {
  items: readonly LiquidAppNavigationItem[];
  activeId: string;
  onNavigate: (id: string) => void | Promise<void>;
  label?: string;
  className?: string;
}) {
  return <nav className={["qg-application-navigation", className].filter(Boolean).join(" ")} aria-label={label}>
    {items.map((item) => <Button
      key={item.id}
      className="qg-app-nav-button"
      aria-label={item.label}
      aria-current={activeId === item.id ? "page" : undefined}
      disabled={item.disabled}
      onClick={() => onNavigate(item.id)}
    >
      {item.icon && <LiquidIcon name={item.icon} size={22} />}
      <span>{item.label}</span>
      {typeof item.count === "number" && item.count > 0 && <span className="qg-app-nav-count">{item.count}</span>}
    </Button>)}
  </nav>;
}

export type LiquidWorkspaceOption = Readonly<{
  id: string;
  name: string;
  role?: string;
  shortLabel?: string;
}>;

export function LiquidWorkspaceSwitcher({
  items, value, onValueChange, disabled = false, className = "",
}: {
  items: readonly LiquidWorkspaceOption[];
  value: string;
  onValueChange: (id: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const current = items.find((item) => item.id === value);
  const title = current?.name ?? "Choose workspace";
  return <Menu>
    <MenuTrigger className={["qg-app-space-menu", className].filter(Boolean).join(" ")}
      aria-label={current ? `Current workspace: ${current.name}. Switch workspace` : "Choose workspace"}
      disabled={disabled}
    >
      <span className="qg-app-workspace-avatar" aria-hidden="true">
        {current?.shortLabel ?? (current?.name.slice(0, 2).toUpperCase() || "—")}
      </span>
      <span className="qg-app-space-label">{title}</span>
      <LiquidIcon name="more" size={14} />
    </MenuTrigger>
    <MenuContent>
      {items.map((item) => <MenuItem
        key={item.id}
        disabled={disabled || item.id === value}
        onClick={() => onValueChange(item.id)}
      >
        <span className="qg-app-menu-space">{item.name}</span>
        {item.role && <span className="qg-app-menu-role">{item.role}</span>}
        {item.id === value && <LiquidIcon name="check" size={16} />}
      </MenuItem>)}
    </MenuContent>
  </Menu>;
}

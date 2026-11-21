import type { ReactNode } from "react";
import type { ButtonActionDetails } from "@ui-sdk/react/button";
import type { ListboxOptions } from "@ui-sdk/react/listbox";
import type { MenuActionDetails } from "@ui-sdk/react/menu";
import type { LiquidPromptComposerProps } from "../assistant/types";

export type LiquidChatStatus = "ready" | "submitted" | "streaming" | "error";

export type LiquidChatPart =
  | { type: "text"; text: string }
  | { type: "source"; id: string; title: string; url: string }
  | { type: "attachment"; id: string; name: string; mediaType?: string; url?: string }
  | { type: "tool"; id: string; name: string; status: "pending" | "running" | "complete" | "error"; input?: unknown; output?: unknown }
  | { type: "unsupported"; label: string };

export interface LiquidChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: readonly LiquidChatPart[];
  author?: string;
}

export interface LiquidChatProps {
  messages: readonly LiquidChatMessage[];
  status: LiquidChatStatus;
  value: string;
  onValueChange: LiquidPromptComposerProps["onValueChange"];
  onSubmit: LiquidPromptComposerProps["onSubmit"];
  onStop?: LiquidPromptComposerProps["onStop"];
  onRetry?: (details: ButtonActionDetails) => void | Promise<void>;
  error?: string;
  title?: string;
  description?: string;
  author?: string;
  label?: string;
  headerActions?: ReactNode;
  sidebar?: ReactNode;
  templates?: ReactNode;
  empty?: ReactNode;
  notice?: ReactNode;
  className?: string;
  renderPart?: (part: LiquidChatPart, message: LiquidChatMessage) => ReactNode | undefined;
  messageActions?: (message: LiquidChatMessage) => ReactNode;
  composer?: Partial<Omit<LiquidPromptComposerProps, "value" | "onValueChange" | "onSubmit" | "status" | "onStop" | "error">>;
}

export interface LiquidConversation {
  id: string;
  title: string;
  description?: string;
  disabled?: boolean;
}

export interface LiquidConversationListProps {
  conversations: readonly LiquidConversation[];
  value: string | null;
  onValueChange: NonNullable<Extract<ListboxOptions<string, false>, { multiple?: false }>["onValueChange"]>;
  onCreate?: (details: ButtonActionDetails) => void | Promise<void>;
  label?: string;
  createLabel?: string;
  disabled?: boolean;
  createDisabled?: boolean;
  className?: string;
}

export interface LiquidPromptTemplate {
  id: string;
  label: string;
  prompt: string;
  disabled?: boolean;
}

export interface LiquidPromptTemplatePickerProps {
  templates: readonly LiquidPromptTemplate[];
  onChoose: (template: LiquidPromptTemplate, details: MenuActionDetails) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
  className?: string;
}

import type { ReactNode } from "react";
import type { ButtonActionDetails } from "@ui-sdk/react/button";
import type { InputOptions } from "@ui-sdk/react/textarea";
import type { SelectOptions } from "@ui-sdk/react/select";
import type { CollapsibleOptions } from "@ui-sdk/core/collapsible";

export interface LiquidPromptRequest {
  text: string;
  mode: string | null;
}

export interface LiquidPromptMode {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface LiquidPromptSubmitDetails extends ButtonActionDetails {
  event?: Event;
}

export interface LiquidPromptComposerProps {
  label: string;
  value: string;
  onValueChange: NonNullable<InputOptions["onValueChange"]>;
  controller?: InputOptions["controller"];
  onSubmit: (request: LiquidPromptRequest, details: LiquidPromptSubmitDetails) => void | Promise<void>;
  status?: "ready" | "running";
  onStop?: (details: ButtonActionDetails) => void | Promise<void>;
  modes?: readonly LiquidPromptMode[];
  mode?: string | null;
  modeLabel?: string;
  onModeChange?: Extract<SelectOptions<string, false>, { multiple?: false }>["onValueChange"];
  attachments?: ReactNode;
  tools?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
  submitLabel?: string;
  stopLabel?: string;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export interface LiquidAttachment {
  id: string;
  name: string;
  description?: string;
  disabled?: boolean;
}

export interface LiquidAttachmentListProps {
  attachments: readonly LiquidAttachment[];
  label?: string;
  onRemove?: (id: string, details: ButtonActionDetails) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export interface LiquidSuggestion {
  id: string;
  label: string;
  prompt: string;
  disabled?: boolean;
}

export interface LiquidSuggestionListProps {
  suggestions: readonly LiquidSuggestion[];
  onChoose: (suggestion: LiquidSuggestion, details: ButtonActionDetails) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export interface LiquidMessageProps {
  id: string;
  author: string;
  role: "user" | "assistant";
  children: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface LiquidSource {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface LiquidSourceListProps {
  sources: readonly LiquidSource[];
  label?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: CollapsibleOptions["onOpenChange"];
  className?: string;
}

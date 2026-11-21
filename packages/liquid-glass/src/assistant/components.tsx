"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Textarea } from "@ui-sdk/react/textarea";
import { withSource } from "@ui-sdk/react/observe";
import { LiquidIcon } from "../icons";
import type {
  LiquidAttachmentListProps, LiquidMessageProps, LiquidPromptComposerProps,
  LiquidSourceListProps, LiquidSuggestionListProps,
} from "./types";

export function LiquidPromptComposer({
  label, value, onValueChange, controller, onSubmit, status = "ready", onStop,
  modes, mode = null, modeLabel = "Response mode", onModeChange,
  attachments, tools, hint, placeholder = "Ask a question…", submitLabel = "Send message",
  stopLabel = "Stop response", maxLength = 4000, disabled = false, error, className = "",
}: LiquidPromptComposerProps) {
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const hintId = useId();
  const limit = Number.isFinite(maxLength) && maxLength > 0 ? Math.floor(maxLength) : 4000;
  const validMode = !modes?.length || modes.some(option => option.id === mode && !option.disabled);
  const ready = !disabled && !pending && status === "ready" && Boolean(value.trim()) && value.length <= limit && validMode;
  const submit: LiquidPromptComposerProps["onSubmit"] = async (_request, details) => {
    if (!ready || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setSubmitError("");
    try { await onSubmit({ text: value.trim(), mode }, details); }
    catch (problem) { setSubmitError(problem instanceof Error ? problem.message : "The message could not be sent. Try again."); }
    finally { submitting.current = false; setPending(false); }
  };
  const problem = error || submitError;

  return <div className={`qg-chat-composer ${className}`.trim()} data-validation="unvalidated" data-liquid-glass="" data-liquid-kind="panel" data-composer-status={status} data-composer-pending={pending || undefined}>
    {attachments}
    <Field className="qg-chat-prompt-field" invalid={Boolean(problem)}>
      <FieldLabel>{label}</FieldLabel>
      <Textarea
        value={value}
        controller={controller}
        onValueChange={(next, details) => {
          if (next.length > limit) { details.cancel(); return; }
          setSubmitError("");
          onValueChange(next, details);
        }}
        placeholder={placeholder}
        rows={2}
        autoResize
        maxLength={limit}
        disabled={disabled || pending || status === "running"}
        submitShortcut="mod+enter"
        onSubmit={(_, details) => { withSource("keyboard", () => { void submit({ text: value, mode }, { source: "keyboard", event: details.event }); }); }}
        aria-describedby={hint ? hintId : undefined}
      />
      {problem && <FieldError match>{problem}</FieldError>}
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
    </Field>
    <div className="qg-chat-composer-footer">
      <div className="qg-chat-composer-tools">
        {tools}
        {modes?.length ? <Select<string, false>
          items={modes.map(option => ({ value: option.id, label: option.label, disabled: option.disabled }))}
          value={mode}
          onValueChange={onModeChange}
          disabled={disabled || pending || status === "running" || !onModeChange}
        >
          <SelectTrigger aria-label={modeLabel}><SelectValue /></SelectTrigger>
          <SelectContent className="qg-chat-mode-menu">
            {modes.map(option => <SelectItem key={option.id} value={option.id} disabled={option.disabled}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select> : null}
      </div>
      {status === "running" && onStop ? <Button key="stop" className="qg-chat-submit" onClick={(_, details) => onStop(details)} disabled={disabled}>
        <span className="qg-chat-stop-symbol" aria-hidden="true" />{stopLabel}
      </Button> : <Button key="send" className="qg-chat-submit" data-variant="primary" disabled={!ready}
        onClick={(_, details) => submit({ text: value, mode }, details)} pendingAnnouncement="Sending message">
        <LiquidIcon name="sparkles" size={16} />{submitLabel}
      </Button>}
    </div>
    {pending && status === "ready" && <p className="qg-chat-submit-status" role="status">Sending message…</p>}
  </div>;
}

export function LiquidAttachmentList({ attachments, label = "Message attachments", onRemove, disabled = false, className = "" }: LiquidAttachmentListProps) {
  if (!attachments.length) return null;
  return <ul className={`qg-chat-attachments ${className}`.trim()} aria-label={label} data-validation="unvalidated">
    {attachments.map(attachment => <li key={attachment.id} data-attachment-id={attachment.id}>
      <LiquidIcon name="folder" size={24} />
      <span className="qg-chat-attachment-text"><strong>{attachment.name}</strong>{attachment.description && <span>{attachment.description}</span>}</span>
      {onRemove && <Button className="qg-chat-attachment-remove" aria-label={`Remove ${attachment.name}`} disabled={disabled || attachment.disabled}
        onClick={(_, details) => onRemove(attachment.id, details)}><span aria-hidden="true">×</span></Button>}
    </li>)}
  </ul>;
}

export function LiquidSuggestionList({ suggestions, onChoose, label = "Suggested prompts", disabled = false, className = "" }: LiquidSuggestionListProps) {
  return <div className={`qg-chat-suggestions ${className}`.trim()} aria-label={label} data-validation="unvalidated">
    {suggestions.map(suggestion => <Button key={suggestion.id} disabled={disabled || suggestion.disabled}
      onClick={(_, details) => onChoose(suggestion, details)}>{suggestion.label}</Button>)}
  </div>;
}

export function LiquidMessage({ id, author, role, children, meta, actions, className = "" }: LiquidMessageProps) {
  return <article className={`qg-chat-message ${className}`.trim()} data-message-id={id} data-message-role={role} data-validation="unvalidated" aria-label={`${author} message`}>
    <header className="qg-chat-message-heading">{role === "assistant" && <LiquidIcon name="sparkles" size={24} />}<strong>{author}</strong>{meta && <span>{meta}</span>}</header>
    <div className="qg-chat-message-content">{children}</div>
    {actions && <footer className="qg-chat-message-actions">{actions}</footer>}
  </article>;
}

function safeSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password ? parsed : null;
  } catch { return null; }
}

export function LiquidSourceList({ sources, label = "Response sources", open, defaultOpen, onOpenChange, className = "" }: LiquidSourceListProps) {
  if (!sources.length) return null;
  return <Collapsible className={`qg-chat-sources ${className}`.trim()} aria-label={label} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} data-validation="unvalidated">
    <CollapsibleTrigger>{sources.length} {sources.length === 1 ? "source" : "sources"}</CollapsibleTrigger>
    <CollapsiblePanel><ol>{sources.map((source, index) => {
      const url = safeSourceUrl(source.url);
      return <li key={source.id} data-source-id={source.id}><span className="qg-chat-source-number" aria-hidden="true">{index + 1}</span><div>
        {url ? <Button render={<a href={url.href} target="_blank" rel="noopener noreferrer" />} className="qg-chat-source-link" aria-label={`${label}: Open ${source.title}`}>{source.title}</Button> : <span>{source.title} · Link unavailable</span>}
        {source.description && <p>{source.description}</p>}{url && <span className="qg-chat-source-host">{url.host}</span>}
      </div></li>;
    })}</ol></CollapsiblePanel>
  </Collapsible>;
}

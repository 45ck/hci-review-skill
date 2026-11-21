"use client";

import { Fragment, useId } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Listbox, ListboxItem } from "@ui-sdk/react/listbox";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import { LiquidAttachmentList, LiquidMessage, LiquidPromptComposer, LiquidSourceList } from "../assistant/components";
import { redactAgentData } from "../agents/task";
import { LiquidIcon } from "../icons";
import type { LiquidChatMessage, LiquidChatPart, LiquidChatProps, LiquidConversationListProps, LiquidPromptTemplatePickerProps } from "./types";

function jsonPreview(value: unknown) {
  try { return JSON.stringify(redactAgentData(value), null, 2) ?? "No value supplied."; }
  catch { return "This value cannot be displayed as JSON."; }
}

function MessagePart({ part, message }: { part: LiquidChatPart; message: LiquidChatMessage }) {
  if (part.type === "text") return <p className="qg-conversation-text">{part.text}</p>;
  if (part.type === "source") return <LiquidSourceList sources={[part]} label={`Sources for ${message.id}: ${part.title}`} />;
  if (part.type === "attachment") return <LiquidAttachmentList label={`Attachments for ${message.id}`} attachments={[{ id: part.id, name: part.name, description: part.mediaType }]} />;
  if (part.type === "tool") return <Collapsible className="qg-conversation-tool" aria-label={`Tool ${part.name} ${part.id}`} data-chat-tool-id={part.id} data-chat-tool-status={part.status}>
    <CollapsibleTrigger><LiquidIcon name="code" size={18} /><span>{part.name}</span><span className="qg-conversation-tool-state">{part.status}</span></CollapsibleTrigger>
    <CollapsiblePanel>
      <p className="qg-conversation-detail-note">Reported by the host. This view does not execute or approve the tool.</p>
      {part.input !== undefined && <div><h4>Input</h4><pre tabIndex={0}>{jsonPreview(part.input)}</pre></div>}
      {part.output !== undefined && <div><h4>Output</h4><pre tabIndex={0}>{jsonPreview(part.output)}</pre></div>}
    </CollapsiblePanel>
  </Collapsible>;
  return <p className="qg-conversation-unsupported">{part.type === "unsupported" ? part.label : "This message part needs an application renderer."}</p>;
}

export function LiquidChat({
  messages, status, value, onValueChange, onSubmit, onStop, onRetry, error,
  title = "Conversation", description, author = "Assistant", label = "Chat conversation", headerActions,
  sidebar, templates, empty, notice, className = "", renderPart, messageActions, composer,
}: LiquidChatProps) {
  const headingId = useId();
  const running = status === "submitted" || status === "streaming";
  return <section className={`qg-conversation ${className}`.trim()} aria-label={label} data-validation="unvalidated" data-chat-status={status} data-has-sidebar={sidebar ? "true" : undefined}>
    {sidebar && <aside className="qg-conversation-sidebar">{sidebar}</aside>}
    <div className="qg-conversation-main">
      <header className="qg-conversation-header"><div><h3 id={headingId}>{title}</h3>{description && <p>{description}</p>}</div>{headerActions && <div className="qg-conversation-header-actions">{headerActions}</div>}</header>
      <div className="qg-conversation-transcript" aria-labelledby={headingId}>
        {!messages.length ? <div className="qg-conversation-empty">{empty ?? <><LiquidIcon name="sparkles" size={40} /><h4>What are we working on?</h4><p>Choose a prompt or write your own.</p></>}</div> : messages.map(message => {
          const content = message.parts.map((part, index) => {
            const custom = renderPart?.(part, message);
            return <Fragment key={"id" in part ? `${part.type}:${part.id}` : `${part.type}:${index}`}>{custom === undefined ? <MessagePart part={part} message={message} /> : custom}</Fragment>;
          });
          return message.role === "system" ? <article key={message.id} className="qg-conversation-system" aria-label={`${message.author ?? "System"} message`} data-message-id={message.id} data-message-role="system"><strong>{message.author ?? "System"}</strong>{content}</article>
            : <LiquidMessage key={message.id} id={message.id} role={message.role} author={message.author ?? (message.role === "user" ? "You" : author)} actions={messageActions?.(message)}>{content}</LiquidMessage>;
        })}
      </div>
      <div className="qg-conversation-compose">
        {templates}
        <LiquidPromptComposer {...composer} label={composer?.label ?? "Message"} value={value} onValueChange={onValueChange} onSubmit={onSubmit} status={running ? "running" : "ready"} onStop={onStop} error={error} />
        <div className="qg-conversation-state"><output aria-live="polite" aria-label="Chat status">{status === "submitted" ? "Starting response…" : status === "streaming" ? "Receiving response…" : notice ?? (status === "error" ? "Response failed." : "Ready")}</output>
          {status === "error" && onRetry && <Button disabled={composer?.disabled} onClick={(_, details) => onRetry(details)}>Retry response</Button>}
        </div>
      </div>
    </div>
  </section>;
}

export function LiquidConversationList({ conversations, value, onValueChange, onCreate, label = "Conversations", createLabel = "New chat", disabled = false, createDisabled = false, className = "" }: LiquidConversationListProps) {
  return <div className={`qg-conversation-list ${className}`.trim()} data-validation="unvalidated">
    <div className="qg-conversation-list-heading"><strong>{label}</strong>{onCreate && <Button aria-label={createLabel} disabled={disabled || createDisabled} onClick={(_, details) => onCreate(details)}><LiquidIcon name="plus" size={18} /><span>{createLabel}</span></Button>}</div>
    <Listbox<string, false> aria-label={label} value={value} disabled={disabled} items={conversations.map(item => ({ value: item.id, label: item.title, disabled: item.disabled }))}
      onValueChange={(next, details) => {
        if (disabled || next === null || !conversations.some(item => item.id === next && !item.disabled)) { details.cancel(); return; }
        onValueChange(next, details);
      }}>
      {conversations.map(item => <ListboxItem key={item.id} value={item.id} disabled={item.disabled} data-chat-thread={item.id}><LiquidIcon name="folder" size={20} /><span><strong>{item.title}</strong>{item.description && <span>{item.description}</span>}</span></ListboxItem>)}
    </Listbox>
    {!conversations.length && <p>No conversations yet.</p>}
  </div>;
}

export function LiquidPromptTemplatePicker({ templates, onChoose, label = "Prompt templates", disabled = false, className = "" }: LiquidPromptTemplatePickerProps) {
  return <Menu onAction={(id, details) => {
    const item = templates.find(template => template.id === id);
    if (!item || item.disabled || disabled) throw new Error("This prompt template is unavailable.");
    return onChoose(item, details);
  }}>
    <MenuTrigger disabled={disabled || !templates.length} aria-label={label} className={`qg-prompt-template-trigger ${className}`.trim()}><LiquidIcon name="grid" size={18} />{label}</MenuTrigger>
    <MenuContent className="qg-prompt-template-menu" sideOffset={8} collisionPadding={16} keepMounted>
      {templates.map(template => <MenuItem key={template.id} value={template.id} disabled={disabled || template.disabled}>{template.label}</MenuItem>)}
    </MenuContent>
  </Menu>;
}

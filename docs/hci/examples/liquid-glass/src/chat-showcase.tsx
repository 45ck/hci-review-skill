import { useEffect, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { createInputController } from "@ui-sdk/react/textarea";
import { createFileInputController, FileInput, FileInputDropzone, FileInputTrigger, formatFileSize } from "@ui-sdk/react/file-input";
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Toggle } from "@ui-sdk/react/toggle";
import { LiquidAttachmentList, type LiquidPromptRequest } from "@quantitative-hci/liquid-glass/assistant";
import { LiquidChat, LiquidConversationList, LiquidPromptTemplatePicker, type LiquidChatMessage, type LiquidChatPart, type LiquidChatStatus, type LiquidPromptTemplate } from "@quantitative-hci/liquid-glass/chat";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/chat.css";
import "./chat-showcase.css";

interface Thread {
  id: string;
  title: string;
  draft: string;
  files: File[];
  messages: LiquidChatMessage[];
  status: LiquidChatStatus;
  notice: string;
  error: string;
  lastRequest?: { text: string; assistantId: string };
}

const templates: readonly LiquidPromptTemplate[] = [
  { id: "brief", label: "Write a project brief", prompt: "Write a short project brief for a coastal studio website." },
  { id: "review", label: "Review a component", prompt: "Review a component for keyboard access, clear labels and cancellable actions." },
  { id: "plan", label: "Plan a release", prompt: "Create a practical release checklist for a small web application." },
  { id: "publish", label: "Publish automatically · Unavailable", prompt: "Publish this project.", disabled: true },
];
const reference: LiquidChatPart = { type: "source", id: "ui-sdk", title: "Vercel UI SDK", url: "https://ui-sdk.dev/docs" };
const initialThreads: Thread[] = [
  {
    id: "coastal", title: "Coastal studio", draft: "", files: [], status: "ready", notice: "Local demo. Your messages stay on this page.", error: "",
    messages: [
      { id: "coastal-question", role: "user", parts: [{ type: "text", text: "Help me turn the coastal studio concept into a useful first screen." }] },
      { id: "coastal-answer", role: "assistant", parts: [{ type: "text", text: "Start with the work. One strong image, a short introduction and a clear way to explore projects.\n\nUse a showcase section for the opening, a chapter section for the process and a visible Actions menu for local tasks. Keep the same named controls available to people and agents." }, reference] },
    ],
  },
  {
    id: "release", title: "Release checklist", draft: "", files: [], status: "ready", notice: "Example conversation. The tool result is a local fixture.", error: "",
    messages: [
      { id: "release-question", role: "user", parts: [{ type: "text", text: "What should I check before shipping this interface?" }] },
      { id: "release-answer", role: "assistant", parts: [{ type: "text", text: "Verify the accepted state after each action, including cancellation and refusal. Check keyboard focus, narrow layouts and the solid fallback. Record what was tested and keep human review separate." }, { type: "tool", id: "fixture-check", name: "Example release check", status: "complete", input: { scope: "local demonstration" }, output: { source: "Fixed example data", checks: ["Keyboard", "Mobile layout", "Cancellation"], executed: false } }] },
    ],
  },
];

const responseText = (text: string) => /release|checklist/i.test(text)
  ? "Start with one release candidate.\n\n1. Check the accepted result of each primary action.\n2. Test cancellation, errors and recovery.\n3. Review keyboard focus and the mobile layout.\n4. Record the tested revision and publish that exact build.\n\nThis is a fixed local response showing the streaming interface."
  : /review|keyboard/i.test(text)
    ? "Make the task clear before adding another control.\n\nUse specific action labels, preserve focus when a panel closes and keep a visible alternative to gestures. When the host refuses a change, keep the accepted value and explain how to recover.\n\nThis is a fixed local response showing the streaming interface."
    : "Give the studio one clear opening.\n\nLead with a real project, explain the work in one sentence and make the next action easy to find. Build the page from the shared showcase, chapter and context-menu components so the controls behave consistently.\n\nThis is a fixed local response showing the streaming interface.";

export function ChatShowcase({ active = true }: { active?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>(() => structuredClone(initialThreads));
  const [selected, setSelected] = useState("coastal");
  const [layout, setLayout] = useState("workspace");
  const [prompt] = useState(createInputController);
  const [fileInput] = useState(createFileInputController);
  const [failNext, setFailNext] = useState(false);
  const [lastSource, setLastSource] = useState("programmatic");
  const [copied, setCopied] = useState("");
  const nextId = useRef(0);
  const fileIds = useRef(new WeakMap<File, string>());
  const pending = useRef<{ id: string; threadId: string; timer: ReturnType<typeof setTimeout>; finish: () => void } | null>(null);
  const thread = threads.find(item => item.id === selected)!;
  const running = thread.status === "submitted" || thread.status === "streaming";

  function updateThread(id: string, update: (current: Thread) => Thread) {
    setThreads(current => current.map(item => item.id === id ? update(item) : item));
  }

  function stop(notice = "Response stopped. Partial text and your draft are kept.") {
    const request = pending.current;
    if (!request) return;
    pending.current = null;
    clearTimeout(request.timer);
    updateThread(request.threadId, current => ({ ...current, status: "ready", notice }));
    request.finish();
  }

  useEffect(() => { if (!active) stop("Response stopped while this example was hidden. Your draft is kept."); }, [active]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop("Response stopped while the page was hidden. Your draft is kept."); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      const request = pending.current;
      if (request) { pending.current = null; clearTimeout(request.timer); request.finish(); }
    };
  }, []);

  function run(request: LiquidPromptRequest, source: string, retry = false) {
    if (!active || pending.current || !request.text.trim() || request.text.length > 2000) return;
    const id = `chat-run-${++nextId.current}`;
    const assistantId = retry && thread.lastRequest ? thread.lastRequest.assistantId : `${id}-assistant`;
    const threadId = selected;
    const shouldFail = failNext;
    setFailNext(false); setLastSource(source); setCopied("");
    const attachmentParts: LiquidChatPart[] = thread.files.map(file => ({ type: "attachment", id: attachmentId(file), name: file.name, mediaType: file.type || "Local file" }));
    updateThread(threadId, current => ({
      ...current, status: "submitted", error: "", notice: "", lastRequest: { text: request.text, assistantId },
      messages: [...current.messages.filter(item => item.id !== assistantId).slice(-10), ...(!retry ? [{ id: `${id}-user`, role: "user" as const, parts: [{ type: "text" as const, text: request.text }, ...attachmentParts] }] : []), { id: assistantId, role: "assistant", parts: [{ type: "text", text: "" }] }],
    }));
    return new Promise<void>(finish => {
      const text = responseText(request.text);
      let length = 0;
      const advance = () => {
        if (pending.current?.id !== id) return;
        if (shouldFail) {
          pending.current = null;
          updateThread(threadId, current => ({ ...current, status: "error", error: "Simulated connection failure. Your prompt is kept; retry when ready.", notice: "The local error example is ready to retry.", messages: current.messages.filter(item => item.id !== assistantId) }));
          finish(); return;
        }
        length = Math.min(text.length, length + 28);
        const complete = length === text.length;
        updateThread(threadId, current => ({ ...current, status: complete ? "ready" : "streaming", notice: complete ? "Local response complete. No model was called." : "", draft: complete && current.draft === request.text ? "" : current.draft,
          messages: current.messages.map(message => message.id === assistantId ? { ...message, parts: [{ type: "text", text: text.slice(0, length) }, ...(complete ? [reference] : [])] } : message),
        }));
        if (complete) { pending.current = null; finish(); }
        else if (pending.current?.id === id) pending.current.timer = setTimeout(advance, 95);
      };
      pending.current = { id, threadId, timer: setTimeout(advance, 280), finish };
    });
  }

  function attachmentId(file: File) {
    let id = fileIds.current.get(file);
    if (!id) { id = `chat-file-${++nextId.current}`; fileIds.current.set(file, id); }
    return id;
  }

  const conversations = <LiquidConversationList label="Chat threads" createLabel="New chat" value={selected} conversations={threads.map(item => ({ id: item.id, title: item.title, description: item.id === selected ? "Current conversation" : `${item.messages.length} messages` }))}
    createDisabled={threads.length >= 8} onCreate={details => {
      if (threads.length >= 8) return;
      stop(); const id = `thread-${++nextId.current}`;
      setThreads(current => [...current, { id, title: `New conversation ${current.length - 1}`, draft: "", files: [], messages: [], status: "ready", error: "", notice: "New local conversation." }]);
      setSelected(id); setLastSource(details.source); setCopied("");
    }} onValueChange={(next, details) => { if (!next) { details.cancel(); return; } stop(); setSelected(next); setLastSource(details.source); setCopied(""); }} />;

  const fileControls = <FileInputTrigger aria-label="Attach chat files"><LiquidIcon name="plus" size={16} />Attach</FileInputTrigger>;

  return <div className="chat-showcase" data-kit-view="chat" data-validation="unvalidated" data-chat-layout={layout} data-thread-id={selected} data-last-source={lastSource} data-chat-state={thread.status} data-message-count={thread.messages.length}>
    <div className="chat-showcase-heading"><div><h2>One conversation. Your runtime.</h2><p>Try the layouts, switch threads and choose a prompt.</p></div><ValidationBadge /></div>
    <div className="chat-showcase-toolbar">
      <SegmentedControl aria-label="Chat example layout" value={layout} onValueChange={(next, details) => { if (next !== "workspace" && next !== "sidepanel" && next !== "playground") { details.cancel(); return; } setLayout(next); setLastSource(details.source); }}>
        <SegmentedControlItem value="workspace">Chat workspace</SegmentedControlItem><SegmentedControlItem value="sidepanel">Side panel</SegmentedControlItem><SegmentedControlItem value="playground">Prompt playground</SegmentedControlItem><SegmentedControlIndicator />
      </SegmentedControl>
      <Collapsible className="chat-demo-controls" aria-label="Chat demo controls"><CollapsibleTrigger>Demo controls</CollapsibleTrigger><CollapsiblePanel><Toggle pressed={failNext} disabled={running} onPressedChange={(next, details) => { setFailNext(next); setLastSource(details.source); }}>Fail next response</Toggle><p>Exercise the error and Retry states. No external request is made.</p></CollapsiblePanel></Collapsible>
    </div>
    <div className="chat-showcase-context">
      {layout === "sidepanel" && <article className="chat-context-document"><div className="chat-context-image"><img src="/media/emerald-coast-small.webp" alt="Fictional coastal landscape" /></div><p className="chat-context-label">Project brief</p><h3>Coastal studio</h3><p>A quiet home for a small studio's work. Start with projects, then show the people and process behind them.</p><h4>First release</h4><ul><li>A focused project gallery</li><li>Readable case studies</li><li>A clear contact action</li></ul><p className="chat-context-note">Example document. Ask the assistant about it alongside the work.</p></article>}
      <FileInput aria-label="Chat attachment selection" controller={fileInput} multiple accept={[".md", ".txt", ".pdf", "image/*"]} maxFiles={3} maxSize={5 * 1024 * 1024} value={thread.files} disabled={running}
        onValueChange={(files, details) => { updateThread(selected, current => ({ ...current, files, error: "" })); setLastSource(details.source); }}
        onReject={rejected => updateThread(selected, current => ({ ...current, error: `${rejected.map(item => item.file.name).join(", ")} was not attached. Choose up to three text, Markdown, PDF or image files under 5 MB each.` }))}>
        <FileInputDropzone className="chat-showcase-dropzone">
          <LiquidChat title={thread.title} description="Local demo · No model connected" label="Example chat conversation" author="Studio assistant" messages={thread.messages} status={thread.status} value={thread.draft}
            onValueChange={(draft, details) => { updateThread(selected, current => ({ ...current, draft, error: current.status === "error" ? current.error : "" })); setLastSource(details.source); }}
            onSubmit={(request, details) => run(request, details.source)} onStop={details => { setLastSource(details.source); stop(); }}
            onRetry={thread.lastRequest ? details => run({ text: thread.lastRequest!.text, mode: null }, details.source, true) : undefined}
            error={thread.error} notice={thread.notice} sidebar={layout === "workspace" ? conversations : undefined}
            headerActions={layout !== "workspace" ? <Collapsible className="chat-inline-threads" aria-label="Choose chat thread"><CollapsibleTrigger>Conversations</CollapsibleTrigger><CollapsiblePanel>{conversations}</CollapsiblePanel></Collapsible> : undefined}
            templates={<LiquidPromptTemplatePicker templates={templates} disabled={running} onChoose={template => { prompt.setValue(template.prompt); prompt.focus(); }} />}
            composer={{ label: "Chat prompt", controller: prompt, maxLength: 2000, placeholder: "What would you like to work on?", submitLabel: "Send demo message", stopLabel: "Stop demo response", hint: "Ctrl / ⌘ + Enter to send. Attachments stay local; their contents are not read.", tools: fileControls,
              attachments: <LiquidAttachmentList label="Chat draft attachments" attachments={thread.files.map(file => ({ id: attachmentId(file), name: file.name, description: `${formatFileSize(file.size)} · Not uploaded` }))} disabled={running} onRemove={(id, details) => { const file = thread.files.find(item => attachmentId(item) === id); if (file) fileInput.removeFile(file); setLastSource(details.source); }} />,
            }}
            messageActions={message => message.role === "assistant" && message.parts.some(part => part.type === "text" && part.text) ? <><Button aria-label={`Copy chat message ${message.id}`} onClick={async () => {
              try { await navigator.clipboard.writeText(message.parts.filter(part => part.type === "text").map(part => part.text).join("\n\n")); setCopied(message.id); }
              catch { updateThread(selected, current => ({ ...current, notice: "Clipboard unavailable. Select the message text to copy it." })); }
            }}><LiquidIcon name="copy" size={16} />Copy</Button>{copied === message.id && <span role="status">Message copied</span>}</> : undefined}
          />
        </FileInputDropzone>
      </FileInput>
    </div>
    <p className="chat-showcase-footer">Same components in each layout. Connect your own runtime in <Button render={<a href="?collection=integrations" />}>AI integrations</Button>.</p>
  </div>;
}

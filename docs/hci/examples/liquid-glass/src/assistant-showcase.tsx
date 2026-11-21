import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { createFileInputController, FileInput, FileInputDropzone, FileInputTrigger, formatFileSize } from "@ui-sdk/react/file-input";
import { createInputController } from "@ui-sdk/react/textarea";
import { withSource } from "@ui-sdk/react/observe";
import {
  LiquidAttachmentList, LiquidMessage, LiquidPromptComposer, LiquidSourceList, LiquidSuggestionList,
  type LiquidAttachment, type LiquidPromptComposerProps, type LiquidSource,
} from "@quantitative-hci/liquid-glass/assistant";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/assistant.css";
import "./assistant-showcase.css";

const sources: readonly LiquidSource[] = [
  { id: "sdk", title: "Vercel UI SDK", url: "https://ui-sdk.dev/docs", description: "Shared controls, keyboard behaviour and the agent bridge." },
  { id: "composer", title: "AI Elements · Prompt input", url: "https://elements.ai-sdk.dev/components/prompt-input", description: "The familiar prompt, attachment and send arrangement." },
  { id: "sections", title: "Quantive · Sections", url: "https://github.com/45ck/hci-review-skill/blob/main/docs/hci/standards/interaction-sections.md", description: "Showcase layouts, chapters and natural scrolling." },
];

const suggestions = [
  { id: "hero", label: "Plan a quiet landing page", prompt: "Plan a quiet landing page for a coastal studio." },
  { id: "review", label: "Review the interaction details", prompt: "Review the interaction details for a coastal studio." },
  { id: "build", label: "Make a component checklist", prompt: "Make a component checklist for a coastal studio." },
];

interface DemoMessage { id: string; role: "user" | "assistant"; content: ReactNode; text: string; attachments?: string[] }
const welcome: DemoMessage = {
  id: "welcome", role: "assistant", text: "Start with a clear opening, one useful action and enough room for the work. Use a showcase section for the first image, a chapter section for the process, and a context menu for local actions.",
  content: <><h3>A calmer place to start.</h3><p>Give the studio one clear opening, one useful action and enough room for the work.</p><p>Use a showcase section for the first image, a chapter section for the process, and a context menu for local actions. Keep the same controls available to a person and an agent.</p></>,
};

export function AssistantShowcase() {
  const root = useRef<HTMLDivElement>(null);
  const [prompt] = useState(createInputController);
  const [fileInput] = useState(createFileInputController);
  const fileIds = useRef(new WeakMap<File, string>());
  const nextFile = useRef(0);
  const nextMessage = useRef(0);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; finish: () => void } | null>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<string | null>("brief");
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState(true);
  const [messages, setMessages] = useState<DemoMessage[]>([welcome]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("Ready for your prompt.");
  const [error, setError] = useState("");
  const [lastSource, setLastSource] = useState("programmatic");
  const [copied, setCopied] = useState("");
  const attachments: LiquidAttachment[] = [
    ...(brief ? [{ id: "project-brief", name: "project-brief.md", description: "Built-in context · Coastal studio" }] : []),
    ...files.map(file => {
      let id = fileIds.current.get(file);
      if (!id) { id = `local-file-${++nextFile.current}`; fileIds.current.set(file, id); }
      return { id, name: file.name, description: `${formatFileSize(file.size)} · Local file, not uploaded` };
    }),
  ];

  function stop(message: string) {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    pending.current.finish();
    pending.current = null;
    setRunning(false);
    setNotice(message);
  }

  useEffect(() => {
    const node = root.current;
    const check = () => {
      if (document.hidden || node?.closest('[hidden],[inert],[aria-hidden="true"]')) stop("Preview stopped. Your draft is kept.");
    };
    const observer = new MutationObserver(check);
    for (let ancestor = node?.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
    }
    document.addEventListener("visibilitychange", check);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", check);
      if (pending.current) { clearTimeout(pending.current.timer); pending.current.finish(); pending.current = null; }
    };
  }, []);

  const submit: LiquidPromptComposerProps["onSubmit"] = (request, details) => {
    if (pending.current || !request.text.trim()) return;
    const id = `turn-${++nextMessage.current}`;
    const names = attachments.map(item => item.name);
    setError(""); setCopied(""); setLastSource(details.source); setRunning(true); setNotice("Preparing a local preview…");
    setMessages(current => [...current.slice(-5), { id: `${id}-user`, role: "user", content: <p>{request.text}</p>, text: request.text, attachments: names }]);
    return new Promise<void>(finish => {
      const timer = setTimeout(() => {
        if (!pending.current || pending.current.timer !== timer) return;
        pending.current = null;
        const checklist = request.mode === "checklist";
        const text = checklist
          ? "Component checklist: LiquidShowcaseSection for the opening; LiquidChapterSection for the process; LiquidContextMenu for local actions. Keep labels specific, actions cancellable and the final state visible."
          : "Start with the work. Use one large coastal image, a short introduction and a visible project action. Continue with readable chapters and the same named controls for people and agents.";
        const content = checklist
          ? <><h3>A small, useful component set.</h3><ul><li><strong>Opening:</strong> LiquidShowcaseSection with one primary action.</li><li><strong>Process:</strong> LiquidChapterSection with readable chapter text.</li><li><strong>Local actions:</strong> LiquidContextMenu with a visible trigger.</li></ul><p>Keep labels specific, actions cancellable and the final state visible.</p></>
          : <><h3>Start with the work.</h3><p>Use one large coastal image, a short introduction and a visible project action. The first screen should make the studio’s work easy to understand.</p><p>Continue with readable chapters and the same named controls for people and agents. Keep cursor effects decorative and let the content set the pace.</p></>;
        setMessages(current => [...current, { id: `${id}-assistant`, role: "assistant", content, text }]);
        withSource(details.source, () => prompt.clear());
        setRunning(false); setNotice(`Local ${checklist ? "checklist" : "brief"} ready. ${names.length} context ${names.length === 1 ? "item" : "items"} retained.`);
        finish();
      }, 1800);
      pending.current = { timer, finish };
    });
  };

  return <div ref={root} className="assistant-showcase" data-kit-view="assistant" data-validation="unvalidated" data-response-state={running ? "running" : "ready"} data-last-source={lastSource} data-response-count={messages.filter(message => message.role === "assistant").length}>
    <header className="assistant-intro"><div><p className="assistant-eyebrow">Assistant</p><h2>From a prompt to something useful.</h2></div><ValidationBadge /></header>
    <section className="assistant-thread" aria-label="Coastal studio conversation">
      <header className="assistant-thread-heading"><div><span className="assistant-thread-mark"><LiquidIcon name="sparkles" size={26} /></span><div><h3>Coastal studio</h3><p>Local preview · No model connected</p></div></div>
        <Button disabled={running} onClick={(_, details) => { setMessages([welcome]); prompt.clear(); setCopied(""); setNotice("Conversation reset. Context retained."); setLastSource(details.source); }}>New conversation</Button>
      </header>
      <div className="assistant-messages" aria-live="polite" aria-relevant="additions">
        {messages.map(message => <LiquidMessage key={message.id} id={message.id} role={message.role} author={message.role === "user" ? "You" : "Studio assistant"}
          meta={message.role === "assistant" ? "Local fixture" : undefined}
          actions={message.role === "assistant" ? <><Button onClick={async () => {
            try { await navigator.clipboard.writeText(message.text); setCopied(message.id); }
            catch { setNotice("Clipboard unavailable. Select the response text to copy it."); }
          }}><LiquidIcon name="copy" size={16} />Copy response</Button>{copied === message.id && <span role="status">Response copied</span>}</> : undefined}>
          {message.content}
          {message.attachments?.length ? <p className="assistant-context-summary">Context: {message.attachments.join(", ")}</p> : null}
          {message.role === "assistant" && <LiquidSourceList sources={sources} label={`Sources for ${message.id}`} />}
        </LiquidMessage>)}
      </div>
      <div className="assistant-compose-area">
        <LiquidSuggestionList suggestions={suggestions} disabled={running} onChoose={(suggestion, details) => { prompt.setValue(suggestion.prompt); prompt.focus(); setLastSource(details.source); }} />
        <FileInput aria-label="Context files" controller={fileInput} multiple value={files} accept={[".md", ".txt", ".pdf", "image/*"]} maxFiles={3} maxSize={5 * 1024 * 1024} disabled={running}
          onValueChange={(next, details) => { setFiles(next); setError(""); setLastSource(details.source); }}
          onReject={rejected => setError(`${rejected.map(item => item.file.name).join(", ")} was not attached. Use up to three text, Markdown, PDF or image files under 5 MB each.`)}>
          <FileInputDropzone className="assistant-dropzone">
            <LiquidPromptComposer label="Design prompt" controller={prompt} value={draft} onValueChange={(next, details) => { setDraft(next); setLastSource(details.source); }}
              onSubmit={submit} status={running ? "running" : "ready"} onStop={details => { setLastSource(details.source); stop("Preview stopped. Your draft is kept."); }}
              modes={[{ id: "brief", label: "Brief" }, { id: "checklist", label: "Checklist" }, { id: "live", label: "Live model · Not connected", disabled: true }]}
              mode={mode} modeLabel="Response style" onModeChange={(next, details) => { if (next !== "brief" && next !== "checklist") { details.cancel(); return; } setMode(next); setLastSource(details.source); }}
              submitLabel="Preview response" stopLabel="Stop preview" placeholder="What would you like to build?" maxLength={2000} error={error}
              hint="Ctrl / ⌘ + Enter to preview. Files stay in this browser; their contents are not read."
              attachments={<LiquidAttachmentList attachments={attachments} disabled={running} onRemove={(id, details) => {
                if (id === "project-brief") setBrief(false);
                else { const file = files.find(item => fileIds.current.get(item) === id); if (file) fileInput.removeFile(file); }
                setLastSource(details.source);
              }} />}
              tools={<FileInputTrigger aria-label="Attach local context"><LiquidIcon name="plus" size={16} />Attach</FileInputTrigger>}
            />
          </FileInputDropzone>
        </FileInput>
        <output className="assistant-notice" aria-label="Conversation status" aria-live="polite">{notice}</output>
      </div>
    </section>
    <p className="assistant-footnote">Replies are fixed local examples. The components accept your application’s model, files and callbacks.</p>
  </div>;
}

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import vercelSource from "./integrations/vercel-chat.tsx?raw";
import providerSource from "./integrations/provider.server.ts?raw";
import copilotSource from "./integrations/copilotkit-chat.tsx?raw";
import aguiSource from "./integrations/ag-ui-chat.tsx?raw";
import customSource from "./integrations/custom-chat.tsx?raw";
import openaiSource from "./integrations/openai.server.ts?raw";
import anthropicSource from "./integrations/anthropic.server.ts?raw";
import "./integrations-showcase.css";

const runtimes = [
  {
    id: "vercel", name: "Vercel AI SDK", kind: "Chat runtime", version: "ai 7.0.179 · React 4.0.183",
    description: "Keep useChat in charge of messages and streaming. Quantive renders its message parts and forwards Send, Stop and Retry.",
    ownership: "useChat owns the conversation. Your authenticated server route chooses the model, handles files and runs tools.",
    docs: "https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat",
    files: [{ id: "client", label: "React UI", name: "vercel-chat.tsx", source: vercelSource }, { id: "server", label: "Server route", name: "provider.server.ts", source: providerSource }],
    capabilities: ["Streaming UI", "Stop and retry", "Message parts", "Three provider recipes"],
  },
  {
    id: "copilotkit", name: "CopilotKit", kind: "Agent runtime", version: "React Core 1.90.0",
    description: "Use CopilotKit’s headless hooks with the Quantive chat. Your existing runtime keeps its messages, tools and agent execution.",
    ownership: "CopilotKit owns the agent and thread. Tool execution, approvals and custom rendering remain host responsibilities.",
    docs: "https://docs.copilotkit.ai/custom-look-and-feel/headless-ui",
    files: [{ id: "client", label: "React UI", name: "copilotkit-chat.tsx", source: copilotSource }],
    capabilities: ["Headless hooks", "Agent messages", "Stop", "Existing runtime"],
  },
  {
    id: "ag-ui", name: "AG-UI", kind: "Agent protocol client", version: "Client 1.0.5",
    description: "Subscribe to an existing AG-UI agent and render its state. The SDK handles events, message history and cancellation.",
    ownership: "The supplied AbstractAgent owns state and the protocol. The component subscribes and unsubscribes without adding another event parser.",
    docs: "https://docs.ag-ui.com/sdk/js/client/abstract-agent",
    files: [{ id: "client", label: "React UI", name: "ag-ui-chat.tsx", source: aguiSource }],
    capabilities: ["Agent subscription", "Tool-call IDs", "Abort run", "Host-owned thread"],
  },
  {
    id: "custom", name: "Your existing runtime", kind: "Controlled interface", version: "Quantive chat",
    description: "Pass your accepted messages, draft and lifecycle into LiquidChat. Connect its callbacks to the service or harness your application already uses.",
    ownership: "Your application owns messages and execution. Quantive adds no second conversation store, network protocol or authorization layer.",
    docs: "https://github.com/45ck/hci-review-skill/tree/main/packages/liquid-glass/src/chat",
    files: [{ id: "client", label: "React UI", name: "custom-chat.tsx", source: customSource }],
    capabilities: ["Controlled state", "Custom parts", "Host callbacks", "SDK controls"],
  },
  {
    id: "openai", name: "OpenAI SDK", kind: "Direct server client", version: "openai 7.62.0",
    description: "Keep the Responses SDK on your server. Project completed response items into the same Quantive messages and preserve tool-call identities.",
    ownership: "The application supplies authentication, transport and tool execution. A completed response is checked before the server reports success.",
    docs: "https://developers.openai.com/api/docs/guides/streaming-responses",
    files: [{ id: "server", label: "Server recipe", name: "openai.server.ts", source: openaiSource }],
    capabilities: ["Response projection", "Cancellation signal", "Completion check", "Server-only credentials"],
  },
  {
    id: "anthropic", name: "Claude SDK", kind: "Direct server client", version: "Anthropic SDK 1.12.0",
    description: "Keep the Messages SDK on your server. Project text and tool-use blocks into Quantive while the application retains its own transport.",
    ownership: "The application supplies validated messages, tool results and authorization. Hidden thinking content is not rendered.",
    docs: "https://platform.claude.com/docs/en/build-with-claude/streaming",
    files: [{ id: "server", label: "Server recipe", name: "anthropic.server.ts", source: anthropicSource }],
    capabilities: ["Message projection", "Tool-use IDs", "Cancellation signal", "Server-only credentials"],
  },
] as const;

const providers = [
  { id: "openai", name: "OpenAI", package: "@ai-sdk/openai 4.0.122", key: "OPENAI_API_KEY", docs: "https://ai-sdk.dev/providers/ai-sdk-providers/openai" },
  { id: "anthropic", name: "Claude · Anthropic", package: "@ai-sdk/anthropic 4.0.107", key: "ANTHROPIC_API_KEY", docs: "https://ai-sdk.dev/providers/ai-sdk-providers/anthropic" },
  { id: "openrouter", name: "OpenRouter", package: "@openrouter/ai-sdk-provider 3.1.0", key: "OPENROUTER_API_KEY", docs: "https://openrouter.ai/docs/guides/community/vercel-ai-sdk" },
] as const;

export function IntegrationsShowcase() {
  const [runtimeId, setRuntimeId] = useState<string>("vercel");
  const [providerId, setProviderId] = useState<string>("openai");
  const [copied, setCopied] = useState("");
  const runtime = runtimes.find(item => item.id === runtimeId) ?? runtimes[0];
  const provider = providers.find(item => item.id === providerId) ?? providers[0];
  const copy = async (source: string, name: string) => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(`${name} copied`);
    } catch {
      setCopied("Clipboard unavailable. Select the code to copy it.");
    }
  };
  return (
    <div className="integration-showcase" data-integration-view={runtime.id}>
      <section className="integration-intro">
        <div>
          <h2>Connect a chat.</h2>
          <p>Use Quantive above your provider or agent runtime.</p>
        </div>
        <Button render={<a href="?collection=chat" />}><LiquidIcon name="sparkles" />Try the chat examples</Button>
      </section>
      <ol className="integration-layers" aria-label="Chat integration layers">
        <li><LiquidIcon name="layers" size={28} /><div><strong>Quantive interface</strong><span>Composer, messages, sources and threads</span></div></li>
        <li><LiquidIcon name="activity" size={28} /><div><strong>Your runtime</strong><span>Conversation state and agent execution</span></div></li>
        <li><LiquidIcon name="code" size={28} /><div><strong>Your server and model</strong><span>Credentials, files, persistence and tools</span></div></li>
      </ol>
      <section className="integration-workbench" aria-label="Chat integration recipes" data-liquid-glass="" data-liquid-kind="panel">
        <div className="integration-config">
          <Select value={runtime.id} items={runtimes.map(item => ({ value: item.id, label: item.name }))} onValueChange={value => {
            if (typeof value === "string" && runtimes.some(item => item.id === value)) { setRuntimeId(value); setCopied(""); }
          }}>
            <SelectLabel>Integration</SelectLabel>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{runtimes.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          {runtime.id === "vercel" && <Select value={provider.id} items={providers.map(item => ({ value: item.id, label: item.name }))} onValueChange={value => {
            if (typeof value === "string" && providers.some(item => item.id === value)) { setProviderId(value); setCopied(""); }
          }}>
            <SelectLabel>Server provider</SelectLabel>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{providers.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>}
        </div>
        <div className="integration-summary">
          <div className="integration-summary-title"><h3>{runtime.name}</h3><span>{runtime.kind}</span></div>
          <p>{runtime.description}</p>
          <ul className="integration-features" aria-label={`${runtime.name} example features`}>{runtime.capabilities.map(item => <li key={item}>{item}</li>)}</ul>
          {runtime.id === "vercel" && <div className="integration-provider" data-integration-provider={provider.id}>
            <strong>{provider.name}</strong><p>Use <code>{provider.package}</code> in the server recipe. Set <code>{provider.key}</code> and choose an available model in your server configuration. This starter route accepts text; the host must authorize file and tool inputs before extending it.</p>
            <Button render={<a href={provider.docs} target="_blank" rel="noreferrer noopener" />}>Provider documentation</Button>
          </div>}
        </div>
        <Tabs key={runtime.id} defaultValue={runtime.files[0].id} className="integration-code" onValueChange={() => setCopied("")}>
          <TabsList aria-label="Integration source files">{runtime.files.map(file => <TabsTab key={file.id} value={file.id}>{file.label}</TabsTab>)}<TabsIndicator /></TabsList>
          {runtime.files.map(file => <TabsPanel key={file.id} value={file.id}>
            <div className="integration-code-heading"><code>{file.name}</code><Button onClick={() => copy(file.source, file.name)}><LiquidIcon name="copy" />Copy {file.name}</Button></div>
            <pre tabIndex={0} aria-label={`${runtime.name} ${file.label} source`}><code>{file.source}</code></pre>
          </TabsPanel>)}
        </Tabs>
        <div className="integration-recipe-status">
          <span>Version-pinned, typechecked examples · {runtime.version}</span>
          <Button render={<a href={runtime.docs} target="_blank" rel="noreferrer noopener" />}>Official documentation</Button>
        </div>
        <output className="integration-copy-result" aria-live="polite">{copied}</output>
      </section>
      <section className="integration-boundaries" aria-label="Integration responsibilities">
        <div><h3>Keep the runtime in charge</h3><p>{runtime.ownership}</p></div>
        <div><h3>Choose supported capabilities</h3><p>Attachments, tools and modalities depend on the chosen runtime and model. The typed adapters preserve supported parts and make unsupported content visible.</p></div>
      </section>
      <p className="integration-evidence">These are integration recipes. This gallery runs local demonstrations; no provider is connected and no API keys are collected here.</p>
    </div>
  );
}

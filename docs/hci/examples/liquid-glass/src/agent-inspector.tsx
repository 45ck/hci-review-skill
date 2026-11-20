"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  galleryAgent,
  hasWebMcp,
  type AgentComponent,
  type AgentStep,
  type GalleryAgent,
  type ObservedChange,
} from "./agent-bridge";

export type AgentInspectorProps = {
  refreshKey?: string | number;
  className?: string;
};

type RecentChange = { sequence: number; change: ObservedChange };

const metadataKeys = new Set([
  "ref",
  "component",
  "label",
  "row",
  "actions",
  "items",
  "buttons",
  "text",
  "source",
  "offPage",
  "confirm",
]);

function serialize(value: unknown, indent?: number) {
  try {
    return JSON.stringify(value, undefined, indent) ?? String(value);
  } catch {
    return String(value);
  }
}

function describeState(entry: AgentComponent) {
  const state = Object.fromEntries(
    Object.entries(entry).filter(([key]) => !metadataKeys.has(key)),
  );
  const text = Object.keys(state).length
    ? serialize(state)
    : "No exposed state";
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

type CommandOperation = "snapshot" | "query" | "act";
type ParsedCommand =
  | { operation: "snapshot" }
  | { operation: "query"; arguments: Parameters<GalleryAgent["query"]>[0] }
  | { operation: "act"; arguments: { steps: AgentStep[] } };

const commandExamples: Record<CommandOperation, string> = {
  snapshot: "{}",
  query: '{\n  "text": "Component catalogue"\n}',
  act: '{\n  "steps": [\n    {\n      "ref": "Component catalogue",\n      "action": "setValue",\n      "args": ["Input"]\n    }\n  ]\n}',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCommand(
  operation: CommandOperation,
  text: string,
): ParsedCommand {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("Arguments must be a JSON object.");
  if (operation === "snapshot") {
    if (Object.keys(value).length) {
      throw new Error("snapshot takes an empty object: {}.");
    }
    return { operation };
  }
  if (operation === "query") {
    const allowed = new Set(["text", "within", "kind"]);
    if (
      Object.keys(value).some((key) => !allowed.has(key)) ||
      Object.values(value).some((item) => typeof item !== "string")
    ) {
      throw new Error("query accepts only text, within and kind as strings.");
    }
    if (!Object.values(value).some((item) => (item as string).trim())) {
      throw new Error(
        "Give query at least one non-empty text, within or kind.",
      );
    }
    return { operation, arguments: value };
  }
  if (
    Object.keys(value).some((key) => key !== "steps") ||
    !Array.isArray(value.steps) ||
    value.steps.length < 1 ||
    value.steps.length > 10
  ) {
    throw new Error("act accepts an object with one to ten steps.");
  }
  const steps = value.steps.map((step: unknown, index): AgentStep => {
    if (
      !isRecord(step) ||
      Object.keys(step).some(
        (key) => !["ref", "action", "args"].includes(key),
      ) ||
      typeof step.ref !== "string" ||
      !step.ref.trim() ||
      typeof step.action !== "string" ||
      !step.action.trim() ||
      (step.args !== undefined && !Array.isArray(step.args))
    ) {
      throw new Error(
        `Step ${index + 1} needs a ref, an action and an optional args array.`,
      );
    }
    return {
      ref: step.ref,
      action: step.action,
      args: step.args as unknown[] | undefined,
    };
  });
  return { operation, arguments: { steps } };
}

function AgentCommandConsole() {
  const operationId = useId();
  const argumentsId = useId();
  const [operation, setOperation] = useState<CommandOperation>("query");
  const [argumentsText, setArgumentsText] = useState(commandExamples.query);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>();
  const [failure, setFailure] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [completed, setCompleted] = useState<CommandOperation | null>(null);

  async function runCommand() {
    if (running) return;
    setFailure("");
    setResult(undefined);
    setSources([]);
    setCompleted(null);
    let command: ParsedCommand;
    try {
      command = parseCommand(operation, argumentsText);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
      return;
    }
    setRunning(true);
    const observedSources = new Set<string>();
    const unsubscribe = galleryAgent.subscribe((change) => {
      observedSources.add(change.source);
    });
    try {
      const next =
        command.operation === "snapshot"
          ? galleryAgent.snapshot()
          : command.operation === "query"
            ? await galleryAgent.query(command.arguments)
            : await galleryAgent.act(command.arguments);
      setResult(next);
      setCompleted(command.operation);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      unsubscribe();
      setSources([...observedSources]);
      setRunning(false);
    }
  }

  return (
    <details className="agent-command-console">
      <summary>Run SDK command</summary>
      <p>
        Call the same bridge with JSON arguments. The action policy still
        applies.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runCommand();
        }}
      >
        <label htmlFor={operationId}>Operation</label>
        <select
          id={operationId}
          aria-label="SDK command operation"
          value={operation}
          disabled={running}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (next === "snapshot" || next === "query" || next === "act") {
              setOperation(next);
              setArgumentsText(commandExamples[next]);
              setFailure("");
            }
          }}
        >
          <option value="snapshot">snapshot</option>
          <option value="query">query</option>
          <option value="act">act</option>
        </select>
        <label htmlFor={argumentsId}>JSON arguments</label>
        <textarea
          id={argumentsId}
          aria-label="SDK command arguments"
          value={argumentsText}
          onChange={(event) => setArgumentsText(event.currentTarget.value)}
          rows={8}
          cols={28}
          spellCheck={false}
          disabled={running}
        />
        <button type="submit" disabled={running} data-sdk-command-run>
          {running ? "Running SDK command…" : "Run SDK command"}
        </button>
      </form>
      {failure ? <p role="alert">Command error: {failure}</p> : null}
      {running ? <p role="status">Waiting for the SDK result…</p> : null}
      {completed ? (
        <p role="status">
          <code>{completed}</code> returned.{" "}
          {sources.length
            ? `Change source: ${sources.join(", ")}.`
            : "No component change events."}
        </p>
      ) : null}
      {result !== undefined ? (
        <pre tabIndex={0} aria-label="SDK command result">
          <code>{serialize(result, 2)}</code>
        </pre>
      ) : null}
    </details>
  );
}

export function AgentInspector({
  refreshKey = "",
  className = "",
}: AgentInspectorProps) {
  const headingId = useId();
  const [snapshot, setSnapshot] = useState<AgentComponent[]>([]);
  const [changes, setChanges] = useState<RecentChange[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const nextSequence = useRef(0);
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let frame = 0;
    const read = () => {
      if (!active) return;
      try {
        const next = galleryAgent.snapshot();
        setSnapshot((previous) =>
          serialize(previous) === serialize(next) ? previous : next,
        );
        setError("");
        setReady(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    // Controlled callbacks report a request before React has rendered its accepted state.
    const scheduleRead = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(read);
      });
    };
    refresh.current = scheduleRead;
    setChanges([]);
    setReady(false);
    const unsubscribe = galleryAgent.subscribe((change) => {
      const next = { sequence: ++nextSequence.current, change };
      setChanges((previous) => [next, ...previous].slice(0, 6));
      scheduleRead();
    });
    scheduleRead();
    return () => {
      active = false;
      unsubscribe();
      cancelAnimationFrame(frame);
      refresh.current = () => {};
    };
  }, [refreshKey]);

  const current = snapshot.filter(
    (entry) => !entry.offPage && entry.component !== "more",
  );
  const named = current.filter((entry) => entry.label?.trim()).length;
  const actionCount = current.reduce(
    (count, entry) => count + entry.actions.length,
    0,
  );
  const remembered = snapshot.filter((entry) => entry.offPage).length;
  const more = snapshot.find((entry) => entry.component === "more");

  return (
    <section
      className={`agent-inspector ${className}`.trim()}
      aria-labelledby={headingId}
      data-agent-hidden
    >
      <div className="agent-inspector-heading">
        <div>
          <h3 id={headingId}>Live registry</h3>
        </div>
        <button type="button" onClick={() => refresh.current()}>
          Refresh snapshot
        </button>
      </div>

      <dl className="agent-inspector-stats">
        <div>
          <dt>Mounted components</dt>
          <dd>{current.length}</dd>
        </div>
        <div>
          <dt>Named</dt>
          <dd>
            {named} / {current.length}
          </dd>
        </div>
        <div>
          <dt>Offered actions</dt>
          <dd>{actionCount}</dd>
        </div>
      </dl>

      <p className="agent-inspector-connection">
        {hasWebMcp
          ? "Browser tool API detected; registration requested."
          : "Browser tool API unavailable; the local console bridge is available."}
      </p>
      {error ? <p role="alert">Snapshot unavailable: {error}</p> : null}
      {!ready && !error ? <p>Reading mounted components…</p> : null}

      <AgentCommandConsole />

      {current.length ? (
        <div className="agent-inspector-table">
          <table>
            <caption>Currently mounted SDK components</caption>
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {current.map((entry) => (
                <tr key={entry.ref}>
                  <th scope="row">
                    {entry.label || (
                      <strong className="agent-inspector-unnamed">
                        Accessible name missing
                      </strong>
                    )}
                    <small>
                      <code>{entry.ref}</code> · {entry.component}
                    </small>
                  </th>
                  <td>
                    <code>{describeState(entry)}</code>
                    {entry.confirm ? <small>Requires a person</small> : null}
                  </td>
                  <td>
                    {entry.actions.length ? (
                      <code>{entry.actions.join(", ")}</code>
                    ) : (
                      "None currently available"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : ready ? (
        <p>No visible SDK components are registered.</p>
      ) : null}

      {more ? (
        <p>
          The SDK snapshot has more entries. Use <code>query</code> to find the
          remaining components or choices.
        </p>
      ) : null}
      {remembered ? (
        <p>
          {remembered} previously mounted component
          {remembered === 1 ? " is" : "s are"} remembered in the JSON as{" "}
          <code>offPage</code>.
        </p>
      ) : null}

      <details className="agent-inspector-json">
        <summary>Snapshot JSON</summary>
        <pre tabIndex={0} aria-label="Raw agent snapshot">
          <code>{serialize(snapshot, 2)}</code>
        </pre>
      </details>

      <details className="agent-inspector-changes">
        <summary>Recent component changes ({changes.length})</summary>
        {changes.length ? (
          <ol>
            {changes.map(({ sequence, change }) => (
              <li key={sequence}>
                <strong>{change.label || change.component}</strong>{" "}
                <code>{change.ref}</code>: <code>{change.key}</code> ={" "}
                <code>{serialize(change.value)}</code>
                <small>
                  {change.source} · {change.reason}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p>Interact with a specimen to see its change notifications.</p>
        )}
        <p>Notifications report requests; the snapshot shows current state.</p>
      </details>
      <p className="agent-inspector-policy">
        Actions marked as requiring a person are refused. Private values remain
        redacted by the SDK.
      </p>
    </section>
  );
}

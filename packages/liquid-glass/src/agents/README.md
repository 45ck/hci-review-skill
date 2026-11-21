# Agent components

Reusable Liquid Glass components for inspecting agent capabilities, task progress, tool requests and produced artifacts. Import from `@quantitative-hci/liquid-glass/agents` and load `@quantitative-hci/liquid-glass/agents.css` after the shared kit CSS. All components remain **Unvalidated** pending a human UI/UX review.

## Components

| Component | Responsibility |
| --- | --- |
| `AgentCapabilityCard` | Identity, version, skills, input/output media types and attributed source. |
| `AgentTaskStatus` | Named task state, with text as well as colour. |
| `AgentTaskTimeline` | Ordered events using the real UI SDK Timeline and its keyboard behaviour. |
| `AgentToolRequest` | Exact tool name, arguments, before/after fields, results, errors and optional review callback. |
| `AgentArtifactCard` | Produced content, media type and producer; optional host open action. |
| `AgentContextPanel` | Read-only, redacted JSON context and copy control. |
| `AgentTaskPanel` | Composes history, tool requests, artifacts, cancellation and host-supplied controls. |

The components use the installed Vercel UI SDK Button, Field, Textarea, Timeline and Collapsible primitives. Their real actions appear through the application's existing SDK agent bridge. No second browser mutation interface is introduced. Context is inspectable through the named disclosure and read-only textarea.

## State and host integration

```tsx
import { useState } from "react";
import {
  AgentTaskPanel, applyAgentTaskUpdate, createAgentTask,
  type AgentTaskUpdate,
} from "@quantitative-hci/liquid-glass/agents";
import "@quantitative-hci/liquid-glass/agents.css";

function TaskView() {
  const [task, setTask] = useState(() => createAgentTask("task-42", "Review a model"));

  function acceptHostUpdate(update: AgentTaskUpdate) {
    setTask(current => {
      const result = applyAgentTaskUpdate(current, update);
      if (!result.ok) console.warn(result.code, result.message);
      return result.task;
    });
  }

  // Feed acceptHostUpdate from your authenticated host subscription.
  return <AgentTaskPanel task={task} />;
}
```

`applyAgentTaskUpdate(task, update)` is a pure local reducer. Each update names `taskId`, `expectedRevision` and one event with an ID, sequence, ISO timestamp, state, actor, title and description. Optional call/artifact records accompany the event. Successful updates return `{ok, changed, task, message}`; rejected updates also return a stable `code` and the unchanged task.

- The next sequence equals the current revision plus one. Events cannot move backward in time.
- Replaying an identical event ID/content is an idempotent no-op, including reordered JSON object keys. Reusing the ID with different content is a conflict.
- A reviewed call begins as `proposed`, then becomes `approved` or `denied`. Approved calls can run and produce a result. Arguments, effect and review policy cannot change after proposal.
- Finished calls cannot be rewritten. A task cannot complete with unresolved calls. Terminal tasks reject subsequent work; duplicate delivery remains idempotent.
- Each update is bounded to 256 KB, each task to 2 MB and 100 events. Hosts should archive longer runs and start a new display task. These are component limits, not protocol limits.
- JSON must contain supported finite values, bounded collections and depth. `validateAgentTask` checks this component schema for imported task documents.

The public task states are pinned to [A2A 0.3.0 TaskState](https://a2a-protocol.org/v0.3.0/specification/#63-taskstate-enum): submitted, working, input-required, auth-required, completed, canceled, failed, rejected and unknown. Input-required is interrupted; auth-required requests out-of-band authentication and is represented separately by `authenticationRequired` in context. The reducer's transition restrictions are an application policy. Its event envelope is a local component schema; it is not the A2A wire schema. This package does not include an A2A transport or connect a model provider.

Tool names, argument/result display and explicit execution state are informed by [MCP tools, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools). Tool annotations are descriptive input; the host remains responsible for validation and authorization. This package does not implement an MCP client/server.

## Review, source and concurrency

`AgentToolRequest` accepts `onReview(decision, {callId, source})`. The component waits for the callback, blocks simultaneous review actions, and displays a callback error. The callback must return/reject its Promise and the host must supply the accepted call state. The component never infers acceptance from a successful button click.

The approval control carries `data-agent-confirm` with the proposed action. The demo's existing bridge refuses such actions from agents; a person can use the same visible control. There is no alternate approval action. This is a demonstrative review policy, not a requirement to add human approval to every tool in a host application. Derive review policy from the host's actual requirements.

`AgentTaskPanel` disables cancellation and pending reviews for terminal tasks. The host must still check revision and authorization on its authoritative state. A disabled control is not a server permission check. The UI's `source` identifies the SDK interaction origin; never use it as authentication.

Hosts must omit secrets before passing data. The context and structured content displays additionally redact common credential keys and bearer values, bound deep/large values, and tolerate repeated references. This is a display safeguard, not a general secret detector. Labels, descriptions and error messages must already be appropriate for display.

## Demo and verification

The **Agents** collection runs an explicitly labelled local sample: inspect → propose → human review → apply → artifact. The resulting artifact contains the actual changed local sample. Rejection/cancellation leave the sample unchanged, and a new task resets it. No provider or remote tool is called.

`node scripts/check-agent-tasks.mjs` verifies malformed inputs, identity/revision conflicts, atomic refusal, duplicate delivery, terminal behaviour, review transitions, immutable input events, bounded history and redaction. The production browser contract checks SDK discovery/actions, marked approval refusal, actual human review, artifacts, read-only context, navigation persistence, narrow layout and forced-colour controls. Passing these checks is not a human UI/UX approval.

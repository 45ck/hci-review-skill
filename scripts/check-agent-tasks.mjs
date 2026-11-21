import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'quantive-agent-tasks-'));
try {
  for (const name of ['types', 'task']) {
    const code = stripTypeScriptTypes(fs.readFileSync(path.join(root, `packages/liquid-glass/src/agents/${name}.ts`), 'utf8')).replaceAll('"./types"', '"./types.mjs"');
    fs.writeFileSync(path.join(output, `${name}.mjs`), code);
  }
  const { applyAgentTaskUpdate, createAgentTask, validateAgentTask, redactAgentData, createAgentTaskContext, isAgentTaskTerminal, isAgentTaskInterrupted } = await import(pathToFileURL(path.join(output, 'task.mjs')).href);
  let checks = 0;
  const test = (name, run) => { run(); checks++; console.log(`PASS ${name}`); };
  const fresh = () => createAgentTask('task-1', 'Review a model');
  const update = (task, state, extra = {}, request = {}) => ({ taskId: task.id, expectedRevision: task.revision, event: { id: `event-${task.revision + 1}`, sequence: task.revision + 1, at: new Date(Date.UTC(2026, 10, 21, 0, 0, task.revision)).toISOString(), state, actor: 'Test host', title: 'Task changed', description: 'An explicit state change.', ...extra }, ...request });
  const send = (task, state, extra = {}, request = {}) => applyAgentTaskUpdate(task, update(task, state, extra, request));
  const call = { id: 'rename', name: 'model.rename', title: 'Rename element', description: 'Rename one element.', state: 'proposed', effect: 'write', review: 'required', arguments: { id: 'a', name: 'New label' }, changes: [{ path: 'a.name', before: 'Old label', after: 'New label' }] };
  const proposal = () => send(send(fresh(), 'working').task, 'input-required', { call }).task;
  test('task construction and nine explicit states', () => {
    assert.deepEqual(validateAgentTask(fresh()), []);
    assert.equal(fresh().revision, 0);
    for (const state of ['completed', 'canceled', 'failed', 'rejected']) assert.equal(isAgentTaskTerminal(state), true);
    for (const state of ['working', 'input-required', 'auth-required', 'unknown', 'submitted']) assert.equal(isAgentTaskTerminal(state), false);
    assert.throws(() => createAgentTask('', 'Task'));
  });
  test('ordered updates preserve the previous task and detach input events', () => {
    const task = fresh(); const request = update(task, 'working');
    const result = applyAgentTaskUpdate(task, request);
    assert.equal(result.ok, true); assert.equal(result.task.revision, 1); assert.equal(task.revision, 0);
    request.event.title = 'External mutation';
    assert.equal(result.task.events[0].title, 'Task changed');
    assert.deepEqual(validateAgentTask(result.task), []);
  });
  test('replayed event is idempotent even when JSON field order differs', () => {
    const request = update(fresh(), 'working');
    const task = applyAgentTaskUpdate(fresh(), request).task;
    const reordered = Object.fromEntries(Object.entries(request.event).reverse());
    const replay = applyAgentTaskUpdate(task, { ...request, event: reordered });
    assert.equal(replay.ok, true); assert.equal(replay.changed, false); assert.equal(replay.task, task);
    assert.equal(applyAgentTaskUpdate(task, { ...request, event: { ...request.event, title: 'Different event' } }).code, 'conflict');
  });
  test('stale revision, wrong identity and out-of-order events are rejected', () => {
    const task = send(fresh(), 'working').task;
    assert.equal(send(task, 'working', {}, { expectedRevision: 0 }).code, 'conflict');
    assert.equal(send(task, 'working', {}, { taskId: 'other' }).code, 'conflict');
    assert.equal(send(task, 'working', { sequence: 8 }).code, 'out-of-order');
    assert.equal(send(task, 'working', { at: '2025-01-01T00:00:00.000Z' }).code, 'out-of-order');
  });
  test('terminal tasks reject new work but permit duplicate delivery', () => {
    for (const state of ['completed', 'canceled', 'failed', 'rejected']) {
      const working = send(fresh(), 'working').task; const request = update(working, state);
      const finished = applyAgentTaskUpdate(working, request).task;
      assert.equal(send(finished, 'working').code, 'terminal');
      assert.equal(applyAgentTaskUpdate(finished, request).changed, false);
    }
  });
  test('reviewed write cannot start approved or skip review', () => {
    const working = send(fresh(), 'working').task;
    assert.equal(send(working, 'working', { call: { ...call, state: 'approved' } }).code, 'transition');
    const task = proposal();
    const result = send(task, 'working', { call: { ...call, state: 'succeeded' } });
    assert.equal(result.ok, false); assert.equal(result.task, task);
    assert.equal(send(task, 'completed').ok, false);
  });
  test('review policy and exact arguments remain attached to a call', () => {
    const task = proposal();
    for (const changed of [{ name: 'different.tool' }, { review: 'not-required' }, { effect: 'read' }, { arguments: { id: 'b', name: 'Other' } }]) {
      const result = send(task, 'working', { call: { ...call, state: 'approved', ...changed } });
      assert.equal(result.code, 'conflict'); assert.equal(result.task, task);
    }
  });
  test('approved changes produce an actual immutable-input artifact', () => {
    const task = send(proposal(), 'working', { call: { ...call, state: 'approved' } }).task;
    const artifact = { id: 'model-1', name: 'Changed model', description: 'The accepted result.', mediaType: 'application/json', content: { revision: 1, node: { id: 'a', name: 'New label' } }, producedBy: 'Test host' };
    const result = send(task, 'completed', { call: { ...call, state: 'succeeded', result: { revision: 1 } }, artifact });
    assert.equal(result.ok, true); assert.equal(result.task.state, 'completed');
    assert.equal(result.task.artifacts[0].content.node.name, 'New label');
    artifact.content.node.name = 'External mutation'; assert.equal(result.task.artifacts[0].content.node.name, 'New label');
    assert.equal(task.artifacts.length, 0); assert.deepEqual(validateAgentTask(result.task), []);
  });
  test('completed calls cannot be rewritten while a task continues', () => {
    const working = send(fresh(), 'working', { call: { ...call, review: 'not-required', effect: 'read', state: 'succeeded', result: { x: 1 } } }).task;
    assert.equal(send(working, 'working', { call: { ...working.calls[0], result: { x: 2 } } }).code, 'conflict');
  });
  test('input interruption and authentication status remain distinct; terminal tasks need no review', () => {
    const working = send(fresh(), 'working').task;
    const interrupted = send(working, 'input-required').task;
    assert.equal(createAgentTaskContext(interrupted).interrupted, true);
    assert.equal(createAgentTaskContext(interrupted).authenticationRequired, false);
    assert.equal(send(interrupted, 'working').ok, true);
    const authentication = send(working, 'auth-required').task;
    assert.equal(createAgentTaskContext(authentication).interrupted, false);
    assert.equal(createAgentTaskContext(authentication).authenticationRequired, true);
    assert.equal(send(authentication, 'working').ok, true);
    assert.equal(isAgentTaskInterrupted('input-required'), true);
    assert.equal(isAgentTaskInterrupted('auth-required'), false);
    assert.deepEqual(createAgentTaskContext(proposal()).reviewRequired, ['rename']);
    for (const state of ['canceled', 'failed', 'rejected']) assert.deepEqual(createAgentTaskContext(send(proposal(), state).task).reviewRequired, []);
  });
  test('host-reported unknown status is reachable and can recover without reopening terminal work', () => {
    const working = send(fresh(), 'working').task;
    for (const task of [fresh(), working, send(working, 'input-required').task, send(working, 'auth-required').task]) {
      const result = send(task, 'unknown');
      assert.ok(result.ok, result.message); assert.deepEqual(validateAgentTask(result.task), []);
      const context = createAgentTaskContext(result.task);
      assert.equal(context.terminal, false); assert.equal(context.interrupted, false); assert.equal(context.authenticationRequired, false);
      const repeated = send(result.task, 'unknown'); assert.ok(repeated.ok);
      const resumed = send(repeated.task, 'working'); assert.ok(resumed.ok); assert.deepEqual(validateAgentTask(resumed.task), []);
    }
    for (const state of ['completed', 'canceled', 'failed', 'rejected']) assert.equal(send(send(working, state).task, 'unknown').code, 'terminal');
  });
  test('malformed and oversized JSON updates never change current state', () => {
    const task = fresh();
    const invalid = [null, {}, { event: null }, update(task, 'bogus'), update(task, 'working', { sequence: Infinity }), update(task, 'working', { at: 'not-time' }), update(task, 'working', { call: { ...call, arguments: { x: NaN } } }), update(task, 'working', { call: { ...call, arguments: { huge: 'x'.repeat(256001) } } })];
    const cyclic = update(task, 'working'); cyclic.circular = cyclic; invalid.push(cyclic);
    for (const malformed of [{ state: { toString: 'proposed' } }, { state: ['proposed'] }, { review: ['required'] }, { effect: { toString: 'write' } }]) invalid.push(update(task, 'working', { call: { ...call, ...malformed } }));
    for (const value of invalid) { const result = applyAgentTaskUpdate(task, value); assert.equal(result.ok, false); assert.equal(result.task, task); }
  });
  test('imported snapshots must be canonical projections of their event history', () => {
    const proposed = proposal();
    const approved = send(proposed, 'working', { call: { ...call, state: 'approved' } }).task;
    const artifact = { id: 'a', name: 'Artifact', description: 'Canonical content', mediaType: 'application/json', content: { value: 1 }, producedBy: 'Test host' };
    const finished = send(approved, 'completed', { call: { ...call, state: 'succeeded' }, artifact }).task;
    const resurrectedEvent = update(finished, 'working').event;
    const skippedReview = structuredClone(proposed);
    skippedReview.events.at(-1).call.state = 'approved';
    skippedReview.calls[0].state = 'approved';
    const completedWithPendingCall = { ...proposed, state: 'completed', revision: proposed.revision + 1, events: [...proposed.events, update(proposed, 'completed').event] };
    const invalid = [
      { ...fresh(), state: 'completed' },
      { ...fresh(), calls: [{ ...call, state: 'approved' }] },
      { ...fresh(), artifacts: [artifact] },
      { ...proposed, calls: [{ ...call, state: 'approved' }] },
      { ...finished, artifacts: [{ ...artifact, content: { value: 999 } }] },
      { ...finished, state: 'working', revision: finished.revision + 1, events: [...finished.events, resurrectedEvent] },
      skippedReview,
      completedWithPendingCall,
    ];
    for (const task of invalid) {
      assert.ok(validateAgentTask(task).length);
      const result = applyAgentTaskUpdate(task, update(task, 'working'));
      assert.equal(result.code, 'invalid'); assert.equal(result.task, task);
    }
    assert.deepEqual(validateAgentTask(finished), []);
    const replacement = send(send(fresh(), 'working', { artifact }).task, 'working', { artifact: { ...artifact, content: { value: 2 } } }).task;
    assert.deepEqual(validateAgentTask(replacement), []);
    assert.equal(replacement.artifacts.length, 1); assert.equal(replacement.artifacts[0].content.value, 2);
  });
  test('display and update limits count UTF-8 bytes including aggregate history', () => {
    const task = fresh();
    const oversized = update(task, 'working', { call: { ...call, arguments: { text: '😀'.repeat(65000) } } });
    assert.ok(JSON.stringify(oversized).length < 256000);
    assert.equal(applyAgentTaskUpdate(task, oversized).code, 'invalid');
    const imported = { ...task, note: 'é'.repeat(1000001) };
    assert.ok(JSON.stringify(imported).length < 2000000);
    assert.match(validateAgentTask(imported)[0], /UTF-8/);
    let current = task;
    for (let index = 0; index < 8; index++) {
      const result = send(current, 'working', { artifact: { id: `artifact-${index}`, name: 'Large artifact', description: 'Bounded content', mediaType: 'text/plain', content: 'é'.repeat(60000), producedBy: 'Test host' } });
      assert.ok(result.ok, result.message); current = result.task;
    }
    const overflow = send(current, 'working', { artifact: { id: 'overflow', name: 'Overflow artifact', description: 'Exceeds aggregate budget', mediaType: 'text/plain', content: 'é'.repeat(60000), producedBy: 'Test host' } });
    assert.equal(overflow.code, 'invalid'); assert.equal(overflow.task, current);
    assert.match(overflow.message, /UTF-8/); assert.deepEqual(validateAgentTask(current), []);
  });
  test('invalid current documents return diagnostics instead of throwing', () => {
    for (const value of [null, {}, { ...fresh(), events: [null] }, { ...fresh(), revision: 1 }, { ...fresh(), state: 'invented' }]) {
      assert.ok(validateAgentTask(value).length);
      assert.equal(applyAgentTaskUpdate(value, update(fresh(), 'working')).code, 'invalid');
    }
  });
  test('bounded history refuses the next event without discarding evidence', () => {
    let task = fresh(); for (let index = 0; index < 100; index++) { const result = send(task, 'working'); assert.equal(result.ok, true); task = result.task; }
    const result = send(task, 'working'); assert.equal(result.ok, false); assert.equal(result.task, task); assert.equal(task.events.length, 100);
  });
  test('display context redacts sensitive keys and bearer values', () => {
    const data = { password: 'p', nested: { api_key: 'k', authorization: 'a', safe: 'Bearer ABC123' }, cookies: ['c'], ordinary: 'visible' };
    const redacted = redactAgentData(data);
    assert.equal(redacted.password, '[Redacted]'); assert.equal(redacted.nested.api_key, '[Redacted]');
    assert.equal(redacted.nested.safe, 'Bearer [Redacted]'); assert.equal(redacted.ordinary, 'visible');
    assert.equal(data.password, 'p'); const cycle = {}; cycle.self = cycle; assert.equal(redactAgentData(cycle).self, '[Repeated reference]');
  });
  console.log(JSON.stringify({ result: 'PASS', agentTaskScenarios: checks, source: 'A2A 0.3.0 state projection; local transition policy' }));
} finally { fs.rmSync(output, { recursive: true, force: true }); }

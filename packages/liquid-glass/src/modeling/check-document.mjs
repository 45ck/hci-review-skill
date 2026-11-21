import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'quantive-documents-'));
const sources = {
  'diagram-types': 'packages/liquid-glass/src/developer/types.ts',
  notations: 'packages/liquid-glass/src/developer/notations.ts',
  scene: 'packages/liquid-glass/src/developer/scene.ts',
  types: 'packages/liquid-glass/src/modeling/types.ts',
  document: 'packages/liquid-glass/src/modeling/document.ts',
};
try {
  for (const [id, name] of Object.entries(sources)) {
    let source = stripTypeScriptTypes(fs.readFileSync(path.join(repo, name), 'utf8'));
    if (id === 'notations' || id === 'scene') source = source.replaceAll('"./types"', '"./diagram-types.mjs"');
    source = source.replaceAll('"./notations"', '"./notations.mjs"').replaceAll('"../developer/scene"', '"./scene.mjs"').replaceAll('"./types"', '"./types.mjs"');
    fs.writeFileSync(path.join(output, `${id}.mjs`), source);
  }
  const { createModelDocument, applyModelTransaction, previewModelTransaction, undoModelDocument, redoModelDocument, selectModelElement, inspectModelDocument, validateModelSetReferences } = await import(pathToFileURL(path.join(output, 'document.mjs')).href);
  const model = {
    id: 'document-test', name: 'Document test', notation: 'UML class', description: 'An authored test model.', width: 900, height: 700,
    nodes: [
      { id: 'container', name: 'Container', kind: 'class', description: '', x: 30, y: 20, width: 560, height: 480 },
      { id: 'child', name: 'Child', kind: 'class', description: '', x: 70, y: 130, width: 180, height: 100, parentId: 'container', entityId: 'shared-child' },
      { id: 'owned', name: 'Owned port', kind: 'port', description: '', x: 578, y: 260, width: 20, height: 20, ownerId: 'container' },
      { id: 'outside', name: 'Outside', kind: 'class', description: '', x: 650, y: 170, width: 180, height: 100 },
    ],
    edges: [
      { id: 'internal', source: 'child', target: 'owned', kind: 'association', description: '', sourcePoint: { x: 250, y: 170 }, targetPoint: { x: 578, y: 270 }, waypoints: [{ x: 400, y: 170 }], labelPosition: { x: 420, y: 180 } },
      { id: 'external', source: 'owned', target: 'outside', kind: 'association', description: '', sourcePoint: { x: 598, y: 270 }, targetPoint: { x: 650, y: 220 }, waypoints: [{ x: 620, y: 270 }] },
    ],
  };
  let checks = 0;
  const test = (name, action) => { action(); checks++; console.log(`PASS ${name}`); };
  const initial = createModelDocument(model, 'child');
  const request = operations => ({ expectedRevision: initial.revision, operations });
  test('constructor owns an immutable copy', () => {
    assert.notEqual(initial.model, model); assert.ok(Object.isFrozen(initial.model.nodes[0]));
    model.nodes[0].name = 'External mutation'; assert.equal(initial.model.nodes[0].name, 'Container');
  });
  test('preview is pure and identifies all affected objects', () => {
    const result = previewModelTransaction(initial, request([{ type: 'update-node', nodeId: 'container', patch: { x: 60, y: 40 } }]));
    assert.ok(result.ok); assert.equal(initial.revision, 0); assert.equal(initial.past.length, 0);
    assert.deepEqual(result.summary.updatedNodeIds.sort(), ['child', 'container', 'owned']);
    assert.deepEqual(result.summary.updatedEdgeIds.sort(), ['external', 'internal']);
    const inside = result.document.model.edges[0], outside = result.document.model.edges[1];
    assert.deepEqual(inside.sourcePoint, { x: 280, y: 190 }); assert.deepEqual(inside.targetPoint, { x: 608, y: 290 });
    assert.deepEqual(inside.waypoints, [{ x: 430, y: 190 }]); assert.deepEqual(inside.labelPosition, { x: 450, y: 200 });
    assert.deepEqual(outside.sourcePoint, { x: 628, y: 290 }); assert.deepEqual(outside.targetPoint, { x: 650, y: 220 });
    assert.deepEqual(outside.waypoints, [{ x: 620, y: 270 }]);
  });
  test('failed batch is atomic', () => {
    const result = applyModelTransaction(initial, request([{ type: 'rename-node', nodeId: 'child', name: 'New child' }, { type: 'update-node', nodeId: 'outside', patch: { width: -100 } }]));
    assert.equal(result.ok, false); assert.equal(result.document, initial); assert.equal(initial.model.nodes[1].name, 'Child');
  });
  test('explicit null clears optional fields while required fields stay validated', () => {
    const added = applyModelTransaction(initial, request([
      { type: 'update-node', nodeId: 'child', patch: { stereotype: 'entity' } },
      { type: 'update-edge', edgeId: 'internal', patch: { label: 'Owned relationship' } },
    ])).document;
    const cleared = applyModelTransaction(added, { expectedRevision: added.revision, operations: [
      { type: 'update-node', nodeId: 'child', patch: { stereotype: null } },
      { type: 'update-edge', edgeId: 'internal', patch: { label: null } },
    ] });
    assert.ok(cleared.ok); assert.equal('stereotype' in cleared.document.model.nodes[1], false);
    assert.equal('label' in cleared.document.model.edges[0], false);
    const invalid = applyModelTransaction(added, { expectedRevision: added.revision, operations: [{ type: 'update-node', nodeId: 'child', patch: { width: null } }] });
    assert.equal(invalid.ok, false); assert.equal(invalid.document, added);
  });
  const changed = applyModelTransaction(initial, { ...request([{ type: 'rename-node', nodeId: 'child', name: 'Reviewed child' }]), label: 'Review child' }).document;
  test('commit, undo, and redo use monotonic revisions', () => {
    assert.equal(changed.revision, 1); assert.equal(changed.past.length, 1);
    const undone = undoModelDocument(changed, 1).document;
    assert.equal(undone.revision, 2); assert.equal(undone.model.nodes[1].name, 'Child'); assert.equal(undone.selectedId, 'child');
    const redone = redoModelDocument(undone, 2).document;
    assert.equal(redone.revision, 3); assert.equal(redone.model.nodes[1].name, 'Reviewed child');
    const stale = applyModelTransaction(redone, { expectedRevision: 1, operations: [{ type: 'rename-node', nodeId: 'child', name: 'Lost change' }] });
    assert.equal(stale.issues[0].code, 'stale-revision'); assert.equal(stale.document, redone);
  });
  test('semantic no-op preserves history and redo', () => {
    const undone = undoModelDocument(changed, 1).document;
    const result = applyModelTransaction(undone, { expectedRevision: 2, operations: [{ type: 'replace-model', model: { ...undone.model, name: undone.model.name } }] });
    assert.equal(result.document, undone); assert.equal(result.changed, false); assert.equal(result.document.future.length, 1);
  });
  test('new edit after undo clears redo', () => {
    const undone = undoModelDocument(changed, 1).document;
    const result = applyModelTransaction(undone, { expectedRevision: 2, operations: [{ type: 'rename-node', nodeId: 'child', name: 'Different child' }] });
    assert.ok(result.ok); assert.equal(result.document.future.length, 0);
  });
  test('cascading deletion is one undoable operation', () => {
    const result = applyModelTransaction(initial, request([{ type: 'remove-node', nodeId: 'container' }]));
    assert.ok(result.ok); assert.deepEqual(result.document.model.nodes.map(node => node.id), ['outside']); assert.deepEqual(result.document.model.edges, []);
    assert.equal(result.document.selectedId, 'outside'); assert.deepEqual(result.summary.removedNodeIds.sort(), ['child', 'container', 'owned']);
    assert.deepEqual(undoModelDocument(result.document, 1).document.model, initial.model);
  });
  test('atomic additions can reference a later operation and select it', () => {
    const result = applyModelTransaction(initial, { ...request([
      { type: 'add-edge', edge: { id: 'added-edge', source: 'outside', target: 'added', kind: 'association', description: '' } },
      { type: 'add-node', node: { id: 'added', name: 'Added', kind: 'class', description: '', x: 650, y: 350, width: 180, height: 100 } },
    ]), selectedId: 'added' });
    assert.ok(result.ok); assert.equal(result.document.selectedId, 'added'); assert.equal(result.document.past.length, 1);
  });
  test('selection uses the same current IDs without creating document history', () => {
    const result = selectModelElement(initial, 'outside'); assert.equal(result.document.revision, 0); assert.equal(result.document.past.length, 0);
    assert.equal(selectModelElement(initial, 'missing').ok, false);
  });
  test('history is bounded', () => {
    let current = initial;
    for (let i = 0; i < 70; i++) current = applyModelTransaction(current, { expectedRevision: current.revision, operations: [{ type: 'rename-node', nodeId: 'child', name: `Child ${i}` }] }).document;
    assert.equal(current.revision, 70); assert.equal(current.past.length, 50);
  });
  test('cross-view references survive inspection and block dangling deletion', () => {
    const other = { id: 'other', name: 'Other', notation: 'UML class', description: 'Related view.', width: 500, height: 300,
      nodes: [{ id: 'ref', name: 'Reference', kind: 'class', description: '', x: 20, y: 20, width: 180, height: 100, entityId: 'shared-child', references: [{ modelId: initial.model.id, nodeId: 'child', relation: 'traces', label: 'Traces child' }] }], edges: [] };
    assert.deepEqual(validateModelSetReferences([initial.model, other]), []);
    assert.equal(inspectModelDocument(initial, { models: [initial.model, other] }).crossViewReferences[0].nodeId, 'ref');
    const result = applyModelTransaction(initial, request([{ type: 'remove-node', nodeId: 'child' }]), { models: [initial.model, other] });
    assert.equal(result.ok, false); assert.ok(result.issues.some(item => item.code === 'dangling-model-reference'));
    assert.ok(validateModelSetReferences([{ ...initial.model, parentModelId: 'other' }, { ...other, parentModelId: initial.model.id }]).some(item => item.code === 'model-hierarchy-cycle'));
  });
  test('host profile errors block writes; warnings remain inspectable', () => {
    const operation = request([{ type: 'rename-node', nodeId: 'child', name: 'New child' }]);
    assert.equal(applyModelTransaction(initial, operation, { validateModel: () => ['Profile error'] }).ok, false);
    const warning = applyModelTransaction(initial, operation, { validateModel: () => [{ code: 'scope', severity: 'warning', message: 'Documented subset.' }] });
    assert.ok(warning.ok); assert.equal(warning.issues[0].severity, 'warning');
    assert.equal(applyModelTransaction(initial, operation, { validateModel: () => { throw Error('broken validator'); } }).issues[0].code, 'validator-failed');
  });
  const invalid = [
    null, {}, { expectedRevision: -1, operations: [] }, { expectedRevision: 0.2, operations: [] }, request([]), request(Array.from({ length: 101 }, () => ({ type: 'remove-node', nodeId: 'child' }))),
    request([{ type: 'unknown' }]), request([{ type: 'update-node', nodeId: 'child', patch: { id: 'replacement' } }]),
    request([{ type: 'rename-node', nodeId: 'child', name: 'Outside' }]), request([{ type: 'rename-node', nodeId: 'child', name: '' }]),
    request([{ type: 'update-node', nodeId: 'child', patch: { x: Number.NaN } }]),
    request([{ type: 'update-node', nodeId: 'container', patch: { ownerId: 'child' } }]),
    request([{ type: 'add-node', node: { ...initial.model.nodes[1] } }]),
    request([{ type: 'add-edge', edge: { id: 'dangling', source: 'child', target: 'missing', kind: 'association', description: '' } }]),
    request([{ type: 'replace-model', model: { ...initial.model, id: 'replacement' } }]),
    request([{ type: 'replace-model', model: { id: initial.model.id } }, { type: 'remove-node', nodeId: 'child' }]),
    request([{ type: 'rename-node', nodeId: 'child', name: 'large'.repeat(300000) }]),
    JSON.parse('{"expectedRevision":0,"operations":[{"type":"update-node","nodeId":"child","patch":{"__proto__":{"bad":true}}}]}'),
    { ...request([{ type: 'rename-node', nodeId: 'child', name: 'Valid' }]), selectedId: 'missing' },
  ];
  test('malformed and hostile transactions never mutate the document', () => {
    for (const [index, value] of invalid.entries()) { const result = applyModelTransaction(initial, value); assert.equal(result.ok, false, `case ${index}`); assert.equal(result.document, initial); }
    const cycle = request([]); cycle.cycle = cycle; cycle.operations = [{ type: 'rename-node', nodeId: 'child', name: 'Valid' }]; assert.equal(applyModelTransaction(initial, cycle).ok, false);
  });
  console.log(`Model document checks passed: ${checks} scenarios, ${invalid.length + 1} rejected inputs.`);
} finally { fs.rmSync(output, { recursive: true, force: true }); }

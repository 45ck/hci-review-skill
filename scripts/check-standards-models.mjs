import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Temporary modules preserve the actual source while resolving extensionless TypeScript imports.
const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'glass-standards-review-'));
const modules = {
  types: 'packages/liquid-glass/src/developer/types.ts',
  notations: 'packages/liquid-glass/src/developer/notations.ts',
  scene: 'packages/liquid-glass/src/developer/scene.ts',
  'developer-models': 'docs/hci/examples/liquid-glass/src/developer-models.ts',
  'standards-models': 'docs/hci/examples/liquid-glass/src/standards-models.ts',
  'extended-models': 'docs/hci/examples/liquid-glass/src/extended-models.ts',
  'agent-models': 'docs/hci/examples/liquid-glass/src/agent-models.ts',
  'model-catalogue': 'docs/hci/examples/liquid-glass/src/model-catalogue.ts',
  profiles: 'packages/liquid-glass/src/standards/profiles.ts',
};
for (const [name, file] of Object.entries(modules)) {
  let code = stripTypeScriptTypes(fs.readFileSync(path.join(repo, file), 'utf8'));
  for (const dependency of Object.keys(modules)) {
    code = code.replaceAll(`"./${dependency}"`, `"./${dependency}.mjs"`);
  }
  fs.writeFileSync(path.join(output, `${name}.mjs`), code);
}
const catalogue = fs.readFileSync(path.join(repo, 'packages/liquid-glass/src/standards/catalogue.ts'), 'utf8');
const snapshot = fs.readFileSync(path.join(repo, 'packages/liquid-glass/src/standards/catalogue.snapshot.json'), 'utf8');
fs.writeFileSync(path.join(output, 'catalogue.mjs'), stripTypeScriptTypes(catalogue.replace("import snapshot from './catalogue.snapshot.json';", `const snapshot=${snapshot};`)));
const load = (name) => import(pathToFileURL(path.join(output, `${name}.mjs`)).href);
const { allDiagramModels: models } = await load('model-catalogue');
const { diagramProfiles, validateDiagramProfile } = await load('profiles');
const { standardsCatalogue: entries, catalogueCounts, findStandards } = await load('catalogue');
const { validateDiagramModel, diagramScene, diagramToSvg } = await load('scene');

const advertised = entries.flatMap(standard => standard.viewIds.map(id => ({ id, standard })));
assert.equal(advertised.length, 46);
assert.equal(models.length, 46);
assert.equal(new Set(models.map(model => model.id)).size, 46);
for (const { id, standard } of advertised) {
  const matches = models.filter(model => model.id === id);
  assert.equal(matches.length, 1, `Exactly one model must resolve ${id}`);
  const actual = matches[0].standard;
  for (const key of ['acronym', 'version', 'sourceUrl', 'coverage']) {
    assert.equal(actual[key], standard[key], `${id}: ${key} must match its catalogue pin`);
  }
}
for (const model of models) {
  assert.deepEqual(validateDiagramModel(model), [], model.id);
  assert.deepEqual(validateDiagramProfile(model).filter(issue => issue.severity === 'error'), [], `${model.id}: profile`);
  if (model.profileId) assert.ok(diagramProfiles.some(profile => profile.id === model.profileId), `${model.id}: registered profile`);
  if (model.parentModelId) assert.ok(models.some(parent => parent.id === model.parentModelId), `${model.id}: parent exists`);
  for (const node of model.nodes) for (const reference of node.references ?? []) {
    const target = models.find(item => item.id === reference.modelId);
    assert.ok(target && (!reference.nodeId || target.nodes.some(item => item.id === reference.nodeId)), `${model.id}/${node.id}: resolved cross-view reference`);
  }
  const svg = diagramToSvg(model);
  assert.ok(svg.startsWith('<svg '), `${model.id}: SVG root`);
  assert.ok(!/\b(?:NaN|Infinity|undefined)\b/.test(svg), `${model.id}: finite serialized geometry`);
  assert.ok(svg.includes('aria-labelledby="diagram-title diagram-description"'), `${model.id}: accessible SVG`);
  fs.writeFileSync(path.join(output, `${model.id}.svg`), svg);
}

const get = id => models.find(model => model.id === id);
const flatten = items => items.flatMap(item => [item, ...flatten(item.children ?? [])]);
const shapes = model => flatten(diagramScene(model));
const edgeShapes = (model, edge) => {
  const group = diagramScene(model).find(shape => shape.attrs['data-relationship'] === edge.id);
  return flatten(group.children);
};

// Regression checks target notation semantics that can look plausible while being wrong.
const dmn = get('dmn-table');
assert.equal(dmn.nodes[0].table.rows[0][2], '-', 'DMN wildcard is ASCII hyphen');
assert.equal(dmn.nodes[0].table.inputColumnCount, 2, 'DMN distinguishes two inputs from the output');
assert.equal(shapes(dmn).filter(shape => shape.attrs['data-dmn-separator'] === 'inputs-outputs').length, 2, 'DMN input/output separator is double');
assert.equal(shapes(dmn).filter(shape => shape.attrs['data-dmn-separator'] === 'clauses-entries').length, 2, 'DMN header/body separator is double');
assert.equal(shapes(dmn).filter(shape => shape.attrs['data-dmn-hit-policy'] === 'U').length, 1, 'Unique-hit policy has its own header cell');

const cmmn = get('cmmn-case');
for (const edge of cmmn.edges) {
  assert.equal(edge.kind, 'sentryOnPart');
  const criterion = cmmn.nodes.find(node => node.id === edge.target);
  assert.equal(criterion.kind, 'criterion', 'CMMN OnPart targets a criterion');
  assert.ok(criterion.ownerId, 'CMMN criterion has an explicit owning plan item');
  assert.ok(!edgeShapes(cmmn, edge).some(shape => shape.attrs['data-arrowhead']), 'CMMN OnPart has no arrowhead');
}
assert.ok(cmmn.nodes.some(node => node.kind === 'planningTable'), 'Discretionary task has a planning table');

const ifml = get('ifml-interaction');
for (const edge of ifml.edges.filter(edge => edge.kind === 'navigationFlow')) {
  const event = ifml.nodes.find(node => node.id === edge.source);
  assert.equal(event.kind, 'ifmlEvent', 'IFML navigation originates from an event');
  assert.ok(event.ownerId, 'IFML event has explicit owner');
}
assert.ok(ifml.edges.some(edge => edge.kind === 'navigationFlow' && edge.target === 'detail-view'), 'A navigation flow opens the Project view');
assert.ok(ifml.edges.some(edge => edge.kind === 'dataFlow'), 'Data passing is distinct from navigation');

const vdml = get('vdml-value');
for (const edge of vdml.edges) assert.ok(edgeShapes(vdml, edge).some(shape => shape.attrs['data-arrowhead'] === 'filled-triangle'), 'VDML flows and proposition connectors have filled arrowheads');
assert.ok(vdml.edges.some(edge => edge.kind === 'valuePropositionFlow' && edge.target === 'value'), 'Value proposition has a provider');
assert.ok(vdml.edges.some(edge => edge.kind === 'valuePropositionFlow' && edge.source === 'value'), 'Value proposition has a recipient');

const activity = get('uml-activity');
assert.ok(activity.nodes.some(node => node.kind === 'merge'), 'Retry and initial flows explicitly merge');
for (const action of activity.nodes.filter(node => node.kind === 'activity')) assert.ok(activity.edges.filter(edge => edge.target === action.id).length <= 1, 'The example does not accidentally join alternative incoming flows at an action');
const composite = get('uml-composite');
assert.equal(composite.nodes.filter(node => node.kind === 'part').length, 2, 'Composite parts are not instance specifications');
for (const edge of get('uml-communication').edges) assert.ok(edgeShapes(get('uml-communication'), edge).some(shape => shape.attrs['data-message-arrow']), 'Communication messages have adjacent arrows');

assert.equal(catalogueCounts.officialEntries, 286);
assert.equal(catalogueCounts.officialFamilies, 270);
assert.equal(catalogueCounts.totalEntries, 291);
assert.equal(catalogueCounts.notationSubsets, 9);
assert.equal(catalogueCounts.conceptProjections, 5);
assert.equal(catalogueCounts.referenceOnly, 277);
for (const id of ['DMN@1.7 beta', 'BACM@1.2 beta', 'SysML@2.0']) assert.equal(entries.find(entry => entry.id === id)?.coverage, 'reference-only', `${id} must not inherit an older adapter`);
assert.ok(findStandards({ category: 'business', coverage: 'notation-subset' }).some(entry => entry.family === 'BPMN'));
assert.ok(entries.filter(entry => entry.coverage === 'reference-only').every(entry => entry.viewIds.length === 0));

const malformed = [null, [], {}, { ...models[0], nodes: [null] }, { ...models[0], edges: [null] }];
const corrupt = mutate => { const value = structuredClone(models[1]); mutate(value); malformed.push(value); };
corrupt(value => { value.nodes[0].x = Number.NaN; });
corrupt(value => { value.nodes[0].parentId = value.nodes[0].id; });
corrupt(value => { value.nodes[0].ownerId = 'missing-owner'; });
corrupt(value => { value.nodes[0].table = { columns: [], rows: null }; });
corrupt(value => { value.standard.sourceUrl = 'javascript:alert(1)'; });
corrupt(value => { value.edges[0].source = 'missing-endpoint'; });
corrupt(value => { value.edges[0].waypoints = [null]; });
corrupt(value => { value.edges[0].label = {}; });
for (const key of ['labelPosition', 'sourcePoint', 'targetPoint']) for (const bad of [0, false, '', null]) corrupt(value => { value.edges[0][key] = bad; });
corrupt(value => { value.nodes[0].compartments = [{ entries: [null] }]; });
corrupt(value => { value.nodes[0].name = 'bad\u0000label'; });
for (const [index, value] of malformed.entries()) {
  assert.ok(validateDiagramModel(value).length, `Malformed import ${index} must be refused without throwing`);
}
const escaped = structuredClone(models[1]);
escaped.nodes[0].name = 'A < B & "C"';
assert.ok(diagramToSvg(escaped).includes('A &lt; B &amp; &quot;C&quot;'), 'User-authored SVG labels stay text');
assert.equal(models.filter(model => model.standard.acronym === 'UWE').length, 11, 'Eleven labelled UWE views');
assert.equal(models.filter(model => model.standard.acronym === 'C4').length, 7, 'Seven C4 view types');
assert.deepEqual(get('agent-task-lifecycle').nodes.map(node => node.name).sort(), ['submitted', 'working', 'input-required', 'auth-required', 'completed', 'canceled', 'failed', 'rejected', 'unknown'].sort());
execFileSync('python3', ['-c', 'import pathlib,sys,xml.etree.ElementTree as ET; files=list(pathlib.Path(sys.argv[1]).glob("*.svg")); [ET.parse(p) for p in files]; assert len(files)==int(sys.argv[2])', output, String(models.length)], { stdio: 'pipe' });
fs.rmSync(output, { recursive: true, force: true });
console.log(JSON.stringify({ result: 'PASS', views: models.length, registry: catalogueCounts, malformedImportsRefused: malformed.length, svgXmlParsed: models.length }));

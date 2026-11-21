import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "glass-profile-check-"));
const modules = {
  types: "packages/liquid-glass/src/developer/types.ts",
  notations: "packages/liquid-glass/src/developer/notations.ts",
  scene: "packages/liquid-glass/src/developer/scene.ts",
  profiles: "packages/liquid-glass/src/standards/profiles.ts",
  "developer-models": "docs/hci/examples/liquid-glass/src/developer-models.ts",
  "extended-models": "docs/hci/examples/liquid-glass/src/extended-models.ts",
};

try {
  for (const [name, source] of Object.entries(modules)) {
    let code = stripTypeScriptTypes(fs.readFileSync(path.join(repo, source), "utf8"));
    for (const dependency of Object.keys(modules)) code = code.replaceAll('"' + "./" + dependency + '"', '"' + "./" + dependency + '.mjs"');
    fs.writeFileSync(path.join(temporary, name + ".mjs"), code);
  }
  const load = name => import(pathToFileURL(path.join(temporary, name + ".mjs")).href);
  const { diagramModels } = await load("developer-models");
  const { extendedDiagramModels, enrichUweModels } = await load("extended-models");
  const { getDiagramProfile, validateDiagramProfile, diagramProfiles } = await load("profiles");
  const { validateDiagramModel, diagramScene, diagramToSvg } = await load("scene");
  const models = [...enrichUweModels(diagramModels).filter(model => model.profileId), ...extendedDiagramModels];
  assert.equal(models.filter(model => model.profileId.startsWith("uwe-")).length, 11);
  assert.equal(models.filter(model => model.profileId.startsWith("c4-")).length, 7);
  for (const model of models) {
    assert.deepEqual(validateDiagramModel(model), [], model.id);
    assert.deepEqual(validateDiagramProfile(model), [], model.id);
    assert.equal(new URL(getDiagramProfile(model).sourceUrl).protocol, "https:");
  }
  const get = id => structuredClone(models.find(model => model.id === id));
  let rejections = 0;
  const refuses = (id, mutate, expected) => {
    const model = get(id);
    mutate(model);
    assert.ok(validateDiagramProfile(model).some(issue => issue.code === expected && issue.severity === "error"), id + ": " + expected);
    rejections += 1;
  };

  // These failures alter meaning while still looking like plausible boxes and arrows.
  refuses("c4-context", model => { delete model.nodes[0].architecture; }, "c4-type-required");
  refuses("c4-context", model => { model.nodes[1].architecture.type = "Component"; }, "c4-abstraction-level");
  refuses("c4-container", model => { model.nodes.find(node => node.id === "api").architecture.technology = ""; }, "c4-technology");
  refuses("c4-container", model => { delete model.nodes.find(node => node.id === "api").parentId; }, "c4-container-owner");
  refuses("c4-component", model => { delete model.nodes.find(node => node.id === "service").parentId; }, "c4-component-owner");
  refuses("c4-deployment", model => { model.nodes.find(node => node.id === "api-instance").parentId = "web-instance"; }, "c4-instance-owner");
  refuses("c4-container", model => { delete model.edges.find(edge => edge.id === "web-api").technology; }, "c4-relationship-protocol");
  refuses("c4-context", model => { model.edges[0].label = ""; }, "c4-relationship-label");
  refuses("c4-context", model => { model.edges[0].directed = false; }, "c4-relationship-direction");
  refuses("c4-dynamic", model => { delete model.edges[0].order; }, "c4-interaction-order");
  refuses("uwe-navigation", model => { model.edges.find(edge => edge.id === "menu-search").kind = "navigationLink"; }, "uwe-process-link");
  refuses("uwe-requirement-activity", model => { delete model.nodes.find(node => node.id === "title-pin").ownerId; }, "uwe-pin-owner");
  refuses("uwe-requirement-activity", model => { model.edges.find(edge => edge.id === "title-draft").kind = "controlFlow"; }, "uwe-control-flow");
  refuses("uwe-process-flow", model => { model.edges.find(edge => edge.id === "enter-validate").kind = "objectFlow"; }, "uwe-object-flow");
  refuses("uwe-basic-rights", model => { model.nodes.find(node => node.id === "designer").kind = "class"; }, "uwe-rights-endpoints");
  refuses("uwe-basic-rights", model => { model.edges[0].label = "«read»"; }, "uwe-rights-access-type");

  const custom = get("c4-context");
  custom.profileId = "host-custom-context";
  assert.deepEqual(validateDiagramProfile(custom).map(issue => [issue.code, issue.severity]), [["profile-unknown", "warning"]]);
  const registration = { ...getDiagramProfile("c4-context"), id: custom.profileId, family: "custom", authority: "Host-defined profile" };
  assert.deepEqual(validateDiagramProfile(custom, [...diagramProfiles, registration]), [], "A host can register its own profile.");
  for (const notation of ["UML component", "UML state machine", "UML sequence"]) {
    assert.equal(getDiagramProfile({ notation }), undefined, "Shared UML notation must not opt ordinary models into an agent-specific profile.");
  }
  assert.equal(getDiagramProfile({ profileId: "agent-architecture", notation: "UML component" })?.family, "agent");

  const flatten = items => items.flatMap(item => [item, ...flatten(item.children ?? [])]);
  const token = diagramScene(get("uwe-requirement-activity")).find(shape => shape.attrs["data-notation-node"] === "draft");
  assert.ok(flatten([token]).every(shape => shape.attrs.textDecoration !== "underline"), "An activity object node is not an underlined instance specification.");
  const role = diagramScene(get("uwe-basic-rights")).find(shape => shape.attrs["data-notation-node"] === "designer");
  assert.ok(flatten([role]).some(shape => shape.attrs.textDecoration === "underline"), "A role instance retains UML instance notation.");
  assert.ok(diagramToSvg(get("uwe-navigation-states")).includes("{roles=designer}"), "Protected-session role constraints remain visible in exported SVG.");
  assert.ok(diagramToSvg(get("c4-dynamic")).includes("1. Submits title"), "Interaction order is visible, not metadata alone.");
  const escaped = get("c4-context");
  escaped.legend = ["<script> & a long notation explanation ".repeat(18)];
  const svg = diagramToSvg(escaped);
  assert.ok(svg.includes("&lt;script&gt;"), "Legend content remains escaped text.");
  assert.ok(!svg.includes("<script>"), "Legend content cannot become active SVG.");
  assert.ok(Number(svg.match(/height="(\d+)"/)[1]) > escaped.height + 68, "Long legends wrap and extend the export.");

  console.log(JSON.stringify({ result: "PASS", linkedUweViews: 11, c4Views: 7, semanticRejections: rejections, customProfileExtension: true, notationRegressions: 5 }));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

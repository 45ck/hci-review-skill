import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialLayoutNavigation, transitionLayout, canRecordReview
} from "../docs/hci/examples/liquid-glass/src/layouts-state.ts";

test("a workspace switch atomically clears stale tenant-specific view state", () => {
  let state = transitionLayout(initialLayoutNavigation, { type: "query", value: "REL-204" });
  state = transitionLayout(state, { type: "open-project", name: "Member portal" });
  state = transitionLayout(state, { type: "inspect", recordId: "REL-204" });
  state = transitionLayout(state, { type: "scenario", value: "error" });
  state = transitionLayout(state, { type: "switch-space", spaceId: "fieldworks", firstRecordId: "OPS-114" });
  assert.deepEqual(state, {
    ...initialLayoutNavigation,
    spaceId: "fieldworks",
    selectedId: "OPS-114"
  });
});

test("navigation closes selected mobile detail without mutating the current workspace", () => {
  const detail = transitionLayout(initialLayoutNavigation, { type: "inspect", recordId: "REL-198" });
  const account = transitionLayout(detail, { type: "navigate", route: "account" });
  assert.equal(account.detailOpen, false);
  assert.equal(account.route, "account");
  assert.equal(account.spaceId, "northstar");
  assert.equal(account.selectedId, "REL-198");
});

test("project navigation provides the matching review context", () => {
  const state = transitionLayout(initialLayoutNavigation, { type: "open-project", name: "Operations" });
  assert.equal(state.route, "reviews");
  assert.equal(state.projectFilter, "Operations");
  assert.equal(state.filter, "all");
  assert.equal(state.query, "");
  const restored = transitionLayout(state, { type: "clear-project" });
  assert.equal(restored.projectFilter, "");
  assert.equal(restored.filter, "open");
});

test("error, empty and loading preview states have a deterministic recovery", () => {
  for (const value of ["loading", "error", "empty"]) {
    const state = transitionLayout(initialLayoutNavigation, { type: "scenario", value });
    assert.equal(state.detailOpen, false);
    assert.equal(state.scenario, value);
    assert.equal(transitionLayout(state, { type: "show-all" }).scenario, "ready");
  }
});

test("viewer permissions and duplicate review operations are denied", () => {
  assert.equal(canRecordReview("Viewer", "REL-204", []), false);
  assert.equal(canRecordReview("Owner", "REL-204", ["REL-204"]), false);
  assert.equal(canRecordReview("Owner", "", []), false);
  assert.equal(canRecordReview("Owner", "REL-204", []), true);
});

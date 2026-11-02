"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (path) => fs.readFileSync(path, "utf8");
const app = read("frontend/src/App.tsx");
const shell = read("frontend/src/components/platform/PlatformShell.tsx");
const dashboard = read("frontend/src/pages/platform/PlatformDashboard.tsx");
const directory = read("frontend/src/pages/platform/PlatformInstitutions.tsx");
const detail = read(
  "frontend/src/pages/platform/PlatformInstitutionDetail.tsx",
);
const data = read("frontend/src/lib/platform/platformData.ts");

test("platform data uses only Phase 7B RPCs", () => {
  for (const rpc of [
    "platform_dashboard_metrics",
    "platform_list_institutions",
    "platform_get_institution",
  ]) {
    assert.ok(data.includes(`"${rpc}"`), `Missing RPC wrapper: ${rpc}`);
  }
  assert.ok(!data.includes(".from("), "Platform data must not read raw tables");
});

test("routes expose directory and detail", () => {
  assert.ok(app.includes('path="/platform/institutions"'));
  assert.ok(app.includes('path="/platform/institutions/:institutionId"'));
});

test("shell has route-aware responsive navigation", () => {
  assert.ok(shell.includes("location.pathname.startsWith"));
  assert.ok(shell.includes("lg:flex"));
  assert.ok(shell.includes("flex items-center justify-between gap-3 lg:block"));
  assert.ok(shell.includes("lg:hidden"));
  assert.ok(shell.includes('sr-only">Sign out</span>'));
  assert.ok(shell.includes("hidden min-h-16"));
  assert.ok(shell.includes("Institutions"));
});

test("dashboard uses production-facing read-only wording", () => {
  assert.ok(dashboard.includes("Read-only platform overview"));
  assert.ok(!dashboard.includes("Phase 7B"));
});

test("pages include loading error retry empty and read-only states", () => {
  assert.ok(dashboard.includes("loading"));
  assert.ok(dashboard.includes("Retry"));
  assert.ok(directory.includes("No institutions found"));
  assert.ok(directory.includes("status"));
  assert.ok(detail.includes("Institution not found"));
  assert.ok(detail.includes("Read-only institution detail"));
});

test("directory supports search status pagination and responsive views", () => {
  for (const term of [
    "Search",
    "All statuses",
    "Previous",
    "Next",
    "md:hidden",
    "hidden md:block",
  ]) {
    assert.ok(directory.includes(term), `Missing directory behavior: ${term}`);
  }
});

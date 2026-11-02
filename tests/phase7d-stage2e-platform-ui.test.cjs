"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const data = read("frontend/src/lib/platform/platformData.ts"),
  page = read("frontend/src/pages/platform/PlatformInstitutionDetail.tsx");
test("platform data exposes lifecycle and admin transfer operations", () => {
  assert.match(data, /transitionPlatformInstitutionStatus/);
  assert.match(data, /platform_transition_institution_status/);
  assert.match(data, /transferPlatformInstitutionAdmin/);
  assert.match(data, /platform_transfer_institution_admin/);
});
test("institution detail exposes guarded lifecycle controls", () => {
  assert.match(page, /Lifecycle controls/);
  assert.match(page, /Suspend institution/);
  assert.match(page, /Reactivate institution/);
  assert.match(page, /reason\.trim\(\)\.length < 5/);
  assert.match(page, /transitionPlatformInstitutionStatus/);
});
test("institution detail exposes administrator transfer controls", () => {
  assert.match(page, /Transfer Institution Admin/);
  assert.match(page, /successorUserId/);
  assert.match(page, /transferPlatformInstitutionAdmin/);
  assert.match(page, /UUID/);
});
test("operations refresh institution state and surface failures", () => {
  assert.match(page, /await load\(\)/);
  assert.match(page, /setActionError/);
  assert.match(page, /setActionSuccess/);
});

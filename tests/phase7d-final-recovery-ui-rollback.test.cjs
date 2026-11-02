"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const app = read("frontend/src/App.tsx"),
  shell = read("frontend/src/components/platform/PlatformShell.tsx"),
  dashboard = read("frontend/src/pages/platform/PlatformDashboard.tsx"),
  service = read("frontend/src/lib/platform/platformRecovery.ts"),
  page = read("frontend/src/pages/platform/PlatformRecovery.tsx"),
  rollback = read(
    "backend/supabase/rollbacks/20261102213000_phase_7d_stage2a_lifecycle.rollback.sql",
  );
test("recovery route and navigation are registered", () => {
  assert.match(app, /PlatformRecovery/);
  assert.match(app, /path="\/platform\/recovery"/);
  assert.match(shell, /to: "\/platform\/recovery"/);
  assert.match(dashboard, /to="\/platform\/recovery"/);
});
test("service uses bearer-authenticated backend recovery routes", () => {
  assert.match(service, /getSession/);
  assert.match(service, /Authorization: `Bearer/);
  assert.match(service, /listPlatformRecovery/);
  assert.match(service, /getPlatformRecovery/);
  assert.match(service, /resolvePlatformRecovery/);
});
test("page provides queue diagnosis and fail-closed resolution", () => {
  assert.match(page, /No recovery-required onboarding attempts/);
  assert.match(page, /linkage_valid/);
  assert.match(page, /institution_exists/);
  assert.match(page, /administrator_profile_exists/);
  assert.match(page, /administrator_role_exists/);
  assert.match(page, /notes\.trim\(\)\.length\s*<\s*5/);
  assert.match(page, /cannot be resolved automatically/);
});
test("Stage 2A rollback restores previous tenant helper", () => {
  assert.match(
    rollback,
    /create or replace function public\.current_user_institution_id\(\)/,
  );
  assert.match(rollback, /from public\.user_roles/);
  assert.doesNotMatch(rollback, /join public\.institutions/);
  assert.match(
    rollback,
    /grant execute on function public\.current_user_institution_id\(\) to authenticated/,
  );
});

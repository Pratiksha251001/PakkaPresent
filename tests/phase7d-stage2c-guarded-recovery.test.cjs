"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const m = read(
    "backend/supabase/migrations/20261102223000_phase_7d_stage2c_guarded_recovery.sql",
  ),
  r = read(
    "backend/supabase/rollbacks/20261102223000_phase_7d_stage2c_guarded_recovery.rollback.sql",
  ),
  b = read("backend/platform-onboarding-recovery.cjs"),
  s = [
    read("backend/supabase_schema.sql"),
    read("frontend/src/lib/schemaSql.ts"),
  ];
test("locks and validates linkage", () => {
  assert.match(m, /institution_onboarding_attempts[\s\S]*for update/);
  assert.match(m, /institution_onboarding_invitations[\s\S]*for update/);
  assert.match(m, /institution_access_requests[\s\S]*for update/);
});
test("fails closed with remaining artifacts", () => {
  assert.match(m, /still contains an institution artifact/);
  assert.match(m, /still contains administrator artifacts/);
});
test("is idempotent and audited", () => {
  assert.match(m, /recovery_status='resolved'/);
  assert.match(m, /recovery_resolved_by=auth.uid\(\)/);
  assert.match(m, /status='active'/);
  assert.match(m, /status='approved'/);
});
test("route is guarded", () => {
  assert.match(b, /onboarding-recovery\/:attemptId\/resolve/);
  assert.match(b, /platform_resolve_clean_onboarding_recovery/);
  assert.match(b, /notes.length < 5/);
});
test("rollback protects evidence", () =>
  assert.match(r, /rollback refused: resolved recovery records exist/i));
test("schemas converge", () => {
  for (const x of s) {
    assert.match(x, /Phase 7D Stage 2C/);
    assert.match(x, /platform_resolve_clean_onboarding_recovery/);
  }
});

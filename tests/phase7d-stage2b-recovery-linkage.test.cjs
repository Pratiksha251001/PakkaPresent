"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
  "backend/supabase/migrations/20261102220000_phase_7d_stage2b_recovery_linkage.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261102220000_phase_7d_stage2b_recovery_linkage.rollback.sql",
);
const onboarding = read("backend/institution-onboarding.cjs"),
  backend = read("backend/platform-onboarding-recovery.cjs"),
  server = read("server.ts");
const schemas = [
  read("backend/supabase_schema.sql"),
  read("frontend/src/lib/schemaSql.ts"),
];
test("attempt ledger stores immutable request and invitation linkage", () => {
  for (const x of [
    "access_request_id",
    "invitation_id",
    "recovery_status",
    "recovery_resolved_at",
    "recovery_resolved_by",
  ])
    assert.match(migration, new RegExp(x));
  assert.match(migration, /unique index[^;]+invitation_id_key/s);
});
test("onboarding records reservation linkage in the first audit", () => {
  assert.match(onboarding, /access_request_id: reservation\.request_id/);
  assert.match(onboarding, /invitation_id: reservation\.invitation_id/);
  assert.match(onboarding, /recovery_status: recovered \? null : "required"/);
});
test("diagnosis is super-admin guarded, bounded, and secret free", () => {
  assert.match(migration, /platform_list_onboarding_recovery/);
  assert.match(migration, /page_limit < 1 or page_limit > 100/);
  assert.match(migration, /platform_get_onboarding_recovery/);
  assert.match(migration, /linkage_valid boolean/);
  assert.doesNotMatch(
    migration,
    /returns table\([\s\S]*token_digest|returns table\([\s\S]*code_digest/,
  );
});
test("production server exposes read-only recovery routes", () => {
  assert.match(server, /registerPlatformOnboardingRecovery/);
  assert.match(server, /platform-onboarding-recovery\.cjs/);
  assert.match(backend, /app\.get\("\/api\/platform\/onboarding-recovery"/);
  assert.doesNotMatch(
    backend,
    /app\.(post|delete|patch)\("\/api\/platform\/onboarding-recovery/,
  );
});
test("rollback protects linked recovery evidence", () =>
  assert.match(
    rollback,
    /rollback refused: recovery linkage or resolution data exists/i,
  ));
test("canonical schemas include Stage 2B", () => {
  for (const s of schemas) {
    assert.match(s, /Phase 7D Stage 2B: immutable onboarding recovery linkage/);
    assert.match(s, /platform_get_onboarding_recovery/);
  }
});

"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
  "backend/supabase/migrations/20261102213000_phase_7d_stage2a_lifecycle.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261102213000_phase_7d_stage2a_lifecycle.rollback.sql",
);
const backend = read("backend/platform-institution-lifecycle.cjs");
const server = read("server.ts"),
  auth = read("frontend/src/context/AuthContext.tsx");
const schemas = [
  read("backend/supabase_schema.sql"),
  read("frontend/src/lib/schemaSql.ts"),
];
test("lifecycle transition is guarded, locked, validated, and audited", () => {
  assert.match(migration, /is_current_user_super_admin/);
  assert.match(migration, /for update/);
  assert.match(migration, /institution_lifecycle_events/);
  assert.match(
    migration,
    /requested institution lifecycle transition is not allowed/i,
  );
});
test("tenant helper requires active institution", () => {
  assert.match(migration, /join public\.institutions i/);
  assert.match(migration, /i\.status = 'active'/);
});
test("rollback preserves lifecycle evidence", () =>
  assert.match(rollback, /rollback refused: lifecycle audit events exist/i));
test("production entrypoint registers lifecycle API", () => {
  assert.match(server, /registerPlatformInstitutionLifecycle/);
  assert.match(server, /platform-institution-lifecycle\.cjs/);
  assert.match(backend, /platform_transition_institution_status/);
});
test("backend middleware rejects non-active institution", () => {
  assert.match(server, /select\("status"\)/);
  assert.match(server, /Institution access is suspended/);
  assert.match(server, /Institution access is inactive/);
});
test("authentication uses lifecycle-specific messages", () => {
  assert.match(auth, /institutionStatusMessage/);
  assert.match(auth, /suspended by the platform administrator/);
  assert.match(auth, /pending activation/);
});
test("canonical schemas contain Stage 2A", () => {
  for (const s of schemas) {
    assert.match(s, /Phase 7D Stage 2A: institution lifecycle controls/);
    assert.match(s, /platform_transition_institution_status/);
  }
});

"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
    "backend/supabase/migrations/20261030005500_multi_institution_phase_4e3_invitations.sql",
  ),
  rollback = read(
    "backend/supabase/rollbacks/20261030005500_multi_institution_phase_4e3_invitations.rollback.sql",
  ),
  server = read("server.ts"),
  render = read("render.yaml"),
  schemas = [
    read("backend/supabase_schema.sql"),
    read("frontend/src/lib/schemaSql.ts"),
  ];
test("invitation ledger is service-role only and digest-only", () => {
  for (const sql of [migration, ...schemas]) {
    assert.match(sql, /institution_onboarding_invitations/);
    assert.match(sql, /token_digest/);
    assert.match(sql, /code_digest/);
    assert.match(
      sql,
      /revoke all on public\.institution_onboarding_invitations from public, anon, authenticated/,
    );
    assert.doesNotMatch(sql, /invitation_token\s+text|onboarding_code\s+text/);
  }
});
test("approval function is atomic and service-role protected", () => {
  assert.match(migration, /for update/);
  assert.match(migration, /status not in \('pending','contacted'\)/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /grant execute.*to service_role/);
});
test("rollback refuses destructive removal", () => {
  assert.match(rollback, /invitations exist/);
  assert.match(rollback, /approved or onboarding requests exist/);
});
test("server and deployment register platform approval", () => {
  assert.match(
    server,
    /registerInstitutionInvitationApproval\(app, \{ admin: supabaseAdmin \}\)/,
  );
  assert.match(render, /PLATFORM_ADMIN_TOKEN/);
});

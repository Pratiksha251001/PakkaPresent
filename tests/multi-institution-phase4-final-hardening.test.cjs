"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (path) => fs.readFileSync(path, "utf8");
const migration = read(
  "backend/supabase/migrations/20261030011500_multi_institution_phase_4e4_invitation_onboarding.sql",
);
const schemas = [
  read("backend/supabase_schema.sql"),
  read("frontend/src/lib/schemaSql.ts"),
];
const access = read("backend/institution-access-requests.cjs");
const onboarding = read("backend/institution-onboarding.cjs");
const approval = read("backend/institution-invitation-approval.cjs");
const server = read("server.ts");

test("reservation and completion require matching request transitions", () => {
  for (const sql of [migration, ...schemas]) {
    assert.match(sql, /returning id into transitioned_request_id/);
    assert.match(sql, /Access request is no longer approved for onboarding/);
    assert.match(sql, /Access request is no longer in onboarding/);
    assert.doesNotMatch(sql, /set status='expired' where id=row_inv\.id/);
  }
});

test("rate limits use trusted Express IP and bounded stores", () => {
  assert.match(server, /app\.set\("trust proxy", 1\)/);
  for (const source of [access, onboarding, approval]) {
    assert.doesNotMatch(source, /x-forwarded-for/);
    assert.match(source, /req\.ip/);
    assert.match(source, /maxKeys/);
    assert.match(source, /store\.delete/);
  }
});

test("platform approval is rate limited before token validation", () => {
  assert.match(approval, /PLATFORM_APPROVAL_RATE_MAX/);
  assert.match(approval, /Too many platform approval attempts/);
});

"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const mig = read(
    "backend/supabase/migrations/20261030002000_multi_institution_phase_4e2_access_requests.sql",
  ),
  rb = read(
    "backend/supabase/rollbacks/20261030002000_multi_institution_phase_4e2_access_requests.rollback.sql",
  ),
  server = read("server.ts");
test("service role only", () => {
  assert.match(mig, /revoke all.*public, anon, authenticated/);
  assert.match(mig, /to service_role/);
  assert.doesNotMatch(mig, /password\s+text|token\s+text|client_ip/i);
});
test("rollback guarded", () => assert.match(rb, /access requests exist/));
test("server registered", () =>
  assert.match(
    server,
    /registerInstitutionAccessRequests\(app, \{ admin: supabaseAdmin \}\)/,
  ));

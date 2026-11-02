"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
    "backend/supabase/migrations/20261102170000_phase_7c_access_request_operations.sql",
  ),
  backend = read("backend/platform-access-request-operations.cjs"),
  limitedServer = read("backend/server.ts"),
  productionServer = read("server.ts");
test("contracts are super-admin guarded and digest-only", () => {
  for (const name of [
    "platform_list_access_requests",
    "platform_get_access_request",
    "platform_mark_access_request_contacted",
    "platform_reject_access_request",
    "platform_issue_access_request_invitation",
    "platform_revoke_access_request_invitation",
  ])
    assert.match(migration, new RegExp(name));
  assert.match(migration, /is_current_user_super_admin/);
  assert.doesNotMatch(
    migration,
    /invitation_token\s+text|onboarding_code\s+text/,
  );
});
test("backend uses bearer auth and removes shared token", () => {
  assert.match(backend, /authorization/);
  assert.match(backend, /client\.auth\.getUser/);
  assert.match(backend, /is_current_user_super_admin/);
  assert.doesNotMatch(backend, /\.from\("user_roles"\)/);
  assert.doesNotMatch(backend, /PLATFORM_ADMIN_TOKEN|x-platform-admin-token/);
  assert.match(limitedServer, /registerPlatformAccessRequestOperations/);
  assert.match(productionServer, /registerPlatformAccessRequestOperations/);
  assert.doesNotMatch(
    productionServer,
    /registerInstitutionInvitationApproval/,
  );
});

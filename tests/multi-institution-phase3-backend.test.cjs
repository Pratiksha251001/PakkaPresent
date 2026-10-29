"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const server = fs.readFileSync("server.ts", "utf8");

test("Phase 3 backend tenant enforcement removes legacy provisioning", () => {
  assert.doesNotMatch(server, /api\/admin\/staff\/provision/);
  assert.match(server, /api\/admin\/accounts\/provision/);
});

test("password reset filters by actor institution before single retrieval", () => {
  const route = server.slice(
    server.indexOf('"/api/admin/accounts/password"'),
    server.indexOf('"/api/sms/config"'),
  );
  assert.match(
    route,
    /\.eq\("id", entityId\)[\s\S]*?\.eq\("institution_id", actor\.institutionId\)[\s\S]*?\.single\(\)/,
  );
});

test("SMS verifies recipient department and subject ownership", () => {
  const route = server.slice(
    server.indexOf('"/api/sms/send"'),
    server.indexOf('"/api/email/send"'),
  );
  assert.match(route, /trustedStudent\.department_id/);
  assert.match(
    route,
    /\.from\("subjects"\)[\s\S]*?\.eq\("institution_id", actor\.institutionId\)/,
  );
  assert.match(
    route,
    /trustedSubject\.department_id !== trustedStudent\.department_id/,
  );
});

test("Phase 3 final tenant enforcement scopes privileged update and rollback paths", () => {
  const route = server.slice(
    server.indexOf('"/api/admin/accounts/update"'),
    server.indexOf('"/api/admin/accounts/password"'),
  );
  assert.match(
    route,
    /from\("departments"\)[\s\S]*?eq\("institution_id", actor\.institutionId\)/,
  );
  assert.match(
    route,
    /from\("user_roles"\)[\s\S]*?eq\("institution_id", actor\.institutionId\)/,
  );
  assert.match(
    route,
    /from\("profiles"\)[\s\S]*?eq\("institution_id", actor\.institutionId\)/,
  );
  assert.match(
    route,
    /previousHodTeacher[\s\S]*?eq\("institution_id", actor\.institutionId\)/,
  );
});

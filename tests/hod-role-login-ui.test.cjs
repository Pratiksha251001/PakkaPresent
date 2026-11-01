"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const roleLogin = fs.readFileSync("frontend/src/pages/RoleLogin.tsx", "utf8");
const authContext = fs.readFileSync(
  "frontend/src/context/AuthContext.tsx",
  "utf8",
);

test("HOD login relies on the authenticated role department", () => {
  assert.doesNotMatch(roleLogin, /Assigned Department/);
  assert.doesNotMatch(roleLogin, /Auto-detect department/);
  assert.doesNotMatch(roleLogin, /departmentId|setDepartmentId/);
  assert.doesNotMatch(roleLogin, /localDb/);
  assert.match(
    roleLogin,
    /loginWithCredentials\(role, email\.trim\(\), password\)/,
  );
  assert.match(
    authContext,
    /department_id:\s*(?:studentRecord\?\.department_id\s*\|\|\s*)?roleRecord\.department_id/,
  );
});

test("login pages show a descriptive empty password placeholder", () => {
  const landingAuth = fs.readFileSync(
    "frontend/src/pages/LandingAuth.tsx",
    "utf8",
  );
  const classTeacherLogin = fs.readFileSync(
    "frontend/src/pages/ClassTeacherLogin.tsx",
    "utf8",
  );

  for (const source of [roleLogin, landingAuth, classTeacherLogin]) {
    assert.match(source, /placeholder="Enter your password"/);
    assert.doesNotMatch(source, /placeholder="••••••••"/);
  }
});

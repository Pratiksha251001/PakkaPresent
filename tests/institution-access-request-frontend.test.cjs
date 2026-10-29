"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8"),
  page = read("frontend/src/pages/InstitutionAccessRequest.tsx"),
  service = read("frontend/src/lib/institutionAccessRequestService.ts"),
  app = read("frontend/src/App.tsx"),
  hub = read("frontend/src/pages/AccessHub.tsx"),
  login = read("frontend/src/pages/RoleLogin.tsx");
test("route and CTA", () => {
  assert.match(app, /institution\/request-access/);
  assert.match(hub, /Request institution access/);
});
test("no direct registration", () =>
  assert.doesNotMatch(login, /Register institution/));
test("secure submission states", () => {
  assert.match(service, /api\/institutions\/access-requests/);
  assert.match(page, /Submitting request/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /setForm\(initial\)/);
  assert.doesNotMatch(page, /mail\.google\.com|PasswordInput/);
});

"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
const app = read("frontend/src/App.tsx"),
  shell = read("frontend/src/components/platform/PlatformShell.tsx"),
  page = read("frontend/src/pages/platform/PlatformAccessRequests.tsx"),
  service = read("frontend/src/lib/platform/platformAccessRequests.ts"),
  dashboard = read("frontend/src/pages/platform/PlatformDashboard.tsx");
test("Stage 2 registers access request navigation and route", () => {
  assert.match(app, /platform\/access-requests/);
  assert.match(shell, /Access requests/);
  assert.match(dashboard, /Review access requests/);
});
test("service uses bearer-authenticated backend routes", () => {
  assert.match(service, /getSession/);
  assert.match(service, /Authorization/);
  assert.match(service, /institution-access-requests/);
  assert.doesNotMatch(service, /\.from\(/);
  for (const field of [
    "duplicate_count",
    "active_invitation_count",
    "invitation_status",
    "invitation_expires_at",
  ])
    assert.match(service, new RegExp(field));
  assert.match(service, /hasActiveInvitation/);
  assert.doesNotMatch(
    service,
    /duplicate_institution_count|duplicate_email_count/,
  );
});
test("page provides review actions, safe one-time credentials, filters and pagination", () => {
  for (const x of [
    "Mark contacted",
    "Reject",
    "Revoke invite",
    "Approve and issue",
    "Reissue invitation",
    "Copy these credentials now",
    "All statuses",
    "Previous",
    "Next",
    "Possible duplicate",
    'value: "expired"',
    'value: "onboarded"',
    "hasActiveInvitation",
  ])
    assert.ok(page.includes(x), `Missing ${x}`);
});

test("runtime failures suppress empty state", () => {
  assert.match(page, /error \? null : rows\.length === 0/);
});

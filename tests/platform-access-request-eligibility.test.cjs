"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync(
  "frontend/src/pages/platform/PlatformAccessRequests.tsx",
  "utf8",
);

test("access-request list labels actions by eligibility", () => {
  assert.match(page, /\? "Review"[\s\S]*\? "Manage"[\s\S]*: "View"/);
});

test("terminal access-request states are read-only", () => {
  assert.match(page, /\["rejected", "expired", "onboarding", "onboarded"\]/);
  assert.match(page, /readOnly=\{isReadOnly\}/);
  const readOnlyFooter = page.match(
    /\{isReadOnly && \([\s\S]*?Close[\s\S]*?\)\}/,
  );
  assert.ok(readOnlyFooter, "read-only footer should expose only Close");
});

test("pending contacted and approved states expose only eligible actions", () => {
  assert.match(page, /selected\?\.status === "pending"/);
  assert.match(page, /selected\?\.status === "contacted"/);
  assert.match(page, /selected\?\.status === "approved"/);
  assert.match(
    page,
    /const invitationAction = isApproved \? "reissue" : "approve"/,
  );
});

test("action failures stay inside the review modal", () => {
  assert.match(
    page,
    /setDialogError\(e instanceof Error \? e\.message : "Action failed\."\)/,
  );
  assert.match(page, /role="alert"/);
  assert.doesNotMatch(
    page,
    /setError\(e instanceof Error \? e\.message : "Action failed\."\)/,
  );
});

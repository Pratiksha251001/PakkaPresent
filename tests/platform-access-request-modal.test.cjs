"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync(
  "frontend/src/pages/platform/PlatformAccessRequests.tsx",
  "utf8",
);

test("successful non-credential access-request actions close the review modal", () => {
  assert.match(
    page,
    /await updateAccessRequest\(selected\.request_id, action, notes\);\s+setSelected\(null\);\s+setCredential\(null\);\s+setNotes\(""\);/,
  );
});

test("approval and reissue keep the modal open for one-time credentials", () => {
  assert.match(
    page,
    /setCredential\(await issueInvitation\(selected\.request_id, action\)\);\s+setSelected\(await getAccessRequest\(selected\.request_id\)\);/,
  );
});

test("the request list refreshes after every successful review action", () => {
  const handlerStart = page.indexOf("const act = async");
  const handlerEnd = page.indexOf("const isReviewable", handlerStart);
  assert.ok(handlerStart >= 0, "access-request action handler should exist");
  assert.ok(handlerEnd > handlerStart, "action handler boundary should exist");
  const actionHandler = page.slice(handlerStart, handlerEnd);
  assert.match(actionHandler, /await load\(\);/);
});

test("invitation delivery result remains visible with one-time fallback credentials", () => {
  assert.match(page, /Invitation email accepted by EmailJS/);
  assert.match(page, /Provider acceptance does not confirm inbox delivery/);
  assert.match(page, /Issue replacement and retry email/);
});

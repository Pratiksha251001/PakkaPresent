"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync(
  "frontend/src/pages/platform/PlatformAccessRequests.tsx",
  "utf8",
);
const dialog = fs.readFileSync("frontend/src/components/ui/dialog.tsx", "utf8");
const css = fs.readFileSync("frontend/src/index.css", "utf8");

test("access-request dialog opens from list data before detail fetch completes", () => {
  const openHandler = page.match(/const open = async[\s\S]*?\n  };/);
  assert.ok(openHandler, "open handler should exist");
  assert.match(openHandler[0], /setSelected\(request\)/);
  assert.match(openHandler[0], /setDetailLoading\(true\)/);
  assert.match(openHandler[0], /await getAccessRequest\(request\.request_id\)/);
  assert.ok(
    openHandler[0].indexOf("setSelected(request)") <
      openHandler[0].indexOf("await getAccessRequest"),
    "dialog data should be selected before awaiting network details",
  );
  assert.match(page, /onClick=\{\(\) => void open\(r\)\}/);
});

test("access-request dialog skeletons replace only values still loading", () => {
  assert.match(page, /detailLoading \? \(/);
  assert.match(page, /mt-2 h-4 w-3\/4 animate-pulse/);
  assert.match(page, /space-y-2 animate-pulse/);
  assert.match(page, /h-\[5\.25rem\] animate-pulse/);
  assert.match(page, /Loading complete request details/);
  assert.doesNotMatch(page, /absolute inset-x-6 top-24/);
  assert.doesNotMatch(page, /Refreshing complete request details/);
  assert.match(page, /setDetailLoading\(false\)/);
});

test("shared dialog uses PakkaPresent entrance motion", () => {
  assert.match(dialog, /dialog-overlay-enter/);
  assert.match(dialog, /dialog-content-enter/);
  assert.match(css, /@keyframes dialog-overlay-in/);
  assert.match(css, /@keyframes dialog-content-in/);
  assert.match(css, /translateY\(12px\) scale\(0\.96\)/);
});

test("dialog motion respects reduced-motion preferences", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    css,
    /\.dialog-overlay-enter,[\s\S]*\.dialog-content-enter[\s\S]*animation: none !important/,
  );
});

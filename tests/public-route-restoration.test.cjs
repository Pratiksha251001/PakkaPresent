"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const app = fs.readFileSync("frontend/src/App.tsx", "utf8");

test("bare login route redirects once to the public root", () => {
  assert.match(
    app,
    /path="\/login" element={<Navigate to="\/" replace \/>} \/>/,
  );
});

test("public routes are never persisted or restored", () => {
  assert.match(app, /PUBLIC_PATH_PREFIXES/);
  assert.match(app, /isRestorableAppPath\(fullPath\)/);
  assert.match(app, /isRestorableAppPath\(savedPath\)/);
  assert.match(app, /localStorage\.removeItem\(LAST_PATH_KEY\)/);
  assert.match(app, /localStorage\.removeItem\(LEGACY_LAST_PATH_KEY\)/);
  assert.match(app, /"\/login"/);
  assert.match(app, /"\/teacher\/login"/);
  assert.match(app, /"\/institution\/onboard"/);
  assert.match(app, /"\/institution\/request-access"/);
});

test("completion route is explicitly excluded from saved-path restoration", () => {
  const prefixes =
    app.match(/const PUBLIC_PATH_PREFIXES = \[[\s\S]*?\];/)?.[0] || "";
  assert.match(prefixes, /["']\/institution\/onboarding-complete["']/);
});

test("AccessHub has no independent saved-path restoration", () => {
  const accessHub = fs.readFileSync("frontend/src/pages/AccessHub.tsx", "utf8");
  assert.doesNotMatch(accessHub, /edutrack_last_authenticated_path/);
  assert.doesNotMatch(accessHub, /navigate\(savedPath/);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const login = fs.readFileSync(
  "frontend/src/pages/platform/PlatformLogin.tsx",
  "utf8",
);
const shared = fs.readFileSync(
  "frontend/src/components/PasswordInput.tsx",
  "utf8",
);

test("platform login uses the shared theme-aware password control", () => {
  assert.match(login, /import \{ PasswordInput \}/);
  assert.match(login, /<PasswordInput/);
  assert.match(login, /autoComplete="current-password"/);
  assert.doesNotMatch(login, /<Input\s+type="password"/);
});

test("shared password control is visible and accessible in both themes", () => {
  assert.match(shared, /text-muted-foreground/);
  assert.match(shared, /hover:bg-muted/);
  assert.match(shared, /hover:text-foreground/);
  assert.match(shared, /focus-visible:ring-2/);
  assert.match(
    shared,
    /aria-label=\{visible \? "Hide password" : "Show password"\}/,
  );
  assert.match(
    shared,
    /title=\{visible \? "Hide password" : "Show password"\}/,
  );
  assert.match(shared, /type="button"/);
});

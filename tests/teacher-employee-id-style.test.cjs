"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/pages/Teachers.tsx", "utf8");

test("teacher employee IDs remain compact, neutral, and on one line", () => {
  const start = source.indexOf('header: "Employee ID"');
  const end = source.indexOf('header: "Faculty Name"');

  assert.notEqual(start, -1, "Employee ID column was not found.");
  assert.ok(end > start, "Faculty Name column must follow Employee ID.");

  const columns = source.slice(start, end);

  assert.match(columns, /whitespace-nowrap/);
  assert.match(columns, /bg-muted\/80/);
  assert.match(columns, /text-foreground/);
  assert.match(columns, /font-mono/);
  assert.doesNotMatch(columns, /min-w-/);
  assert.doesNotMatch(columns, /bg-primary\/10/);
  assert.doesNotMatch(columns, /text-primary/);
});
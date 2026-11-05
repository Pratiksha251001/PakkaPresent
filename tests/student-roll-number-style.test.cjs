"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/pages/Students.tsx", "utf8");

test("student roll numbers remain compact, neutral, clickable, and on one line", () => {
  const start = source.indexOf('header: "Roll No"');
  const end = source.indexOf('header: "Student Name"');

  assert.notEqual(start, -1, "Roll No column was not found.");
  assert.ok(end > start, "Student Name column must follow Roll No.");

  const column = source.slice(start, end);

  assert.match(column, /<button/);
  assert.match(column, /onClick=\{\(\) => setSelectedStudent\(s\)\}/);
  assert.match(column, /whitespace-nowrap/);
  assert.match(column, /bg-muted\/80/);
  assert.match(column, /text-foreground/);
  assert.match(column, /font-mono/);
  assert.doesNotMatch(column, /text-primary/);
  assert.doesNotMatch(column, /hover:underline/);
  assert.doesNotMatch(column, /min-w-/);
});
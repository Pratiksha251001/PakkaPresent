"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/pages/Subjects.tsx", "utf8");

test("subject codes remain compact, neutral, and on one line", () => {
  const columns = source.slice(
    source.indexOf("columns={["),
    source.indexOf('header: "Subject Name"'),
  );

  assert.match(columns, /whitespace-nowrap/);
  assert.match(columns, /bg-muted\/80/);
  assert.match(columns, /text-foreground/);
  assert.match(columns, /font-mono/);
  assert.doesNotMatch(columns, /min-w-\[8rem\]/);
  assert.doesNotMatch(columns, /border-primary\/30/);
  assert.doesNotMatch(columns, /bg-primary\/10/);
  assert.doesNotMatch(columns, /text-primary/);
});
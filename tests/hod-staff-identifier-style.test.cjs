"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/pages/HODStaff.tsx", "utf8");

test("HOD teacher and coordinator employee IDs remain neutral and on one line", () => {
  assert.match(
    source,
    /min-w-\[130px\]\s+whitespace-nowrap\s+pl-3\s+font-bold/,
  );
  assert.match(source, />\s*Employee ID\s*</);

  const start = source.indexOf("{/* 3. College Employee ID */}");
  const end = source.indexOf("{/* 4. Academic Role */}");

  assert.notEqual(start, -1, "HOD employee-ID column was not found.");
  assert.ok(end > start, "Academic Role must follow the Employee ID column.");

  const column = source.slice(start, end);

  assert.match(column, /whitespace-nowrap/);
  assert.match(column, /bg-muted\/80/);
  assert.match(column, /text-foreground/);
  assert.match(column, /font-mono/);
  assert.doesNotMatch(column, /whitespace-normal/);
  assert.doesNotMatch(column, /bg-primary\/10/);
  assert.doesNotMatch(column, /text-primary/);
});
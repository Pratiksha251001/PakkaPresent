"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(
  path.join(
    __dirname,
    "../frontend/src/components/DefaulterDirectAlertModal.tsx",
  ),
  "utf8",
);

test("defaulter modal layout remains stable with one or many students", () => {
  assert.ok(source.includes("w-[min(94vw,42rem)] max-w-[42rem]"));
  assert.ok(source.includes("min-h-0 flex-1 overflow-y-auto"));
  assert.ok(source.includes("max-h-[19rem] space-y-2 overflow-y-auto"));
  assert.ok(source.includes("grid-cols-[auto_minmax(0,1fr)_auto]"));
  assert.ok(source.includes('data-testid="defaulter-student-row"'));
  assert.ok(source.includes("min-w-0 flex-1"));
  assert.ok(source.includes("whitespace-nowrap"));
  assert.ok(source.includes("Number(d.percentage.toFixed(1))"));
  assert.ok(source.includes("Delivery channel"));
  assert.ok(source.includes("Coming soon"));
  assert.ok(!source.includes('className="contents"'));
  assert.ok(!source.includes("bodyScrollRef"));
  assert.ok(!source.includes("w-[min(92vw,56rem)] max-w-4xl"));
  assert.ok(!source.includes("max-h-64 space-y-2 overflow-y-auto"));
});
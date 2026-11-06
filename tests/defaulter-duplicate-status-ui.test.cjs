"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../frontend/src/components/DefaulterDirectAlertModal.tsx"),
  "utf8",
);

test("defaulter modal uses one professional scroll region", () => {
  assert.ok(source.includes("w-[min(94vw,46rem)] max-w-[46rem]"));
  assert.ok(source.includes("h-[min(86dvh,44rem)]"));
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1);
  assert.ok(!source.includes("max-h-[19rem]"));
  assert.ok(source.includes('data-testid="defaulter-student-row"'));
});

test("defaulter modal uses one continuous visual surface", () => {
  const header = source.match(/<DialogHeader className="([^"]+)"/);
  const footer = source.match(/<DialogFooter className="([^"]+)"/);

  assert.ok(header);
  assert.ok(footer);
  assert.ok(header[1].includes("border-b"));
  assert.ok(footer[1].includes("border-t"));
  assert.ok(!header[1].includes("bg-background"));
  assert.ok(!footer[1].includes("bg-background"));
});

test("defaulter cards use a compact information hierarchy", () => {
  assert.ok(source.includes("grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto]"));
  assert.ok(source.includes("rounded-xl border px-4 py-3"));
  assert.ok(source.includes("text-base font-bold"));
  assert.ok(source.includes('d.parentEmail || "No parent email"'));
  assert.ok(source.includes("No parent email"));
  assert.ok(source.includes("d.attendedLectures"));
  assert.ok(source.includes("d.totalLectures"));

  assert.match(source, /points\s+below\s+target/);

  assert.ok(!source.includes("Email ready"));
  assert.ok(!source.includes("% below target"));
  assert.ok(!source.includes("sm:grid-cols-[auto_minmax(0,1.15fr)_minmax(0,0.95fr)_auto]"));
});

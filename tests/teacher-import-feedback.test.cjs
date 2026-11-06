"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const modal = fs.readFileSync("frontend/src/components/TeacherImportModal.tsx", "utf8");
const page = fs.readFileSync("frontend/src/pages/Teachers.tsx", "utf8");

test("teacher import shows persistent progress and completion feedback", () => {
  assert.match(modal, /TeacherImportProgress/);
  assert.match(modal, /TeacherImportResult/);
  assert.match(modal, /Creating faculty portal account/);
  assert.match(modal, /Import completed/);
  assert.match(modal, /Retry failed rows/);
  assert.match(modal, />\s*Done\s*</);
});

test("teacher modal uses a spacious responsive layout", () => {
  assert.match(modal, /w-\[min\(1000px,calc\(100vw-2rem\)\)\]/);
  assert.match(modal, /\[scrollbar-width:thin\]/);
  assert.match(modal, /lg:grid-cols-4/);
  assert.match(modal, /lg:grid-cols-\[1\.1fr_0\.9fr\]/);
  assert.match(modal, /sticky top-0 z-30/);
});

test("Teachers page refreshes immediately after successful rows", () => {
  assert.match(page, /key=\{`teachers-\$\{teacherDataVersion\}`\}/);
  assert.match(page, /setTeacherDataVersion\(\(version\) => version \+ 1\)/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "frontend/src/components/SyllabusImportModal.tsx",
  "utf8",
);

test("syllabus imports await persistent subject and assignment writes", () => {
  assert.match(source, /const handleExecuteImport = async \(\) =>/);
  assert.match(source, /await localDb\.update\("subjects"/);
  assert.match(source, /await localDb\.insert\("subjects"/);
  assert.match(source, /await localDb\.insert\("teacher_subjects"/);
  assert.doesNotMatch(source, /localDb\.subjects\[[^\]]+\]\s*=/);
  assert.doesNotMatch(source, /localDb\.subjects\.push/);
  assert.doesNotMatch(source, /localDb\.teacher_subjects\.push/);
});

test("syllabus import protects active persistence and rolls back new records", () => {
  assert.match(source, /disabled=\{selectedCount === 0 \|\| isImporting\}/);
  assert.match(source, /onEscapeKeyDown/);
  assert.match(source, /onInteractOutside/);
  assert.match(source, /createdAssignmentIds/);
  assert.match(source, /createdSubjectIds/);
  assert.match(source, /await localDb\.delete\("teacher_subjects"/);
  assert.match(source, /await localDb\.delete\("subjects"/);
});

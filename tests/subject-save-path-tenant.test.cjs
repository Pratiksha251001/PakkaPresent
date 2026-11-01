"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../frontend/src/lib/supabase.ts"),
  "utf8",
);

test("actual subject save path preserves authenticated tenant scope", () => {
  const subjectsColumns = source.slice(
    source.indexOf("subjects: ["),
    source.indexOf("subjects: [") + 160,
  );
  const teacherSubjectColumns = source.slice(
    source.indexOf("teacher_subjects: ["),
    source.indexOf("teacher_subjects: [") + 180,
  );
  assert.ok(subjectsColumns.includes('"institution_id"'));
  assert.ok(teacherSubjectColumns.includes('"institution_id"'));
  assert.ok(
    source.includes(
      'const TENANT_SCOPED_WRITE_TABLES = new Set(["subjects", "teacher_subjects"])',
    ),
  );
  assert.ok(source.includes("? { institution_id: scope.institutionId }"));
  assert.ok(source.includes("TENANT_SCOPED_WRITE_TABLES.has(table)"));
  assert.ok(source.includes('table === "subjects"'));
  assert.ok(source.includes('"Teacher assignment"'));
});

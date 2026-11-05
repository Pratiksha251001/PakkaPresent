"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("frontend/src/pages/HODStudents.tsx", "utf8");
const db = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");
const schema = fs.readFileSync("frontend/src/lib/schemaSql.ts", "utf8");
test("student editor moves into view and focuses its heading", () => {
  assert.match(page, /scrollIntoView/);
  assert.match(page, /prefers-reduced-motion/);
  assert.match(page, /hod-student-editor-heading/);
  assert.match(page, /scroll-mt-28/);
});
test("student editor keeps essential fields immediately visible", () => {
  const primary = page.slice(page.indexOf("Academic and essential details"), page.indexOf("Additional student details"));
  for (const label of ["Roll Number", "Full Name", "Semester", "Class / Division", "Status", "Parent Mobile", "Student Email"]) assert.match(primary, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
test("optional details and password reset are collapsed", () => {
  assert.match(page, /<details[\s\S]*?Additional student details/);
  assert.match(page, /<details[\s\S]*?Account access/);
  for (const key of ["prn_number", "reg_number", "student_mobile", "date_of_birth", "address", "parent_name", "parent_email"]) assert.match(page, new RegExp(key));
});
test("student class assignment and save feedback remain enabled", () => {
  assert.match(db, /students:[\s\S]*?"class_id"/);
  const schemaLiteralEnd = schema.lastIndexOf("`;");
  const classMigrationIndex = schema.indexOf(
    "add column if not exists class_id uuid references public.academic_classes(id)",
  );
  assert.ok(classMigrationIndex >= 0 && classMigrationIndex < schemaLiteralEnd);
  assert.match(page, /Updating student\.\.\./);
  assert.match(page, /Student updated successfully/);
  assert.match(page, /if \(form\.password\.trim\(\)\)/);
});


test("compatible semester changes preserve the class and incompatible changes clear it", () => {
  assert.match(page, /const handleSemesterChange = \(semester: string\)/);
  assert.match(page, /Number\(selectedClass\.year\) === nextEngineeringYear/);
  assert.match(page, /class_id: keepSelectedClass \? form\.class_id : ""/);
  assert.match(page, /onChange=\{\(event\) => handleSemesterChange\(event\.target\.value\)\}/);
});

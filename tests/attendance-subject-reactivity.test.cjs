"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../frontend/src/pages/Attendance.tsx"),
  "utf8",
);

test("attendance subject lists react to local data updates", () => {
  assert.match(source, /attendanceDataVersion/);
  assert.ok(source.includes("setAttendanceDataVersion((version) => version + 1)"));
  for (const table of ["subjects", "teacher_subjects", "students", "academic_classes"]) {
    assert.ok(source.includes(`"${table}"`));
  }
  assert.ok(source.includes('addEventListener("localDbUpdate", refreshAttendanceData)'));
  assert.ok(source.includes("[teacherId, user, attendanceDataVersion]"));
  assert.ok(source.includes("[role, user, teacherId, attendanceDataVersion]"));
});

test("selected subject synchronizes the visible academic year", () => {
  assert.match(source, /const selectedSubjectAcademicYear = selectedSubject/);

  assert.match(
    source,
    /selectedSubject\.year \|\|[\s\S]*?Math\.ceil\(selectedSubject\.semester \/ 2\)/,
  );

  assert.match(source, /setSelectedYearFilter\(\(currentYear\) =>[\s\S]*?currentYear === nextYear/);

  assert.match(
    source,
    /setSelectedSubjectId\(event\.target\.value\);[\s\S]*?setSelectedClassName\("all"\)/,
  );

  assert.match(
    source,
    /if \(!selectedSubjectAcademicYear\) \{[\s\S]*?setSelectedYearFilter\("all"\)/,
  );
});

test("attendance initially shows all students without forcing a subject", () => {
  assert.ok(source.includes('return "";'));

  assert.ok(!source.includes('return subjects[0]?.id || "";'));

  assert.ok(!source.includes("setSelectedSubjectId(filteredSubjects[0].id)"));

  assert.ok(source.includes("const selectedSubjectAcademicYear = selectedSubject"));

  assert.ok(source.includes("Math.ceil(selectedSubject.semester / 2)"));

  assert.ok(source.includes("setSelectedYearFilter(nextYear)"));

  assert.ok(source.includes('setSelectedSubjectId("")'));
  assert.ok(source.includes('setSelectedClassName("all")'));
  assert.ok(source.includes('placeholder="Select Subject"'));

  assert.ok(source.includes("student.year || Math.ceil(student.semester / 2)"));

  assert.ok(source.includes("disabled={!selectedSubject || cohortStudents.length === 0}"));
});

test("class selector always uses the All Divisions label", () => {
  assert.ok(source.includes('label: "All Divisions"'));
  assert.ok(source.includes('"All visible students"'));
  assert.ok(source.includes("All students in Semester"));
  assert.ok(!source.includes('"All Students in Semester"'));
});

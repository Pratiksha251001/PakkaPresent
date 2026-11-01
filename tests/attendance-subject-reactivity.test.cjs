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
  assert.ok(
    source.includes("setAttendanceDataVersion((version) => version + 1)"),
  );
  for (const table of [
    "subjects",
    "teacher_subjects",
    "students",
    "academic_classes",
  ]) {
    assert.ok(source.includes(`"${table}"`));
  }
  assert.ok(
    source.includes('addEventListener("localDbUpdate", refreshAttendanceData)'),
  );
  assert.ok(source.includes("[teacherId, user, attendanceDataVersion]"));
  assert.ok(source.includes("[role, user, teacherId, attendanceDataVersion]"));
});

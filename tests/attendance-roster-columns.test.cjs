"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../frontend/src/pages/Attendance.tsx"),
  "utf8",
);

const rosterStart = source.indexOf("{/* Student Attendance Roster Card */}");
const rosterEnd = source.indexOf("{/* Verification Modal", rosterStart);
const roster = source.slice(rosterStart, rosterEnd);

test("attendance roster separates semester and class division", () => {
  assert.ok(rosterStart >= 0 && rosterEnd > rosterStart);
  assert.match(roster, />\s*Semester\s*</);
  assert.match(roster, />\s*Class \/ Division\s*</);
  assert.match(roster, /Sem \{st\.semester\}/);
  assert.match(roster, /academicClass\.id === st\.class_id/);
  assert.match(roster, /assignedClass\?\.name \|\| st\.class_name \|\| "—"/);
});

test("attendance roster shows guardian email only", () => {
  assert.match(roster, />\s*Guardian Email\s*</);
  assert.match(roster, /st\.parent_email\?\.trim\(\) \|\| ""/);
  assert.match(roster, /href=\{`mailto:\$\{guardianEmail\}`\}/);
  assert.doesNotMatch(roster, />\s*Guardian Contact\s*</);
  assert.doesNotMatch(roster, /st\.parent_name/);
  assert.doesNotMatch(roster, /st\.parent_mobile/);
  assert.match(roster, />\s*—\s*</);
});

test("specific class filtering prioritizes class id and email search", () => {
  assert.match(source, /if \(matchedClass && st\.class_id\) return st\.class_id === matchedClass\.id/);
  assert.match(source, /st\.parent_email && st\.parent_email\.toLowerCase\(\)\.includes\(q\)/);
  assert.match(roster, /toggleStudent\(st\.id, "present"\)/);
  assert.match(roster, /toggleStudent\(st\.id, "absent"\)/);
});


test("attendance roster centers categorical columns", () => {
  assert.match(
    roster,
    /min-w-\[90px\] text-center font-bold">\s*Semester/,
  );
  assert.match(
    roster,
    /min-w-\[140px\] text-center font-bold">\s*Class \/ Division/,
  );
  assert.match(
    roster,
    /min-w-\[220px\] text-center font-bold">\s*Attendance Action/,
  );
  assert.match(roster, /<TableCell className="text-center">\s*<Badge[\s\S]*?Sem \{st\.semester\}/);
  assert.match(roster, /<TableCell className="text-center">\s*\{classDisplayName === "—"/);
  assert.match(roster, /inline-flex items-center justify-center gap-1\.5/);
});

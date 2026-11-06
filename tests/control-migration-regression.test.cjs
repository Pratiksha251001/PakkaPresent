"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(file, "utf8");
const msg91 = read("frontend/src/components/Msg91SetupModal.tsx");
const studentImport = read("frontend/src/components/StudentImportModal.tsx");
const teacherImport = read("frontend/src/components/TeacherImportModal.tsx");
const accessRequest = read("frontend/src/pages/InstitutionAccessRequest.tsx");
const hodStudents = read("frontend/src/pages/HODStudents.tsx");
const coordinator = read("frontend/src/pages/ClassCoordinatorDashboard.tsx");

test("Batch 2A removes raw selects from targeted files", () => {
  for (const source of [msg91, studentImport, teacherImport, accessRequest]) {
    assert.doesNotMatch(source, /<select\b/);
  }
  assert.match(msg91, /value=\{fast2smsRoute\}[\s\S]*?options=\{\[/);
  assert.match(msg91, /value=\{customMethod\}[\s\S]*?onValueChange/);
  assert.match(studentImport, /searchPlaceholder="Search departments\.\.\."/);
  assert.match(teacherImport, /searchPlaceholder="Search departments\.\.\."/);
  assert.match(accessRequest, /value=\{form\.institutionType\}[\s\S]*?Select type/);
});

test("HOD student date of birth uses the shared DatePicker", () => {
  assert.match(hodStudents, /import \{ DatePicker \} from "\.\.\/components\/ui\/date-picker"/);
  assert.match(hodStudents, /<DatePicker[\s\S]*?value=\{form\.date_of_birth\}/);
  assert.doesNotMatch(hodStudents, /type="date"/);
});

test("Class coordinator replaces both datalists with searchable shared Selects", () => {
  assert.doesNotMatch(coordinator, /<datalist\b/);
  assert.doesNotMatch(coordinator, /list="cc-(?:student|modal)-/);
  assert.match(coordinator, /const classDivisionOptions = useMemo/);
  assert.match(
    coordinator,
    /value=\{studentForm\.class_name\}[\s\S]*?searchPlaceholder="Search classes or divisions\.\.\."/,
  );
  assert.match(coordinator, /value=\{selectedClassForAssign\}[\s\S]*?placeholder="All Divisions"/);
});

test("Batch 2A preserves hidden native file inputs", () => {
  assert.match(studentImport, /type="file"/);
  assert.match(teacherImport, /type="file"/);
});

test("Custom API method and endpoint use non-overlapping responsive columns", () => {
  const methodStart = msg91.indexOf("value={customMethod}");
  const methodBlock = msg91.slice(Math.max(0, methodStart - 450), methodStart + 850);

  assert.ok(methodStart >= 0);
  assert.match(methodBlock, /sm:grid-cols-\[9rem_minmax\(0,1fr\)\]/);
  assert.match(methodBlock, /className="w-full min-w-0"/);
  assert.match(methodBlock, /Gateway Endpoint URL/);
  assert.match(methodBlock, /\{ value: "POST", label: "POST" \}/);
  assert.match(methodBlock, /\{ value: "GET", label: "GET" \}/);
  assert.doesNotMatch(methodBlock, /min-w-\[8rem\]/);
});

test("HOD Staff Sort trigger keeps its prefix without repeating it in options", () => {
  const staff = read("frontend/src/pages/HODStaff.tsx");
  const sortStart = staff.indexOf("value={sortBy}");
  const sortBlock = staff.slice(Math.max(0, sortStart - 100), sortStart + 850);

  assert.ok(sortStart >= 0);
  assert.match(sortBlock, /valuePrefix="Sort: "/);
  assert.match(sortBlock, /\{ value: "name", label: "Name" \}/);
  assert.match(sortBlock, /\{ value: "empid", label: "Employee ID" \}/);
  assert.match(sortBlock, /\{ value: "role", label: "Role" \}/);
  assert.match(sortBlock, /\{ value: "exp", label: "Experience" \}/);
  assert.doesNotMatch(sortBlock, /label: "Sort:/);
});

test("shared Select applies valuePrefix only to its trigger", () => {
  const select = read("frontend/src/components/ui/select.tsx");

  assert.match(select, /valuePrefix\?: string/);
  assert.match(select, /valuePrefix = ""/);
  assert.match(select, /`\$\{valuePrefix\}\$\{selectedOption\.label\}`/);
  assert.match(select, /\{option\.label\}/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/pages/HODClasses.tsx", "utf8");

test("standard divisions are persisted through the shared database layer", () => {
  const start = source.indexOf("const handleSetupStandardDivisions = async");
  const end = source.indexOf("\n\n  return (", start);
  assert.notEqual(start, -1);
  assert.ok(end > start);
  const handler = source.slice(start, end);
  assert.match(handler, /await localDb\.insert\("academic_classes"/);
  assert.doesNotMatch(handler, /ensureStandardEngineeringDivisions/);
  assert.match(handler, /Creating class \$\{index \+ 1\} of \$\{standardClasses\.length\}/);
  assert.match(handler, /Created \$\{created\}, already existed \$\{existing\}, failed \$\{failures\.length\}/);
  assert.match(handler, /Standard classes ready\. Created \$\{created\}; already existed \$\{existing\}\./);
});

test("standard setup creates seven expected persisted class definitions", () => {
  for (const name of ["FY ${departmentCode}", "SY ${departmentCode}-A", "SY ${departmentCode}-B", "TY ${departmentCode}-A", "TY ${departmentCode}-B", "BE ${departmentCode}-A", "BE ${departmentCode}-B"]) {
    assert.match(source, new RegExp(name.replace(/[${}]/g, "\\$&")));
  }
  assert.match(source, /const \[isSettingUpDivisions, setIsSettingUpDivisions\] = useState\(false\)/);
  assert.match(source, /disabled=\{isSettingUpDivisions\}/);
  assert.match(source, /Creating standard classes\.\.\./);
});

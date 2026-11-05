"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("frontend/src/components/StudentImportModal.tsx","utf8");
test("import feedback persists",()=>{assert.match(source,/StudentImportProgress/);assert.match(source,/Import completed/);assert.match(source,/result remains here until Done/);assert.doesNotMatch(source,/alert\(summary\)/);});
test("active import is protected",()=>{assert.match(source,/onEscapeKeyDown/);assert.match(source,/onInteractOutside/);assert.match(source,/Retry failed rows/);assert.match(source,/failedRows\.push\(item\)/);});

test("existing students are classified separately from invalid rows", () => {
  assert.match(source, /isAlreadyExistingError/);
  assert.match(source, /isExistingRow/);
  assert.match(source, /Already exists \(\{existingCount\}\)/);
  assert.match(source, /Invalid \(\{invalidCount\}\)/);
  assert.match(source, /existingSkipped: existingCount/);
  assert.match(source, /Already existed/);
});

test("duplicate reasons remain available in the compact badge tooltip", () => {
  assert.match(source, /title=\{row\.errors\.join\("; "\)\}/);
  assert.doesNotMatch(
    source,
    /isExistingRow\(row\)[\s\S]{0,700}\{row\.errors\.join\(" "\)\}/,
  );
});

test("existing rows stay compact and table chrome remains readable", () => {
  assert.match(source, /\{displayIndex \+ 1\}/);
  assert.match(source, /bg-card sticky top-0 z-30 border-b border-border shadow-sm/);
  assert.match(source, /title=\{row\.errors\.join\("; "\)\}/);
  assert.doesNotMatch(
    source,
    /isExistingRow\(row\)[\s\S]{0,700}\{row\.errors\.join\(" "\)\}/,
  );
});

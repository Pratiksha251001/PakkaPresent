"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");

test("Supabase mode never creates or retains synthetic academic-class IDs", () => {
  const start = source.indexOf("public ensureStandardEngineeringDivisions");
  const end = source.indexOf("public async syncFromSupabase", start);
  assert.notEqual(start, -1);
  assert.ok(end > start);
  const method = source.slice(start, end);
  assert.match(method, /if \(isSupabaseConfigured\)/);
  assert.match(method, /filter\(\(item\) => isUuid\(item\.id\)\)/);
  assert.match(method, /this\.academic_classes = persistedClasses/);
  assert.match(method, /this\.persist\("academic_classes"\)/);
  assert.ok(method.indexOf("if (isSupabaseConfigured)") < method.indexOf("class-${deptCode.toLowerCase()}"));
  assert.match(method, /return;/);
});

test("class update failures use a table-specific label", () => {
  assert.match(source, /table === "academic_classes"[\s\S]*?\? "Class"/);
  assert.match(source, /\$\{label\} update failed in Supabase/);
  assert.doesNotMatch(source, /table === "teachers" \? "Teacher" : "Student"\} update failed in Supabase/);
});

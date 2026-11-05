"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/components/TeacherImportModal.tsx", "utf8");

test("teacher imports use repository-controlled managed account provisioning", () => {
  assert.match(source, /provisionManagedAccount/);
  assert.match(source, /await provisionManagedAccount\(\{/);
  assert.match(source, /teacherId: teacher\.id/);
  assert.doesNotMatch(source, /await localDb\.insert\("users"[\s\S]*?if \(isSupabaseConfigured\)/);
});

test("teacher records roll back when managed account provisioning fails", () => {
  assert.match(source, /if \(insertedTeacherId\)/);
  assert.match(source, /await localDb\.delete\("teachers", insertedTeacherId\)/);
  assert.match(source, /failedRows\.push\(item\)/);
});

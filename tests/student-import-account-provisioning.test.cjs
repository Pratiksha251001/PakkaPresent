"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const modal = fs.readFileSync("frontend/src/components/StudentImportModal.tsx", "utf8");
test("student import uses the repository-controlled provisioning route", () => {
  assert.match(modal, /import \{ provisionManagedAccount \} from "\.\.\/lib\/accountService"/);
  assert.match(modal, /await provisionManagedAccount\(\{/);
  assert.match(modal, /role: "student"/);
  assert.match(modal, /studentId: student\.id/);
  assert.match(modal, /user_id: provisioned\.userId/);
  assert.doesNotMatch(modal, /provision-student-accounts/);
  assert.doesNotMatch(modal, /supabase\.functions\.invoke/);
});
test("student import preserves per-row rollback", () => {
  assert.match(modal, /await localDb\.delete\("students", insertedStudentId\)/);
  assert.match(modal, /studentsCreated -= 1/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync(
  "backend/supabase/migrations/20261106181500_fix_attendance_hod_scope_and_student_year.sql",
  "utf8",
);
const diagnostic = fs.readFileSync(
  "backend/supabase/diagnostics/attendance_semester_mismatches.sql",
  "utf8",
);

test("migration derives missing student years with a bounded trigger bypass", () => {
  assert.match(
    migration,
    /alter table public\.students disable trigger enforce_immutable_institution_id/,
  );
  assert.match(migration, /set year = ceiling\(semester::numeric \/ 2\)::integer/);
  assert.match(migration, /where year is null/);
  assert.match(migration, /semester between 1 and 8/);
  assert.match(
    migration,
    /alter table public\.students enable trigger enforce_immutable_institution_id/,
  );
  assert.doesNotMatch(migration, /disable trigger all/i);
});

test("HOD authorization stays institution and department scoped", () => {
  assert.match(migration, /student\.institution_id = public\.current_user_institution_id\(\)/);
  assert.match(migration, /role_record\.institution_id = student\.institution_id/);
  assert.match(migration, /role_record\.department_id = student\.department_id/);
  assert.match(migration, /role_record\.role = 'hod'/);
});

test("teacher and coordinator authorization still requires assignment scope", () => {
  assert.match(migration, /role_record\.role in \('teacher', 'class_coordinator'\)/);
  assert.match(migration, /assignment\.subject_id = subject\.id/);
  assert.match(migration, /teacher\.user_id = auth\.uid\(\)/);
  assert.match(migration, /teacher\.status = 'active'/);
  assert.match(migration, /assignment\.class_id is null/);
  assert.match(migration, /class_record\.id = assignment\.class_id/);
});

test("student and subject scope must still match", () => {
  assert.match(migration, /subject\.department_id = student\.department_id/);
  assert.match(migration, /subject\.semester = student\.semester/);
  assert.match(migration, /subject\.institution_id = student\.institution_id/);
  assert.match(migration, /student\.status = 'active'/);
});

test("migration preserves function grants and reloads PostgREST", () => {
  assert.match(
    migration,
    /revoke all on function public\.can_manage_attendance\(uuid, uuid\) from public, anon/,
  );
  assert.match(
    migration,
    /grant execute on function public\.can_manage_attendance\(uuid, uuid\) to authenticated/,
  );
  assert.match(migration, /notify pgrst, 'reload schema'/);
});

test("historical semester mismatches are diagnostic-only", () => {
  assert.match(diagnostic, /^-- Read-only diagnostic/m);
  assert.match(diagnostic, /student\.semester is distinct from subject\.semester/);
  assert.doesNotMatch(diagnostic, /\b(update|delete|insert)\b/i);
});

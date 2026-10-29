"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const migration = read(
  "backend/supabase/migrations/20261029150000_multi_institution_phase_1.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261029150000_multi_institution_phase_1.rollback.sql",
);
const schemas = [
  read("backend/supabase_schema.sql"),
  read("frontend/src/lib/schemaSql.ts"),
];
const tables = [
  "departments",
  "profiles",
  "user_roles",
  "teachers",
  "students",
  "academic_classes",
  "class_coordinator_assignments",
  "subjects",
  "teacher_subjects",
  "attendance",
  "notices",
  "sms_logs",
  "parent_notification_attempts",
];
test("verified identity and conflict gates", () => {
  assert.match(migration, /conflicting MITCORER identity/);
  assert.match(migration, /fixed MITCORER id has conflicting identity/);
  assert.match(migration, /MITCORER Barshi/);
  assert.match(migration, /'06901'/);
});
test("every live tenant table is explicitly present", () => {
  for (const table of tables) assert.match(migration, new RegExp(`'${table}'`));
});
test("temporary compatibility default and mandatory ownership", () => {
  assert.match(migration, /alter column institution_id set default/);
  assert.match(migration, /alter column institution_id set not null/);
  assert.match(migration, /Do not onboard another institution until Phase 2/);
});
test("all confirmed relationship gates exist", () => {
  for (const msg of [
    "profile and role",
    "role and department",
    "department HOD",
    "teacher and department",
    "teacher and account",
    "student and department",
    "student and account",
    "subject and department",
    "class and department",
    "class and coordinator",
    "coordinator assignment",
    "teacher subject",
    "attendance",
    "communication log",
    "parent notification",
  ])
    assert.match(migration, new RegExp(msg, "i"));
});
test("business identifiers are institution scoped", () => {
  for (const name of [
    "departments_institution_code_key",
    "teachers_institution_employee_id_key",
    "students_institution_roll_number_key",
    "subjects_institution_code_key",
  ])
    assert.match(migration, new RegExp(name));
});
test("rollback is guarded", () => {
  for (const gate of [
    "additional institutions",
    "later institution security functions",
    "institution_id missing",
    "multiple admins",
  ])
    assert.match(rollback, new RegExp(gate, "i"));
});
test("baseline copies converge on the secured Phase 1 state", () => {
  for (const schema of schemas) {
    assert.match(schema, /institution_id uuid not null references/);
    assert.doesNotMatch(
      schema,
      /institution_id uuid not null default '6f5f8c70-8b95-5f20-a567-43f379c38ec8'/,
    );
    assert.match(schema, /MITCORER Barshi/);
    assert.match(schema, /Baseline refused: conflicting MITCORER identity/);
    assert.match(schema, /on conflict \(id\) do update/);
    assert.match(
      schema,
      /one_admin_per_institution on public\.user_roles \(institution_id\) where role = 'admin'/,
    );
    for (const name of [
      "departments_institution_code_key",
      "teachers_institution_employee_id_key",
      "students_institution_roll_number_key",
      "subjects_institution_code_key",
    ])
      assert.match(schema, new RegExp(name));
    assert.doesNotMatch(schema, /code text not null unique/);
    assert.doesNotMatch(schema, /employee_id text not null unique/);
    assert.doesNotMatch(schema, /roll_number text not null unique/);
    assert.match(
      schema,
      /alter table public\.institutions enable row level security/,
    );
    assert.match(
      schema,
      /revoke all on public\.institutions from anon, authenticated/,
    );
    assert.match(schema, /institution_id is authoritative/);
    assert.match(
      schema,
      /New institutions are created only by the trusted onboarding backend/,
    );
  }
});
test("Phase 2 security is not pretended", () => {
  assert.doesNotMatch(migration, /create policy institutions_/i);
  assert.match(
    migration,
    /revoke all on public\.institutions from anon,authenticated/i,
  );
});

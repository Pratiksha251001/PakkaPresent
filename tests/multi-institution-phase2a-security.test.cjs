"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const migration = read(
  "backend/supabase/migrations/20261029173000_multi_institution_phase_2a_security.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261029173000_multi_institution_phase_2a_security.rollback.sql",
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
test("Phase 2A fails closed without Phase 1", () => {
  assert.match(migration, /institutions table missing/);
  assert.match(migration, /institution_id missing or nullable/);
});
test("security-definer institution lookup is narrow", () => {
  assert.match(migration, /current_user_institution_id/);
  assert.match(migration, /security definer set search_path = public/);
  assert.ok(
    migration.includes(
      "revoke all on function public.current_user_institution_id() from public, anon;",
    ),
  );
});
test("every tenant table receives restrictive isolation", () => {
  for (const table of tables) assert.match(migration, new RegExp(`'${table}'`));
  assert.ok(
    migration.includes(
      "as restrictive for all to authenticated using (institution_id = public.current_user_institution_id()) with check",
    ),
  );
});
test("client institution reassignment is rejected without breaking service-role writes", () => {
  assert.match(migration, /institution_id cannot be changed/);
  assert.match(
    migration,
    /institution_id must match authenticated institution/,
  );
  assert.match(migration, /before insert or update/);
  assert.match(migration, /auth\.role\(\) = 'service_role'/);
});
test("institution registry grants SELECT but exposes only the current institution", () => {
  assert.ok(
    migration.includes("grant select on public.institutions to authenticated;"),
  );
  assert.match(migration, /create policy institutions_read_own/);
  assert.ok(
    migration.includes("using (id = public.current_user_institution_id());"),
  );
});
test("rollback restores Phase 1 institution privileges and removes only Phase 2A objects", () => {
  assert.match(rollback, /drop policy if exists tenant_isolation_restrictive/);
  assert.ok(
    rollback.includes(
      "revoke select on public.institutions from authenticated;",
    ),
  );
  assert.ok(
    rollback.includes(
      "drop function if exists public.current_user_institution_id();",
    ),
  );
  assert.ok(!rollback.includes("drop table public.institutions"));
});
test("baseline schemas include equivalent Phase 2A security", () => {
  for (const schema of schemas) {
    assert.match(
      schema,
      /Multi-institution Phase 2A restrictive tenant security/,
    );
    assert.match(schema, /tenant_isolation_restrictive/);
    assert.match(schema, /enforce_immutable_institution_id/);
    assert.match(schema, /institutions_read_own/);
    assert.ok(
      schema.includes("grant select on public.institutions to authenticated;"),
    );
  }
});

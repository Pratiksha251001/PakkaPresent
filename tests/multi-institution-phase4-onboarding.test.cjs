"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
  "backend/supabase/migrations/20261029203000_multi_institution_phase_4a_onboarding.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261029203000_multi_institution_phase_4a_onboarding.rollback.sql",
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
test("Phase 4A removes temporary defaults while retaining ownership", () => {
  for (const x of tables) assert.match(migration, new RegExp(`'${x}'`));
  assert.match(migration, /alter column institution_id drop default/);
  assert.match(migration, /institution_id missing or nullable/);
  assert.doesNotMatch(migration, /drop not null/);
});
test("onboarding ledger is service-role only and stores no secrets", () => {
  assert.match(migration, /institution_onboarding_attempts/);
  assert.match(
    migration,
    /revoke all on public\.institution_onboarding_attempts from public, anon, authenticated/,
  );
  assert.match(migration, /to service_role/);
  assert.match(migration, /administrator_email_digest/);
  assert.doesNotMatch(migration, /password\s+text|onboarding_token\s+text/i);
});
test("rollback refuses unsafe restoration", () => {
  assert.match(rollback, /additional institutions exist/);
  assert.match(rollback, /onboarding attempts exist/);
  assert.match(rollback, /non-baseline ownership/);
  assert.match(rollback, /set default/);
});
test("canonical schemas converge", () => {
  for (const s of schemas) {
    assert.match(s, /Phase 4A onboarding schema foundation/);
    assert.match(s, /institution_onboarding_attempts/);
    assert.match(s, /drop default/);
    assert.match(s, /trusted onboarding backend/);
    assert.doesNotMatch(
      s,
      /institution_id uuid not null default '6f5f8c70-8b95-5f20-a567-43f379c38ec8'/,
    );
  }
});

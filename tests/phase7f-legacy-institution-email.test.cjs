"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
    "backend/supabase/migrations/20261103010000_phase_7f_legacy_institution_email.sql",
  ),
  rollback = read(
    "backend/supabase/rollbacks/20261103010000_phase_7f_legacy_institution_email.rollback.sql",
  ),
  schemas = [
    read("backend/supabase_schema.sql"),
    read("frontend/src/lib/schemaSql.ts"),
  ],
  page = read("frontend/src/pages/platform/PlatformInstitutionDetail.tsx");
test("legacy institution email prefers request then admin profile", () => {
  assert.match(
    migration,
    /coalesce\(request_row\.official_email, admin_profile\.email\)/,
  );
  assert.match(
    migration,
    /join public\.profiles p on p\.id=ur\.user_id and p\.institution_id=ur\.institution_id/,
  );
  assert.match(migration, /ur\.institution_id=i\.id and ur\.role='admin'/);
});
test("fallback remains explicit-super-admin guarded and credential safe", () => {
  assert.match(migration, /is_current_user_super_admin/);
  assert.match(migration, /security definer set search_path = pg_catalog/);
  assert.doesNotMatch(
    migration,
    /auth\.users|encrypted_password|token_digest|code_digest|administrator_email_digest/,
  );
  assert.match(
    migration,
    /revoke all on function public\.platform_get_institution\(uuid\) from public, anon, service_role/,
  );
});
test("rollback restores request-only email behavior", () => {
  assert.match(rollback, /request_row\.official_email/);
  assert.doesNotMatch(
    rollback,
    /admin_profile|coalesce\(request_row\.official_email/,
  );
});
test("canonical schemas converge on fallback", () => {
  for (const schema of schemas) {
    assert.match(
      schema,
      /Phase 7F: legacy institution administrator email fallback/,
    );
    assert.match(
      schema,
      /coalesce\(request_row\.official_email, admin_profile\.email\)/,
    );
  }
});
test("legacy empty fields use specific explanations", () => {
  for (const text of [
    "Not provided",
    "No linked request",
    "No linked invitation",
    "Legacy institution",
    "No failure recorded",
  ])
    assert.match(page, new RegExp(text));
});

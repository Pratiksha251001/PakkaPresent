"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
const migration = read(
  "backend/supabase/migrations/20261102013000_phase_7b_platform_read_models.sql",
);
const rollback = read(
  "backend/supabase/rollbacks/20261102013000_phase_7b_platform_read_models.rollback.sql",
);
const schemas = [
  read("backend/supabase_schema.sql"),
  read("frontend/src/lib/schemaSql.ts"),
];
const functions = [
  "platform_dashboard_metrics",
  "platform_list_institutions",
  "platform_get_institution",
];
test("Phase 7B exposes only narrow super-admin read models", () => {
  for (const name of functions)
    assert.match(migration, new RegExp(`function public\\.${name}`));
  assert.equal(
    (migration.match(/is_current_user_super_admin\(\)/g) || []).length,
    3,
  );
  assert.equal((migration.match(/errcode = '42501'/g) || []).length, 3);
  assert.match(migration, /security definer set search_path = pg_catalog/g);
});
test("metrics use exact states and operational invitation expiry", () => {
  for (const status of [
    "pending",
    "active",
    "inactive",
    "suspended",
    "approved",
    "onboarding",
    "recovery_required",
  ])
    assert.match(migration, new RegExp(`'${status}'`));
  assert.match(migration, /status = 'active' and v\.expires_at > now\(\)/);
  assert.match(migration, /v\.expires_at <= now\(\)/);
});
test("directory search and pagination are bounded", () => {
  assert.match(
    migration,
    /page_limit < 1 or page_limit > 100 or page_offset < 0/,
  );
  assert.match(migration, /Invalid institution status filter/);
  assert.match(migration, /concat_ws[\s\S]*?ilike/);
  assert.match(migration, /count\(\*\) over\(\)/);
});
test("read contracts do not expose secret digests or notes", () => {
  const returns = migration
    .match(/returns table\([\s\S]*?\)\nlanguage/g)
    .join("\n");
  for (const secret of [
    "token_digest",
    "code_digest",
    "administrator_email_digest",
    "review_notes",
    "password",
  ])
    assert.doesNotMatch(returns, new RegExp(secret));
});
test("authenticated execute grants are exact", () => {
  for (const name of functions)
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${name}`),
    );
  assert.doesNotMatch(
    migration,
    /grant select on public\.institutions to authenticated/,
  );
});
test("rollback removes only Phase 7B functions and preserves Phase 7A", () => {
  for (const name of functions)
    assert.match(
      rollback,
      new RegExp(`drop function if exists public\\.${name}`),
    );
  assert.match(rollback, /Phase 7A authorization foundation is missing/);
  assert.doesNotMatch(
    rollback,
    /drop function if exists public\.is_current_user_super_admin/,
  );
});
test("canonical schemas converge on Phase 7B contracts", () => {
  for (const schema of schemas) {
    assert.match(
      schema,
      /Phase 7B read-only platform metrics and institution directory/,
    );
    for (const name of functions)
      assert.match(schema, new RegExp(`function public\\.${name}`));
  }
});

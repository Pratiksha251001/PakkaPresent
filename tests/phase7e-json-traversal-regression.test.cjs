"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync(
  "backend/supabase/migrations/20261103163000_fix_platform_audit_json_traversal.sql",
  "utf8",
);
const rollback = fs.readFileSync(
  "backend/supabase/rollbacks/20261103163000_fix_platform_audit_json_traversal.rollback.sql",
  "utf8",
);
const schemas = [
  fs.readFileSync("backend/supabase_schema.sql", "utf8"),
  fs.readFileSync("frontend/src/lib/schemaSql.ts", "utf8"),
];

test("audit JSON safety traversal handles objects arrays and scalar leaves", () => {
  assert.match(migration, /with recursive json_nodes/);
  assert.match(migration, /jsonb_typeof\(node\.value\) = 'object'/);
  assert.match(migration, /jsonb_typeof\(node\.value\) = 'array'/);
  assert.match(migration, /jsonb_array_elements/);
  assert.match(migration, /jsonb_object_keys/);
  assert.match(migration, /as object_key\(key\)/);
  assert.doesNotMatch(migration, /strict \$\.\*\*\.keyvalue\(\)/);
});

test("audit JSON safety traversal still rejects nested secret-shaped keys", () => {
  for (const key of [
    "password",
    "token_digest",
    "onboarding_code",
    "service_role_key",
  ]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.match(migration, /nested.*token_digest/);
});

test("canonical schemas converge on the safe traversal implementation", () => {
  for (const schema of schemas) {
    assert.match(schema, /with recursive json_nodes/);
    assert.doesNotMatch(schema, /strict \$\.\*\*\.keyvalue\(\)/);
  }
});

test("rollback restores the prior function definition", () => {
  assert.match(rollback, /strict \$\.\*\*\.keyvalue\(\)/);
});

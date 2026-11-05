"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");

test("teacher writes derive institution ownership from active scope", () => {
  assert.match(source, /teachers: \[[\s\S]*?"institution_id"/);
  assert.match(source, /TENANT_SCOPED_WRITE_TABLES = new Set\(\["teachers"/);
  assert.match(source, /TENANT_SCOPED_WRITE_TABLES\.has\(table\)[\s\S]*?institution_id: scope\.institutionId/);
});

test("teacher updates and inserts retain rollback behavior", () => {
  assert.match(source, /table === "teachers"[\s\S]*?insertedIds/);
  assert.match(source, /table === "teachers"[\s\S]*?list\[idx\] = previous/);
});

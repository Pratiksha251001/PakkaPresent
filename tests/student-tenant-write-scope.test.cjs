"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");

test("student writes derive tenant ownership from verified session scope", () => {
  assert.match(
    source,
    /students:\s*\[\s*"id",\s*"institution_id",/,
  );

  assert.match(
    source,
    /TENANT_SCOPED_WRITE_TABLES[\s\S]*?"students"[\s\S]*?"subjects"[\s\S]*?"teacher_subjects"/,
  );

  assert.match(
    source,
    /TENANT_SCOPED_WRITE_TABLES\.has\(table\)[\s\S]*institution_id:\s*scope\.institutionId/,
  );
});

test("student import cannot supply institution ownership", () => {
  const modal = fs.readFileSync(
    "frontend/src/components/StudentImportModal.tsx",
    "utf8",
  );

  assert.doesNotMatch(modal, /institution_id\s*:/);

  assert.match(
    modal,
    /localDb\.insert\("students", \[studentData\]\)/,
  );
});

test("database tenant enforcement remains intact", () => {
  const schema = fs.readFileSync(
    "frontend/src/lib/schemaSql.ts",
    "utf8",
  );

  assert.match(
    schema,
    /institution_id must match authenticated institution/,
  );

  assert.match(schema, /enforce_immutable_institution_id/);
});
"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const read = (p) => fs.readFileSync(p, "utf8");
const auditMigration = read(
  "backend/supabase/migrations/20261103000000_phase_7e_platform_audit.sql",
);
const auditRollback = read(
  "backend/supabase/rollbacks/20261103000000_phase_7e_platform_audit.rollback.sql",
);
const platformAuth = read("frontend/src/lib/platform/platformAuth.ts");
const institutionAuth = read("frontend/src/context/AuthContext.tsx");
const platformService = read("frontend/src/lib/platform/platformAudit.ts");
const backendFiles = [
  "backend/platform-access-request-operations.cjs",
  "backend/platform-institution-lifecycle.cjs",
  "backend/platform-onboarding-recovery.cjs",
  "backend/platform-audit-log.cjs",
];
const platformMigrations = fs
  .readdirSync("backend/supabase/migrations")
  .filter((n) => /phase_7[abcd]|phase_7e/i.test(n))
  .map((n) => read(path.join("backend/supabase/migrations", n)))
  .join("\n");

test("audit evidence rejects secret-shaped JSON and direct client writes", () => {
  assert.match(auditMigration, /platform_audit_json_is_safe/);
  for (const secret of [
    "password",
    "token_digest",
    "onboarding_code",
    "code_digest",
    "administrator_email_digest",
    "service_role_key",
    "access_token",
    "refresh_token",
  ])
    assert.match(auditMigration, new RegExp(`'${secret}'`));
  assert.match(
    auditMigration,
    /revoke all on public\.platform_audit_events from public, anon, authenticated, service_role/,
  );
  assert.doesNotMatch(
    auditMigration,
    /grant (insert|update|delete) on public\.platform_audit_events/i,
  );
  assert.match(
    auditRollback,
    /drop function if exists public\.platform_audit_json_is_safe\(jsonb\)/,
  );
});

test("every exposed platform RPC is explicit-super-admin guarded", () => {
  const functions = [
    ...platformMigrations.matchAll(
      /create or replace function public\.(platform_[a-z0-9_]+)/g,
    ),
  ].map((m) => m[1]);
  assert.ok(
    functions.length >= 10,
    `Expected broad platform RPC coverage, found ${functions.length}`,
  );
  for (const name of new Set(
    functions.filter((name) => name !== "platform_audit_json_is_safe"),
  )) {
    const start = platformMigrations.indexOf(
      `create or replace function public.${name}`,
    );
    const next = platformMigrations.indexOf(
      "create or replace function public.",
      start + 1,
    );
    const body = platformMigrations.slice(start, next < 0 ? undefined : next);
    assert.match(
      body,
      /is_current_user_super_admin\(\)/,
      `${name} lacks explicit super-admin authorization`,
    );
    assert.match(
      body,
      /security definer set search_path\s*=\s*(pg_catalog|public)/,
      `${name} lacks controlled search_path`,
    );
  }
});

test("all platform backend modules deny missing invalid and non-super-admin sessions", () => {
  for (const file of backendFiles) {
    const source = read(file);
    assert.match(
      source,
      /authorization/i,
      `${file} does not require bearer authorization`,
    );
    assert.match(
      source,
      /auth\.getUser/,
      `${file} does not validate the bearer user`,
    );
    assert.match(
      source,
      /is_current_user_super_admin/,
      `${file} does not verify super-admin role`,
    );
    assert.match(
      source,
      /status\(401\)/,
      `${file} lacks unauthenticated denial`,
    );
    assert.match(source, /status\(403\)/, `${file} lacks cross-role denial`);
  }
});

test("platform and institution sessions use isolated clients and storage", () => {
  assert.match(platformAuth, /window\.sessionStorage/);
  assert.match(platformAuth, /storageKey:\s*"pakkapresent-platform-auth"/);
  assert.match(platformAuth, /await platformSupabase\.auth\.signOut\(\)/);
  assert.doesNotMatch(
    platformAuth,
    /import \{[^}]*\bsupabase\b[^}]*\} from "\.\.\/supabase"/,
  );
  assert.match(
    institutionAuth,
    /import \{ localDb, supabase, isSupabaseConfigured \} from "\.\.\/lib\/supabase"/,
  );
  assert.doesNotMatch(
    institutionAuth,
    /platformSupabase|pakkapresent-platform-auth/,
  );
  assert.match(platformService, /platformSupabase\.auth\.getSession/);
  assert.doesNotMatch(platformService, /\bsupabase\.auth\.getSession/);
});

test("canonical schemas include the hardened Phase 7E contract", () => {
  for (const file of [
    "backend/supabase_schema.sql",
    "frontend/src/lib/schemaSql.ts",
  ]) {
    const source = read(file);
    assert.match(source, /Phase 7E: unified append-only platform audit ledger/);
    assert.match(source, /platform_audit_json_is_safe/);
    assert.match(source, /platform_list_audit_events/);
  }
});

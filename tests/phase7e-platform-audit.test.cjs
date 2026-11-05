"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const m = read(
    "backend/supabase/migrations/20261103000000_phase_7e_platform_audit.sql",
  ),
  r = read(
    "backend/supabase/rollbacks/20261103000000_phase_7e_platform_audit.rollback.sql",
  ),
  b = read("backend/platform-audit-log.cjs"),
  server = read("server.ts"),
  app = read("frontend/src/App.tsx"),
  shell = read("frontend/src/components/platform/PlatformShell.tsx"),
  page = read("frontend/src/pages/platform/PlatformAuditLog.tsx"),
  service = read("frontend/src/lib/platform/platformAudit.ts");
test("append-only audit safely covers platform mutations", () => {
  assert.match(m, /platform_audit_events/);
  assert.match(
    m,
    /revoke all on public\.platform_audit_events from public, anon, authenticated/,
  );
  assert.doesNotMatch(
    m,
    /token_digest.*jsonb_build_object|code_digest.*jsonb_build_object|administrator_email_digest.*jsonb_build_object/,
  );
  for (const name of [
    "institution_access_requests",
    "institution_onboarding_invitations",
    "institution_onboarding_attempts",
    "institution_lifecycle_events",
    "institution_admin_transfer_events",
  ])
    assert.match(m, new RegExp(name));
});
test("audit read model is guarded and bounded", () => {
  assert.match(m, /platform_list_audit_events/);
  assert.match(m, /is_current_user_super_admin/);
  assert.match(m, /page_limit < 1 or page_limit > 100/);
  assert.match(m, /security definer set search_path = pg_catalog/);
});
test("rollback preserves audit evidence", () =>
  assert.match(r, /rollback refused: platform audit evidence exists/i));
test("backend and UI are registered", () => {
  assert.match(b, /api\/platform\/audit-events/);
  assert.match(server, /registerPlatformAuditLog/);
  assert.match(app, /platform\/audit-log/);
  assert.match(shell, /Audit log/);
  assert.match(page, /No audit events found/);
  assert.match(service, /import \{ apiUrl \} from \"\.\.\/api\"/);
  assert.match(service, /fetch\(\s*apiUrl\(`/);
  assert.doesNotMatch(service, /fetch\(`\/api\/platform/);
});

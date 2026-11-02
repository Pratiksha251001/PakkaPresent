"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const m = read(
    "backend/supabase/migrations/20261102230000_phase_7d_stage2d_admin_transfer.sql",
  ),
  r = read(
    "backend/supabase/rollbacks/20261102230000_phase_7d_stage2d_admin_transfer.rollback.sql",
  ),
  b = read("backend/platform-institution-lifecycle.cjs"),
  s = [
    read("backend/supabase_schema.sql"),
    read("frontend/src/lib/schemaSql.ts"),
  ];
test("transfer is super-admin guarded and institution locked", () => {
  assert.match(m, /is_current_user_super_admin/);
  assert.match(m, /institutions where id=target_institution_id for update/);
  assert.match(m, /exactly one current administrator/);
});
test("successor must be an existing same-institution non-platform account", () => {
  assert.match(
    m,
    /profiles p where p.id=successor_user_id and p.institution_id=target_institution_id/,
  );
  assert.match(m, /role<>'super_admin'/);
  assert.match(m, /platform Super Admin cannot become an Institution Admin/);
});
test("role replacement and audit are one database transaction", () => {
  assert.match(
    m,
    /delete from public.user_roles[\s\S]*insert into public.user_roles[\s\S]*insert into public.institution_admin_transfer_events/,
  );
  assert.match(m, /previous_admin_user_id/);
  assert.match(m, /new_admin_user_id/);
  assert.match(m, /actor_user_id/);
});
test("backend exposes guarded transfer route", () => {
  assert.match(b, /institutions\/:institutionId\/administrator\/transfer/);
  assert.match(b, /platform_transfer_institution_admin/);
  assert.match(b, /successorUserId/);
  assert.match(b, /reason.length < 5/);
});
test("rollback protects transfer evidence", () =>
  assert.match(r, /rollback refused: administrator transfer records exist/i));
test("canonical schemas include Stage 2D", () => {
  for (const x of s) {
    assert.match(x, /Phase 7D Stage 2D: atomic Institution Admin transfer/);
    assert.match(x, /platform_transfer_institution_admin/);
  }
});

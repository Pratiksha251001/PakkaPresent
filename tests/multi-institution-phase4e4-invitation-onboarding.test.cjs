"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const app = read("frontend/src/App.tsx"),
  page = read("frontend/src/pages/InstitutionOnboarding.tsx"),
  service = read("frontend/src/lib/institutionOnboardingService.ts"),
  backend = read("backend/institution-onboarding.cjs"),
  migration = read(
    "backend/supabase/migrations/20261030011500_multi_institution_phase_4e4_invitation_onboarding.sql",
  ),
  rollback = read(
    "backend/supabase/rollbacks/20261030011500_multi_institution_phase_4e4_invitation_onboarding.rollback.sql",
  ),
  render = read("render.yaml");
test("private token route replaces public onboarding", () => {
  assert.match(app, /institution\/onboard\/:invitationToken/);
  assert.doesNotMatch(app, /path="\/institution\/onboard"/);
  assert.match(page, /useParams/);
});
test("token stays in route and code stays in body", () => {
  assert.match(service, /encodeURIComponent\(invitationToken\)/);
  assert.match(service, /const\s*\{\s*invitationToken\s*,\s*\.\.\.body\s*\}/);
  assert.doesNotMatch(service, /x-onboarding-token|localStorage.*invitation/i);
});
test("backend reserves completes and releases invitation", () => {
  assert.match(backend, /reserve_institution_onboarding/);
  assert.match(backend, /complete_institution_onboarding/);
  assert.match(backend, /release_institution_onboarding/);
  assert.doesNotMatch(
    backend,
    /INSTITUTION_ONBOARDING_TOKEN|x-onboarding-token/,
  );
});
test("schema prevents replay and rollback is guarded", () => {
  assert.match(migration, /status in \('active','onboarding','consumed'/);
  assert.match(migration, /for update/);
  assert.match(migration, /status='consumed'/);
  assert.match(rollback, /invitation onboarding activity exists/);
});
test("shared onboarding secret removed from deployment", () =>
  assert.doesNotMatch(render, /INSTITUTION_ONBOARDING_TOKEN/));

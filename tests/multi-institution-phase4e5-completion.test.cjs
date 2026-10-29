"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  read = (p) => fs.readFileSync(p, "utf8");
const app = read("frontend/src/App.tsx"),
  onboarding = read("frontend/src/pages/InstitutionOnboarding.tsx"),
  completion = read("frontend/src/pages/InstitutionOnboardingComplete.tsx"),
  login = read("frontend/src/pages/RoleLogin.tsx"),
  restoration = read("tests/public-route-restoration.test.cjs");
test("tokenless completion route is registered", () => {
  assert.match(app, /path="\/institution\/onboarding-complete"/);
  assert.match(app, /InstitutionOnboardingComplete/);
});
test("successful onboarding clears secrets before tokenless navigation", () => {
  assert.match(onboarding, /clear\(\);/);
  assert.match(onboarding, /navigate\("\/institution\/onboarding-complete"/);
  assert.match(onboarding, /registrationComplete:\s*true/);
  assert.doesNotMatch(
    onboarding,
    /navigate\("\/login\/admin"[\s\S]*onboardingComplete:true/,
  );
});
test("completion navigation state excludes secrets", () => {
  const nav =
    onboarding.match(
      /navigate\("\/institution\/onboarding-complete"[\s\S]*?\}\);/,
    )?.[0] || "";
  assert.doesNotMatch(
    nav,
    /invitationToken|onboardingCode|password|confirmPassword/,
  );
  assert.match(nav, /institutionName/);
  assert.match(nav, /administratorEmail/);
});
test("completion page requires success state and continues to Admin login", () => {
  assert.match(completion, /registrationComplete/);
  assert.match(completion, /Registration complete/);
  assert.match(completion, /Continue to Admin login/);
  assert.match(completion, /navigate\("\/login\/admin"/);
  assert.match(completion, /onboardingComplete:\s*true/);
});
test("Admin login preserves onboarding success feedback", () => {
  assert.match(login, /onboardingComplete/);
  assert.match(login, /institutionName/);
});
test("completion and invitation routes remain public and protected", () => {
  assert.match(app, /institution\/onboard\/:invitationToken/);
  assert.match(app, /institution\/onboarding-complete/);
  assert.match(restoration, /public routes are never persisted or restored/);
});

"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  s = fs.readFileSync("backend/institution-onboarding.cjs", "utf8");
test("invitation authorization replaces shared token", () => {
  assert.match(s, /reserve_institution_onboarding/);
  assert.match(s, /complete_institution_onboarding/);
  assert.match(s, /release_institution_onboarding/);
  assert.doesNotMatch(s, /INSTITUTION_ONBOARDING_TOKEN|x-onboarding-token/);
});
test("strong administrator password policy", () => {
  assert.match(s, /passwordValid/);
  assert.match(s, /\[A-Z\]/);
  assert.match(s, /\[a-z\]/);
  assert.match(s, /\[0-9\]/);
  assert.match(s, /\[\^A-Za-z0-9\]/);
});

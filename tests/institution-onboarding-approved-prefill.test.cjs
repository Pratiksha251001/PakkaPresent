"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const backend = fs.readFileSync("backend/institution-onboarding.cjs", "utf8");
const service = fs.readFileSync("frontend/src/lib/institutionOnboardingService.ts", "utf8");
const page = fs.readFileSync("frontend/src/pages/InstitutionOnboarding.tsx", "utf8");

test("invitation validation returns approved location and contact name", () => {
  assert.match(backend, /contact_name,city,state/);
  assert.match(backend, /administratorName: r\.contact_name/);
  assert.match(backend, /city: r\.city/);
  assert.match(backend, /state: r\.state/);
});

test("onboarding prefills and locks approved identity", () => {
  assert.match(service, /administratorName\?: string/);
  assert.match(page, /city: r\.institution\?\.city/);
  assert.match(page, /state: r\.institution\?\.state/);
  assert.match(page, /fullName: r\.administratorName/);
  assert.match(page, /field\("City", "city", true, true\)/);
  assert.match(page, /field\("State", "state", true, true\)/);
  assert.match(page, /field\("Official email", "email", true, true\)/);
  assert.match(page, /field\("District \(optional\)", "district", false\)/);
});

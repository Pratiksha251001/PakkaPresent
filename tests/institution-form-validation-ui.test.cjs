"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("frontend/src/pages/InstitutionAccessRequest.tsx", "utf8");
test("original PakkaPresent request design remains present", () => {
  assert.ok(page.includes("bg-[#191a23]"));
  assert.match(page, /How verification works/);
  assert.match(page, /No password is requested here/);
  assert.match(page, /What happens next/);
});
test("request design contains India dependent selectors and inline errors", () => {
  assert.match(page, /value="India" readOnly/);
  assert.match(page, /getIndiaStates/);
  assert.match(page, /getIndiaCities/);
  assert.match(page, /Select state/);
  assert.match(page, /Select city/);
  assert.match(page, /text-red-600/);
  assert.match(page, /10-digit phone number/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeInstitutionCode,
  normalizeDigits,
  institutionFieldErrors,
} = require("../backend/institution-details-validation.cjs");

test("institution code normalization matches onboarding rules", () => {
  assert.equal(normalizeInstitutionCode("Khote Institute of India"), "KHOTE_INSTITUTE_OF_INDIA");
  assert.equal(normalizeInstitutionCode("MITCORER"), "MITCORER");
});

test("digit normalization preserves DTE leading zeroes and caps phone length", () => {
  assert.equal(normalizeDigits("06901", 32), "06901");
  assert.equal(normalizeDigits("98 765-43210-extra", 10), "9876543210");
});

test("shared validation reports precise field errors", () => {
  const errors = institutionFieldErrors({
    institution_code: "INVALID CODE",
    dte_code: "06A01",
    official_email: "not-email",
    phone: "123",
    state: "",
    city: "",
    student_count: 2.5,
  });
  assert.deepEqual(Object.keys(errors).sort(), [
    "city", "dteCode", "institutionCode", "officialEmail", "phone", "state", "studentCount",
  ]);
});

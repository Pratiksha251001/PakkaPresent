"use strict";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTION_CODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const DTE_CODE = /^\d{1,32}$/;
const PHONE = /^\d{10}$/;

const clean = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
const normalizeInstitutionCode = (value) =>
  clean(value).toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
const normalizeDigits = (value, max) =>
  String(value ?? "").replace(/\D/g, "").slice(0, max);

function institutionFieldErrors(value, { requireLocation = true } = {}) {
  const errors = {};
  if (value.institution_code && !INSTITUTION_CODE.test(value.institution_code))
    errors.institutionCode = "Use 2-32 uppercase letters, numbers, hyphens, or underscores.";
  if (value.dte_code && !DTE_CODE.test(value.dte_code))
    errors.dteCode = "DTE code can contain digits only.";
  if (!EMAIL.test(value.official_email || ""))
    errors.officialEmail = "Enter a valid official email address.";
  if (!PHONE.test(value.phone || ""))
    errors.phone = "Enter a valid 10-digit phone number.";
  if (requireLocation && !clean(value.state)) errors.state = "Select a state.";
  if (requireLocation && !clean(value.city)) errors.city = "Select a city.";
  if (
    value.student_count !== null &&
    (!Number.isInteger(value.student_count) || value.student_count < 1 || value.student_count > 10000000)
  ) errors.studentCount = "Enter a whole-number student count from 1 to 10,000,000.";
  return errors;
}

module.exports = {
  EMAIL, INSTITUTION_CODE, DTE_CODE, PHONE,
  clean, normalizeInstitutionCode, normalizeDigits, institutionFieldErrors,
};

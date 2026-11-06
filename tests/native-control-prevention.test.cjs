"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "frontend", "src");
const relative = (file) => path.relative(path.join(__dirname, ".."), file).replaceAll("\\", "/");

function listTsx(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTsx(target);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [target] : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findViolations(file, source, label, pattern) {
  return [...source.matchAll(pattern)].map(
    (match) => `${relative(file)}:${lineNumber(source, match.index)}: ${label}`,
  );
}

const files = listTsx(root);
const sources = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
const prohibited = [
  ["native <select>", /<select\b/g],
  ["native <datalist>", /<datalist\b/g],
  ["native date input", /<input\b[^>]*\btype\s*=\s*["']date["'][^>]*>/g],
  ["native checkbox input", /<input\b[^>]*\btype\s*=\s*["']checkbox["'][^>]*>/g],
  ["native radio input", /<input\b[^>]*\btype\s*=\s*["']radio["'][^>]*>/g],
];

const approvedFileInputs = new Map([
  ["frontend/src/components/ui/file-upload-surface.tsx", 1],
  ["frontend/src/pages/InstitutionSettings.tsx", 1],
]);

test("repository contains no prohibited visible native controls", () => {
  const violations = [];
  for (const [file, source] of sources) {
    for (const [label, pattern] of prohibited) {
      violations.push(...findViolations(file, source, label, pattern));
    }
  }
  assert.deepEqual(violations, [], `Prohibited native controls found:\n${violations.join("\n")}`);
});

test("native file inputs exist only in approved hidden locations", () => {
  const actual = new Map();
  const violations = [];
  const pattern = /<input\b[^>]*\btype\s*=\s*["']file["'][^>]*>/gs;

  for (const [file, source] of sources) {
    const name = relative(file);
    const matches = [...source.matchAll(pattern)];
    if (!matches.length) continue;
    actual.set(name, matches.length);
    if (!approvedFileInputs.has(name)) {
      for (const match of matches) {
        violations.push(`${name}:${lineNumber(source, match.index)}: unapproved native file input`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Unapproved native file inputs found:\n${violations.join("\n")}`,
  );
  assert.deepEqual(actual, approvedFileInputs);
});

test("approved native file inputs remain hidden and constrained", () => {
  const shared = fs.readFileSync(
    path.join(__dirname, "..", "frontend/src/components/ui/file-upload-surface.tsx"),
    "utf8",
  );
  const institution = fs.readFileSync(
    path.join(__dirname, "..", "frontend/src/pages/InstitutionSettings.tsx"),
    "utf8",
  );

  assert.match(shared, /type="file"[\s\S]*?className="sr-only"/);
  assert.match(shared, /accept=\{accept\}/);
  assert.match(institution, /type="file"[\s\S]*?accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(
    institution,
    /accept="image\/png,image\/jpeg,image\/webp"[\s\S]*?className="sr-only"/,
  );
});

test("shared alternatives remain available", () => {
  const required = [
    "frontend/src/components/ui/select.tsx",
    "frontend/src/components/ui/date-picker.tsx",
    "frontend/src/components/ui/checkbox.tsx",
    "frontend/src/components/ui/radio-group.tsx",
    "frontend/src/components/ui/switch.tsx",
    "frontend/src/components/ui/file-upload-surface.tsx",
  ];
  for (const file of required) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", file)), `${file} is missing`);
  }
});

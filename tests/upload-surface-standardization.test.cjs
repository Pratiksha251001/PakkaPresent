"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(file, "utf8");
const shared = read("frontend/src/components/ui/file-upload-surface.tsx");
const student = read("frontend/src/components/StudentImportModal.tsx");
const teacher = read("frontend/src/components/TeacherImportModal.tsx");
const syllabus = read("frontend/src/components/SyllabusImportModal.tsx");
const institution = read("frontend/src/pages/InstitutionSettings.tsx");

test("shared upload surface preserves hidden native file input", () => {
  assert.match(shared, /type="file"/);
  assert.match(shared, /className="sr-only"/);
  assert.match(shared, /accept=\{accept\}/);
  assert.match(shared, /event\.target\.value = ""/);
});

test("shared upload surface is keyboard and drag accessible", () => {
  assert.match(shared, /<button/);
  assert.match(shared, /focus-visible:ring-2/);
  assert.match(shared, /onDragEnter/);
  assert.match(shared, /onDragOver/);
  assert.match(shared, /onDragLeave/);
  assert.match(shared, /onDrop/);
  assert.match(shared, /event\.dataTransfer\.files\?\.\[0\]/);
});

test("shared upload surface exposes formats, errors, busy and replacement states", () => {
  assert.match(shared, /aria-label="Accepted file formats"/);
  assert.match(shared, /role="alert"/);
  assert.match(shared, /Processing file/);
  assert.match(shared, /replace it/);
  assert.match(shared, /Clear file/);
});

test("bulk imports use the shared upload surface", () => {
  for (const source of [student, teacher, syllabus]) {
    assert.match(source, /FileUploadSurface/);
  }

  assert.match(student, /accept="\.xlsx,\.xls,\.csv,\.tsv"/);
  assert.match(teacher, /accept="\.xlsx,\.xls,\.csv,\.tsv,\.txt"/);
  assert.match(syllabus, /accept="\.pdf,\.txt"/);
});

test("institution logo exposes edit and destructive remove overlay actions", () => {
  assert.doesNotMatch(institution, /FileUploadSurface/);

  assert.match(institution, /aria-label=\{[\s\S]*?"Replace institution logo"/);

  assert.match(institution, /onClick=\{\(\) => logoInputRef\.current\?\.click\(\)\}/);

  assert.match(institution, /className="absolute right-1 top-1/);

  assert.match(institution, /aria-label="Remove institution logo"/);

  assert.match(institution, /onClick=\{remove\}/);

  assert.match(institution, /className="absolute bottom-1 right-1[\s\S]*?bg-destructive/);

  assert.match(institution, /accept="image\/png,image\/jpeg,image\/webp"/);

  assert.match(institution, /className="sr-only"/);
});

test("feature files no longer own clickable div dropzones", () => {
  for (const source of [student, teacher, syllabus]) {
    assert.doesNotMatch(source, /<div[\s\S]{0,300}?onDrop=/);
    assert.doesNotMatch(source, /<div[\s\S]{0,300}?fileInputRef\.current\?\.click\(\)/);
  }
});

test("Student Import scroll area clears the fixed modal footer", () => {
  assert.match(student, /flex-1 overflow-y-auto space-y-3 px-4 pb-6 pt-4/);

  assert.match(student, /shrink-0 flex flex-col-reverse gap-3 border-t/);

  assert.match(student, /<FileUploadSurface/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const modal = fs.readFileSync(
  "frontend/src/components/SyllabusImportModal.tsx",
  "utf8",
);
const page = fs.readFileSync("frontend/src/pages/Subjects.tsx", "utf8");

test("syllabus import shows persistent progress and completion results", () => {
  assert.match(modal, /SubjectImportProgress/);
  assert.match(modal, /SubjectImportResult/);
  assert.match(modal, /Saving subject/);
  assert.match(modal, /Import completed/);
  assert.match(modal, /assignmentsCreated/);
  assert.match(modal, /Review the result, then select Done/);
});

test("completion hides the normal empty list and closes only through Done", () => {
  assert.match(modal, /!importResult && <div className="space-y-2">/);
  assert.match(
    modal,
    /resetImportSession\(\);[\s\S]*onOpenChange\(false\)/,
  );
  assert.doesNotMatch(
    modal,
    /setTimeout\([\s\S]{0,200}onOpenChange\(false\)/,
  );
});

test("Subjects page refreshes immediately after import", () => {
  assert.match(page, /onImportComplete=\{\(count\) =>/);
  assert.match(
    page,
    /setSubjectDataVersion\(\(version\) => version \+ 1\)/,
  );
  assert.match(page, /key=\{`subjects-\$\{subjectDataVersion\}`\}/);
  assert.match(page, /saved successfully/);
});

test("syllabus modal uses a spacious responsive desktop layout", () => {
  assert.match(
    modal,
    /w-\[min\(1000px,calc\(100vw-2rem\)\)\] max-w-none max-h-\[90vh\]/,
  );
  assert.match(modal, /sm:px-8 sm:py-6/);
  assert.match(modal, /md:grid-cols-\[1\.25fr_1fr_1\.15fr\]/);
  assert.match(modal, /sm:flex-row sm:items-end sm:justify-between/);
  assert.match(modal, /min-h-28/);
  assert.match(modal, /border-dashed/);
});

test("syllabus modal footer and disabled action remain readable", () => {
  assert.match(modal, /shrink-0 border-t border-border bg-background px-6 py-4 sm:px-8/);
  assert.match(modal, /disabled:cursor-not-allowed/);
  assert.match(modal, /disabled:bg-muted/);
  assert.match(modal, /disabled:text-muted-foreground/);
});

test("syllabus modal uses concise empty and footer wording", () => {
  assert.match(modal, /Upload a syllabus to view subjects for this semester/);
  assert.match(modal, /total credits •/);
  assert.match(modal, /\[scrollbar-width:thin\]/);
  assert.doesNotMatch(modal, /No courses found for this year & semester/);
});

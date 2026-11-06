"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (f) => fs.readFileSync(f, "utf8");
const shared = [
  read("frontend/src/components/ui/checkbox.tsx"),
  read("frontend/src/components/ui/radio-group.tsx"),
  read("frontend/src/components/ui/switch.tsx"),
];
const targets = [
  "StudentImportModal",
  "StudentPasswordModal",
  "SyllabusImportModal",
  "TeacherImportModal",
  "DefaulterDirectAlertModal",
  "MonthlyLowAttendanceAlertModal",
]
  .map((n) => read(`frontend/src/components/${n}.tsx`))
  .concat([
    read("frontend/src/pages/HODStaff.tsx"),
    read("frontend/src/pages/InstitutionAccessRequest.tsx"),
  ]);
test("shared controls expose accessible semantics", () => {
  assert.match(shared[0], /role="checkbox"/);
  assert.match(shared[1], /role="radiogroup"/);
  assert.match(shared[1], /role="radio"/);
  assert.match(shared[2], /role="switch"/);
});
test("targeted files remove native checkbox and radio inputs", () =>
  targets.forEach((s) => assert.doesNotMatch(s, /<input[\s\S]{0,160}?type="(?:checkbox|radio)"/)));
test("hidden upload inputs remain native through the shared upload surface", () => {
  const uploadSurface = read("frontend/src/components/ui/file-upload-surface.tsx");

  assert.match(uploadSurface, /type="file"/);
  assert.match(uploadSurface, /className="sr-only"/);
  assert.match(targets[0], /FileUploadSurface/);
  assert.match(targets[2], /FileUploadSurface/);
  assert.match(targets[3], /FileUploadSurface/);
});
test("institution consent remains focusable and invalid-aware", () => {
  const s = targets[7];
  assert.match(s, /refs\.current\.consent = element/);
  assert.match(s, /invalid=\{!!fieldErrors\.consent\}/);
  assert.match(s, /id="consent-error"/);
});
test("HOD and monthly selection constraints remain", () => {
  assert.match(targets[6], /aria-pressed=\{isChecked\}/);
  assert.match(targets[5], /disabled=\{!d\.hasValidMobile\}/);
});

test("shared Switch preserves visible contrast in light and dark themes", () => {
  const controlSwitch = shared[2];

  assert.match(controlSwitch, /bg-muted-foreground\/35/);
  assert.match(controlSwitch, /dark:bg-muted-foreground\/40/);
  assert.match(controlSwitch, /bg-white/);
  assert.match(controlSwitch, /dark:bg-foreground/);
  assert.match(controlSwitch, /dark:bg-primary-foreground/);
  assert.match(controlSwitch, /ring-black\/15/);
  assert.doesNotMatch(controlSwitch, /rounded-full bg-background shadow-sm/);
});

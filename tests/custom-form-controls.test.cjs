"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const select = read("frontend/src/components/ui/select.tsx");
const picker = read("frontend/src/components/ui/date-picker.tsx");
const dates = read("frontend/src/lib/local-date.ts");
const attendance = read("frontend/src/pages/Attendance.tsx");
const reports = read("frontend/src/pages/Reports.tsx");

test("shared select no longer renders a native select", () => {
  assert.doesNotMatch(select, /<select\b/);
  assert.match(select, /role="combobox"/);
  assert.match(select, /role="listbox"/);
  assert.match(select, /aria-selected=\{selected\}/);
  assert.match(select, /event\.key === "Escape"/);
  assert.match(select, /document\.addEventListener\("pointerdown"/);
});

test("date picker uses a custom local calendar", () => {
  assert.doesNotMatch(picker, /type="date"/);
  assert.match(picker, /role="dialog"/);
  assert.match(picker, /Choose date/);
  assert.match(picker, /isDateWithinBounds/);
  assert.match(dates, /getFullYear\(\)/);
  assert.doesNotMatch(dates, /toISOString\(\)/);
});

test("attendance and reports remain wired to shared controls", () => {
  assert.match(attendance, /import \{ Select \} from "\.\.\/components\/ui\/select"/);
  assert.match(attendance, /import \{ DatePicker \} from "\.\.\/components\/ui\/date-picker"/);
  assert.match(reports, /import \{ Select \} from "\.\.\/components\/ui\/select"/);
  assert.match(reports, /import \{ DatePicker \} from "\.\.\/components\/ui\/date-picker"/);
});

test("select portals collision-aware content and preserves full option details", () => {
  assert.match(select, /createPortal\(/);
  assert.match(select, /document\.body/);
  assert.match(select, /position: "fixed"/);
  assert.match(select, /openAbove = spaceBelow < 240/);
  assert.match(select, /description\?: string/);
  assert.match(select, /whitespace-normal break-words/);
});

test("attendance subjects and classes use readable searchable options", () => {
  assert.match(attendance, /searchPlaceholder="Search by subject code, name, or semester\.\.\."/);
  assert.match(attendance, /description: `Semester \$\{s\.semester\}`/);
  assert.match(attendance, /contentWidth="wide"/);
  assert.match(attendance, /searchable=\{availableClasses\.length > 10\}/);
  assert.match(attendance, /description:\s*availableClasses\.length > 0\s*\? "Whole Batch"/);
});

test("prettier ignore excludes repository artifacts without local drive paths", () => {
  const ignore = read(".prettierignore");
  assert.doesNotMatch(ignore, /[A-Z]:\//i);
  assert.match(ignore, /^node_modules$/m);
  assert.match(ignore, /^frontend\/dist$/m);
});

test("option-based select uses compact distinct hover and selected styling", () => {
  assert.doesNotMatch(select, /shadow-\[0_10px_30px/);
  assert.match(select, /hover:bg-muted\/50 focus-visible:bg-muted\/50/);
  assert.match(select, /ring-1 ring-inset ring-foreground\/20/);
  assert.match(select, /shrink-0 text-primary/);
});

test("Subject uses bounded wide popup while Class uses trigger width", () => {
  const subjectStart = attendance.indexOf(
    'searchPlaceholder="Search by subject code, name, or semester..."',
  );

  const subjectBlock = attendance.slice(Math.max(0, subjectStart - 220), subjectStart + 180);

  assert.ok(subjectStart >= 0);
  assert.match(subjectBlock, /contentWidth="wide"/);

  const classStart = attendance.indexOf('searchPlaceholder="Search classes or divisions..."');

  const classBlock = attendance.slice(Math.max(0, classStart - 220), classStart + 180);

  assert.ok(classStart >= 0);
  assert.doesNotMatch(classBlock, /contentWidth="wide"/);
});

test("hover and selected options have clearly different neutral states", () => {
  assert.match(select, /hover:bg-muted\/50 focus-visible:bg-muted\/50/);
  assert.match(select, /ring-1 ring-inset ring-foreground\/20/);
  assert.match(select, /shrink-0 text-primary/);
});

test("shared dropdown keeps solid lower edge and content-aware row heights", () => {
  assert.match(select, /shadow-\[0_4px_0_0_hsl\(var\(--border\)\)\]/);
  assert.match(select, /option\.description \? "min-h-12" : "h-10"/);
  assert.match(select, /h-10 w-full rounded-lg border border-input/);
  assert.match(select, /focus:border-foreground\/60 focus:ring-0/);
  assert.doesNotMatch(select, /focus:border-primary/);
});

test("dropdown option content is vertically centered", () => {
  assert.match(select, /flex w-full items-center justify-between gap-3 rounded-lg/);
  assert.match(select, /className="h-4 w-4 shrink-0 text-primary"/);
  assert.doesNotMatch(select, /flex w-full items-start justify-between gap-3 rounded-lg/);
});

test("long dropdowns use a compact scrollbar without reserved gutter", () => {
  assert.doesNotMatch(select, /scrollbar-gutter:stable/);
  assert.match(select, /\[scrollbar-width:thin\]/);
  assert.match(select, /\[&::\-webkit-scrollbar\]:w-2/);
  assert.match(select, /\[&::\-webkit-scrollbar-track\]:bg-transparent/);
});

test("internal dropdown scrolling does not reposition the popup", () => {
  assert.match(select, /popupRef\.current\?\.contains\(target\)/);
  assert.match(select, /window\.addEventListener\("scroll", handleViewportScroll, true\)/);
  assert.doesNotMatch(select, /window\.addEventListener\("scroll", updatePosition, true\)/);
});

test("dropdown lists do not reserve permanent scrollbar space", () => {
  assert.doesNotMatch(select, /filteredOptions\.length > 5 && "\[scrollbar-gutter:stable\]"/);
  assert.doesNotMatch(select, /scrollbar-gutter:stable/);
  assert.match(select, /overflow-y-auto/);
});

test("Subject uses bounded wide popup and allows long names to wrap", () => {
  assert.match(attendance, /contentWidth="wide"/);
  assert.match(attendance, /searchPlaceholder="Search by subject code, name, or semester\.\.\."/);
  assert.match(select, /whitespace-normal break-words/);
});

test("long dropdowns use a taller viewport-aware popup", () => {
  assert.match(select, /maxHeight: Math\.min\(440, available\)/);
  assert.doesNotMatch(select, /maxHeight: Math\.min\(360, available\)/);
});

test("calendar renders through a top-level portal above attendance content", () => {
  assert.match(picker, /createPortal\(/);
  assert.match(picker, /document\.body/);
  assert.match(picker, /ref=\{popupRef\}/);
  assert.match(picker, /position: "fixed"/);
  assert.match(picker, /z-\[1000\]/);
  assert.doesNotMatch(picker, /top-full z-\[310\]/);
  assert.doesNotMatch(picker, /absolute right-0\.5 top-0\.5 h-2\.5 w-2\.5/);
});

test("Reports Subject uses searchable bounded-wide popup", () => {
  const subjectPosition = reports.indexOf("value={selectedSubject}");

  const subjectStart = reports.lastIndexOf("<Select", subjectPosition);

  const subjectEnd = reports.indexOf("/>", subjectPosition) + 2;

  const subjectBlock = reports.slice(subjectStart, subjectEnd);

  assert.ok(subjectPosition >= 0);
  assert.match(subjectBlock, /searchable/);
  assert.match(subjectBlock, /contentWidth="wide"/);
  assert.match(subjectBlock, /searchPlaceholder="Search by subject code, name, or semester\.\.\."/);
  assert.match(subjectBlock, /emptyMessage="No matching subjects"/);
  assert.match(subjectBlock, /description: `Semester \$\{s\.semester\}`/);
  assert.match(
    subjectBlock,
    /searchText: `\$\{s\.code\} \$\{s\.name\} semester \$\{s\.semester\}`/,
  );
});

test("Reports Class and Format retain trigger-width popups", () => {
  const classPosition = reports.indexOf("value={selectedClass}");

  const classStart = reports.lastIndexOf("<Select", classPosition);

  const classEnd = reports.indexOf("/>", classPosition) + 2;

  const classBlock = reports.slice(classStart, classEnd);

  const formatPosition = reports.indexOf("value={reportViewType}");

  const formatStart = reports.lastIndexOf("<Select", formatPosition);

  const formatEnd = reports.indexOf("/>", formatPosition) + 2;

  const formatBlock = reports.slice(formatStart, formatEnd);

  assert.ok(classPosition >= 0);
  assert.ok(formatPosition >= 0);
  assert.doesNotMatch(classBlock, /contentWidth="wide"/);
  assert.doesNotMatch(formatBlock, /contentWidth="wide"/);
});

test("single-line dropdown options use the same compact row height", () => {
  assert.match(select, /option\.description \? "min-h-12" : "h-10"/);
  assert.doesNotMatch(select, /option\.description \? "min-h-\[52px\]" : "h-11"/);
});

test("single-line options match the closed Select trigger height", () => {
  assert.match(select, /option\.description \? "min-h-12" : "h-10"/);
  assert.doesNotMatch(select, /option\.description \? "min-h-12" : "h-11"/);
});

test("Subject options use compact two-line height", () => {
  assert.match(select, /option\.description \? "min-h-12" : "h-10"/);
  assert.doesNotMatch(select, /option\.description \? "min-h-\[52px\]"/);
});

test("calendar uses the same solid lower edge as dropdowns", () => {
  assert.match(picker, /shadow-\[0_4px_0_0_hsl\(var\(--border\)\)\]/);
  assert.doesNotMatch(picker, /shadow-\[0_7px_0_0_hsl\(var\(--foreground\)\/0\.18\)\]/);
});

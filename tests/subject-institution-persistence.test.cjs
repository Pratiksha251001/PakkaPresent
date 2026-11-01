"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../frontend/src/pages/ClassCoordinatorDashboard.tsx"),
  "utf8",
);
const start = source.indexOf("const handleSaveSubject = async () => {");
const end = source.indexOf("const handleDeleteSubject", start);
const saveHandler = source.slice(start, end);

test("subject and faculty assignment writes use authenticated institution", () => {
  assert.ok(start >= 0 && end > start);
  assert.ok(
    saveHandler.includes("const institutionId = user?.institution_id?.trim()"),
  );
  assert.ok(saveHandler.includes("if (!institutionId)"));
  assert.equal(
    (saveHandler.match(/institution_id: institutionId/g) || []).length,
    4,
  );
  assert.ok(saveHandler.includes('myDepartmentId === "dept-1"'));
});

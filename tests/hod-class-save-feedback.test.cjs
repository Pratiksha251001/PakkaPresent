"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/pages/HODClasses.tsx", "utf8");

test("HOD class create and update show saving and success feedback", () => {
  assert.match(source, /const \[isSaving, setIsSaving\] = useState\(false\)/);
  assert.match(source, /Class updated successfully\./);
  assert.match(source, /Class created successfully\./);
  assert.match(source, /Updating class\.\.\./);
  assert.match(source, /Creating class\.\.\./);
  assert.match(source, /disabled=\{isSaving\}/);
  assert.match(source, /role=\{saveFeedback\.type === "error" \? "alert" : "status"\}/);
});

test("HOD class editor closes only after an awaited successful write", () => {
  const save = source.slice(source.indexOf("const save = async"), source.indexOf("const remove = async"));
  assert.match(save, /await localDb\.update\("academic_classes"/);
  assert.match(save, /await localDb\.insert\("academic_classes"/);
  assert.match(save, /try \{/);
  assert.match(save, /catch \(error\)/);
  assert.match(save, /setOpen\(false\)/);
  assert.match(save, /setSaveFeedback\(\{[\s\S]*?type: "error"/);
  assert.ok(save.indexOf("await localDb") < save.indexOf("setOpen(false)"));
});

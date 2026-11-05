"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/components/ui/select.tsx", "utf8");

test("native selects reserve space for the browser chevron", () => {
  const nativeSelect = source.slice(
    source.indexOf("if (options || !children)"),
    source.indexOf("return (", source.indexOf("if (options || !children)")) + 1600,
  );
  assert.match(nativeSelect, /truncate/);
  assert.match(nativeSelect, /pl-3 pr-10/);
  assert.doesNotMatch(
    nativeSelect,
    /bg-card px-3 py-2 text-sm font-medium/,
  );
});

test("native selects expose the complete selected label", () => {
  assert.match(source, /const selectedOptionLabel = options\?\.find/);
  assert.match(source, /title=\{props\.title \|\| selectedOptionLabel\}/);
});

test("custom SelectTrigger behavior remains unchanged", () => {
  assert.match(source, /export const SelectTrigger/);
  assert.match(source, /justify-between/);
  assert.match(source, /context\?\.setOpen\(!context\.open\)/);
});

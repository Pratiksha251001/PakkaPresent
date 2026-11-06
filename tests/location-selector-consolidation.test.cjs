"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(file, "utf8");
const location = read("frontend/src/components/ui/searchable-location-select.tsx");
const select = read("frontend/src/components/ui/select.tsx");
const request = read("frontend/src/pages/InstitutionAccessRequest.tsx");

test("location selector delegates popup behavior to the shared Select", () => {
  assert.match(location, /import \{ Select \} from "\.\/select"/);
  assert.match(location, /<Select/);
  assert.match(location, /searchable/);
  assert.match(location, /searchLocale="en-IN"/);
  assert.doesNotMatch(location, /createPortal|role="listbox"|closeOnOutsideClick/);
});

test("shared Select accepts locale-aware filtering and trigger integration", () => {
  assert.match(select, /searchLocale\?: string/);
  assert.match(select, /toLocaleLowerCase\(searchLocale\)/);
  assert.match(select, /triggerRef\?: React\.Ref<HTMLButtonElement>/);
  assert.match(
    select,
    /triggerProps\?:[\s\S]*?Omit<[\s\S]*?React\.ButtonHTMLAttributes<HTMLButtonElement>/,
  );
  assert.match(select, /triggerProps\?\.className/);
});

test("location validation refs and data selectors remain intact", () => {
  assert.match(location, /triggerRef=\{inputRef\}/);
  assert.match(location, /"data-location-selector": dataSelector/);
  assert.match(location, /"aria-invalid": !!error/);
  assert.match(location, /"aria-describedby": error \? errorId : undefined/);
  assert.match(request, /refs\.current\.state = element/);
  assert.match(request, /refs\.current\.city = element/);
});

test("state and city dependency behavior remains unchanged", () => {
  assert.match(request, /setValue\("city", ""\)/);
  assert.match(request, /setCities\(\[\]\)/);
  assert.match(request, /getIndiaCities\(stateCode\)/);
  assert.match(request, /disabled=\{!form\.state \|\| locationsLoading\}/);
  assert.match(request, /value: state\.code/);
  assert.match(request, /label: state\.name/);
});

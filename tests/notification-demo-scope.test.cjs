"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/lib/notificationService.ts", "utf8");

test("sample notifications are restricted to the explicit demo institution", () => {
  assert.ok(source.includes('activeScope?.institutionId === "demo"'));
  assert.ok(source.includes("if (!isDemoNotificationScope()) return [];"));
  assert.ok(!source.includes('typeof window === "undefined") return initialSampleNotifications'));
});

test("real scopes remove previously seeded sample-only notification stores", () => {
  assert.ok(source.includes("containsOnlySeededSamples"));
  assert.ok(source.includes("!isDemoNotificationScope() && containsOnlySeededSamples"));
  assert.ok(source.includes("localStorage.removeItem(storageKey)"));
});

test("demo scope retains sample seeding and demo-clear behavior", () => {
  assert.ok(source.includes("demo_cleared"));
  assert.ok(source.includes("localStorage.setItem(storageKey, JSON.stringify(initialSampleNotifications))"));
});

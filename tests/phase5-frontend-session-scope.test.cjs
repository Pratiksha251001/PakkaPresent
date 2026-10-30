"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8"),
  db = read("frontend/src/lib/supabase.ts"),
  auth = read("frontend/src/context/AuthContext.tsx"),
  notif = read("frontend/src/lib/notificationService.ts"),
  app = read("frontend/src/App.tsx");
test("cache and realtime use verified tenant-user scope", () => {
  assert.match(db, /activeScope: LocalDatabaseScope/);
  assert.match(db, /scopeGeneration \+= 1/);
  assert.match(db, /stopRealtime/);
  assert.match(db, /scopeIsCurrent/);
  assert.match(
    db,
    /edutrack-data-\$\{scope.institutionId\}-\$\{scope.userId\}/,
  );
});
test("authentication verifies profile and active institution", () => {
  assert.equal(
    (auth.match(/must_change_password,institution_id/g) || []).length,
    2,
  );
  assert.match(auth, /profile.institution_id !== roleRecord.institution_id/);
  assert.match(auth, /institution.status !== "active"/);
  assert.equal((auth.match(/setSessionScope\(\{/g) || []).length, 4);
});
test("all demo users carry the demo institution identity", () => {
  const demoUsers =
    auth.match(
      /const demoUsers: Record<UserRoleType, User> = \{[\s\S]*?\n    \};/,
    )?.[0] || "";
  for (const role of [
    "admin",
    "hod",
    "teacher",
    "class_coordinator",
    "student",
  ]) {
    assert.match(
      demoUsers,
      new RegExp(
        String.raw`\n\s*${role}:\s*\{[\s\S]*?institution_id:\s*"demo"`,
      ),
    );
  }
  assert.equal((demoUsers.match(/institution_id: "demo"/g) || []).length, 5);
});
test("notifications and routes are user scoped", () => {
  assert.match(notif, /activeScope.*institutionId.*userId/s);
  assert.match(app, /getScopedPath/);
  assert.match(app, /setScopedPath/);
  assert.match(
    auth,
    /setSessionScope\(\{[\s\S]*institutionId: "demo"[\s\S]*userId: demoUser\.id/,
  );
  assert.match(auth, /setNotificationSessionScope\("demo", demoUser\.id\)/);
  assert.match(
    auth,
    /setScopedPath\([\s\S]*institutionId: "demo"[\s\S]*userId: demoUser\.id[\s\S]*defaultPath/,
  );
  assert.doesNotMatch(
    auth,
    /localStorage\.setItem\("edutrack_last_active_path"/,
  );
});

test("remaining critical Phase 5 isolation guards are present", () => {
  assert.match(auth, /Saved demo session is incomplete/);
  assert.match(auth, /studentRecord\.institution_id !== institution\.id/);

  assert.match(db, /private captureScope\(\)/);
  assert.match(db, /private assertScopeCurrent/);
  assert.match(db, /scopeIsCurrent\(expectedScope, generation\)/);

  assert.match(
    db,
    /async insert[\s\S]*captureScope\(\)[\s\S]*assertScopeCurrent/,
  );
  assert.match(
    db,
    /async update[\s\S]*captureScope\(\)[\s\S]*assertScopeCurrent/,
  );
  assert.match(
    db,
    /async delete[\s\S]*captureScope\(\)[\s\S]*assertScopeCurrent/,
  );
  assert.match(
    db,
    /async upsertAttendance[\s\S]*captureScope\(\)[\s\S]*assertScopeCurrent/,
  );
});

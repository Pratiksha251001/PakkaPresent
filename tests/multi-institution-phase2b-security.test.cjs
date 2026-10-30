"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
const server = read("server.ts"),
  auth = read("frontend/src/context/AuthContext.tsx"),
  db = read("frontend/src/lib/supabase.ts"),
  notifications = read("frontend/src/lib/notificationService.ts");
test("backend actor requires institution ownership", () => {
  assert.match(server, /institutionId: string/);
  assert.match(server, /role,department_id,institution_id/);
  assert.match(server, /!authorizedRole\.institution_id/);
  assert.match(server, /institutionId: authorizedRole\.institution_id/);
});
test("auth session loads and stores institution identity", () => {
  assert.match(auth, /institution_id: string/);
  assert.equal(
    (auth.match(/role,department_id,institution_id/g) || []).length,
    2,
  );
  assert.match(auth, /setSessionScope\(\{/);
  assert.match(auth, /setNotificationSessionScope\(roleRecord\.institution_id/);
});
test("missing institution fails closed", () => {
  assert.match(auth, /This account has no institution assignment/);
  assert.match(auth, /if \(!roleRecord\.institution_id\)/);
});
test("local data cache is tenant scoped", () => {
  assert.match(db, /edutrack_local_db_\$\{this\.activeScope\.institutionId/);
  assert.match(db, /setSessionScope\(scope: LocalDatabaseScope \| null\)/);
  assert.match(
    db,
    /this\.syncReady = this\.syncFromSupabase\(scope, generation\)/,
  );
});
test("notifications are tenant scoped", () => {
  assert.match(notifications, /getNotificationsStorageKey/);
  assert.match(notifications, /setNotificationSessionScope/);
  assert.doesNotMatch(
    notifications,
    /localStorage\.getItem\(NOTIFICATIONS_STORAGE_KEY\)/,
  );
});
test("sign out clears tenant state", () => {
  assert.match(auth, /setSessionScope\(null\)/);
  assert.match(auth, /setNotificationSessionScope\(null\)/);
});

test("institution cache switching uses an explicit table list", () => {
  assert.match(
    db,
    /const LOCAL_DATABASE_TABLES = \[[\s\S]*?"academic_classes",[\s\S]*?\] as const;/,
  );
  assert.match(db, /for \(const table of LOCAL_DATABASE_TABLES\)/);
  assert.doesNotMatch(db, /for \(const table of TABLES\)/);
});

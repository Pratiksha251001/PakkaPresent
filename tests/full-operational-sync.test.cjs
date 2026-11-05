"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const db = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");
const crud = fs.readFileSync("frontend/src/components/CrudPage.tsx", "utf8");
const users = fs.readFileSync("frontend/src/pages/Users.tsx", "utf8");
const attendance = fs.readFileSync("frontend/src/pages/Attendance.tsx", "utf8");
const smsLogs = fs.readFileSync("frontend/src/pages/SmsLogs.tsx", "utf8");
const schema = fs.readFileSync("frontend/src/lib/schemaSql.ts", "utf8");

const tables = ["departments","teachers","students","academic_classes","class_coordinator_assignments","subjects","teacher_subjects","attendance","notices","sms_logs"];

test("all operational tables are tenant owned and realtime enabled", () => {
  const tenantSet = db.slice(db.indexOf("const TENANT_SCOPED_WRITE_TABLES"), db.indexOf("const LOCAL_DATABASE_TABLES"));
  const realtime = db.slice(db.indexOf("private subscribeToRealtime"), db.indexOf("private applyRealtimeChange"));
  for (const table of tables) {
    assert.match(tenantSet, new RegExp(`"${table}"`));
    assert.match(realtime, new RegExp(`"${table}"`));
    assert.match(schema, new RegExp(`'${table}'`));
  }
  assert.match(db, /\.eq\("institution_id", expectedScope\.institutionId\)/);
  assert.match(realtime, /filter: `institution_id=eq\.\$\{scope\.institutionId\}`/);
});

test("failed deletes restore local state and surface errors", () => {
  const deletion = db.slice(db.indexOf("async delete("), db.indexOf("async upsertAttendance("));
  assert.match(deletion, /const previous = list\[idx\]/);
  assert.match(deletion, /list\.splice\(idx, 0, previous\)/);
  assert.match(deletion, /\.eq\("institution_id", scope\.institutionId\)/);
  assert.match(deletion, /delete affected no institution-owned record/);
  assert.match(crud, /CrudPage delete failed/);
});

test("dependent pages refresh synchronized data", () => {
  assert.match(users, /\["users", "teachers", "students", "departments"\]/);
  assert.match(attendance, /"attendance"/);
  assert.match(attendance, /attendanceDataVersion/);
  assert.match(smsLogs, /\}, \[logs\]\);/);
  assert.match(crud, /Math\.min\(current, Math\.max\(totalPages - 1, 0\)\)/);
});

test("tenant-owned updates constrain institution and verify the affected row", () => {
  const update = db.slice(db.indexOf("async update("), db.indexOf("async delete("));
  assert.match(update, /TENANT_SCOPED_WRITE_TABLES\.has\(table\)/);
  assert.match(update, /request = request\.eq\("institution_id", scope\.institutionId\)/);
  assert.match(update, /const \{ data: updatedRows, error \} = await request\.select\("id"\)/);
  assert.match(update, /!updatedRows\?\.length/);
  assert.match(update, /update affected no institution-owned record/);
  assert.match(update, /list\[idx\] = previous/);
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");

test("subject realtime listeners are institution filtered", () => {
  const realtime = source.slice(
    source.indexOf("private subscribeToRealtime"),
    source.indexOf("private applyRealtimeChange"),
  );
  assert.match(realtime, /const realtimeTables = \[[\s\S]*?"subjects"[\s\S]*?"teacher_subjects"/);
  assert.match(realtime, /table,[\s\S]*?filter: `institution_id=eq\.\$\{scope\.institutionId\}`/);
});
test("out-of-scope realtime writes are ignored defensively", () => {
  const apply = source.slice(
    source.indexOf("private applyRealtimeChange"),
    source.indexOf("private load<"),
  );
  assert.match(apply, /TENANT_SCOPED_WRITE_TABLES\.has\(table\)/);
  assert.match(apply, /record\?\.institution_id !== scope\.institutionId/);
  assert.match(apply, /Ignored out-of-scope realtime/);
});

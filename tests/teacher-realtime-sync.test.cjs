"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("frontend/src/lib/supabase.ts", "utf8");

test("teacher realtime is institution filtered", () => {
  const realtime = source.slice(
    source.indexOf("private subscribeToRealtime"),
    source.indexOf("private applyRealtimeChange"),
  );
  assert.match(
    realtime,
    /table: "teachers",[\s\S]*?filter: `institution_id=eq\.\$\{scope\.institutionId\}`/,
  );
});

test("out-of-scope teacher events are rejected by the shared guard", () => {
  assert.match(source, /TENANT_SCOPED_WRITE_TABLES\.has\(table\)/);
  assert.match(source, /record\?\.institution_id !== scope\.institutionId/);
});

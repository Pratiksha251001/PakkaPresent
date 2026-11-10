"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const attendance = fs.readFileSync("frontend/src/pages/Attendance.tsx", "utf8");
const receipt = fs.readFileSync(
  "frontend/src/components/AttendanceDispatchReceiptModal.tsx",
  "utf8",
);
const logs = fs.readFileSync("frontend/src/pages/SmsLogs.tsx", "utf8");

test("daily submissions keep the daily workflow classification", () => {
  assert.match(attendance, /const kind = "daily_attendance"/);
  assert.match(attendance, /is_defaulter_alert: false/);
  assert.match(attendance, /email_subject: "Daily attendance update"/);
  assert.doesNotMatch(attendance, /const kind = isDefaulter/);
});

test("duplicate daily requests are skipped", () => {
  assert.match(attendance, /response\.status === 409/);
  assert.match(attendance, /result\.status === "already_processed"/);
  assert.match(attendance, /Duplicate .*Skipped/);
});

test("receipt distinguishes accepted skipped and failed", () => {
  assert.match(receipt, /"accepted" \| "failed" \| "skipped"|"accepted" \| "skipped" \| "failed"/);
  assert.match(receipt, /skipped: results\.filter/);
});

test("communication logs use explicit workflow classification", () => {
  assert.match(logs, /is_defaulter_alert !== true/);
  assert.match(logs, /is_defaulter_alert === true/);
  assert.match(logs, /Skipped duplicate/);
});

test("SMS results remain independent of email provider status", () => {
  assert.match(attendance, /status:\s*hasMobile \? "sent" : "failed"/);
  assert.match(attendance, /status:\s*hasMobile \? "accepted" : "failed"/);
});

test("communication log row references the current log workflow", () => {
  assert.match(logs, /const isDefaulter = log\.is_defaulter_alert === true/);
  assert.doesNotMatch(logs, /const isDefaulter = is_defaulter_alert === true/);
});

test("duplicate daily requests are excluded from sms_logs persistence", () => {
  assert.match(attendance, /responseStatus\s*!==\s*"already_processed"[\s\S]*?newLogEntries\.push/);

  assert.match(
    attendance,
    /Parent notification was already processed, so no duplicate alert was sent\./,
  );

  assert.doesNotMatch(attendance, /newLogEntries\.push\([\s\S]*?status:\s*"skipped"/);
});

test("duplicate success banner stays concise", () => {
  assert.ok(attendance.includes('successMsg.includes("Parent alert already sent")'));

  assert.ok(attendance.includes("Attendance Saved · Duplicate Skipped"));

  assert.ok(attendance.includes("Parent alert already sent."));

  assert.ok(attendance.includes("duplicateOnly"));

  assert.ok(attendance.includes('classLabel || "Attendance"'));

  assert.ok(attendance.includes("Attendance Saved; Notification Status Recorded"));

  assert.ok(!attendance.includes("View in SMS & Alert History anytime."));
});

test("success banner waits until the receipt closes", () => {
  assert.ok(attendance.includes('const [pendingSuccessMsg, setPendingSuccessMsg] = useState("")'));

  assert.ok(attendance.includes("setPendingSuccessMsg("));

  assert.ok(attendance.includes("if (!nextOpen && pendingSuccessMsg)"));

  assert.ok(attendance.includes("setSuccessMsg(completedMessage)"));

  assert.ok(attendance.includes("currentMessage === completedMessage"));

  assert.ok(!attendance.includes('setTimeout(() => setSuccessMsg(""), 12000)'));
});

"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  registerParentNotificationDispatch,
} = require("../backend/parent-notification-dispatch.cjs");
function setup(env = {}) {
  const routes = {};
  let called = 0;
  registerParentNotificationDispatch(
    { post: (path, ...handlers) => (routes[path] = handlers) },
    {
      admin: {
        from: () => {
          called++;
          throw Error("unexpected database");
        },
      },
      requireManager: () => {},
      env,
    },
  );
  return {
    routes,
    get called() {
      return called;
    },
  };
}
function response() {
  return {
    code: 200,
    status(n) {
      this.code = n;
      return this;
    },
    json(x) {
      this.body = x;
      return this;
    },
  };
}
test("dispatch disabled by default without database access", async () => {
  const h = setup(),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1]({ body: {} }, r);
  assert.equal(r.code, 503);
  assert.equal(h.called, 0);
});
test("rejects malformed student IDs before DB", async () => {
  const h = setup({ PARENT_ATTENDANCE_EMAIL_ENABLED: "true" }),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1](
    {
      body: { studentId: "bad", kind: "daily_attendance", date: "2026-10-22" },
    },
    r,
  );
  assert.equal(r.code, 400);
  assert.equal(h.called, 0);
});
test("missing actor rejected before DB", async () => {
  const h = setup({ PARENT_ATTENDANCE_EMAIL_ENABLED: "true" }),
    r = response();
  await h.routes["/api/parents/attendance/notify"][1](
    {
      body: {
        studentId: "00000000-0000-4000-8000-000000000001",
        kind: "daily_attendance",
        date: "2026-10-22",
      },
    },
    r,
  );
  assert.equal(r.code, 401);
  assert.equal(h.called, 0);
});

const id = "00000000-0000-4000-8000-000000000001";
const institutionId = "22222222-2222-4222-8222-222222222222";
const student = {
  id,
  institution_id: institutionId,
  department_id: "dept-1",
  full_name: "Student Example",
  parent_name: "Guardian",
  parent_email: "guardian@example.com",
  parent_email_approved_at: "2026-10-22T00:00:00Z",
  parent_email_approved_by: "11111111-1111-4111-8111-111111111111",
};

test("missing actor institution is rejected before database access", async () => {
  const h = setup({ PARENT_ATTENDANCE_EMAIL_ENABLED: "true" });
  const r = response();
  await h.routes["/api/parents/attendance/notify"][1](
    {
      actor: { role: "admin", id: "actor" },
      body: { studentId: id, kind: "daily_attendance", date: "2026-10-22" },
    },
    r,
  );
  assert.equal(r.code, 403);
  assert.equal(h.called, 0);
});

const institution = {
  display_name: "PakkaPresent Test Institution",
  official_name: "PakkaPresent Test Institution Official",
  logo_path: "22222222-2222-4222-8222-222222222222/logo.png",
};
const configured = {
  PARENT_ATTENDANCE_EMAIL_ENABLED: "true",
  EMAILJS_SERVICE_ID: "service",
  EMAILJS_TEMPLATE_ID: "template",
  EMAILJS_PUBLIC_KEY: "public",
  EMAILJS_PRIVATE_KEY: "private",
};
function enabled({
  records = [],
  studentRow = student,
  institutionRow = institution,
  institutionError = null,
  logoSignedUrl = "https://example.test/signed-institution-logo.png",
  logoError = null,
  claim = true,
  complete = true,
  claimError = null,
  completeError = null,
  providerOk = true,
} = {}) {
  const routes = {};
  const calls = [];
  const queries = [];
  const storageCalls = [];
  let providerPayload = null;
  const admin = {
    storage: {
      from(bucket) {
        storageCalls.push({ bucket });
        return {
          async createSignedUrl(path, expiresIn) {
            storageCalls[storageCalls.length - 1] = { bucket, path, expiresIn };
            return {
              data: logoError ? null : { signedUrl: logoSignedUrl },
              error: logoError,
            };
          },
        };
      },
    },
    from(table) {
      const query = { table, equalities: [] };
      queries.push(query);
      return {
        select(columns) {
          query.columns = columns;
          return this;
        },
        eq(column, value) {
          query.equalities.push({ column, value });
          return this;
        },
        lte(column, value) {
          query.lte = { column, value };
          return Promise.resolve({ data: records, error: null });
        },
        single() {
          if (table === "institutions") {
            return Promise.resolve({
              data: institutionError ? null : institutionRow,
              error: institutionError,
            });
          }
          return Promise.resolve({ data: studentRow, error: null });
        },
      };
    },
    async rpc(name, params) {
      calls.push({ name, params });
      const isClaim = name === "claim_parent_notification";
      return {
        data: isClaim ? claim : complete,
        error: isClaim ? claimError : completeError,
      };
    },
  };
  let sends = 0;
  registerParentNotificationDispatch(
    { post: (path, ...handlers) => (routes[path] = handlers) },
    {
      admin,
      requireManager: () => {},
      env: configured,
      fetchImpl: async (_url, options) => {
        sends++;
        providerPayload = JSON.parse(options.body);
        return { ok: providerOk };
      },
    },
  );
  return {
    handler: routes["/api/parents/attendance/notify"][1],
    calls,
    queries,
    storageCalls,
    get providerPayload() {
      return providerPayload;
    },
    get sends() {
      return sends;
    },
  };
}
async function invoke(h, kind = "low_attendance") {
  const r = response();
  await h.handler(
    {
      actor: { role: "admin", id: "actor", institutionId },
      body: { studentId: id, kind, date: "2026-10-22" },
    },
    r,
  );
  return r;
}
test("no attendance records fail closed without claiming or sending", async () => {
  const h = enabled();
  const r = await invoke(h, "daily_attendance");
  assert.equal(r.code, 422);
  assert.equal(h.calls.length, 0);
  assert.equal(h.sends, 0);
});
test("74.5 percent is below 75 without premature rounding", async () => {
  const records = Array.from({ length: 200 }, (_, i) => ({
    status: i < 149 ? "present" : "absent",
  }));
  const h = enabled({ records });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(h.sends, 1);
  assert.equal(h.calls[0].name, "claim_parent_notification");
});
test("duplicate claim never sends", async () => {
  const h = enabled({ records: [{ status: "absent" }], claim: false });
  const r = await invoke(h);
  assert.equal(r.code, 409);
  assert.equal(r.body.status, "already_processed");
  assert.equal(
    r.body.message,
    "Alert already sent or processed for this student and date.",
  );
  assert.equal(h.sends, 0);
});
test("failed completion RPC never reports provider acceptance", async () => {
  const h = enabled({ records: [{ status: "absent" }], complete: false });
  const r = await invoke(h);
  assert.equal(r.code, 503);
  assert.equal(r.body.success, false);
});
test("staff-approved stored parent email sends without parent verification", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    studentRow: { ...student },
  });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(h.sends, 1);
});

test("unapproved parent email is never claimed or sent", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    studentRow: {
      ...student,
      parent_email_approved_at: null,
      parent_email_approved_by: null,
    },
  });
  const r = await invoke(h);
  assert.equal(r.code, 422);
  assert.equal(h.sends, 0);
});

test("claim RPC errors fail closed before provider dispatch", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    claimError: { code: "23502", message: "institution_id is required" },
  });
  const previous = console.error;
  const diagnostics = [];
  console.error = (...args) => diagnostics.push(args);
  try {
    const r = await invoke(h);
    assert.equal(r.code, 503);
    assert.equal(r.body.message, "Notification ledger unavailable.");
    assert.equal(h.sends, 0);
    assert.equal(diagnostics[0][0], "Parent notification claim RPC failed");
  } finally {
    console.error = previous;
  }
});

test("completion RPC errors never report provider acceptance", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    completeError: { code: "P0001", message: "completion failed" },
  });
  const previous = console.error;
  const diagnostics = [];
  console.error = (...args) => diagnostics.push(args);
  try {
    const r = await invoke(h);
    assert.equal(r.code, 503);
    assert.equal(r.body.message, "Provider outcome could not be recorded.");
    assert.equal(h.sends, 1);
    assert.equal(
      diagnostics[0][0],
      "Parent notification completion RPC failed",
    );
  } finally {
    console.error = previous;
  }
});

test("institution display name and signed logo are sent to EmailJS", async () => {
  const h = enabled({ records: [{ status: "absent" }] });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(
    h.providerPayload.template_params.institution_name,
    institution.display_name,
  );
  assert.equal(
    h.providerPayload.template_params.institution_logo_url,
    "https://example.test/signed-institution-logo.png",
  );
  assert.equal(h.providerPayload.template_params.platform_name, "PakkaPresent");
  assert.deepEqual(h.storageCalls, [
    {
      bucket: "institution-assets",
      path: institution.logo_path,
      expiresIn: 60 * 60 * 24 * 7,
    },
  ]);
});

test("institution branding lookup is scoped to the student institution", async () => {
  const h = enabled({ records: [{ status: "absent" }] });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  const query = h.queries.find((entry) => entry.table === "institutions");
  assert.deepEqual(query.equalities, [{ column: "id", value: institutionId }]);
  assert.equal(query.columns, "display_name,official_name,logo_path");
});

test("official institution name is used when display name is blank", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    institutionRow: { ...institution, display_name: "  " },
  });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(
    h.providerPayload.template_params.institution_name,
    institution.official_name,
  );
});

test("missing institution logo does not block email delivery", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    institutionRow: { ...institution, logo_path: null },
  });
  const r = await invoke(h);
  assert.equal(r.code, 200);
  assert.equal(h.providerPayload.template_params.institution_logo_url, "");
  assert.deepEqual(h.storageCalls, []);
});

test("logo signing failure falls back safely", async () => {
  const previous = console.error;
  const diagnostics = [];
  console.error = (...args) => diagnostics.push(args);
  try {
    const h = enabled({
      records: [{ status: "absent" }],
      logoError: { code: "storage_error", message: "signing failed" },
    });
    const r = await invoke(h);
    assert.equal(r.code, 200);
    assert.equal(h.providerPayload.template_params.institution_logo_url, "");
    assert.equal(diagnostics[0][0], "Institution email logo signing failed");
  } finally {
    console.error = previous;
  }
});

test("missing institution branding fails closed before provider access", async () => {
  const h = enabled({
    records: [{ status: "absent" }],
    institutionError: { code: "PGRST116", message: "not found" },
  });
  const r = await invoke(h);
  assert.equal(r.code, 503);
  assert.equal(r.body.message, "Institution branding unavailable.");
  assert.equal(h.sends, 0);
  assert.equal(
    h.queries.some((entry) => entry.table === "attendance"),
    false,
  );
});

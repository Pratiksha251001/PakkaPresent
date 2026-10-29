"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  {
    registerInstitutionAccessRequests,
  } = require("../backend/institution-access-requests.cjs");
const res = () => ({
  code: 200,
  status(n) {
    this.code = n;
    return this;
  },
  json(v) {
    this.body = v;
    return this;
  },
});
const body = {
  institutionName: "Example College",
  institutionType: "College",
  contactName: "Contact",
  designation: "Registrar",
  officialEmail: "ADMIN@EXAMPLE.EDU",
  phone: "+91 98765 43210",
  city: "Pune",
  state: "Maharashtra",
  studentCount: "500",
  message: "Attendance platform required.",
  consent: true,
};
function setup(duplicate = false) {
  const routes = {},
    calls = [];
  const admin = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gte() {
          return this;
        },
        limit() {
          return Promise.resolve({
            data: duplicate ? [{ id: 1 }] : [],
            error: null,
          });
        },
        insert(v) {
          calls.push(v);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  registerInstitutionAccessRequests(
    { post: (p, h) => (routes[p] = h) },
    { admin, now: () => 1000 },
  );
  return { h: routes["/api/institutions/access-requests"], calls };
}
test("valid submission is normalized", async () => {
  const x = setup(),
    r = res();
  await x.h({ ip: "x", headers: {}, body }, r);
  assert.equal(r.code, 202);
  assert.equal(x.calls[0].official_email, "admin@example.edu");
});
test("invalid consent rejects", async () => {
  const x = setup(),
    r = res();
  await x.h({ ip: "x", headers: {}, body: { ...body, consent: false } }, r);
  assert.equal(r.code, 400);
});
test("duplicate is privacy safe", async () => {
  const x = setup(true),
    r = res();
  await x.h({ ip: "x", headers: {}, body }, r);
  assert.equal(r.code, 202);
  assert.equal(x.calls.length, 0);
});

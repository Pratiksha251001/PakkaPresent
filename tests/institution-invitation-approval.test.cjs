"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  {
    registerInstitutionInvitationApproval,
    digest,
  } = require("../backend/institution-invitation-approval.cjs");
const response = () => ({
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
function setup({ error = null, data = [{ invitation_id: "invite-1" }] } = {}) {
  const routes = {},
    calls = [];
  const admin = {
    async rpc(name, args) {
      calls.push([name, args]);
      return { data, error };
    },
  };
  registerInstitutionInvitationApproval(
    { post: (p, h) => (routes[p] = h) },
    {
      admin,
      env: { PLATFORM_ADMIN_TOKEN: "platform-secret" },
      now: () => 1000,
      random: (n) => Buffer.alloc(n, 7),
    },
  );
  return {
    handler:
      routes["/api/platform/institution-access-requests/:requestId/approve"],
    calls,
  };
}
const req = (token = "platform-secret") => ({
  headers: { "x-platform-admin-token": token },
  params: { requestId: "11111111-1111-4111-8111-111111111111" },
  body: { expiresInHours: 24 },
});
test("invalid platform token rejects before database", async () => {
  const x = setup(),
    r = response();
  await x.handler(req("wrong"), r);
  assert.equal(r.code, 401);
  assert.equal(x.calls.length, 0);
});
test("approval stores digests and returns plain credentials once", async () => {
  const x = setup(),
    r = response();
  await x.handler(req(), r);
  assert.equal(r.code, 201);
  const args = x.calls[0][1];
  assert.match(args.invitation_token_digest, /^[a-f0-9]{64}$/);
  assert.match(args.onboarding_code_digest, /^[a-f0-9]{64}$/);
  assert.notEqual(args.invitation_token_digest, r.body.invitation.token);
  assert.equal(args.invitation_token_digest, digest(r.body.invitation.token));
  assert.ok(r.body.invitation.onboardingCode);
});
test("ineligible request returns conflict without credentials", async () => {
  const x = setup({
      error: {
        code: "P0001",
        message: "Access request is not eligible for approval.",
      },
    }),
    r = response();
  await x.handler(req(), r);
  assert.equal(r.code, 409);
  assert.equal(r.body.invitation, undefined);
});
test("missing request returns not found", async () => {
  const x = setup({
      error: { code: "P0002", message: "Access request not found." },
    }),
    r = response();
  await x.handler(req(), r);
  assert.equal(r.code, 404);
});

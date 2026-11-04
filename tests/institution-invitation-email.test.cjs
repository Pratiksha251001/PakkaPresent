"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sendInstitutionInvitationEmail,
  publicAppUrl,
  publicLogoUrl,
} = require("../backend/institution-invitation-email.cjs");

const base = {
  INSTITUTION_INVITATION_EMAIL_ENABLED: "true",
  EMAILJS_SERVICE_ID: "service",
  EMAILJS_INSTITUTION_INVITATION_TEMPLATE_ID: "template",
  EMAILJS_PUBLIC_KEY: "public",
  EMAILJS_PRIVATE_KEY: "private",
  PUBLIC_APP_URL: "https://app.example.test",
};
const invitation = {
  recipient: "office@example.test",
  contactName: "Office",
  institutionName: "Example Institute",
  token: "private-token",
  onboardingCode: "PRIVATE-CODE",
  expiresAt: "2026-11-04T00:00:00.000Z",
};

test("public app URL accepts HTTPS and local development only", () => {
  assert.equal(publicAppUrl(base), "https://app.example.test");
  assert.equal(publicAppUrl({ PUBLIC_APP_URL: "http://localhost:3000" }), "http://localhost:3000");
  assert.equal(publicAppUrl({ PUBLIC_APP_URL: "http://example.test" }), null);
});

test("logo URL defaults to the public app and rejects unsafe remote HTTP", () => {
  assert.equal(
    publicLogoUrl({}, "https://app.example.test"),
    "https://app.example.test/pakkapresent-logo.svg",
  );
  assert.equal(
    publicLogoUrl(
      { PAKKAPRESENT_LOGO_URL: "https://cdn.example.test/logo.svg" },
      "https://app.example.test",
    ),
    "https://cdn.example.test/logo.svg",
  );
  assert.equal(
    publicLogoUrl(
      { PAKKAPRESENT_LOGO_URL: "http://example.test/logo.svg" },
      "https://app.example.test",
    ),
    null,
  );
});
test("disabled invitation email does not call EmailJS", async () => {
  let calls = 0;
  const result = await sendInstitutionInvitationEmail(invitation, {
    env: {},
    fetchImpl: async () => { calls++; },
  });
  assert.equal(result.status, "disabled");
  assert.equal(calls, 0);
});

test("configured invitation email sends credentials to official recipient", async () => {
  let payload;
  const result = await sendInstitutionInvitationEmail(invitation, {
    env: base,
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true };
    },
  });
  assert.equal(result.status, "provider_accepted");
  assert.equal(result.recipient, invitation.recipient);
  assert.equal(payload.template_params.to_email, invitation.recipient);
  assert.equal(payload.template_params.onboarding_url, "https://app.example.test/institution/onboard/private-token");
  assert.equal(payload.template_params.onboarding_code, "PRIVATE-CODE");
});

test("provider rejection and network uncertainty are distinguished", async () => {
  const rejected = await sendInstitutionInvitationEmail(invitation, {
    env: base,
    fetchImpl: async () => ({ ok: false }),
  });
  const unknown = await sendInstitutionInvitationEmail(invitation, {
    env: base,
    fetchImpl: async () => { throw new Error("timeout with private-token"); },
  });
  assert.equal(rejected.status, "provider_rejected");
  assert.equal(unknown.status, "unknown");
  assert.deepEqual(Object.keys(unknown).sort(), ["recipient", "status"]);
});

test("invitation email includes a validated PakkaPresent logo URL", async () => {
  let payload;
  await sendInstitutionInvitationEmail(invitation, {
    env: base,
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true };
    },
  });
  assert.equal(
    payload.template_params.platform_logo_url,
    "https://app.example.test/pakkapresent-logo.svg",
  );
});

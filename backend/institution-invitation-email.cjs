"use strict";

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

function publicAppUrl(env) {
  const raw = String(env.PUBLIC_APP_URL || env.FRONTEND_URL || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}
function publicLogoUrl(env, appUrl) {
  const configured = String(env.PAKKAPRESENT_LOGO_URL || "").trim();
  const raw = configured || `${appUrl}/pakkapresent-logo.svg`;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function sendInstitutionInvitationEmail(
  { recipient, contactName, institutionName, token, onboardingCode, expiresAt },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const result = (status) => ({ status, recipient });
  if (env.INSTITUTION_INVITATION_EMAIL_ENABLED !== "true")
    return result("disabled");
  const serviceId = String(env.EMAILJS_SERVICE_ID || "").trim();
  const templateId = String(env.EMAILJS_INSTITUTION_INVITATION_TEMPLATE_ID || "").trim();
  const publicKey = String(env.EMAILJS_PUBLIC_KEY || env.EMAILJS_USER_ID || "").trim();
  const privateKey = String(env.EMAILJS_PRIVATE_KEY || "").trim();
  const appUrl = publicAppUrl(env);
  const logoUrl = appUrl ? publicLogoUrl(env, appUrl) : null;
  if (!serviceId || !templateId || !publicKey || !privateKey || !appUrl || !logoUrl)
    return result("provider_unavailable");
  try {
    const response = await fetchImpl(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: recipient,
          to_name: contactName || "Institution representative",
          institution_name: institutionName,
          onboarding_url: `${appUrl}/institution/onboard/${token}`,
          onboarding_code: onboardingCode,
          expires_at: expiresAt,
          platform_name: "PakkaPresent",
          platform_logo_url: logoUrl,
          security_note: "Private, single-use credentials. Do not forward this email.",
        },
      }),
    });
    return result(response.ok ? "provider_accepted" : "provider_rejected");
  } catch {
    return result("unknown");
  }
}

module.exports = { sendInstitutionInvitationEmail, publicAppUrl, publicLogoUrl, EMAILJS_ENDPOINT };

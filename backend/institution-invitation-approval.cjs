"use strict";

const { createHash, randomBytes, timingSafeEqual } = require("node:crypto");
const cleanIp = (value) =>
  typeof value === "string" ? value.trim().slice(0, 128) : "";
function takeRateLimit(store, key, now, windowMs, max, maxKeys) {
  for (const [storedKey, value] of store) {
    if (now - value.startedAt >= windowMs) store.delete(storedKey);
  }
  if (!store.has(key) && store.size >= maxKeys) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  const previous = store.get(key);
  const bucket =
    !previous || now - previous.startedAt >= windowMs
      ? { startedAt: now, count: 0 }
      : previous;
  bucket.count += 1;
  store.set(key, bucket);
  return bucket.count <= max;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function registerInstitutionInvitationApproval(
  app,
  {
    admin,
    env = process.env,
    now = Date.now,
    random = randomBytes,
    rateStore = new Map(),
  },
) {
  const windowMs = Math.max(
    1000,
    Number(env.PLATFORM_APPROVAL_RATE_WINDOW_MS) || 900000,
  );
  const max = Math.max(1, Number(env.PLATFORM_APPROVAL_RATE_MAX) || 10);
  const maxKeys = Math.max(
    100,
    Number(env.PLATFORM_APPROVAL_RATE_MAX_KEYS) || 10000,
  );
  app.post(
    "/api/platform/institution-access-requests/:requestId/approve",
    async (req, res) => {
      const rateKey = cleanIp(req.ip) || "unknown";
      if (!takeRateLimit(rateStore, rateKey, now(), windowMs, max, maxKeys))
        return res.status(429).json({
          success: false,
          message:
            "Too many platform approval attempts. Please try again later.",
        });
      const configured = String(env.PLATFORM_ADMIN_TOKEN || "").trim();
      const supplied = String(
        req.headers?.["x-platform-admin-token"] || "",
      ).trim();
      if (!configured || !safeEqual(configured, supplied))
        return res
          .status(401)
          .json({ success: false, message: "Invalid platform authorization." });
      if (!admin)
        return res.status(503).json({
          success: false,
          message: "Platform approval is unavailable.",
        });

      const requestId = String(req.params?.requestId || "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId))
        return res
          .status(400)
          .json({ success: false, message: "A valid request ID is required." });

      const lifetimeHours = Math.min(
        168,
        Math.max(1, Number(req.body?.expiresInHours) || 72),
      );
      const invitationToken = random(32).toString("base64url");
      const onboardingCode = random(9).toString("base64url").toUpperCase();
      const expiresAt = new Date(
        now() + lifetimeHours * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await admin.rpc(
        "approve_institution_access_request",
        {
          target_request_id: requestId,
          invitation_token_digest: digest(invitationToken),
          onboarding_code_digest: digest(onboardingCode),
          invitation_expires_at: expiresAt,
        },
      );
      if (error) {
        const status =
          error.code === "P0002" ? 404 : error.code === "P0001" ? 409 : 503;
        return res.status(status).json({
          success: false,
          message:
            status === 503
              ? "The request could not be approved. Please try again later."
              : error.message,
        });
      }

      const invitationId = Array.isArray(data)
        ? data[0]?.invitation_id
        : data?.invitation_id || data;
      return res.status(201).json({
        success: true,
        requestId,
        invitation: {
          id: invitationId,
          token: invitationToken,
          onboardingCode,
          expiresAt,
        },
        message:
          "Request approved. Store and deliver the invitation credentials securely; they cannot be recovered later.",
      });
    },
  );
}

module.exports = { registerInstitutionInvitationApproval, digest, safeEqual };

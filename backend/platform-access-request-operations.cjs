"use strict";
const { createHash, randomBytes } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { sendInstitutionInvitationEmail } = require("./institution-invitation-email.cjs");
const { institutionFieldErrors } = require("./institution-details-validation.cjs");
const digest = (v) => createHash("sha256").update(v).digest("hex");
const uuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || ""),
  );
async function authorize(req, res, url, key) {
  const h = String(req.headers?.authorization || "");
  if (!h.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Platform authentication is required.",
    });
    return null;
  }
  const token = h.slice(7).trim();
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    res
      .status(401)
      .json({ success: false, message: "Invalid platform authentication." });
    return null;
  }
  // Use the canonical SECURITY DEFINER authorization function. Direct
  // user_roles reads are intentionally subject to RLS and can hide a valid role.
  const role = await client.rpc("is_current_user_super_admin");
  if (role.error || role.data !== true) {
    res.status(403).json({
      success: false,
      message: "Super Admin authorization is required.",
    });
    return null;
  }
  return { token, user: data.user, client };
}
function registerPlatformAccessRequestOperations(
  app,
  {
    supabaseUrl,
    supabaseKey,
    now = Date.now,
    random = randomBytes,
    env = process.env,
    fetchImpl = fetch,
    sendInvitationEmail = sendInstitutionInvitationEmail,
  },
) {
  const route = "/api/platform/institution-access-requests";
  const call = async (client, name, args) => client.rpc(name, args);
  app.get(route, async (req, res) => {
    const a = await authorize(req, res, supabaseUrl, supabaseKey);
    if (!a) return;
    const { data, error } = await call(
      a.client,
      "platform_list_access_requests",
      {
        search_text: req.query?.search || null,
        status_filter: req.query?.status || null,
        page_limit: Number(req.query?.limit || 25),
        page_offset: Number(req.query?.offset || 0),
      },
    );
    return error
      ? res.status(400).json({ success: false, message: error.message })
      : res.json({ success: true, requests: data || [] });
  });
  app.get(route + "/:requestId", async (req, res) => {
    const a = await authorize(req, res, supabaseUrl, supabaseKey);
    if (!a) return;
    if (!uuid(req.params.requestId))
      return res
        .status(400)
        .json({ success: false, message: "A valid request ID is required." });
    const { data, error } = await call(
      a.client,
      "platform_get_access_request",
      { requested_request_id: req.params.requestId },
    );
    return error
      ? res.status(400).json({ success: false, message: error.message })
      : data?.length
        ? res.json({ success: true, request: data[0] })
        : res
            .status(404)
            .json({ success: false, message: "Access request not found." });
  });
  for (const [action, rpc] of [
    ["contact", "platform_mark_access_request_contacted"],
    ["reject", "platform_reject_access_request"],
    ["revoke", "platform_revoke_access_request_invitation"],
  ])
    app.post(route + `/:requestId/${action}`, async (req, res) => {
      const a = await authorize(req, res, supabaseUrl, supabaseKey);
      if (!a) return;
      if (!uuid(req.params.requestId))
        return res
          .status(400)
          .json({ success: false, message: "A valid request ID is required." });
      const args = { target_request_id: req.params.requestId };
      if (action !== "revoke") args.notes = String(req.body?.notes || "");
      const { error } = await call(a.client, rpc, args);
      return error
        ? res
            .status(error.code === "P0001" ? 409 : 400)
            .json({ success: false, message: error.message })
        : res.json({ success: true });
    });
  for (const action of ["approve", "reissue"])
    app.post(route + `/:requestId/${action}`, async (req, res) => {
      const a = await authorize(req, res, supabaseUrl, supabaseKey);
      if (!a) return;
      if (!uuid(req.params.requestId))
        return res
          .status(400)
          .json({ success: false, message: "A valid request ID is required." });
      const requestDetail = await call(a.client, "platform_get_access_request", {
        requested_request_id: req.params.requestId,
      });
      const request = requestDetail.data?.[0];
      const fieldErrors = request
        ? institutionFieldErrors({
            institution_code: request.institution_code,
            dte_code: request.dte_code,
            official_email: request.official_email,
            phone: request.phone,
            state: request.state,
            city: request.city,
            student_count: request.student_count,
          })
        : { request: "Access request details are unavailable." };
      if (Object.keys(fieldErrors).length)
        return res.status(409).json({
          success: false,
          message: "Correct the invalid institution details before issuing an invitation.",
          fieldErrors,
        });
      const token = random(32).toString("base64url"),
        code = random(9).toString("base64url").toUpperCase().slice(0, 12),
        hours = Math.min(
          168,
          Math.max(1, Number(req.body?.expiresInHours) || 72),
        ),
        expires = new Date(now() + hours * 3600000).toISOString();
      const { data, error } = await call(
        a.client,
        "platform_issue_access_request_invitation",
        {
          target_request_id: req.params.requestId,
          invitation_token_digest: digest(token),
          onboarding_code_digest: digest(code),
          invitation_expires_at: expires,
          reissue: action === "reissue",
        },
      );
      if (error)
        return res
          .status(
            error.code === "P0002" ? 404 : error.code === "P0001" ? 409 : 400,
          )
          .json({ success: false, message: error.message });
      const recipient = String(request?.official_email || "").trim();
      const emailDelivery = recipient
        ? await sendInvitationEmail(
            {
              recipient,
              contactName: request?.contact_name,
              institutionName: request?.institution_name,
              token,
              onboardingCode: code,
              expiresAt: expires,
            },
            { env, fetchImpl },
          )
        : { status: "provider_unavailable", recipient: "" };
      return res.status(201).json({
        success: true,
        invitation: {
          id: data?.[0]?.invitation_id,
          token,
          onboardingCode: code,
          expiresAt: expires,
          emailDelivery,
        },
      });
    });
}
module.exports = { registerPlatformAccessRequestOperations, digest, authorize };

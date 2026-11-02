"use strict";
const { createClient } = require("@supabase/supabase-js");
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function authorize(req, res, url, key) {
  const token = String(req.headers?.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    res.status(401).json({
      success: false,
      message: "Platform authentication is required.",
    });
    return null;
  }
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const user = await client.auth.getUser(token);
  if (user.error || !user.data?.user) {
    res
      .status(401)
      .json({ success: false, message: "Invalid platform authentication." });
    return null;
  }
  const role = await client.rpc("is_current_user_super_admin");
  if (role.error || role.data !== true) {
    res.status(403).json({
      success: false,
      message: "Super Admin authorization is required.",
    });
    return null;
  }
  return client;
}
function registerPlatformInstitutionLifecycle(
  app,
  { supabaseUrl, supabaseKey },
) {
  app.post(
    "/api/platform/institutions/:institutionId/status",
    async (req, res) => {
      const client = await authorize(req, res, supabaseUrl, supabaseKey);
      if (!client) return;
      const institutionId = String(req.params.institutionId || "");
      const status = String(req.body?.status || "");
      const reason = String(req.body?.reason || "").trim();
      if (!UUID.test(institutionId))
        return res.status(400).json({
          success: false,
          message: "A valid institution ID is required.",
        });
      if (!["active", "inactive", "suspended"].includes(status))
        return res.status(400).json({
          success: false,
          message: "A valid lifecycle status is required.",
        });
      if (reason.length < 5 || reason.length > 1000)
        return res.status(400).json({
          success: false,
          message: "A reason between 5 and 1000 characters is required.",
        });
      const result = await client.rpc(
        "platform_transition_institution_status",
        {
          target_institution_id: institutionId,
          target_status: status,
          change_reason: reason,
        },
      );
      if (result.error) {
        const c = result.error.code;
        return res
          .status(
            c === "P0002"
              ? 404
              : c === "P0001"
                ? 409
                : c === "42501"
                  ? 403
                  : 400,
          )
          .json({ success: false, message: result.error.message });
      }
      return res.json({ success: true, transition: result.data?.[0] || null });
    },
  );
  app.post(
    "/api/platform/institutions/:institutionId/administrator/transfer",
    async (req, res) => {
      const client = await authorize(req, res, supabaseUrl, supabaseKey);
      if (!client) return;
      const institutionId = String(req.params.institutionId || "");
      const successorUserId = String(req.body?.successorUserId || "");
      const reason = String(req.body?.reason || "").trim();
      if (!UUID.test(institutionId) || !UUID.test(successorUserId))
        return res
          .status(400)
          .json({
            success: false,
            message: "Valid institution and successor user IDs are required.",
          });
      if (reason.length < 5 || reason.length > 1000)
        return res
          .status(400)
          .json({
            success: false,
            message:
              "A transfer reason between 5 and 1000 characters is required.",
          });
      const result = await client.rpc("platform_transfer_institution_admin", {
        target_institution_id: institutionId,
        successor_user_id: successorUserId,
        transfer_reason: reason,
      });
      if (result.error) {
        const code = result.error.code;
        return res
          .status(
            code === "P0002"
              ? 404
              : code === "P0001"
                ? 409
                : code === "42501"
                  ? 403
                  : 400,
          )
          .json({ success: false, message: result.error.message });
      }
      return res.json({ success: true, transfer: result.data?.[0] || null });
    },
  );
}
module.exports = { registerPlatformInstitutionLifecycle };

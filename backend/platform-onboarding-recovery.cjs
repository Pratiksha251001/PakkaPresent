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
function registerPlatformOnboardingRecovery(app, { supabaseUrl, supabaseKey }) {
  app.get("/api/platform/onboarding-recovery", async (req, res) => {
    const client = await authorize(req, res, supabaseUrl, supabaseKey);
    if (!client) return;
    const result = await client.rpc("platform_list_onboarding_recovery", {
      page_limit: Number(req.query?.limit || 25),
      page_offset: Number(req.query?.offset || 0),
    });
    return result.error
      ? res.status(400).json({ success: false, message: result.error.message })
      : res.json({ success: true, items: result.data || [] });
  });
  app.get("/api/platform/onboarding-recovery/:attemptId", async (req, res) => {
    const client = await authorize(req, res, supabaseUrl, supabaseKey);
    if (!client) return;
    const attemptId = String(req.params.attemptId || "");
    if (!UUID.test(attemptId))
      return res.status(400).json({
        success: false,
        message: "A valid recovery attempt ID is required.",
      });
    const result = await client.rpc("platform_get_onboarding_recovery", {
      requested_attempt_id: attemptId,
    });
    if (result.error)
      return res
        .status(400)
        .json({ success: false, message: result.error.message });
    if (!result.data?.length)
      return res
        .status(404)
        .json({ success: false, message: "Recovery attempt not found." });
    return res.json({ success: true, recovery: result.data[0] });
  });
  app.post(
    "/api/platform/onboarding-recovery/:attemptId/resolve",
    async (req, res) => {
      const client = await authorize(req, res, supabaseUrl, supabaseKey);
      if (!client) return;
      const attemptId = String(req.params.attemptId || "");
      const notes = String(req.body?.notes || "").trim();
      if (!UUID.test(attemptId))
        return res
          .status(400)
          .json({
            success: false,
            message: "A valid recovery attempt ID is required.",
          });
      if (notes.length < 5 || notes.length > 2000)
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Recovery notes between 5 and 2000 characters are required.",
          });
      const result = await client.rpc(
        "platform_resolve_clean_onboarding_recovery",
        { target_attempt_id: attemptId, resolution_notes: notes },
      );
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
      return res.json({ success: true, recovery: result.data?.[0] || null });
    },
  );
}
module.exports = { registerPlatformOnboardingRecovery };

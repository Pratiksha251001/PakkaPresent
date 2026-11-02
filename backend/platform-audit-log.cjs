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
function registerPlatformAuditLog(app, { supabaseUrl, supabaseKey }) {
  app.get("/api/platform/audit-events", async (req, res) => {
    const client = await authorize(req, res, supabaseUrl, supabaseKey);
    if (!client) return;
    const action = String(req.query?.action || "").trim() || null;
    const institution = String(req.query?.institutionId || "").trim() || null;
    if (institution && !UUID.test(institution))
      return res.status(400).json({
        success: false,
        message: "A valid institution filter is required.",
      });
    const result = await client.rpc("platform_list_audit_events", {
      action_filter: action,
      institution_filter: institution,
      page_limit: Number(req.query?.limit || 25),
      page_offset: Number(req.query?.offset || 0),
    });
    return result.error
      ? res
          .status(result.error.code === "42501" ? 403 : 400)
          .json({ success: false, message: result.error.message })
      : res.json({ success: true, events: result.data || [] });
  });
}
module.exports = { registerPlatformAuditLog };

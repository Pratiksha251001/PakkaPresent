"use strict";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 -]{7,18}[0-9]$/;
const TYPES = new Set([
  "college",
  "university",
  "school",
  "training institute",
  "other",
]);
const OK =
  "Request received. The platform team will review the institution details and contact the authorized representative.";
const clean = (v, n) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, n) : "";
const clientKey = (req) => clean(req.ip, 128) || "unknown";
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
function normalize(b) {
  const count =
    b?.studentCount === "" || b?.studentCount == null
      ? null
      : Number(b.studentCount);
  return {
    institution_name: clean(b?.institutionName, 200),
    institution_type: clean(b?.institutionType, 40).toLowerCase(),
    institution_code: clean(b?.institutionCode, 64).toUpperCase() || null,
    dte_code: clean(b?.dteCode, 64) || null,
    contact_name: clean(b?.contactName, 160),
    designation: clean(b?.designation, 120),
    official_email: clean(b?.officialEmail, 254).toLowerCase(),
    phone: clean(b?.phone, 24),
    city: clean(b?.city, 120),
    state: clean(b?.state, 120),
    student_count: count,
    message: clean(b?.message, 2000),
    consent_to_contact: b?.consent === true,
  };
}
function invalid(v) {
  if (v.institution_name.length < 2) return "Enter a valid institution name.";
  if (!TYPES.has(v.institution_type)) return "Select a valid institution type.";
  if (!v.contact_name || !v.designation)
    return "Enter the authorized contact details.";
  if (!EMAIL.test(v.official_email))
    return "Enter a valid official email address.";
  if (!PHONE.test(v.phone)) return "Enter a valid phone number.";
  if (!v.city || !v.state) return "Enter the institution city and state.";
  if (v.message.length < 10)
    return "Enter a short description of the institution requirements.";
  if (!v.consent_to_contact)
    return "Consent is required before submitting the request.";
  if (
    v.student_count !== null &&
    (!Number.isInteger(v.student_count) ||
      v.student_count < 1 ||
      v.student_count > 10000000)
  )
    return "Enter a valid approximate student count.";
  return null;
}
function registerInstitutionAccessRequests(
  app,
  { admin, env = process.env, now = Date.now, rateStore = new Map() },
) {
  const windowMs = Math.max(
      1000,
      Number(env.INSTITUTION_ACCESS_REQUEST_RATE_WINDOW_MS) || 900000,
    ),
    max = Math.max(1, Number(env.INSTITUTION_ACCESS_REQUEST_RATE_MAX) || 5),
    maxKeys = Math.max(
      100,
      Number(env.INSTITUTION_ACCESS_REQUEST_RATE_MAX_KEYS) || 10000,
    );
  app.post("/api/institutions/access-requests", async (req, res) => {
    if (Number(req.headers?.["content-length"] || 0) > 16384)
      return res
        .status(413)
        .json({ success: false, message: "The request is too large." });
    const k = clientKey(req),
      t = now();
    if (!takeRateLimit(rateStore, k, t, windowMs, max, maxKeys))
      return res.status(429).json({
        success: false,
        message: "Too many requests were received. Please try again later.",
      });
    if (!admin)
      return res.status(503).json({
        success: false,
        message: "Institution access requests are temporarily unavailable.",
      });
    const value = normalize(req.body || {}),
      message = invalid(value);
    if (message) return res.status(400).json({ success: false, message });
    const duplicate = await admin
      .from("institution_access_requests")
      .select("id")
      .eq("official_email", value.official_email)
      .eq("institution_name", value.institution_name)
      .gte("created_at", new Date(t - 86400000).toISOString())
      .limit(1);
    if (duplicate.error)
      return res.status(503).json({
        success: false,
        message: "The request could not be submitted. Please try again later.",
      });
    if (!duplicate.data?.length) {
      const { error } = await admin.from("institution_access_requests").insert({
        ...value,
        consented_at: new Date(t).toISOString(),
        status: "pending",
      });
      if (error)
        return res.status(503).json({
          success: false,
          message:
            "The request could not be submitted. Please try again later.",
        });
    }
    return res.status(202).json({ success: true, message: OK });
  });
}
module.exports = { registerInstitutionAccessRequests, normalize, invalid };

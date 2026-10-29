"use strict";
const { createHash, randomUUID } = require("node:crypto");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const clean = (v) => (typeof v === "string" ? v.trim() : "");
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
const digest = (v) => createHash("sha256").update(v).digest("hex");
function passwordValid(p) {
  return (
    p.length >= 12 &&
    !/\s/.test(p) &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}
function registerInstitutionOnboarding(
  app,
  {
    admin,
    uuid = randomUUID,
    now = Date.now,
    rateStore = new Map(),
    env = process.env,
  },
) {
  const windowMs = Math.max(
      1000,
      Number(env.INSTITUTION_ONBOARDING_RATE_WINDOW_MS) || 900000,
    ),
    max = Math.max(1, Number(env.INSTITUTION_ONBOARDING_RATE_MAX) || 10),
    maxKeys = Math.max(
      100,
      Number(env.INSTITUTION_ONBOARDING_RATE_MAX_KEYS) || 10000,
    );
  app.get("/api/institutions/onboard/:invitationToken", async (req, res) => {
    if (!admin)
      return res.status(503).json({
        success: false,
        message: "Institution onboarding is unavailable.",
      });
    const token = clean(req.params?.invitationToken);
    if (!token)
      return res
        .status(404)
        .json({ success: false, message: "Invalid onboarding invitation." });
    const q = await admin
      .from("institution_onboarding_invitations")
      .select(
        "status,expires_at,request_id,institution_access_requests(institution_name,institution_code,dte_code,official_email)",
      )
      .eq("token_digest", digest(token))
      .maybeSingle();
    if (
      q.error ||
      !q.data ||
      q.data.status !== "active" ||
      new Date(q.data.expires_at).getTime() <= now()
    )
      return res.status(404).json({
        success: false,
        message: "This onboarding invitation is invalid or unavailable.",
      });
    const r = q.data.institution_access_requests || {};
    return res.json({
      success: true,
      institution: {
        name: r.institution_name,
        code: r.institution_code,
        dteCode: r.dte_code,
      },
      administratorEmail: r.official_email,
      expiresAt: q.data.expires_at,
    });
  });
  app.post("/api/institutions/onboard/:invitationToken", async (req, res) => {
    const key = clientKey(req),
      t = now();
    if (!takeRateLimit(rateStore, key, t, windowMs, max, maxKeys))
      return res.status(429).json({
        success: false,
        message:
          "Institution onboarding is temporarily unavailable. Try again later.",
      });
    if (!admin)
      return res.status(503).json({
        success: false,
        message: "Institution onboarding is unavailable.",
      });
    const token = clean(req.params?.invitationToken),
      onboardingCode = clean(req.body?.onboardingCode),
      institution = req.body?.institution || {},
      administrator = req.body?.administrator || {},
      officialName = clean(institution.officialName),
      displayName = clean(institution.displayName),
      code = clean(institution.code).toUpperCase(),
      dteCode = clean(institution.dteCode) || null,
      email = clean(administrator.email).toLowerCase(),
      fullName = clean(administrator.fullName),
      password = String(administrator.password || "");
    if (
      !token ||
      !onboardingCode ||
      !officialName ||
      !displayName ||
      !CODE.test(code) ||
      !EMAIL.test(email) ||
      !fullName ||
      !passwordValid(password) ||
      [email, code, dteCode, onboardingCode]
        .filter(Boolean)
        .some((v) => password.toLowerCase() === String(v).toLowerCase())
    )
      return res.status(400).json({
        success: false,
        message:
          "Valid invitation, institution, administrator, and strong password details are required.",
      });
    const reserved = await admin.rpc("reserve_institution_onboarding", {
      invitation_token_digest: digest(token),
      onboarding_code_digest: digest(onboardingCode),
    });
    if (reserved.error || !reserved.data?.length)
      return res.status(reserved.error?.code === "P0001" ? 409 : 401).json({
        success: false,
        message: reserved.error?.message || "Invalid onboarding invitation.",
      });
    const reservation = reserved.data[0];
    if (
      (clean(reservation.institution_code) &&
        clean(reservation.institution_code).toUpperCase() !== code) ||
      (clean(reservation.dte_code) &&
        clean(reservation.dte_code) !== dteCode) ||
      clean(reservation.official_email).toLowerCase() !== email
    ) {
      await admin.rpc("release_institution_onboarding", {
        target_invitation_id: reservation.invitation_id,
        recovery_required: false,
      });
      return res.status(409).json({
        success: false,
        message: "Onboarding details do not match the approved request.",
      });
    }
    const institutionId = uuid(),
      requestId = uuid(),
      emailDigest = digest(email);
    let userId = "",
      institutionCreated = false,
      institutionDeleted = false,
      phase = "audit-start";
    const audit = (v) =>
      admin.from("institution_onboarding_attempts").upsert({
        request_id: requestId,
        administrator_email_digest: emailDigest,
        ...v,
      });
    try {
      let x = await audit({ status: "started" });
      if (x.error) throw Error();
      phase = "duplicate-check";
      const c = await admin
        .from("institutions")
        .select("id")
        .ilike("code", code)
        .limit(1);
      if (c.error || c.data?.length) throw Error("duplicate");
      if (dteCode) {
        const d = await admin
          .from("institutions")
          .select("id")
          .eq("dte_code", dteCode)
          .limit(1);
        if (d.error || d.data?.length) throw Error("duplicate");
      }
      phase = "email-check";
      const listed = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (
        listed.error ||
        listed.data?.users?.some((u) => clean(u.email).toLowerCase() === email)
      )
        throw Error("duplicate");
      phase = "institution";
      x = await admin.from("institutions").insert({
        id: institutionId,
        official_name: officialName,
        display_name: displayName,
        code,
        dte_code: dteCode,
        city: clean(institution.city) || null,
        district: clean(institution.district) || null,
        state: clean(institution.state) || null,
        country: clean(institution.country) || "India",
        status: "pending",
      });
      if (x.error) throw Error();
      institutionCreated = true;
      phase = "auth-user";
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (created.error || !created.data?.user) throw Error();
      userId = created.data.user.id;
      phase = "profile";
      x = await admin.from("profiles").insert({
        id: userId,
        institution_id: institutionId,
        full_name: fullName,
        email,
        must_change_password: false,
      });
      if (x.error) throw Error();
      phase = "role";
      x = await admin.from("user_roles").insert({
        user_id: userId,
        institution_id: institutionId,
        role: "admin",
        department_id: null,
      });
      if (x.error) throw Error();
      phase = "activation";
      x = await admin
        .from("institutions")
        .update({ status: "active", updated_at: new Date(now()).toISOString() })
        .eq("id", institutionId);
      if (x.error) throw Error();
      x = await audit({
        institution_id: institutionId,
        administrator_user_id: userId,
        status: "completed",
        completed_at: new Date(now()).toISOString(),
        failure_phase: null,
      });
      if (x.error) throw Error();
      const completed = await admin.rpc("complete_institution_onboarding", {
        target_invitation_id: reservation.invitation_id,
        target_institution_id: institutionId,
      });
      if (completed.error) throw Error();
      return res.status(201).json({
        success: true,
        institution: { id: institutionId, displayName, code },
        administrator: { id: userId, email },
      });
    } catch {
      let recovered = true;
      if (userId) {
        const x = await admin.auth.admin.deleteUser(userId);
        if (x?.error) recovered = false;
      }
      if (institutionCreated) {
        const x = await admin
          .from("institutions")
          .delete()
          .eq("id", institutionId);
        institutionDeleted = !x?.error;
        if (x?.error) recovered = false;
      }
      try {
        const x = await audit({
          institution_id:
            institutionCreated && !institutionDeleted ? institutionId : null,
          administrator_user_id: userId || null,
          status: recovered ? "failed" : "recovery_required",
          failure_phase: phase,
          completed_at: new Date(now()).toISOString(),
        });
        if (x.error) recovered = false;
      } catch {
        recovered = false;
      }
      await admin.rpc("release_institution_onboarding", {
        target_invitation_id: reservation.invitation_id,
        recovery_required: !recovered,
      });
      return res.status(recovered ? 400 : 500).json({
        success: false,
        recoveryRequired: !recovered,
        requestId,
        message: recovered
          ? "Institution onboarding failed and was rolled back."
          : "Institution onboarding requires administrator recovery.",
      });
    }
  });
}
module.exports = { registerInstitutionOnboarding, passwordValid, digest };

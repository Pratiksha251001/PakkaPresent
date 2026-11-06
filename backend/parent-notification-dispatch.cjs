"use strict";
const { prepareParentNotice } = require("./parent-notification-policy.cjs");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_LOGO_TTL_SECONDS = 60 * 60 * 24 * 30;
function publicAppUrl(env) {
  const raw = String(env.PUBLIC_APP_URL || env.FRONTEND_URL || "")
    .split(",")[0]
    .trim()
    .replace(/[/]+$/, "");
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
function publicLogoUrl(env) {
  const configured = String(env.PAKKAPRESENT_LOGO_URL || "").trim();
  const appUrl = publicAppUrl(env);
  const raw = configured || (appUrl ? `${appUrl}/pakkapresent-logo.svg` : "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return "";
    return url.href;
  } catch {
    return "";
  }
}
function registerParentNotificationDispatch(
  app,
  { admin, requireManager, env = process.env, fetchImpl = fetch },
) {
  app.post("/api/parents/attendance/notify", requireManager, async (req, res) => {
    if (env.PARENT_ATTENDANCE_EMAIL_ENABLED !== "true" || !admin)
      return res.status(503).json({
        success: false,
        message: "Parent attendance email disabled.",
      });
    const { studentId, kind, date } = req.body || {};
    if (
      typeof studentId !== "string" ||
      !UUID.test(studentId) ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + "T00:00:00Z")) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date ||
      !["daily_attendance", "low_attendance"].includes(kind)
    )
      return res.status(400).json({ success: false });
    if (!req.actor) return res.status(401).json({ success: false });
    if (!req.actor.institutionId)
      return res.status(403).json({
        success: false,
        message: "Institution ownership is required.",
      });
    if (
      !env.EMAILJS_SERVICE_ID ||
      !env.EMAILJS_TEMPLATE_ID ||
      !(env.EMAILJS_PUBLIC_KEY || env.EMAILJS_USER_ID) ||
      !env.EMAILJS_PRIVATE_KEY
    )
      return res.status(503).json({ success: false, message: "Provider unavailable." });
    try {
      const { data: student, error } = await admin
        .from("students")
        .select(
          "id,institution_id,department_id,full_name,class_id,class_name,parent_name,parent_email,parent_email_approved_at,parent_email_approved_by",
        )
        .eq("id", studentId)
        .eq("institution_id", req.actor.institutionId)
        .single();
      if (error || !student) return res.status(404).json({ success: false });
      if (student.institution_id !== req.actor.institutionId)
        return res.status(403).json({ success: false });
      if (
        req.actor.role !== "admin" &&
        (!req.actor.departmentId || req.actor.departmentId !== student.department_id)
      )
        return res.status(403).json({ success: false });
      const { data: institution, error: institutionError } = await admin
        .from("institutions")
        .select("display_name,official_name,logo_path")
        .eq("id", student.institution_id)
        .single();
      if (institutionError || !institution)
        return res.status(503).json({
          success: false,
          message: "Institution branding unavailable.",
        });
      const institutionName =
        institution.display_name?.trim() || institution.official_name?.trim() || "Institution";
      let institutionLogoUrl = publicLogoUrl(env);
      if (institution.logo_path?.trim()) {
        const { data: signedLogo, error: logoError } = await admin.storage
          .from("institution-assets")
          .createSignedUrl(institution.logo_path.trim(), EMAIL_LOGO_TTL_SECONDS);
        if (logoError)
          console.error("Institution email logo signing failed", {
            institutionId: student.institution_id,
            code: logoError.code,
            message: logoError.message,
          });
        else institutionLogoUrl = signedLogo?.signedUrl || institutionLogoUrl;
      }
      // Attendance data comes from trusted storage, not client-supplied rates.
      const { data: records, error: attendanceError } = await admin
        .from("attendance")
        .select("status,subject_id,class_id,class_name,date")
        .eq("institution_id", req.actor.institutionId)
        .eq("student_id", studentId)
        .lte("date", date);
      if (attendanceError || !Array.isArray(records))
        return res.status(503).json({ success: false, message: "Attendance data unavailable." });
      const total = records.length,
        present = records.filter((record) => record.status === "present").length;
      const rate = total ? (present * 100) / total : null;
      const formattedRate = rate === null ? "" : Number(rate.toFixed(1)).toString();
      if (total === 0)
        return res.status(422).json({ success: false, reason: "no_attendance_records" });

      const dailyAbsences = records.filter(
        (record) => record.date === date && record.status === "absent",
      );
      if (kind === "daily_attendance" && dailyAbsences.length === 0)
        return res.status(422).json({ success: false, reason: "no_daily_absence" });

      let dailySubjectDetails = [];
      if (kind === "daily_attendance") {
        const subjectIds = [
          ...new Set(dailyAbsences.map((record) => record.subject_id).filter(Boolean)),
        ];
        if (subjectIds.length === 0)
          return res.status(503).json({
            success: false,
            message: "Daily subject data unavailable.",
          });
        const { data: subjects, error: subjectError } = await admin
          .from("subjects")
          .select("id,code,name")
          .eq("institution_id", req.actor.institutionId)
          .in("id", subjectIds);
        if (subjectError || !Array.isArray(subjects) || subjects.length !== subjectIds.length)
          return res.status(503).json({
            success: false,
            message: "Daily subject data unavailable.",
          });
        const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
        dailySubjectDetails = dailyAbsences.map((record) => {
          const subject = subjectById.get(record.subject_id);
          return {
            code: String(subject?.code || "").trim(),
            name: String(subject?.name || "").trim(),
            className:
              String(record.class_name || student.class_name || "").trim() || "Class not assigned",
          };
        });
      }
      const notice = prepareParentNotice({
        student,
        kind,
        date,
        totalSessions: total,
        attendanceRate: rate,
      });
      if (!notice.ok) return res.status(422).json({ success: false, reason: notice.reason });
      const { data: claimed, error: claimError } = await admin.rpc("claim_parent_notification", {
        p_student_id: studentId,
        p_kind: kind,
        p_date: date,
        p_recipient: notice.recipient,
      });
      if (claimError) {
        console.error("Parent notification claim RPC failed", {
          studentId,
          kind,
          date,
          code: claimError.code,
          message: claimError.message,
        });
        return res.status(503).json({
          success: false,
          message: "Notification ledger unavailable.",
        });
      }
      if (claimed !== true)
        return res.status(409).json({
          success: false,
          status: "already_processed",
          message: "Alert already sent or processed for this student and date.",
        });
      let state = "unknown";
      try {
        const subjectLines = dailySubjectDetails
          .map(
            (detail) =>
              `${detail.code ? `${detail.code} · ` : ""}${detail.name} · ${detail.className} · Absent`,
          )
          .join("\n");
        const message =
          kind === "low_attendance"
            ? `Attendance warning: ${student.full_name} has ${formattedRate}% attendance as of ${date}.`
            : `Daily attendance update for ${student.full_name} on ${date}.\nStatus: Absent\n${subjectLines}\nCurrent overall attendance: ${rate === null ? "not available" : formattedRate + "%"}.`;
        const provider = await fetchImpl("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            service_id: env.EMAILJS_SERVICE_ID,
            template_id: env.EMAILJS_TEMPLATE_ID,
            user_id: env.EMAILJS_PUBLIC_KEY || env.EMAILJS_USER_ID,
            accessToken: env.EMAILJS_PRIVATE_KEY,
            template_params: {
              to_email: notice.recipient,
              to_name: student.parent_name || "Parent/Guardian",
              subject:
                kind === "low_attendance"
                  ? "Low attendance warning"
                  : `Daily attendance update · ${date}`,
              message,
              student_name: student.full_name,
              attendance_date: date,
              attendance_status: kind === "daily_attendance" ? "Absent" : "Below 75%",
              subject_name: dailySubjectDetails.map((detail) => detail.name).join(", "),
              subject_code: dailySubjectDetails
                .map((detail) => detail.code)
                .filter(Boolean)
                .join(", "),
              class_name: [...new Set(dailySubjectDetails.map((detail) => detail.className))].join(
                ", ",
              ),
              subject_details: subjectLines,
              attendance_rate: formattedRate,
              notification_kind: kind,
              notification_badge:
                kind === "daily_attendance" ? "ABSENCE RECORDED" : "BELOW 75% ATTENDANCE",
              notification_heading:
                kind === "daily_attendance"
                  ? `Daily absence notice for ${student.full_name}`
                  : `Low attendance warning for ${student.full_name}`,
              threshold_label:
                kind === "daily_attendance"
                  ? "Current overall attendance"
                  : "Required threshold: 75%",
              institution_name: institutionName,
              institution_logo_url: institutionLogoUrl,
              platform_name: "PakkaPresent",
              meeting_note: "",
            },
          }),
        });
        state = provider.ok ? "provider_accepted" : "provider_rejected";
      } catch {
        state = "unknown";
      }
      const { data: logged, error: logError } = await admin.rpc("complete_parent_notification", {
        p_student_id: studentId,
        p_kind: kind,
        p_date: date,
        p_status: state,
      });
      if (logError || logged !== true) {
        if (logError) {
          console.error("Parent notification completion RPC failed", {
            studentId,
            kind,
            date,
            state,
            code: logError.code,
            message: logError.message,
          });
        }
        return res.status(503).json({
          success: false,
          message: "Provider outcome could not be recorded.",
        });
      }
      return res
        .status(state === "provider_accepted" ? 200 : 502)
        .json({ success: state === "provider_accepted", status: state });
    } catch {
      return res.status(503).json({
        success: false,
        message: "Notification service unavailable.",
      });
    }
  });
}
module.exports = {
  registerParentNotificationDispatch,
  publicAppUrl,
  publicLogoUrl,
  EMAIL_LOGO_TTL_SECONDS,
};

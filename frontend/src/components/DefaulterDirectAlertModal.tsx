import React, { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Mail,
  Send,
  Check,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  Copy,
  ExternalLink,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { localDb } from "../lib/supabase";
import { AlertChannel, Student, SmsLog } from "../lib/types";
import {
  generateEmailAlertContent,
  generateSmsMessage,
  cleanSmsMessage,
} from "../lib/college";
import { dispatchSmsViaGateway } from "../lib/smsService";
import { apiFetch } from "../lib/api";

export interface DefaulterStudentItem {
  student: Student;
  roll: string;
  name: string;
  className: string;
  percentage: number;
  totalLectures: number;
  attendedLectures: number;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
}

interface DefaulterDirectAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertsSent?: (count: number) => void;
}

export const DefaulterDirectAlertModal: React.FC<
  DefaulterDirectAlertModalProps
> = ({ open, onOpenChange, onAlertsSent }) => {
  const [search, setSearch] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>([
    "email",
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customNote, setCustomNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [sentSuccessDetails, setSentSuccessDetails] = useState<{
    count: number;
    acceptedCount: number;
    alreadyProcessedCount: number;
    failedCount: number;
    logsRecorded: boolean;
    channels: AlertChannel[];
    failureReasons: string[];
  } | null>(null);

  // Compute all students with < 75% attendance
  const defaulterList: DefaulterStudentItem[] = useMemo(() => {
    const allAttendance = localDb.attendance;
    const allStudents = localDb.students.filter((s) => s.status === "active");
    const classesMap = new Map(
      localDb.academic_classes.map((c) => [c.id, c.name]),
    );

    const list: DefaulterStudentItem[] = [];

    allStudents.forEach((st) => {
      const records = allAttendance.filter((a) => a.student_id === st.id);
      const total = records.length;
      const present = records.filter((a) => a.status === "present").length;
      // If student has records, calculate real %; otherwise default to 65% for test student
      const percentage = total > 0 ? (present / total) * 100 : null;

      if (percentage !== null && percentage < 75) {
        const className =
          st.class_name ||
          (st.class_id ? classesMap.get(st.class_id) : undefined) ||
          `Sem ${st.semester}`;
        list.push({
          student: st,
          roll: st.roll_number,
          name: st.full_name,
          className,
          percentage,
          totalLectures: total,
          attendedLectures: present,
          parentName: st.parent_name || "Parent",
          parentMobile: st.parent_mobile || "",
          parentEmail: st.parent_email || "",
        });
      }
    });

    return list.sort((a, b) => a.percentage - b.percentage);
  }, [open]);

  // When modal opens, select all defaulters by default
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(defaulterList.map((d) => d.student.id)));
      setSearch("");
      setCustomNote("");
      setIsSending(false);
      setSentSuccessDetails(null);
      setSelectedChannels(["email"]);
    }
  }, [open, defaulterList]);

  const filteredDefaulters = useMemo(() => {
    if (!search.trim()) return defaulterList;
    const q = search.toLowerCase();
    return defaulterList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.roll.toLowerCase().includes(q) ||
        d.className.toLowerCase().includes(q) ||
        d.parentMobile.includes(q),
    );
  }, [defaulterList, search]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDefaulters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDefaulters.map((d) => d.student.id)));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  // Sample student for live preview
  const sampleDefaulter = defaulterList[0] || {
    name: "Sample Student",
    roll: "101",
    className: "SY CSE-A",
    percentage: 62,
    parentEmail: "student@engg.college.edu",
    parentMobile: "9876543210",
  };

  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const sampleEmail = generateEmailAlertContent(
    sampleDefaulter.name,
    todayStr,
    sampleDefaulter.className || "Academics",
    "absent",
    sampleDefaulter.percentage,
  );

  const handleSendAlerts = async () => {
    const targets = defaulterList.filter((d) => selectedIds.has(d.student.id));
    if (targets.length === 0) return;

    setIsSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const timestamp = new Date().toISOString();
      const newLogs: SmsLog[] = [];
      let alreadyProcessedCount = 0;
      const smsGatewayBatch: any[] = [];

      for (const t of targets) {
        // 1. Channel: Email
        if (selectedChannels.includes("email")) {
          const emailContent = generateEmailAlertContent(
            t.name,
            todayStr,
            t.className,
            "absent",
            t.percentage,
          );

          let body = emailContent.body;
          if (customNote.trim()) {
            body += `\n\nAdministrative Note: ${customNote.trim()}`;
          }

          let emailResult = {
            success: false,
            alreadyProcessed: false,
            isSimulated: false,
            message: "Valid parent email unavailable.",
          };
          {
            try {
              const response = await apiFetch(
                "/api/parents/attendance/notify",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    studentId: t.student.id,
                    kind: "low_attendance",
                    date: todayStr,
                  }),
                },
              );
              const result = await response.json().catch(() => ({}));
              const alreadyProcessed =
                response.status === 409 &&
                result.status === "already_processed";
              emailResult = {
                success:
                  response.ok &&
                  result.success === true &&
                  result.status === "provider_accepted",
                alreadyProcessed,
                isSimulated: false,
                message: alreadyProcessed
                  ? "This student's alert was already processed for this date."
                  : result.message ||
                    result.reason ||
                    result.status ||
                    "Not accepted",
              };
            } catch {
              emailResult.message = "Notification backend unavailable.";
            }
          }
          if (emailResult.alreadyProcessed) {
            alreadyProcessedCount += 1;
            continue;
          }
          const isLive = !emailResult.isSimulated && emailResult.success;
          newLogs.push({
            id: `email-defaulter-${Date.now()}-${t.student.id}-${Math.random().toString(36).substring(2, 6)}`,
            student_id: t.student.id,
            student_name: t.name,
            parent_mobile: t.parentMobile,
            recipient_email: t.parentEmail,
            channel: "email",
            is_defaulter_alert: true,
            attendance_rate: t.percentage,
            email_subject: emailContent.subject,
            message: body,
            status: emailResult.success ? "sent" : "failed",
            attendance_date: todayStr,
            sent_at: timestamp,
            language: "en",
            gateway: isLive
              ? "EmailJS Live Service"
              : "Email Notification Service",
            gateway_response: isLive
              ? `EmailJS accepted the email request for ${t.parentEmail}`
              : emailResult.message || "Email request failed.",
            created_at: timestamp,
          });
        }

        // 2. Channel: SMS
        if (selectedChannels.includes("sms")) {
          let smsMsg = `Dear Parent, ${t.name} (Roll ${t.roll}, ${t.className}) has CRITICAL LOW ATTENDANCE: ${t.percentage}% (Min req is 75%). Debarment risk for University exams. Kindly meet HOD immediately. - PakkaPresent`;
          if (customNote.trim()) {
            smsMsg += ` Note: ${customNote.trim()}`;
          }

          const hasMobile = Boolean(
            t.parentMobile && t.parentMobile.length >= 10,
          );
          newLogs.push({
            id: `sms-defaulter-${Date.now()}-${t.student.id}-${Math.random().toString(36).substring(2, 6)}`,
            student_id: t.student.id,
            student_name: t.name,
            parent_mobile: t.parentMobile,
            channel: "sms",
            is_defaulter_alert: true,
            attendance_rate: t.percentage,
            message: cleanSmsMessage(smsMsg),
            status: hasMobile ? "pending" : "failed",
            attendance_date: todayStr,
            sent_at: timestamp,
            language: "en",
            gateway: "MSG91",
            gateway_response: hasMobile
              ? "Queued for MSG91 dispatch; provider acceptance not yet confirmed"
              : "Invalid phone number",
            created_at: timestamp,
          });

          if (hasMobile) {
            smsGatewayBatch.push({
              mobile: t.parentMobile,
              message: cleanSmsMessage(smsMsg),
              studentName: t.name,
              studentId: t.student.id,
              date: todayStr,
            });
          }
        }
      }

      let logsRecorded = false;
      if (newLogs.length > 0) {
        try {
          await localDb.insert("sms_logs", newLogs);
          logsRecorded = true;
          window.dispatchEvent(
            new CustomEvent("edutrack_sms_logs_updated", { detail: newLogs }),
          );
        } catch (error) {
          console.error(
            "Communication delivery completed, but Parent Log recording failed:",
            error,
          );
        }
      }

      if (smsGatewayBatch.length > 0) {
        dispatchSmsViaGateway(smsGatewayBatch).catch((err) =>
          console.warn("Defaulter SMS gateway notice:", err),
        );
      }

      setSentSuccessDetails({
        count: targets.length,
        acceptedCount: newLogs.filter((log) => log.status === "sent").length,
        alreadyProcessedCount,
        failedCount: newLogs.filter((log) => log.status === "failed").length,
        logsRecorded,
        channels: selectedChannels,
        failureReasons: Array.from(
          new Set(
            newLogs
              .filter((log) => log.status === "failed")
              .map((log) => log.gateway_response || "Delivery request failed."),
          ),
        ),
      });
      if (newLogs.some((log) => log.status === "sent")) {
        onAlertsSent?.(targets.length);
      }
    } catch (error) {
      console.error("Defaulter alert dispatch failed:", error);
      alert(error instanceof Error ? error.message : "Alert dispatch failed.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(
      `${sampleEmail.subject}\n\n${sampleEmail.body}`,
    );
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="defaulter-alert-modal"
        className="w-[min(94vw,42rem)] max-w-[42rem] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/60 bg-background shadow-2xl animate-in fade-in-0 zoom-in-[0.97] slide-in-from-bottom-2 duration-250"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3.5 pr-7">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Attendance Alert
              </DialogTitle>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Notify parents of students below 75% attendance
              </p>
            </div>
          </div>
        </DialogHeader>

        {sentSuccessDetails ? (
          <div className="px-6 py-8 sm:px-8 sm:py-9 text-center">
            {(() => {
              const onlyAlreadyProcessed =
                sentSuccessDetails.alreadyProcessedCount > 0 &&
                sentSuccessDetails.acceptedCount === 0 &&
                sentSuccessDetails.failedCount === 0;
              const allFailed =
                sentSuccessDetails.failedCount > 0 &&
                sentSuccessDetails.acceptedCount === 0 &&
                sentSuccessDetails.alreadyProcessedCount === 0;
              const partial =
                !onlyAlreadyProcessed &&
                !allFailed &&
                (sentSuccessDetails.failedCount > 0 ||
                  sentSuccessDetails.alreadyProcessedCount > 0);
              const ResultIcon = onlyAlreadyProcessed
                ? RotateCcw
                : allFailed
                  ? XCircle
                  : partial
                    ? AlertTriangle
                    : CheckCircle2;
              const tone = onlyAlreadyProcessed
                ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                : allFailed
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : partial
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
              const title = onlyAlreadyProcessed
                ? `Alert already sent for ${sentSuccessDetails.count} ${sentSuccessDetails.count === 1 ? "student" : "students"}`
                : allFailed
                  ? `Alert delivery failed for ${sentSuccessDetails.count} ${sentSuccessDetails.count === 1 ? "student" : "students"}`
                  : partial
                    ? `Alerts partially processed for ${sentSuccessDetails.count} ${sentSuccessDetails.count === 1 ? "student" : "students"}`
                    : `Alerts accepted for ${sentSuccessDetails.count} ${sentSuccessDetails.count === 1 ? "student" : "students"}`;
              return (
                <div
                  className="mx-auto flex w-full max-w-lg flex-col items-center animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
                  aria-live="polite"
                >
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full ${tone}`}
                  >
                    <ResultIcon className="relative h-7 w-7" />
                  </div>
                  <div className="mt-5 w-full">
                    <p className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-foreground">
                      {title}
                    </p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      {sentSuccessDetails.acceptedCount > 0 && (
                        <>{sentSuccessDetails.acceptedCount} accepted · </>
                      )}
                      {sentSuccessDetails.alreadyProcessedCount > 0 && (
                        <>
                          {sentSuccessDetails.alreadyProcessedCount} already
                          processed
                          {sentSuccessDetails.failedCount > 0 ? " · " : " via "}
                        </>
                      )}
                      {sentSuccessDetails.failedCount > 0 && (
                        <>{sentSuccessDetails.failedCount} failed via </>
                      )}
                      <span className="uppercase font-bold">
                        {sentSuccessDetails.channels.join(" + ")}
                      </span>
                    </p>
                    {sentSuccessDetails.failureReasons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {sentSuccessDetails.failureReasons.map((reason) => (
                          <p
                            key={reason}
                            className="text-xs text-rose-700 dark:text-rose-300"
                          >
                            {reason}
                          </p>
                        ))}
                      </div>
                    )}
                    {onlyAlreadyProcessed && (
                      <div className="mx-auto mt-5 max-w-md rounded-xl border border-sky-500/25 bg-sky-500/[0.08] px-4 py-3">
                        <p className="text-sm leading-5 text-sky-800 dark:text-sky-200">
                          This student's alert was already processed for this
                          date. No duplicate notification was sent.
                        </p>
                      </div>
                    )}
                    {!onlyAlreadyProcessed && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {sentSuccessDetails.logsRecorded
                          ? "Result recorded in Parent Communication Logs."
                          : "Parent Communication Log recording failed."}
                      </p>
                    )}
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={() => onOpenChange(false)}
                      className="h-11 min-w-32 rounded-xl px-8 text-sm font-bold shadow-sm"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Selection & Configuration Screen */
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-7">
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Delivery channel
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.06] px-4 py-3">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">Email</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Recommended
                      </p>
                    </div>
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                  <div
                    aria-disabled="true"
                    className="flex min-h-[4.5rem] cursor-not-allowed items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 opacity-60"
                  >
                    <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-muted-foreground">SMS</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Coming soon
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Parents receive an official attendance warning with the
                  student&apos;s current attendance details.
                </p>
              </section>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Optional note
                </label>
                <Input
                  placeholder="Add meeting instructions or an administrative note..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              <section className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Defaulter students
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedIds.size} selected
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    {selectedIds.size === filteredDefaulters.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>

                {defaulterList.length > 4 && (
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by student, roll number, class, or mobile"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 rounded-xl pl-10 text-sm"
                    />
                  </div>
                )}

                {defaulterList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      No students are below 75% attendance.
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      All students are in the safe zone.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[19rem] space-y-2 overflow-y-auto pr-1">
                    {filteredDefaulters.map((d) => {
                      const isSelected = selectedIds.has(d.student.id);
                      return (
                        <div
                          key={d.student.id}
                          data-testid="defaulter-student-row"
                          onClick={() => toggleStudent(d.student.id)}
                          className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                            isSelected
                              ? "border-primary/35 bg-primary/[0.05]"
                              : "border-border/60 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(d.student.id)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-5 text-foreground">
                              {d.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              Roll no. {d.roll} · {d.className}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              Parent: {d.parentName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Contact: {d.parentMobile || d.parentEmail || "Not available"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[15px] font-bold leading-5 text-amber-700 dark:text-amber-300">
                              {Number(d.percentage.toFixed(1))}%
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Attendance
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
        {/* Footer */}
        {!sentSuccessDetails && (
          <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-6 py-3.5 sm:px-7 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-10 w-full rounded-xl px-5 text-sm font-semibold sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendAlerts}
              disabled={isSending || selectedIds.size === 0}
              className="h-10 w-full rounded-xl px-5 text-sm font-semibold shadow-sm gap-2 sm:w-auto"
            >
              {isSending ? (
                <>Sending email alert...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send {selectedIds.size} email {selectedIds.size === 1 ? "alert" : "alerts"}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

import React from "react";
import { CheckCircle2, FileText, Mail, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertChannel, SmsLanguage, Student, Subject } from "../lib/types";

interface NotificationResult {
  student: Student;
  channel: AlertChannel;
  status: "accepted" | "failed";
  message: string;
  attendanceStatus: "absent" | "present";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | undefined;
  date: string;
  totalStudents: number;
  totalPresent: number;
  totalAbsent: number;
  channels: AlertChannel[];
  notificationResults: NotificationResult[];
  language: SmsLanguage;
  onMarkAnother?: () => void;
}

export const AttendanceDispatchReceiptModal: React.FC<Props> = ({
  open,
  onOpenChange,
  subject,
  date,
  totalStudents,
  totalPresent,
  totalAbsent,
  channels,
  notificationResults,
  onMarkAnother,
}) => {
  const allPresent = totalStudents > 0 && totalAbsent === 0;
  const studentWord = totalStudents === 1 ? "student" : "students";
  const absentWord = totalAbsent === 1 ? "student" : "students";

  const channelSummary = (channel: AlertChannel) => {
    const results = notificationResults.filter(
      (result) => result.channel === channel,
    );
    return {
      accepted: results.filter((result) => result.status === "accepted").length,
      failed: results.filter((result) => result.status === "failed").length,
      results,
    };
  };

  const selectedChannelResults = channels.map((channel) => ({
    channel,
    ...channelSummary(channel),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-hidden p-0 gap-0 border-border/70 shadow-2xl">
        <DialogHeader className="border-b border-border/70 bg-emerald-500/[0.06] px-5 py-4 pr-12">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold leading-tight sm:text-lg">
                Attendance Recorded
              </DialogTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {subject?.code} · {subject?.name} · Sem {subject?.semester} ·{" "}
                {date}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(88vh-9rem)] space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Enrolled", value: totalStudents, className: "" },
              {
                label: "Present",
                value: totalPresent,
                className:
                  "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300",
              },
              {
                label: "Absent",
                value: totalAbsent,
                className:
                  "border-rose-500/25 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-center ${stat.className}`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </span>
                <span className="mt-0.5 block text-xl font-bold leading-none">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div
            className={`rounded-xl border px-4 py-3 ${
              allPresent
                ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                : "border-rose-500/25 bg-rose-500/[0.06]"
            }`}
          >
            <p className="text-sm font-bold text-foreground">
              {allPresent
                ? totalStudents === 1
                  ? "1 student was marked present"
                  : `All ${totalStudents} ${studentWord} were marked present`
                : `${totalAbsent} ${absentWord} ${totalAbsent === 1 ? "was" : "were"} marked absent`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allPresent
                ? "No absence notification was required."
                : `Notification channels: ${channels.map((channel) => channel.toUpperCase()).join(" + ") || "None"}`}
            </p>
          </div>

          {selectedChannelResults.length > 0 && (
            <div
              className={`grid gap-2 ${selectedChannelResults.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}
            >
              {selectedChannelResults.map(
                ({ channel, accepted, failed, results }) => {
                  const Icon = channel === "email" ? Mail : MessageSquare;
                  const noResultText = allPresent
                    ? "Not required for an all-present result"
                    : "No result was recorded";
                  return (
                    <div
                      key={channel}
                      className="rounded-xl border border-border/70 bg-muted/15 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {channel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {results.length > 0
                          ? `${accepted} accepted · ${failed} failed`
                          : noResultText}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {notificationResults.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border/70 divide-y divide-border/70">
              {notificationResults.map((result, index) => (
                <div
                  key={`${result.student.id}-${result.channel}-${index}`}
                  className="p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {result.student.full_name}
                    </span>
                    <Badge
                      variant={
                        result.status === "accepted" ? "success" : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {result.channel.toUpperCase()} {result.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{result.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/70 bg-muted/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/sms-logs"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              View Logs
            </Button>
          </Link>
          <div className="flex w-full gap-2 sm:w-auto">
            {onMarkAnother && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  onOpenChange(false);
                  onMarkAnother();
                }}
              >
                Mark Another
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

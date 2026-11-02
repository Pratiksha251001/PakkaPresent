import React from "react";
import { ArrowLeft, Building2, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  getPlatformInstitution,
  PlatformInstitutionDetail,
  transferPlatformInstitutionAdmin,
  transitionPlatformInstitutionStatus,
} from "../../lib/platform/platformData";
const formatInstitutionStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);
export const PlatformInstitutionDetailPage: React.FC = () => {
  const { institutionId = "" } = useParams(),
    [data, setData] = React.useState<PlatformInstitutionDetail | null>(null),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(""),
    [reason, setReason] = React.useState(""),
    [successorUserId, setSuccessorUserId] = React.useState(""),
    [actionBusy, setActionBusy] = React.useState(false),
    [actionError, setActionError] = React.useState(""),
    [actionSuccess, setActionSuccess] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getPlatformInstitution(institutionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institution.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const runLifecycleAction = async (
    status: "active" | "inactive" | "suspended",
  ) => {
    if (reason.trim().length < 5) {
      setActionError("Enter a reason containing at least 5 characters.");
      return;
    }
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await transitionPlatformInstitutionStatus(institutionId, status, reason);
      setReason("");
      setActionSuccess(
        `Institution status changed to ${formatInstitutionStatus(status)}.`,
      );
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Lifecycle update failed.",
      );
    } finally {
      setActionBusy(false);
    }
  };
  const runAdminTransfer = async () => {
    if (!/^[0-9a-f-]{36}$/i.test(successorUserId.trim())) {
      setActionError("Enter the successor account UUID.");
      return;
    }
    if (reason.trim().length < 5) {
      setActionError(
        "Enter a transfer reason containing at least 5 characters.",
      );
      return;
    }
    setActionBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await transferPlatformInstitutionAdmin(
        institutionId,
        successorUserId.trim(),
        reason,
      );
      setSuccessorUserId("");
      setReason("");
      setActionSuccess("Institution Admin transferred successfully.");
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Administrator transfer failed.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  if (loading)
    return <div className="h-80 animate-pulse rounded-2xl bg-muted" />;
  if (error)
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="font-bold text-destructive">{error}</p>
          <Button className="mt-3" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  if (!data)
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-10 w-10" />
          <h1 className="mt-4 font-bold">Institution not found</h1>
          <Link
            to="/platform/institutions"
            className="mt-4 inline-block underline"
          >
            Back to institutions
          </Link>
        </CardContent>
      </Card>
    );
  const items = [
    ["Official name", data.official_name],
    ["Institution code", data.institution_code],
    ["DTE code", data.dte_code],
    [
      "Location",
      [data.city, data.district, data.state, data.country]
        .filter(Boolean)
        .join(", "),
    ],
    ["Official email", data.official_email || "Not provided"],
    ["Institution admins", String(data.admin_count)],
    ["Branding", data.logo_path ? "Logo configured" : "No logo configured"],
    ["Access request", data.access_request_status || "No linked request"],
    ["Invitation", data.invitation_status || "No linked invitation"],
    ["Onboarding", data.onboarding_status || "Legacy institution"],
    ["Failure phase", data.onboarding_failure_phase || "No failure recorded"],
    ["Created", new Date(data.created_at).toLocaleString()],
  ];
  return (
    <div className="space-y-6">
      <Link
        to="/platform/institutions"
        className="inline-flex items-center gap-2 font-bold underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to institutions
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Institution administration</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            {data.display_name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Operational identity, administration coverage, and onboarding
            provenance.
          </p>
        </div>
        <Badge
          variant={
            data.status === "active"
              ? "success"
              : data.status === "suspended"
                ? "destructive"
                : "outline"
          }
        >
          {formatInstitutionStatus(data.status)}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Institution information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 break-words font-medium">
                {value || "Not available"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            className="block text-sm font-bold"
            htmlFor="platform-action-reason"
          >
            Required reason
          </label>
          <textarea
            id="platform-action-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            className="min-h-24 w-full rounded-lg border bg-background p-3"
            placeholder="Explain why this platform operation is required."
          />
          {actionError ? (
            <p className="font-bold text-destructive">{actionError}</p>
          ) : null}
          {actionSuccess ? (
            <p className="font-bold text-emerald-700">{actionSuccess}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {data.status === "active" ? (
              <>
                <Button
                  variant="destructive"
                  disabled={actionBusy}
                  onClick={() => void runLifecycleAction("suspended")}
                >
                  Suspend institution
                </Button>
                <Button
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => void runLifecycleAction("inactive")}
                >
                  Deactivate institution
                </Button>
              </>
            ) : (
              <Button
                disabled={actionBusy}
                onClick={() => void runLifecycleAction("active")}
              >
                Reactivate institution
              </Button>
            )}
          </div>
          <div className="border-t pt-4">
            <h2 className="font-bold">Transfer Institution Admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The successor must already have a profile and role in this
              institution. Enter that account's UUID.
            </p>
            <input
              value={successorUserId}
              onChange={(event) => setSuccessorUserId(event.target.value)}
              className="mt-3 w-full rounded-lg border bg-background p-3"
              placeholder="Successor user UUID"
            />
            <Button
              className="mt-3"
              disabled={actionBusy}
              onClick={() => void runAdminTransfer()}
            >
              Transfer Institution Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

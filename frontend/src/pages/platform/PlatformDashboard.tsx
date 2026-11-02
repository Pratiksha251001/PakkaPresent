import React from "react";
import {
  Building2,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  TicketCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  getPlatformDashboardMetrics,
  PlatformDashboardMetrics,
} from "../../lib/platform/platformData";
export const PlatformDashboard: React.FC = () => {
  const [data, setData] = React.useState<PlatformDashboardMetrics | null>(null),
    [error, setError] = React.useState(""),
    [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getPlatformDashboardMetrics());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load platform metrics.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void load();
  }, [load]);
  const cards: Array<[string, number, LucideIcon]> = data
    ? [
        ["Total institutions", data.total_institutions, Building2],
        ["Active institutions", data.active_institutions, TicketCheck],
        ["Pending requests", data.pending_access_requests, ClipboardCheck],
        [
          "Recovery required",
          data.recovery_required_invitations + data.recovery_required_attempts,
          ShieldAlert,
        ],
      ]
    : [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Platform overview</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            Platform Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Monitor institution status, access requests, onboarding, and
            recovery activity.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-destructive">{error}</p>
            <Button size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(([label, value, Icon]) => (
                <Card key={label} className="h-full">
                  <CardContent className="flex min-h-40 flex-col p-6">
                    <Icon className="h-5 w-5 dashboard-accent-text" />
                    <p className="mt-6 font-display text-4xl font-black leading-none">
                      {value}
                    </p>
                    <p className="mt-3 text-sm font-bold text-muted-foreground">
                      {label}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Institution status</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    ["Pending", data.pending_institutions],
                    ["Inactive", data.inactive_institutions],
                    ["Suspended", data.suspended_institutions],
                    ["Active", data.active_institutions],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-6 rounded-xl bg-muted/40 px-4 py-3"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <b className="tabular-nums">{value}</b>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding pipeline</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  {[
                    ["Approved", data.approved_access_requests],
                    ["Onboarding", data.onboarding_access_requests],
                    ["Active invites", data.active_invitations],
                    ["Expired invites", data.expired_invitations],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-6 rounded-xl bg-muted/40 px-4 py-3"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <b className="tabular-nums">{value}</b>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/platform/access-requests"
                className="inline-flex font-bold underline decoration-primary decoration-2 underline-offset-4"
              >
                Review access requests
              </Link>
              <Link
                to="/platform/institutions"
                className="inline-flex font-bold underline decoration-primary decoration-2 underline-offset-4"
              >
                Open institution directory
              </Link>
              <Link
                to="/platform/audit-log"
                className="inline-flex font-bold underline decoration-primary decoration-2 underline-offset-4"
              >
                Open audit log
              </Link>
              <Link
                to="/platform/recovery"
                className="inline-flex font-bold underline decoration-primary decoration-2 underline-offset-4"
              >
                Open recovery queue
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
};

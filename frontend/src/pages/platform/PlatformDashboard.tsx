import React from "react";
import {
  Building2,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  TicketCheck,
} from "lucide-react";
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
  const cards = data
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
          <p className="section-label">Read-only platform overview</p>
          <h1 className="mt-3 font-display text-3xl font-black">
            Platform Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Monitor institutions and onboarding health without changing tenant
            data.
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
                <Card key={label as string}>
                  <CardHeader className="pb-3">
                    <Icon className="h-5 w-5 dashboard-accent-text" />
                    <CardTitle className="text-sm">{label as string}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black">{value as number}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Institution status</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <p>
                    Pending <b>{data.pending_institutions}</b>
                  </p>
                  <p>
                    Inactive <b>{data.inactive_institutions}</b>
                  </p>
                  <p>
                    Suspended <b>{data.suspended_institutions}</b>
                  </p>
                  <p>
                    Active <b>{data.active_institutions}</b>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding pipeline</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <p>
                    Approved <b>{data.approved_access_requests}</b>
                  </p>
                  <p>
                    Onboarding <b>{data.onboarding_access_requests}</b>
                  </p>
                  <p>
                    Active invites <b>{data.active_invitations}</b>
                  </p>
                  <p>
                    Expired invites <b>{data.expired_invitations}</b>
                  </p>
                </CardContent>
              </Card>
            </div>
            <Link
              to="/platform/institutions"
              className="inline-flex font-bold underline decoration-primary decoration-2 underline-offset-4"
            >
              Open institution directory
            </Link>
          </>
        )
      )}
    </div>
  );
};

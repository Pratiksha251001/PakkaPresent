import React from "react";
import { Link } from "react-router-dom";
import { Building2, Search } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  InstitutionStatus,
  listPlatformInstitutions,
  PlatformInstitutionSummary,
} from "../../lib/platform/platformData";
const variant = (s: InstitutionStatus) =>
  s === "active"
    ? "success"
    : s === "suspended"
      ? "destructive"
      : s === "pending"
        ? "secondary"
        : "outline";
export const PlatformInstitutions: React.FC = () => {
  const [search, setSearch] = React.useState(""),
    [query, setQuery] = React.useState(""),
    [status, setStatus] = React.useState<InstitutionStatus | "">(""),
    [page, setPage] = React.useState(0),
    [rows, setRows] = React.useState<PlatformInstitutionSummary[]>([]),
    [total, setTotal] = React.useState(0),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState("");
  const limit = 25;
  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listPlatformInstitutions({
        search: query,
        status,
        limit,
        offset: page * limit,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institutions.");
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);
  React.useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Read-only directory</p>
        <h1 className="mt-3 font-display text-3xl font-black">Institutions</h1>
        <p className="mt-2 text-muted-foreground">
          Search and inspect institution onboarding and administration coverage.
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_200px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, code, city, district or state"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as InstitutionStatus | "");
            setPage(0);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <Button type="submit">Search</Button>
      </form>
      {error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="font-bold text-destructive">{error}</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-bold">No institutions found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search or status filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} result{total === 1 ? "" : "s"}
          </p>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admins</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.institution_id}>
                    <TableCell>
                      <b>{r.display_name}</b>
                      <p className="text-xs text-muted-foreground">
                        {r.institution_code}
                      </p>
                    </TableCell>
                    <TableCell>
                      {[r.city, r.district, r.state]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.admin_count}</TableCell>
                    <TableCell>
                      <Link
                        className="font-bold underline"
                        to={`/platform/institutions/${r.institution_id}`}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <Card key={r.institution_id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{r.display_name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {r.institution_code}
                      </p>
                    </div>
                    <Badge variant={variant(r.status)}>{r.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm">
                    {[r.city, r.district, r.state].filter(Boolean).join(", ") ||
                      "Location not provided"}
                  </p>
                  <Link
                    className="mt-4 inline-block font-bold underline"
                    to={`/platform/institutions/${r.institution_id}`}
                  >
                    View details
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <p className="text-sm">
              Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}
            </p>
            <Button
              variant="outline"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

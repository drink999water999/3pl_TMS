import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Dashboard" };

const RANGES: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string; client?: string };
}) {
  const { profile } = await requireUser();
  if (!profile) redirect("/login");
  if (profile.role === "driver") redirect("/my-dispatches");

  const rangeKey =
    searchParams.range && RANGES[searchParams.range] ? searchParams.range : "30";
  const days = RANGES[rangeKey] ?? 30;
  const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  const clientFilter =
    searchParams.client && searchParams.client !== "all"
      ? searchParams.client
      : null;

  const supabase = await createClient();
  const [requestsRes, dispatchesRes, exceptionsRes, trucksRes, clientsRes] =
    await Promise.all([
      supabase
        .from("transport_requests")
        .select("id, status, client_id, created_at"),
      supabase
        .from("dispatches")
        .select(
          "id, status, assignment_type, has_issue, created_at, delivered_at, request_id",
        ),
      supabase
        .from("exceptions")
        .select("id, kind, created_at, request_id"),
      supabase.from("trucks").select("id, status, is_active, deleted_at"),
      supabase
        .from("clients")
        .select("id, name")
        .is("deleted_at", null)
        .order("name"),
    ]);

  const requests = requestsRes.data ?? [];
  const dispatches = dispatchesRes.data ?? [];
  const exceptions = exceptionsRes.data ?? [];
  const trucks = trucksRes.data ?? [];
  const clients = clientsRes.data ?? [];

  const clientOfRequest = new Map(
    requests.map((r) => [r.id, r.client_id] as const),
  );
  const inRange = (iso: string | null) => !!iso && iso >= sinceIso;
  const reqMatch = (clientId: string | null) =>
    !clientFilter || clientId === clientFilter;
  const dispClient = (requestId: string) =>
    clientOfRequest.get(requestId) ?? null;
  const dispMatch = (requestId: string) =>
    !clientFilter || dispClient(requestId) === clientFilter;

  // --- Point-in-time KPIs -----------------------------------------------------
  const activeShipments = dispatches.filter(
    (d) => dispMatch(d.request_id) && d.status !== "Delivered",
  ).length;
  const openIssues = dispatches.filter(
    (d) => dispMatch(d.request_id) && d.has_issue,
  ).length;
  const awaitingAction = requests.filter(
    (r) =>
      reqMatch(r.client_id) &&
      (r.status === "Submitted" || r.status === "Approved"),
  ).length;
  const activeTrucks = trucks.filter((t) => t.is_active && !t.deleted_at);
  const busyTrucks = activeTrucks.filter((t) => t.status === "busy").length;
  const utilization = activeTrucks.length
    ? Math.round((busyTrucks / activeTrucks.length) * 100)
    : 0;

  // --- Range-based metrics ----------------------------------------------------
  const deliveredInRange = dispatches.filter(
    (d) =>
      dispMatch(d.request_id) &&
      d.status === "Delivered" &&
      inRange(d.delivered_at),
  ).length;
  const dispatchesInRange = dispatches.filter(
    (d) => dispMatch(d.request_id) && inRange(d.created_at),
  );
  const ownCount = dispatchesInRange.filter(
    (d) => d.assignment_type === "own",
  ).length;
  const outsourcedCount = dispatchesInRange.filter(
    (d) => d.assignment_type === "outsourced",
  ).length;

  // --- Time series: created vs delivered per day ------------------------------
  const seriesMap = new Map<string, { created: number; delivered: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    seriesMap.set(key, { created: 0, delivered: 0 });
  }
  for (const d of dispatches) {
    if (!dispMatch(d.request_id)) continue;
    if (inRange(d.created_at)) {
      const e = seriesMap.get(d.created_at.slice(0, 10));
      if (e) e.created++;
    }
    if (d.delivered_at && inRange(d.delivered_at)) {
      const e = seriesMap.get(d.delivered_at.slice(0, 10));
      if (e) e.delivered++;
    }
  }
  const series = Array.from(seriesMap.entries()).map(([date, v]) => ({
    date: date.slice(5),
    created: v.created,
    delivered: v.delivered,
  }));

  // --- Requests by status -----------------------------------------------------
  const statusOrder = [
    "Draft",
    "Submitted",
    "Approved",
    "Assigned",
    "Delivered",
    "Rejected",
    "Cancelled",
  ];
  const statusCounts = statusOrder.map((s) => ({
    status: s,
    count: requests.filter(
      (r) => reqMatch(r.client_id) && inRange(r.created_at) && r.status === s,
    ).length,
  }));

  // --- Top clients by request volume ------------------------------------------
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Unknown";
  const clientCounts = new Map<string, number>();
  for (const r of requests) {
    if (!inRange(r.created_at)) continue;
    if (clientFilter && r.client_id !== clientFilter) continue;
    clientCounts.set(r.client_id, (clientCounts.get(r.client_id) ?? 0) + 1);
  }
  const topClients = Array.from(clientCounts.entries())
    .map(([id, count]) => ({ name: clientName(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // --- Exceptions by type -----------------------------------------------------
  const exMatch = (requestId: string | null) =>
    !clientFilter || (requestId ? dispClient(requestId) === clientFilter : false);
  const exceptionData = ["delay", "damage", "complaint"].map((k) => ({
    kind: k,
    count: exceptions.filter(
      (e) => inRange(e.created_at) && exMatch(e.request_id) && e.kind === k,
    ).length,
  }));

  return (
    <div>
      <RealtimeRefresh table="dispatches" />
      <PageHeader
        title="Operations Dashboard"
        description={`Shipment performance over the last ${days} days.`}
      />
      <DashboardFilters
        clients={clients}
        range={rangeKey}
        client={clientFilter ?? "all"}
      />
      <DashboardView
        kpis={{
          activeShipments,
          deliveredInRange,
          awaitingAction,
          openIssues,
          utilization,
          busyTrucks,
          totalTrucks: activeTrucks.length,
          ownCount,
          outsourcedCount,
        }}
        rangeDays={days}
        series={series}
        statusCounts={statusCounts}
        topClients={topClients}
        exceptions={exceptionData}
      />
    </div>
  );
}

"use client";

import {
  Truck,
  PackageCheck,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";

const NAVY = "#13386b";
const BLUE = "#2b8fd6";
const SKY = "#5bb6e6";
const ORANGE = "#f08a24";
const GREEN = "#16a34a";
const AMBER = "#d97706";
const RED = "#dc2626";
const SLATE = "#94a3b8";

const STATUS_COLOR: Record<string, string> = {
  Draft: SLATE,
  Submitted: AMBER,
  Approved: BLUE,
  Assigned: NAVY,
  Delivered: GREEN,
  Rejected: RED,
  Cancelled: "#cbd5e1",
};
const EXC_COLOR: Record<string, string> = {
  delay: AMBER,
  damage: RED,
  complaint: BLUE,
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

type Kpis = {
  activeShipments: number;
  deliveredInRange: number;
  awaitingAction: number;
  openIssues: number;
  utilization: number;
  busyTrucks: number;
  totalTrucks: number;
  ownCount: number;
  outsourcedCount: number;
};

export function DashboardView({
  kpis,
  rangeDays,
  series,
  statusCounts,
  topClients,
  exceptions,
}: {
  kpis: Kpis;
  rangeDays: number;
  series: { date: string; created: number; delivered: number }[];
  statusCounts: { status: string; count: number }[];
  topClients: { name: string; count: number }[];
  exceptions: { kind: string; count: number }[];
}) {
  const assignment = [
    { name: "Own fleet", value: kpis.ownCount },
    { name: "Outsourced", value: kpis.outsourcedCount },
  ];
  const assignmentTotal = kpis.ownCount + kpis.outsourcedCount;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active shipments"
          value={kpis.activeShipments}
          hint="In flight now"
          icon={<Truck className="h-5 w-5" />}
          tone="navy"
        />
        <Stat
          label="Delivered"
          value={kpis.deliveredInRange}
          hint={`Last ${rangeDays} days`}
          icon={<PackageCheck className="h-5 w-5" />}
          tone="green"
        />
        <Stat
          label="Awaiting action"
          value={kpis.awaitingAction}
          hint="To approve or dispatch"
          icon={<ClipboardList className="h-5 w-5" />}
          tone="blue"
        />
        <Stat
          label="Open issues"
          value={kpis.openIssues}
          hint="Flagged dispatches"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
      </div>

      {/* Trend + side column */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          title="Shipments over time"
          subtitle="Created vs delivered per day"
          className="lg:col-span-2"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={32}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  name="Created"
                  dataKey="created"
                  stroke={BLUE}
                  strokeWidth={2}
                  fill="url(#gCreated)"
                />
                <Area
                  type="monotone"
                  name="Delivered"
                  dataKey="delivered"
                  stroke={GREEN}
                  strokeWidth={2}
                  fill="url(#gDelivered)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="space-y-5">
          <ChartCard title="Fleet utilization">
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold text-brand-navy">
                {kpis.utilization}
                <span className="text-xl">%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {kpis.busyTrucks} of {kpis.totalTrucks} trucks busy
              </p>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-sky transition-[width] duration-700"
                style={{ width: `${kpis.utilization}%` }}
              />
            </div>
          </ChartCard>

          <ChartCard title="Own vs outsourced" subtitle={`Last ${rangeDays} days`}>
            {assignmentTotal === 0 ? (
              <Empty />
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assignment}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      <Cell fill={NAVY} />
                      <Cell fill={ORANGE} />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Breakdown charts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Requests by status" subtitle={`Last ${rangeDays} days`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusCounts}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusCounts.map((s) => (
                    <Cell
                      key={s.status}
                      fill={STATUS_COLOR[s.status] ?? SLATE}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top clients" subtitle="By request volume">
          {topClients.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topClients}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    stroke="#eef2f7"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={96}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "#f1f5f9" }}
                  />
                  <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Exceptions by type" subtitle={`Last ${rangeDays} days`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={exceptions}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis
                  dataKey="kind"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: string) => v[0].toUpperCase() + v.slice(1)}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {exceptions.map((e) => (
                    <Cell key={e.kind} fill={EXC_COLOR[e.kind] ?? SKY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: "navy" | "blue" | "green" | "red";
}) {
  const tones: Record<string, string> = {
    navy: "from-brand-navy to-brand-blue shadow-[0_4px_12px_rgba(19,56,107,0.35)]",
    blue: "from-brand-blue to-brand-sky shadow-[0_4px_12px_rgba(43,143,214,0.35)]",
    green: "from-emerald-500 to-green-600 shadow-[0_4px_12px_rgba(22,163,74,0.3)]",
    red: "from-rose-500 to-red-600 shadow-[0_4px_12px_rgba(220,38,38,0.3)]",
  };
  const bars: Record<string, string> = {
    navy: "from-brand-navy to-brand-blue",
    blue: "from-brand-blue to-brand-sky",
    green: "from-emerald-500 to-green-600",
    red: "from-rose-500 to-red-600",
  };
  return (
    <Card className="relative flex items-center gap-4 overflow-hidden p-5 hover:shadow-card-hover">
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bars[tone]}`}
      />
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${tones[tone]}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-3xl font-bold leading-none tracking-tight text-brand-navy">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function Empty() {
  return (
    <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
      No data in this period.
    </div>
  );
}

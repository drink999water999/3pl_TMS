"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];

export function DashboardFilters({
  clients,
  range,
  client,
}: {
  clients: { id: string; name: string }[];
  range: string;
  client: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => update("range", r.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              range === r.key
                ? "bg-brand-navy text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <select
        value={client}
        onChange={(e) => update("client", e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
      >
        <option value="all">All clients</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, requestStatusVariant } from "@/lib/format";

export type RequestRow = {
  id: string;
  request_no: string;
  po: string;
  client: string;
  clientType: string;
  locationName: string;
  route: string;
  deliveryDate: string | null;
  status: string;
};

type ColKey = keyof Omit<RequestRow, "id">;
const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "request_no", label: "Request #" },
  { key: "po", label: "PO reference" },
  { key: "client", label: "Client" },
  { key: "clientType", label: "Client type" },
  { key: "locationName", label: "Location" },
  { key: "route", label: "Route" },
  { key: "deliveryDate", label: "Delivery date" },
  { key: "status", label: "Status" },
];

export function RequestsTable({ rows }: { rows: RequestRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ColKey>("request_no");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((r) =>
        COLUMNS.some((c) =>
          String(r[c.key] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    const sorted = [...list].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  const toggleSort = (key: ColKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search across all columns…"
        className="sm:max-w-md"
      />
      <Table>
        <THead>
          <TR>
            {COLUMNS.map((c) => (
              <TH key={c.key}>
                <button
                  type="button"
                  onClick={() => toggleSort(c.key)}
                  className="inline-flex items-center gap-1 hover:text-brand-navy"
                >
                  {c.label}
                  {sortKey === c.key ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <TR>
              <TD
                colSpan={COLUMNS.length}
                className="text-center text-muted-foreground"
              >
                No requests found.
              </TD>
            </TR>
          ) : (
            filtered.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link
                    href={`/requests/${r.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {r.request_no}
                  </Link>
                </TD>
                <TD>{r.po || "—"}</TD>
                <TD>{r.client}</TD>
                <TD>
                  {r.clientType ? (
                    <Badge variant="info">{r.clientType}</Badge>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD>{r.locationName}</TD>
                <TD className="text-sm text-muted-foreground">{r.route}</TD>
                <TD>{formatDate(r.deliveryDate)}</TD>
                <TD>
                  <Badge variant={requestStatusVariant(r.status)}>
                    {r.status}
                  </Badge>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}

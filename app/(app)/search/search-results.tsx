"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type SearchHit = {
  type: string;
  label: string;
  sub: string;
  href: string;
};

export function SearchResults({ q, hits }: { q: string; hits: SearchHit[] }) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const exportCsv = () => {
    const esc = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lines = [
      "Type,Result,Detail",
      ...hits.map((h) => [h.type, h.label, h.sub].map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search-${q || "results"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search request #, waybill #, PO, customer, supplier, plate, driver, mobile…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit">Search</Button>
        {hits.length > 0 ? (
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        ) : null}
      </form>

      {q.length >= 2 ? (
        <p className="text-sm text-muted-foreground">
          {hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters and press Search.
        </p>
      )}

      <div className="space-y-2">
        {hits.map((h, i) => (
          <Link key={i} href={h.href}>
            <Card className="flex items-center justify-between p-3 transition-colors hover:bg-brand-blue/[0.04]">
              <div>
                <p className="font-medium text-brand-navy">{h.label}</p>
                {h.sub ? (
                  <p className="text-xs text-muted-foreground">{h.sub}</p>
                ) : null}
              </div>
              <Badge variant="info">{h.type}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

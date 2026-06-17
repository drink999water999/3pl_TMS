"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export type Report = {
  id: string;
  label: string;
  columns: string[];
  rows: (string | number)[][];
};

export function ReportsView({ reports }: { reports: Report[] }) {
  const [active, setActive] = useState(reports[0]?.id ?? "");
  const report = reports.find((r) => r.id === active) ?? reports[0];

  const exportCsv = () => {
    if (!report) return;
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      report.columns.map(esc).join(","),
      ...report.rows.map((row) => row.map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.id}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="sm:w-72"
        >
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <THead>
            <TR>
              {report.columns.map((c, i) => (
                <TH key={c} className={i === 0 ? "" : "text-right"}>
                  {c}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {report.rows.length === 0 ? (
              <TR>
                <TD
                  colSpan={report.columns.length}
                  className="text-center text-muted-foreground"
                >
                  No completed deliveries yet.
                </TD>
              </TR>
            ) : (
              report.rows.map((row, ri) => (
                <TR key={ri}>
                  {row.map((cell, ci) => (
                    <TD key={ci} className={ci === 0 ? "font-medium" : "text-right"}>
                      {typeof cell === "number" && ci > 1
                        ? new Intl.NumberFormat().format(cell)
                        : cell}
                    </TD>
                  ))}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

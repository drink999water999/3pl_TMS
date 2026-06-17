"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = Record<string, string | number | null>;

export function ExcelTools({
  rows,
  filename,
  templateColumns,
  onImport,
}: {
  rows: Row[];
  filename: string;
  templateColumns: string[];
  onImport: (
    rows: Record<string, string>[],
  ) => Promise<{
    error?: string;
    count?: number;
    created?: number;
    updated?: number;
  }>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const exportXlsx = async () => {
    setMsg(null);
    const XLSX = await import("xlsx");
    const data = rows.length > 0 ? rows : [Object.fromEntries(templateColumns.map((c) => [c, ""]))];
    const ws = XLSX.utils.json_to_sheet(data, { header: templateColumns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const template = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([templateColumns]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}-template.xlsx`);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
      const res = await onImport(parsed);
      if (res.error) setMsg(`Error: ${res.error}`);
      else {
        if (res.created != null || res.updated != null) {
          setMsg(
            `Imported: ${res.created ?? 0} new, ${res.updated ?? 0} updated (matched on email/phone).`,
          );
        } else {
          setMsg(`Imported ${res.count ?? parsed.length} row(s).`);
        }
        router.refresh();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not read the file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportXlsx}>
        <Download className="h-4 w-4" /> Export Excel
      </Button>
      <Button variant="outline" size="sm" onClick={template}>
        Template
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4" /> {busy ? "Importing…" : "Import Excel"}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFile}
      />
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

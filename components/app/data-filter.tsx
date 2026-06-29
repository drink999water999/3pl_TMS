"use client";

// Reusable multi-column filter. The user picks a column (or "Any column"),
// types a value, and presses Enter / Add to create a filter chip. Multiple
// chips combine with AND. Used across every data table in the app.

import { useState } from "react";
import { Plus, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type FilterColumn = { key: string; label: string };
export type ActiveFilter = { column: string; value: string };

export const ANY_COLUMN = "__all__";

// True if `row` matches every active filter. `get(row, columnKey)` must return
// the searchable text for that column; for ANY_COLUMN it should return all
// columns joined together.
export function matchesFilters<T>(
  row: T,
  filters: ActiveFilter[],
  get: (row: T, column: string) => string,
): boolean {
  return filters.every((f) =>
    get(row, f.column).toLowerCase().includes(f.value.toLowerCase()),
  );
}

export function DataFilter({
  columns,
  filters,
  onChange,
}: {
  columns: FilterColumn[];
  filters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}) {
  const [column, setColumn] = useState<string>(ANY_COLUMN);
  const [value, setValue] = useState("");

  const labelFor = (key: string) =>
    key === ANY_COLUMN
      ? "Any column"
      : (columns.find((c) => c.key === key)?.label ?? key);

  const add = () => {
    const v = value.trim();
    if (!v) return;
    onChange([...filters, { column, value: v }]);
    setValue("");
  };

  const removeAt = (i: number) =>
    onChange(filters.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
        </div>
        <Select
          value={column}
          onChange={(e) => setColumn(e.target.value)}
          className="w-40"
          aria-label="Filter column"
        >
          <option value={ANY_COLUMN}>Any column</option>
          {columns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Select>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type a value, press Enter to add…"
          className="w-64"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add filter
        </Button>
        {filters.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        ) : null}
      </div>

      {filters.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-2.5 py-1 text-xs text-brand-navy"
            >
              <span className="font-medium">{labelFor(f.column)}:</span>
              {f.value}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded-full p-0.5 hover:bg-brand-blue/20"
                aria-label="Remove filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

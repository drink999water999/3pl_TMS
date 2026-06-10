"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes on a table and refreshes the current route's
 * server data when something changes. Defensive: if Realtime isn't enabled for
 * the table (migration not applied), this simply never fires — no errors.
 */
export function RealtimeRefresh({
  table,
  channel,
}: {
  table: string;
  channel?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(channel ?? `rt-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, channel, router]);

  return null;
}

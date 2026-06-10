"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "./client-dialog";

export function ClientsActions() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New client
      </Button>
      <ClientDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

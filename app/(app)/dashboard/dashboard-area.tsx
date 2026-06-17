import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

type AreaRow = {
  city: string;
  inTransit: number;
  pickedUp: number;
  delivered: number;
  freeTrucks: number;
};

export function AreaOps({
  rows,
  maintenanceCount,
}: {
  rows: AreaRow[];
  maintenanceCount: number;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-navy">
          Operations by area
        </h2>
        <Badge variant={maintenanceCount > 0 ? "warning" : "default"}>
          <Wrench className="mr-1 h-3 w-3" />
          {maintenanceCount} truck{maintenanceCount === 1 ? "" : "s"} in
          maintenance
        </Badge>
      </div>
      <Card className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Area / city</TH>
              <TH className="text-right">In transit</TH>
              <TH className="text-right">Picked up</TH>
              <TH className="text-right">Delivered</TH>
              <TH className="text-right">Free trucks</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center text-muted-foreground">
                  No area activity yet. Assign cities to locations and trucks to
                  populate this view.
                </TD>
              </TR>
            ) : (
              rows.map((r) => (
                <TR key={r.city}>
                  <TD className="font-medium">{r.city}</TD>
                  <TD className="text-right">
                    {r.inTransit > 0 ? (
                      <Badge variant="navy">{r.inTransit}</Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-right">{r.pickedUp || "—"}</TD>
                  <TD className="text-right">{r.delivered || "—"}</TD>
                  <TD className="text-right">
                    {r.freeTrucks > 0 ? (
                      <Badge variant="success">{r.freeTrucks}</Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </section>
  );
}

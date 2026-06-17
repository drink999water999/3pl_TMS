// Pure helpers for deriving a trip's selling price from the rate matrix.
// Shared by the request form (suggestion + auto-fill) and the request detail
// (display). "Trip" basis: a flat rate per lane + a fixed charge per extra stop
// + any additional-services price.

export type RateRow = {
  service_type_id: string | null;
  route_id: string | null;
  rate: number;
  currency: string;
  client_id?: string | null;
};

/** Best lane match: exact (service+route) → service-only → route-only → any. */
export function matchRate(
  rows: RateRow[],
  serviceTypeId: string | null,
  routeId: string | null,
): RateRow | null {
  return (
    rows.find(
      (r) => r.service_type_id === serviceTypeId && r.route_id === routeId,
    ) ??
    rows.find((r) => r.service_type_id === serviceTypeId && !r.route_id) ??
    rows.find((r) => !r.service_type_id && r.route_id === routeId) ??
    rows.find((r) => !r.service_type_id && !r.route_id) ??
    null
  );
}

export function computeSelling({
  contractRates,
  standardRates,
  serviceTypeId,
  routeId,
  stops,
  multiLocationCharge,
  additional,
}: {
  contractRates: RateRow[];
  standardRates: RateRow[];
  serviceTypeId: string | null;
  routeId: string | null;
  stops: number;
  multiLocationCharge: number;
  additional: number;
}): { base: number; total: number; currency: string; source: "contract" | "standard" } | null {
  const contract = matchRate(contractRates, serviceTypeId, routeId);
  const m = contract ?? matchRate(standardRates, serviceTypeId, routeId);
  if (!m) return null;
  const extraStops = Math.max(0, stops - 1);
  const total = m.rate + extraStops * (multiLocationCharge || 0) + (additional || 0);
  return {
    base: m.rate,
    total,
    currency: m.currency || "SAR",
    source: contract ? "contract" : "standard",
  };
}

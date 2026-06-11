// Pure pricing math (no IO) — safe to unit test. The DB orchestration that
// loads rows and writes the waybill lives in lib/pricing-server.ts.

export type ClientPricing = {
  pricing_mode: string; // 'fixed' | 'per_km'
  currency: string;
  rate_per_km: number | null;
  base_charge: number | null;
  margin_type: string | null; // 'percent' | 'fixed' | null
  margin_value: number | null;
};

export type ContractRate = {
  delivery_location_id: string | null;
  truck_type_id: string | null;
  shipment_type_id: string | null;
  rate: number;
  currency: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pick the most specific contract rate that doesn't conflict with the lane.
 * A null column on the rate is a wildcard; specificity is scored so an exact
 * destination beats a truck-type-only rate, etc.
 */
export function matchContractRate(
  rates: ContractRate[],
  lane: {
    deliveryId: string | null;
    truckTypeId: string | null;
    shipmentTypeId: string | null;
  },
): ContractRate | null {
  let best: ContractRate | null = null;
  let bestScore = -1;
  for (const r of rates) {
    if (r.delivery_location_id && r.delivery_location_id !== lane.deliveryId)
      continue;
    if (r.truck_type_id && r.truck_type_id !== lane.truckTypeId) continue;
    if (r.shipment_type_id && r.shipment_type_id !== lane.shipmentTypeId)
      continue;
    const score =
      (r.delivery_location_id ? 4 : 0) +
      (r.truck_type_id ? 2 : 0) +
      (r.shipment_type_id ? 1 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

export type FreightResult = {
  amount: number | null;
  currency: string;
  basis: string;
};

export function computeFreight(
  client: ClientPricing,
  ctx: { distanceKm: number | null; rate: ContractRate | null },
): FreightResult {
  if (client.pricing_mode === "per_km") {
    const d = ctx.distanceKm ?? 0;
    const perKm = client.rate_per_km ?? 0;
    const base = client.base_charge ?? 0;
    return {
      amount: round2(base + perKm * d),
      currency: client.currency,
      basis: `Distance: ${base} base + ${perKm}/km × ${d} km`,
    };
  }
  // fixed (contract rate per lane)
  if (!ctx.rate) {
    return {
      amount: null,
      currency: client.currency,
      basis: "Fixed: no matching contract rate for this lane",
    };
  }
  return {
    amount: round2(ctx.rate.rate),
    currency: ctx.rate.currency ?? client.currency,
    basis: "Fixed: contract rate",
  };
}

export type MarginResult = {
  cost: number | null;
  margin: number | null;
  basis: string;
};

export function computeMargin(ctx: {
  amount: number | null;
  carrierCost: number | null;
  client: ClientPricing;
}): MarginResult {
  const { amount, carrierCost, client } = ctx;
  if (amount == null) {
    return { cost: carrierCost, margin: null, basis: "No freight amount yet" };
  }
  if (carrierCost != null) {
    return {
      cost: carrierCost,
      margin: round2(amount - carrierCost),
      basis: "Derived: price − carrier cost",
    };
  }
  if (client.margin_type === "percent" && client.margin_value != null) {
    return {
      cost: null,
      margin: round2((amount * client.margin_value) / 100),
      basis: `Markup: ${client.margin_value}%`,
    };
  }
  if (client.margin_type === "fixed" && client.margin_value != null) {
    return {
      cost: null,
      margin: round2(client.margin_value),
      basis: `Markup: fixed ${client.margin_value}`,
    };
  }
  return { cost: null, margin: null, basis: "No carrier cost or markup rule" };
}

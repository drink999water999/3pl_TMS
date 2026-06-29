// Server-only orchestration: load the rows a waybill needs, compute its freight
// + margin, and persist them. Freight (client-facing) goes on the waybill row;
// carrier cost + margin (internal) go in waybill_billing. Uses the service role
// so it can write the internal billing row regardless of the caller's role.
import { createAdminClient } from "@/lib/supabase/admin";
import {
  matchContractRate,
  computeFreight,
  computeMargin,
  type ClientPricing,
  type ContractRate,
} from "@/lib/pricing";

export async function priceWaybill(waybillId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: wb } = await admin
    .from("waybills")
    .select("id, request_id, dispatch_id")
    .eq("id", waybillId)
    .maybeSingle();
  if (!wb) return;

  const { data: req } = await admin
    .from("transport_requests")
    .select(
      "client_id, delivery_location_id, service_type_id, shipment_type_id, distance_km",
    )
    .eq("id", wb.request_id)
    .maybeSingle();
  if (!req) return;

  const { data: dispatch } = await admin
    .from("dispatches")
    .select("carrier_cost, customer_charge, service_type_id")
    .eq("id", wb.dispatch_id)
    .maybeSingle();

  const { data: client } = await admin
    .from("clients")
    .select(
      "pricing_mode, currency, rate_per_km, base_charge, margin_type, margin_value, multi_location_charge",
    )
    .eq("id", req.client_id)
    .maybeSingle();
  if (!client) return;

  const pricing = client as ClientPricing;

  // Multiple-locations surcharge: charged for every pickup AND delivery beyond
  // the first one on the trip.
  const [{ count: pickupCount }, { count: deliveryCount }] = await Promise.all([
    admin
      .from("request_pickups")
      .select("id", { count: "exact", head: true })
      .eq("request_id", wb.request_id),
    admin
      .from("request_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("request_id", wb.request_id),
  ]);
  const extraStops =
    Math.max(0, (pickupCount ?? 1) - 1) +
    Math.max(0, (deliveryCount ?? 1) - 1);
  const multiCharge =
    (client as { multi_location_charge?: number | null })
      .multi_location_charge ?? 0;
  const multiLocationAmount = extraStops * multiCharge;

  let rate: ContractRate | null = null;
  if (pricing.pricing_mode === "fixed") {
    const { data: rates } = await admin
      .from("contract_rates")
      .select(
        "delivery_location_id, service_type_id, shipment_type_id, rate, currency",
      )
      .eq("client_id", req.client_id)
      .is("deleted_at", null)
      .eq("is_active", true);
    rate = matchContractRate(rates ?? [], {
      deliveryId: req.delivery_location_id,
      serviceTypeId: dispatch?.service_type_id ?? req.service_type_id,
      shipmentTypeId: req.shipment_type_id,
    });
  }

  // A manual customer-charge on the dispatch overrides automatic pricing.
  const override = dispatch?.customer_charge ?? null;
  let freight: { amount: number | null; currency: string; basis: string };
  if (override != null) {
    freight = {
      amount: override,
      currency: pricing.currency,
      basis: "Manual customer charge",
    };
  } else {
    const base = computeFreight(pricing, {
      distanceKm: req.distance_km,
      rate,
    });
    // Add the multiple-locations surcharge for each extra pickup/delivery stop.
    freight =
      base.amount != null && multiLocationAmount > 0
        ? {
            amount: Math.round((base.amount + multiLocationAmount) * 100) / 100,
            currency: base.currency,
            basis: `${base.basis} + ${extraStops} extra stop(s) × ${multiCharge}`,
          }
        : base;
  }
  const margin = computeMargin({
    amount: freight.amount,
    carrierCost: dispatch?.carrier_cost ?? null,
    client: pricing,
  });

  await admin
    .from("waybills")
    .update({ freight_amount: freight.amount, currency: freight.currency })
    .eq("id", waybillId);

  await admin.from("waybill_billing").upsert(
    {
      waybill_id: waybillId,
      freight_amount: freight.amount,
      carrier_cost: margin.cost,
      margin_amount: margin.margin,
      currency: freight.currency,
      pricing_mode: pricing.pricing_mode,
      basis: `${freight.basis} | ${margin.basis}`,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "waybill_id" },
  );
}

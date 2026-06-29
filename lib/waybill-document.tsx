// Server-only: renders a waybill to PDF with @react-pdf/renderer.
// Built entirely from the waybill's persisted SNAPSHOT (+ request items), so a
// historical PDF never changes when master data changes later.
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Tables } from "@/lib/database.types";
import { formatDate, formatMoney } from "@/lib/format";

type Waybill = Tables<"waybills">;
type Item = Tables<"request_items">;
export type WaybillStop = {
  name: string | null;
  address: string | null;
  city: string | null;
  mapsUrl: string | null;
  contact: string | null;
};

const NAVY = "#0f2a4a";
const BORDER = "#c9d2dd";
const MUTED = "#5b6878";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    color: "#1a2330",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY },
  brandSub: { fontSize: 9, color: MUTED, marginTop: 2 },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  docMeta: { fontSize: 9, color: MUTED, marginTop: 2, textAlign: "right" },
  section: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    backgroundColor: "#eef2f7",
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  sectionBody: { padding: 8 },
  row: { flexDirection: "row", marginBottom: 4 },
  cell: { flex: 1, paddingRight: 8 },
  fieldLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase" },
  fieldValue: { fontSize: 10, marginTop: 1 },
  addressBox: { flex: 1, paddingRight: 12 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#eef2f7",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: NAVY },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
  },
});

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value !== "" ? value : "—"}</Text>
    </View>
  );
}

export function waybillDocument({
  waybill,
  items,
  appName,
  pickups = [],
  deliveries = [],
}: {
  waybill: Waybill;
  items: Item[];
  appName: string;
  pickups?: WaybillStop[];
  deliveries?: WaybillStop[];
}): React.ReactElement {
  // Extra delivery stops (beyond the primary one shown on page 1) each get their
  // own page so a multi-drop trip produces a multi-page waybill.
  const extraStops = deliveries.length > 1 ? deliveries.slice(1) : [];
  return (
    <Document title={waybill.waybill_no}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{appName}</Text>
            <Text style={styles.brandSub}>Transport Waybill</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{waybill.waybill_no}</Text>
            <Text style={styles.docMeta}>
              Issued {formatDate(waybill.issued_at)}
            </Text>
            <Text style={styles.docMeta}>
              Status: {waybill.status === "approved" ? "Approved" : "Draft"}
              {waybill.revision > 0 ? ` · Rev ${waybill.revision}` : ""}
            </Text>
          </View>
        </View>

        {/* 1) E-Way / document details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>E-Way Details</Text>
          <View style={styles.sectionBody}>
            <View style={styles.row}>
              <Field label="Waybill No." value={waybill.waybill_no} />
              <Field label="Issued" value={formatDate(waybill.issued_at)} />
              <Field
                label="Shipment Type"
                value={waybill.shipment_type_name}
              />
              <Field label="Pickup Date" value={formatDate(waybill.pickup_date)} />
            </View>
          </View>
        </View>

        {/* 2) Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.sectionBody}>
            <View style={styles.row}>
              <Field label="Sender" value={waybill.client_name} />
              <Field label="Receiver" value={waybill.receiver_name} />
              <Field label="PO / Reference" value={waybill.po_reference} />
            </View>
            <View style={styles.row}>
              <View style={styles.addressBox}>
                <Text style={styles.fieldLabel}>Pickup Address</Text>
                <Text style={styles.fieldValue}>
                  {waybill.pickup_address || "—"}
                </Text>
              </View>
              <View style={styles.addressBox}>
                <Text style={styles.fieldLabel}>Delivery Address</Text>
                <Text style={styles.fieldValue}>
                  {waybill.delivery_address || "—"}
                </Text>
                {waybill.delivery_maps_url ? (
                  <Link
                    src={waybill.delivery_maps_url}
                    style={{ fontSize: 9, color: "#2b8fd6", marginTop: 2 }}
                  >
                    Open location in Google Maps
                  </Link>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* 2b) Additional pickups (multi-pickup trips) */}
        {pickups.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Locations</Text>
            <View style={styles.sectionBody}>
              {pickups.map((p, i) => (
                <View key={i} style={styles.row}>
                  <Field label={`Pickup ${i + 1}`} value={p.name} />
                  <Field label="City" value={p.city} />
                  <Field label="Address" value={p.address} />
                  <Field label="Contact" value={p.contact} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 3) Goods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goods</Text>
          <View>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 3 }]}>Item</Text>
              <Text style={[styles.th, { flex: 4 }]}>Description</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
                Qty
              </Text>
              <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>
                Unit Price
              </Text>
            </View>
            {items.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ flex: 1, color: MUTED }}>
                  No itemized goods. Total quantity: {waybill.quantity ?? "—"}
                </Text>
              </View>
            ) : (
              items.map((it) => (
                <View key={it.id} style={styles.tableRow}>
                  <Text style={{ flex: 3 }}>{it.item_name}</Text>
                  <Text style={{ flex: 4 }}>{it.description || "—"}</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>
                    {it.quantity ?? "—"}
                  </Text>
                  <Text style={{ flex: 2, textAlign: "right" }}>
                    {it.unit_price != null ? formatMoney(it.unit_price) : "—"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* 4) Transportation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transportation</Text>
          <View style={styles.sectionBody}>
            <View style={styles.row}>
              <Field label="Truck Number" value={waybill.truck_number} />
              <Field label="Service Type" value={waybill.service_type_name} />
              <Field label="Driver" value={waybill.driver_name} />
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{appName}</Text>
          <Text>
            {waybill.waybill_no} · Generated {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>

      {/* One extra page per additional delivery stop. */}
      {extraStops.map((stop, i) => (
        <Page key={i} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>{appName}</Text>
              <Text style={styles.brandSub}>
                Transport Waybill · Delivery Stop {i + 2} of {deliveries.length}
              </Text>
            </View>
            <View>
              <Text style={styles.docTitle}>{waybill.waybill_no}</Text>
              <Text style={styles.docMeta}>{waybill.client_name ?? ""}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Delivery Stop {i + 2}
            </Text>
            <View style={styles.sectionBody}>
              <View style={styles.row}>
                <Field label="Receiver" value={stop.name} />
                <Field label="City" value={stop.city} />
                <Field label="Contact" value={stop.contact} />
              </View>
              <View style={styles.row}>
                <View style={styles.addressBox}>
                  <Text style={styles.fieldLabel}>Delivery Address</Text>
                  <Text style={styles.fieldValue}>{stop.address || "—"}</Text>
                  {stop.mapsUrl ? (
                    <Link
                      src={stop.mapsUrl}
                      style={{ fontSize: 9, color: "#2b8fd6", marginTop: 2 }}
                    >
                      Open location in Google Maps
                    </Link>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text>{appName}</Text>
            <Text>
              {waybill.waybill_no} · Generated{" "}
              {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

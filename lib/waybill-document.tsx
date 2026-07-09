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
const LINK = "#2b8fd6";

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
  mapsLink: { fontSize: 9, color: LINK, marginTop: 3 },
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

// One address box: label + city (per the requested "Pick Up/Delivery Address =
// City" format) + a clickable Google Maps link when a URL is available.
function AddressBox({
  label,
  city,
  mapsUrl,
}: {
  label: string;
  city: string | null;
  mapsUrl: string | null;
}) {
  return (
    <View style={styles.addressBox}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{city && city !== "" ? city : "—"}</Text>
      {mapsUrl ? (
        <Link src={mapsUrl} style={styles.mapsLink}>
          Open location in Google Maps
        </Link>
      ) : null}
    </View>
  );
}

// A complete waybill page. Rendered once for the primary delivery and once per
// additional delivery location, so every location produces a full document.
function WaybillPageBody({
  waybill,
  items,
  appName,
  delivery,
  pageLabel,
}: {
  waybill: Waybill;
  items: Item[];
  appName: string;
  delivery: {
    receiver: string | null;
    city: string | null;
    mapsUrl: string | null;
  };
  pageLabel?: string;
}): React.ReactElement {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{appName}</Text>
          <Text style={styles.brandSub}>
            Transport Waybill{pageLabel ? ` · ${pageLabel}` : ""}
          </Text>
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
            <Field label="Shipment Type" value={waybill.shipment_type_name} />
            <Field label="Pickup Date" value={formatDate(waybill.pickup_date)} />
          </View>
        </View>
      </View>

      {/* 2) Address — Sender/Receiver + Pickup/Delivery city + maps for both */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <View style={styles.sectionBody}>
          <View style={styles.row}>
            <Field label="Sender" value={waybill.client_name} />
            <Field label="Receiver" value={delivery.receiver} />
            <Field label="PO / Reference" value={waybill.po_reference} />
          </View>
          <View style={styles.row}>
            <AddressBox
              label="Pickup Address"
              city={waybill.pickup_city}
              mapsUrl={waybill.pickup_maps_url}
            />
            <AddressBox
              label="Delivery Address"
              city={delivery.city}
              mapsUrl={delivery.mapsUrl}
            />
          </View>
        </View>
      </View>

      {/* 3) Goods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goods</Text>
        <View>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 3 }]}>Item</Text>
            <Text style={[styles.th, { flex: 4 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
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
              </View>
            ))
          )}
        </View>
      </View>

      {/* 4) Transportation — incl. Driver ID (license number) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transportation</Text>
        <View style={styles.sectionBody}>
          <View style={styles.row}>
            <Field label="Truck Number" value={waybill.truck_number} />
            <Field label="Service Type" value={waybill.service_type_name} />
          </View>
          <View style={styles.row}>
            <Field label="Driver" value={waybill.driver_name} />
            <Field label="Driver ID (License No.)" value={waybill.driver_license} />
          </View>
        </View>
      </View>

      {/* 5) Charges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Charges</Text>
        <View style={styles.sectionBody}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>
              Total Amount
            </Text>
            <Text
              style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY }}
            >
              {waybill.freight_amount != null
                ? formatMoney(waybill.freight_amount, waybill.currency ?? "SAR")
                : "—"}
            </Text>
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
  );
}

export function waybillDocument({
  waybill,
  items,
  appName,
  deliveries = [],
}: {
  waybill: Waybill;
  items: Item[];
  appName: string;
  pickups?: WaybillStop[];
  deliveries?: WaybillStop[];
}): React.ReactElement {
  // Primary delivery comes from the waybill snapshot; any additional delivery
  // locations each get their own COMPLETE waybill page.
  const primary = {
    receiver: waybill.receiver_name,
    city: waybill.delivery_city,
    mapsUrl: waybill.delivery_maps_url,
  };
  const extraStops = deliveries.length > 1 ? deliveries.slice(1) : [];
  const totalPages = 1 + extraStops.length;

  return (
    <Document title={waybill.waybill_no}>
      <WaybillPageBody
        waybill={waybill}
        items={items}
        appName={appName}
        delivery={primary}
        pageLabel={totalPages > 1 ? `Location 1 of ${totalPages}` : undefined}
      />
      {extraStops.map((stop, i) => (
        <WaybillPageBody
          key={i}
          waybill={waybill}
          items={items}
          appName={appName}
          delivery={{
            receiver: stop.name,
            city: stop.city,
            mapsUrl: stop.mapsUrl,
          }}
          pageLabel={`Location ${i + 2} of ${totalPages}`}
        />
      ))}
    </Document>
  );
}

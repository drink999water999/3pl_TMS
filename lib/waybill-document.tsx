// Server-only: renders a waybill to PDF with @react-pdf/renderer.
// Built entirely from the waybill's persisted SNAPSHOT (+ request items), so a
// historical PDF never changes when master data changes later.
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Tables } from "@/lib/database.types";
import { formatDate, formatMoney } from "@/lib/format";

type Waybill = Tables<"waybills">;
type Item = Tables<"request_items">;

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
}: {
  waybill: Waybill;
  items: Item[];
  appName: string;
}): React.ReactElement {
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
              <Field label="Client" value={waybill.client_name} />
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
              </View>
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
              <Field label="Truck Type" value={waybill.truck_type_name} />
              <Field label="Driver" value={waybill.driver_name} />
              <Field label="Supplier" value={waybill.supplier_name} />
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
    </Document>
  );
}

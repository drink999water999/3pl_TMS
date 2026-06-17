# FastLane TMS — Test Cases for the "TMS Adjusts" Changes

This document covers every change made for the 12-section adjustment request.
Run these after applying the new migrations and rebuilding.

## 0. Prerequisites (do this first)

| Step | Action | Expected |
|---|---|---|
| 0.1 | Run `pnpm install` | Installs the new `xlsx` dependency (used by Excel import/export). |
| 0.2 | Run `supabase migration up` | Applies the 6 new migrations (foundation, truck_types, request_fields, confirmed_enum, dispatch_v2, waybill_v2) with no errors. |
| 0.3 | Run `pnpm build` then `pnpm dev` (or your normal start) | Builds with no errors and starts. |
| 0.4 | Log in as an **admin** | Sidebar shows new items: **Search**, **Setup**, **Reports** (plus existing Dashboard, Requests, Dispatch, Fleet, Waybills, Clients, Finance, Users). |

> Roles used below: **Admin** (full), **Operations** (requests), **Dispatch**, **Finance**, **Client** (customer portal).

---

## 1. Clients

| ID | Steps | Expected result |
|---|---|---|
| 1.1 | Go to **Setup → Service Types** | The list is pre-seeded with: Flatbed, Curtain Side, Chiller, Lorry-12 Ton, Lorry-10 Ton, Dyna-6 Ton, Dyna-5 Ton, Dyna-4 Ton, Pallet, Box. Pallet & Box show **Quantity? = Yes**. |
| 1.2 | Setup → **Cities**, add `Riyadh (RUH)`, `Jeddah (JED)`, `Dammam (DMM)` | Cities saved and listed. |
| 1.3 | Setup → **Routes**, add `Riyadh → Jeddah` and `Jeddah → Riyadh` | Routes saved, shown as "From → To". |
| 1.4 | Clients → open a client → **Edit** | Dialog shows **Client type** (Warehouse / Transportation) and **Multiple-locations charge**. Set type = Transportation, charge = 100. Save. |
| 1.5 | On the client detail header | A **Transportation** badge appears; the summary card shows **Client type**, **Multiple-locations charge = SAR 100**, and **Rate basis = Per trip**. |
| 1.6 | Client detail → **Locations → Add** | Dialog has **City**, **Receiver in-charge name**, **Receiver in-charge phone**. Add a delivery location in Jeddah with a receiver. Location row shows city + receiver. |
| 1.7 | Client detail → **Contract rates → Add** | Matrix editor: **Service type × Route × Price**. Pick Flatbed + Riyadh→Jeddah + 2000. Save. Row shows "Flatbed / Riyadh → Jeddah / SAR 2,000". |
| 1.8 | (If a Standard Rate exists for that service/route) open the rate dialog again | A "Standard rate: SAR X · Use standard" hint appears and fills the price when clicked. |
| 1.9 | Clients list → **Export Excel** | Downloads `clients.xlsx` with the client columns. |
| 1.10 | Clients list → **Template**, fill a row, **Import Excel** | Alert shows "Imported: X new, Y updated (matched on email/phone)". A row whose **email or phone** matches an existing client **updates** that client; otherwise it is created. |

## 2. Supplier (Outsourced Fleet)

| ID | Steps | Expected result |
|---|---|---|
| 2.1 | Fleet → **Suppliers** tab → click a supplier name | Opens the new **supplier detail** page. Rate basis shows **Per trip**. |
| 2.2 | Supplier detail → **Trucks → Add** | Add Truck plate, Driver name, Driver ID, Driver mobile, Truck type. Saved row shows all fields. |
| 2.3 | Supplier detail → **Cost list → Add** | Matrix **Service type × Route × Cost**. Add Flatbed + Riyadh→Jeddah + 1500. Saved. |
| 2.4 | Fleet page → **Suppliers Excel → Export / Template / Import** | Export downloads `suppliers.xlsx`; import upserts suppliers by code. |

## 3. New transport request (Client Portal)

| ID | Steps | Expected result |
|---|---|---|
| 3.1 | Log in as a **Client** → Requests → **New** | Client field is locked to the company; **Request source** shows "Customer portal" (locked). |
| 3.2 | Pick a pickup location | The location's **city** is shown beneath it. |
| 3.3 | **Service type** dropdown | Lists the seeded service types. Choosing **Pallet** or **Box** reveals the **Quantity** field; other types hide it. |
| 3.4 | **Delivery locations** | Can **Add stop** for multiple deliveries; each stop has its own receiver name/phone (pre-filled from the location, editable). Each stop shows its city. |
| 3.5 | Shipment type | Options include **Dry, Ambient, Cold, Frozen**. |
| 3.6 | With pickup city + first delivery city on a defined route | **Distance (km)** auto-fills from the route (still editable). |
| 3.7 | **Additional services** | Free-text description field present. |
| 3.8 | Submit/create | Request is created as Draft with all the above saved. |

## 4. New transport request (Admin Portal)

| ID | Steps | Expected result |
|---|---|---|
| 4.1 | Log in as **Admin/Operations** → Requests → New | **Request source** is selectable (In-house / Customer portal). |
| 4.2 | A **Pricing (admin)** card is shown | Contains **Additional services price** and **Trip selling price (override)**. |
| 4.3 | Pick a client + service type; pickup & first-delivery locations must have **cities** on a defined **route** (so the route auto-resolves) | A **Suggested** price appears = **contract rate** (if the client has one) **else the route\'s standard rate**, + (extra stops × multi-location charge) + additional services. The **Trip selling price auto-fills** with it (still editable / "Use suggested"). |
| 4.3b | Open the created request detail | **Selling price** is shown. If you never set it manually it shows as **"Selling price (auto)"**, computed from the matrix. |
| 4.4 | Add 2+ delivery stops | A note shows the multiple-locations charge applies per extra stop. |
| 4.5 | Open the created request detail | Shows Service type, **Route (cities)**, Request source, **Selling price**, the **Delivery stops** list, and Additional services. |

## 5. Request Page (list)

| ID | Steps | Expected result |
|---|---|---|
| 5.1 | Open **Requests** | Columns: Request #, **PO reference**, Client, **Client type**, **Location**, **Route**, Delivery date, Status. |
| 5.2 | Route column | Shows **cities (From → To)**, not location names. |
| 5.3 | Click any column header | Sorts ascending/descending (arrow indicator toggles). |
| 5.4 | Type in the **search box** | Filters rows across **all** columns (request #, PO, client, type, location, route, status). |
| 5.5 | Status chips | Still filter by status (server-side). |

## 6. Dispatch Process

| ID | Steps | Expected result |
|---|---|---|
| 6.1 | Dispatch an approved request → **Own fleet** | **No Carrier cost** field. **Customer charge** pre-filled from the request's selling price (editable). |
| 6.2 | Dispatch → **Outsourced** → pick a supplier | A **Truck plate** dropdown lists that supplier's trucks. |
| 6.3 | Select a plate | **Driver name, Driver ID, Truck type** auto-fill (all editable). **Carrier cost** auto-fills from the supplier's cost list for the route/service. **Customer charge** pre-filled. |
| 6.4 | Open a dispatch → **Mark as Picked Up** | A dialog requires the **actual pick-up time** (mandatory). |
| 6.5 | **Mark as Delivered** | Requires a POD first (existing guard) **and** an **actual delivery time** (mandatory). |
| 6.6 | After Delivered → **Mark as Confirmed** | A dialog requires a **PO / invoice / reference number** if the request has none. On confirm, the dispatch shows **Confirmed** and Ready-for-billing. |
| 6.7 | Outsourced dispatch detail | Shows the outsourced **Driver** and **Driver ID**. |
| 6.8 | Fleet → Trucks → Add/Edit | Truck dialog has a **Base city** field (own-fleet location). |

## 7. Dispatch Page (board)

| ID | Steps | Expected result |
|---|---|---|
| 7.1 | Dispatch board → Dispatches section | A **search box** filters by truck, driver, client, destination, request #. |
| 7.2 | **Status filter** dropdown | Filters to Assigned / Dispatched / Picked Up / In Transit / Delivered / Confirmed. |

## 8. Waybill

| ID | Steps | Expected result |
|---|---|---|
| 8.1 | Open a waybill (created when a dispatch reaches **Dispatched**) | Address section shows **Sender** (client), **Receiver** (delivery location name), and **PO / Reference**. |
| 8.2 | If the delivery location has a Google Maps URL | An **"Open location in Google Maps"** link appears (and is clickable in the downloaded **PDF**). |
| 8.3 | Download the **PDF** | Shows Sender/Receiver/PO, **no selling or cost prices anywhere**, and **no supplier** (own vs outsourced not identifiable). |
| 8.4 | View the waybill as a **Client** | No supplier field shown; no carrier cost / margin panel. |
| 8.5 | As **Admin/Finance** → Billing panel → change Customer charge with a **Reason** → Save | Price updates; a **Price change history** row logs original → new, the user, the date, and the reason. |

## 9. Dashboard

| ID | Steps | Expected result |
|---|---|---|
| 9.1 | Open **Dashboard** (admin/ops) → scroll to **Operations by area** | A table per city shows **In transit**, **Picked up**, **Delivered**, and **Free trucks**. |
| 9.2 | Header badge | Shows **N trucks in maintenance**. |
| 9.3 | Set a truck's status to *maintenance* / *available* with a base city | Maintenance count and free-trucks-per-area update accordingly. |

## 10. Reports

| ID | Steps | Expected result |
|---|---|---|
| 10.1 | Open **Reports** | A report selector with: Deliveries per **truck / driver / client / supplier / client type / area**, and **Month closing statement**. |
| 10.2 | Pick each report | The table shows the right columns and counts of completed (Delivered/Confirmed) shipments + revenue. |
| 10.3 | Month closing statement | Columns: Month, Deliveries, Revenue, Carrier cost, Margin. |
| 10.4 | **Export CSV** | Downloads the current report as CSV (opens in Excel). |

## 11. Fleet (drivers ↔ accounts)

| ID | Steps | Expected result |
|---|---|---|
| 11.1 | Fleet → Drivers → key/login action | Create/Reset/Revoke a driver app login (interconnection between a driver record and an auth account). The driver can then sign in and see **My Deliveries**. |

## 12. General

| ID | Steps | Expected result |
|---|---|---|
| 12.1 | Sidebar → **Search** → type a request #, waybill #, PO, customer, supplier, truck plate, driver name, driver mobile, or city | Matching results are grouped by type and link to the right page. |
| 12.2 | Search results → **Export** | Downloads the results as CSV. |
| 12.3 | Setup → **Standard Rates** (the Rate Page) | Add a standard price per service type + route. New client contract rates can then pre-fill from it via "Use standard". |

---

## Known limitations / not in this round
- **"Adjust mandatory fields"** (Section 3, last bullet): a configurable validation engine — not yet built. Current required fields are fixed (client + at least one delivery stop).
- **Excel import** covers core **client** and **supplier** fields; importing locations and contract-rate matrices by Excel is a future enhancement.
- **Automatic matrix pricing** on the waybill: freight currently follows the manual **selling price / customer charge** path. Auto-applying the Service-Type × Route matrix to waybill freight is a planned follow-up.

## Regression smoke test
- Create request → approve → dispatch (own & outsourced) → Dispatched → Picked Up → Delivered (with POD) → Confirmed.
- Confirm a waybill PDF generates, Finance shows the shipment, and a credit note can still be issued.

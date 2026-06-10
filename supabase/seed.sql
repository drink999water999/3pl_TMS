-- =============================================================================
-- FastLane TMS — local DEMO data (runs on `supabase db reset`, local only).
-- Reference lookups (truck/shipment types) live in a migration so they also
-- ship to production; this file is just sample master data for the local UI.
-- Idempotent: safe to re-run.
-- =============================================================================

-- --- Clients ------------------------------------------------------------------
insert into clients (name, code, phone, email, billing_address) values
  ('Acme Foods Ltd',    'ACME', '+20 100 000 0001', 'ops@acmefoods.example',  '12 Industrial Rd, Cairo'),
  ('Nile Retail Group', 'NILE', '+20 100 000 0002', 'logistics@nile.example', '5 Corniche, Alexandria')
on conflict do nothing;

-- --- Client contacts ----------------------------------------------------------
insert into client_contacts (client_id, name, phone, email, role, is_primary)
select c.id, 'Sara Mansour', '+20 100 111 2233', 'sara@acmefoods.example', 'Logistics Manager', true
from clients c where c.code = 'ACME'
on conflict do nothing;

insert into client_contacts (client_id, name, phone, email, role, is_primary)
select c.id, 'Omar Khaled', '+20 100 444 5566', 'omar@nile.example', 'Dispatch Coordinator', true
from clients c where c.code = 'NILE'
on conflict do nothing;

-- --- Locations (pickup + delivery per client) ---------------------------------
insert into locations (client_id, kind, name, address)
select c.id, 'pickup', 'Acme Cairo Warehouse', '12 Industrial Rd, Cairo'
from clients c where c.code = 'ACME'
on conflict do nothing;

insert into locations (client_id, kind, name, address)
select c.id, 'delivery', 'Acme Giza DC', '88 6th October, Giza'
from clients c where c.code = 'ACME'
on conflict do nothing;

insert into locations (client_id, kind, name, address)
select c.id, 'pickup', 'Nile Alexandria Hub', '5 Corniche, Alexandria'
from clients c where c.code = 'NILE'
on conflict do nothing;

insert into locations (client_id, kind, name, address)
select c.id, 'delivery', 'Nile Cairo Store', '20 Tahrir Sq, Cairo'
from clients c where c.code = 'NILE'
on conflict do nothing;

-- --- Drivers ------------------------------------------------------------------
insert into drivers (name, phone, license_no, status) values
  ('Ahmed Saleh',  '+20 101 222 3344', 'DL-100234', 'available'),
  ('Mahmoud Adel', '+20 101 555 6677', 'DL-100987', 'available')
on conflict do nothing;

-- --- Trucks (linked to truck types + a default driver) ------------------------
insert into trucks (code, plate_number, truck_type_id, capacity, status, default_driver_id)
select 'TRK-001', 'CAI-1234', tt.id, 10000, 'available', d.id
from truck_types tt, drivers d
where tt.code = '10T' and d.license_no = 'DL-100234'
on conflict do nothing;

insert into trucks (code, plate_number, truck_type_id, capacity, status, default_driver_id)
select 'TRK-002', 'CAI-5678', tt.id, 5000, 'available', d.id
from truck_types tt, drivers d
where tt.code = '5T' and d.license_no = 'DL-100987'
on conflict do nothing;

insert into trucks (code, plate_number, truck_type_id, capacity, status)
select 'TRK-003', 'ALX-9012', tt.id, 1500, 'maintenance'
from truck_types tt where tt.code = 'VAN'
on conflict do nothing;

-- --- Suppliers (outsourced carriers) + their truck types ----------------------
insert into suppliers (name, code, phone, email, status) values
  ('Delta Transport Co', 'DELTA', '+20 102 777 8899', 'book@delta.example', 'active'),
  ('Cairo Movers',       'CMOV',  '+20 102 333 1122', 'ops@cmov.example',   'active')
on conflict do nothing;

insert into supplier_truck_types (supplier_id, truck_type_id)
select s.id, tt.id from suppliers s, truck_types tt
where s.code = 'DELTA' and tt.code in ('10T', 'CURT')
on conflict do nothing;

insert into supplier_truck_types (supplier_id, truck_type_id)
select s.id, tt.id from suppliers s, truck_types tt
where s.code = 'CMOV' and tt.code in ('5T', 'VAN')
on conflict do nothing;

-- --- A sample contract rate ---------------------------------------------------
insert into contract_rates (client_id, delivery_location_id, truck_type_id, shipment_type_id, rate, currency)
select c.id, l.id, tt.id, st.id, 3500.00, 'EGP'
from clients c
join locations l on l.client_id = c.id and l.kind = 'delivery' and l.name = 'Acme Giza DC'
join truck_types tt on tt.code = '10T'
join shipment_types st on st.code = 'DRY'
where c.code = 'ACME'
on conflict do nothing;

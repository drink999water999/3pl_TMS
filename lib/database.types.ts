// AUTO-GENERATED from the validated schema (Phase 1).
// Regenerate authoritatively once the local stack is up: `pnpm db:types`.

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      client_contacts: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          role: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          role?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          role?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          code: string;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          billing_address: string | null;
          notes: string | null;
          pricing_mode: string;
          currency: string;
          rate_per_km: number | null;
          base_charge: number;
          margin_type: string | null;
          margin_value: number | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          name: string;
          code: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          pricing_mode?: string;
          currency?: string;
          rate_per_km?: number | null;
          base_charge?: number;
          margin_type?: string | null;
          margin_value?: number | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          name?: string;
          code?: string;
          tax_id?: string | null;
          phone?: string | null;
          email?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          pricing_mode?: string;
          currency?: string;
          rate_per_km?: number | null;
          base_charge?: number;
          margin_type?: string | null;
          margin_value?: number | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_rates: {
        Row: {
          id: string;
          client_id: string;
          delivery_location_id: string | null;
          truck_type_id: string | null;
          shipment_type_id: string | null;
          rate: number;
          currency: string;
          effective_from: string | null;
          effective_to: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          delivery_location_id?: string | null;
          truck_type_id?: string | null;
          shipment_type_id?: string | null;
          rate: number;
          currency?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          delivery_location_id?: string | null;
          truck_type_id?: string | null;
          shipment_type_id?: string | null;
          rate?: number;
          currency?: string;
          effective_from?: string | null;
          effective_to?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dispatches: {
        Row: {
          id: string;
          request_id: string;
          assignment_type: Database["public"]["Enums"]["assignment_type"];
          truck_id: string | null;
          driver_id: string | null;
          supplier_id: string | null;
          supplier_truck: string | null;
          truck_type_id: string | null;
          status: Database["public"]["Enums"]["dispatch_status"];
          version: number;
          has_issue: boolean;
          issue_note: string | null;
          issue_resolved_at: string | null;
          dispatched_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          ready_for_billing: boolean;
          closed_at: string | null;
          notes: string | null;
          carrier_cost: number | null;
          customer_charge: number | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          assignment_type: Database["public"]["Enums"]["assignment_type"];
          truck_id?: string | null;
          driver_id?: string | null;
          supplier_id?: string | null;
          supplier_truck?: string | null;
          truck_type_id?: string | null;
          status?: Database["public"]["Enums"]["dispatch_status"];
          version?: number;
          has_issue?: boolean;
          issue_note?: string | null;
          issue_resolved_at?: string | null;
          dispatched_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          ready_for_billing?: boolean;
          closed_at?: string | null;
          notes?: string | null;
          carrier_cost?: number | null;
          customer_charge?: number | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          assignment_type?: Database["public"]["Enums"]["assignment_type"];
          truck_id?: string | null;
          driver_id?: string | null;
          supplier_id?: string | null;
          supplier_truck?: string | null;
          truck_type_id?: string | null;
          status?: Database["public"]["Enums"]["dispatch_status"];
          version?: number;
          has_issue?: boolean;
          issue_note?: string | null;
          issue_resolved_at?: string | null;
          dispatched_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          ready_for_billing?: boolean;
          closed_at?: string | null;
          notes?: string | null;
          carrier_cost?: number | null;
          customer_charge?: number | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string | null;
          name: string;
          phone: string | null;
          license_no: string | null;
          status: Database["public"]["Enums"]["driver_status"];
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          user_id?: string | null;
          name: string;
          phone?: string | null;
          license_no?: string | null;
          status?: Database["public"]["Enums"]["driver_status"];
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          user_id?: string | null;
          name?: string;
          phone?: string | null;
          license_no?: string | null;
          status?: Database["public"]["Enums"]["driver_status"];
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exceptions: {
        Row: {
          id: string;
          request_id: string | null;
          dispatch_id: string | null;
          kind: Database["public"]["Enums"]["exception_kind"];
          description: string | null;
          reported_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          dispatch_id?: string | null;
          kind: Database["public"]["Enums"]["exception_kind"];
          description?: string | null;
          reported_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string | null;
          dispatch_id?: string | null;
          kind?: Database["public"]["Enums"]["exception_kind"];
          description?: string | null;
          reported_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          client_id: string;
          kind: Database["public"]["Enums"]["location_kind"];
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          maps_url: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          kind: Database["public"]["Enums"]["location_kind"];
          name: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          maps_url?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          kind?: Database["public"]["Enums"]["location_kind"];
          name?: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          maps_url?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pods: {
        Row: {
          id: string;
          dispatch_id: string;
          kind: Database["public"]["Enums"]["pod_kind"];
          storage_path: string | null;
          note: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          dispatch_id: string;
          kind: Database["public"]["Enums"]["pod_kind"];
          storage_path?: string | null;
          note?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          dispatch_id?: string;
          kind?: Database["public"]["Enums"]["pod_kind"];
          storage_path?: string | null;
          note?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          driver_id: string | null;
          client_id: string | null;
          company_name: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          driver_id?: string | null;
          client_id?: string | null;
          company_name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          driver_id?: string | null;
          client_id?: string | null;
          company_name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      request_items: {
        Row: {
          id: string;
          request_id: string;
          item_name: string;
          description: string | null;
          quantity: number | null;
          unit_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          item_name: string;
          description?: string | null;
          quantity?: number | null;
          unit_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          item_name?: string;
          description?: string | null;
          quantity?: number | null;
          unit_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shipment_types: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      status_history: {
        Row: {
          id: string;
          entity: string;
          entity_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          entity: string;
          entity_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          entity?: string;
          entity_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [];
      };
      supplier_rates: {
        Row: {
          id: string;
          supplier_id: string;
          truck_type_id: string | null;
          lane: string | null;
          rate: number;
          currency: string;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          truck_type_id?: string | null;
          lane?: string | null;
          rate: number;
          currency?: string;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          truck_type_id?: string | null;
          lane?: string | null;
          rate?: number;
          currency?: string;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      supplier_truck_types: {
        Row: {
          supplier_id: string;
          truck_type_id: string;
          created_at: string;
        };
        Insert: {
          supplier_id: string;
          truck_type_id: string;
          created_at?: string;
        };
        Update: {
          supplier_id?: string;
          truck_type_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          code: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          status: Database["public"]["Enums"]["supplier_status"];
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          name: string;
          code?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["supplier_status"];
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          name?: string;
          code?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          status?: Database["public"]["Enums"]["supplier_status"];
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transport_requests: {
        Row: {
          id: string;
          request_no: string;
          client_id: string;
          pickup_location_id: string | null;
          delivery_location_id: string | null;
          shipment_type_id: string | null;
          truck_type_id: string | null;
          quantity: number | null;
          weight: number | null;
          pallets: number | null;
          distance_km: number | null;
          required_pickup_at: string | null;
          delivery_date: string | null;
          special_instructions: string | null;
          po_reference: string | null;
          status: Database["public"]["Enums"]["request_status"];
          approved_by: string | null;
          approved_at: string | null;
          rejected_reason: string | null;
          cancelled_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_no: string;
          client_id: string;
          pickup_location_id?: string | null;
          delivery_location_id?: string | null;
          shipment_type_id?: string | null;
          truck_type_id?: string | null;
          quantity?: number | null;
          weight?: number | null;
          pallets?: number | null;
          distance_km?: number | null;
          required_pickup_at?: string | null;
          delivery_date?: string | null;
          special_instructions?: string | null;
          po_reference?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          cancelled_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_no?: string;
          client_id?: string;
          pickup_location_id?: string | null;
          delivery_location_id?: string | null;
          shipment_type_id?: string | null;
          truck_type_id?: string | null;
          quantity?: number | null;
          weight?: number | null;
          pallets?: number | null;
          distance_km?: number | null;
          required_pickup_at?: string | null;
          delivery_date?: string | null;
          special_instructions?: string | null;
          po_reference?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          cancelled_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      truck_types: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trucks: {
        Row: {
          id: string;
          tenant_id: string | null;
          code: string;
          plate_number: string;
          truck_type_id: string | null;
          capacity: number | null;
          capacity_unit: string | null;
          status: Database["public"]["Enums"]["truck_status"];
          default_driver_id: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          code: string;
          plate_number: string;
          truck_type_id?: string | null;
          capacity?: number | null;
          capacity_unit?: string | null;
          status?: Database["public"]["Enums"]["truck_status"];
          default_driver_id?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          code?: string;
          plate_number?: string;
          truck_type_id?: string | null;
          capacity?: number | null;
          capacity_unit?: string | null;
          status?: Database["public"]["Enums"]["truck_status"];
          default_driver_id?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waybill_billing: {
        Row: {
          waybill_id: string;
          freight_amount: number | null;
          carrier_cost: number | null;
          margin_amount: number | null;
          currency: string | null;
          pricing_mode: string | null;
          basis: string | null;
          payment_status: string;
          invoice_no: string | null;
          paid_at: string | null;
          computed_at: string;
        };
        Insert: {
          waybill_id: string;
          freight_amount?: number | null;
          carrier_cost?: number | null;
          margin_amount?: number | null;
          currency?: string | null;
          pricing_mode?: string | null;
          basis?: string | null;
          payment_status?: string;
          invoice_no?: string | null;
          paid_at?: string | null;
          computed_at?: string;
        };
        Update: {
          waybill_id?: string;
          freight_amount?: number | null;
          carrier_cost?: number | null;
          margin_amount?: number | null;
          currency?: string | null;
          pricing_mode?: string | null;
          basis?: string | null;
          payment_status?: string;
          invoice_no?: string | null;
          paid_at?: string | null;
          computed_at?: string;
        };
        Relationships: [];
      };
      waybill_pdfs: {
        Row: {
          id: string;
          waybill_id: string;
          storage_path: string;
          file_name: string | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          waybill_id: string;
          storage_path: string;
          file_name?: string | null;
          generated_at?: string;
        };
        Update: {
          id?: string;
          waybill_id?: string;
          storage_path?: string;
          file_name?: string | null;
          generated_at?: string;
        };
        Relationships: [];
      };
      waybills: {
        Row: {
          id: string;
          waybill_no: string;
          dispatch_id: string;
          request_id: string;
          status: Database["public"]["Enums"]["waybill_status"];
          issued_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          client_name: string | null;
          pickup_address: string | null;
          delivery_address: string | null;
          truck_number: string | null;
          truck_type_name: string | null;
          shipment_type_name: string | null;
          quantity: number | null;
          freight_amount: number | null;
          currency: string | null;
          pickup_date: string | null;
          supplier_name: string | null;
          driver_name: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          waybill_no: string;
          dispatch_id: string;
          request_id: string;
          status?: Database["public"]["Enums"]["waybill_status"];
          issued_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          client_name?: string | null;
          pickup_address?: string | null;
          delivery_address?: string | null;
          truck_number?: string | null;
          truck_type_name?: string | null;
          shipment_type_name?: string | null;
          quantity?: number | null;
          freight_amount?: number | null;
          currency?: string | null;
          pickup_date?: string | null;
          supplier_name?: string | null;
          driver_name?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          waybill_no?: string;
          dispatch_id?: string;
          request_id?: string;
          status?: Database["public"]["Enums"]["waybill_status"];
          issued_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          client_name?: string | null;
          pickup_address?: string | null;
          delivery_address?: string | null;
          truck_number?: string | null;
          truck_type_name?: string | null;
          shipment_type_name?: string | null;
          quantity?: number | null;
          freight_amount?: number | null;
          currency?: string | null;
          pickup_date?: string | null;
          supplier_name?: string | null;
          driver_name?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      assignment_type: "own" | "outsourced";
      dispatch_status: "Assigned" | "Dispatched" | "Picked Up" | "In Transit" | "Delivered";
      driver_status: "available" | "on_trip" | "off_duty" | "inactive";
      exception_kind: "delay" | "damage" | "complaint";
      location_kind: "pickup" | "delivery";
      pod_kind: "signed_note" | "photo";
      request_status: "Draft" | "Submitted" | "Approved" | "Assigned" | "Delivered" | "Rejected" | "Cancelled";
      supplier_status: "active" | "inactive";
      truck_status: "available" | "busy" | "maintenance";
      user_role:
        | "admin"
        | "operations"
        | "dispatch"
        | "driver"
        | "finance"
        | "client";
      waybill_status: "draft" | "approved";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T];

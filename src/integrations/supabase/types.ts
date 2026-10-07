export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          city: string | null
          color: string
          company: string
          created_at: string
          dealer_id: string | null
          email: string | null
          id: string
          notes: string | null
          owner_id: string | null
          person: string
          phone: string
          rating: number
          source: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          color?: string
          company: string
          created_at?: string
          dealer_id?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          person: string
          phone: string
          rating?: number
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          color?: string
          company?: string
          created_at?: string
          dealer_id?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          person?: string
          phone?: string
          rating?: number
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          logo_data: string | null
          phone: string | null
          tagline: string | null
          terms_html: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          logo_data?: string | null
          phone?: string | null
          tagline?: string | null
          terms_html?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          logo_data?: string | null
          phone?: string | null
          tagline?: string | null
          terms_html?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      dispatches: {
        Row: {
          bilty_number: string | null
          created_at: string
          dispatch_at: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          item_index: number
          notes: string | null
          number: string
          order_id: string
          status: string
          transporter: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          bilty_number?: string | null
          created_at?: string
          dispatch_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          item_index?: number
          notes?: string | null
          number: string
          order_id: string
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          bilty_number?: string | null
          created_at?: string
          dispatch_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          item_index?: number
          notes?: string | null
          number?: string
          order_id?: string
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_counters: {
        Row: {
          n: number
          prefix: string
          year: number
        }
        Insert: {
          n?: number
          prefix: string
          year: number
        }
        Update: {
          n?: number
          prefix?: string
          year?: number
        }
        Relationships: []
      }
      interactions: {
        Row: {
          accent: string | null
          at: string
          by_user: string | null
          client_id: string
          created_at: string
          discussion: string | null
          id: string
          next_followup_at: string | null
          next_step: string | null
          outcome: string | null
          updated_at: string
        }
        Insert: {
          accent?: string | null
          at?: string
          by_user?: string | null
          client_id: string
          created_at?: string
          discussion?: string | null
          id?: string
          next_followup_at?: string | null
          next_step?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string | null
          at?: string
          by_user?: string | null
          client_id?: string
          created_at?: string
          discussion?: string | null
          id?: string
          next_followup_at?: string | null
          next_step?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          current_stock: number
          id: string
          location: string | null
          min_level: number
          name: string
          purchase_reference: string | null
          sku: string
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          location?: string | null
          min_level?: number
          name: string
          purchase_reference?: string | null
          sku: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          location?: string | null
          min_level?: number
          name?: string
          purchase_reference?: string | null
          sku?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          allow_negative: boolean
          at: string | null
          by_user: string | null
          created_at: string
          id: string
          item_id: string
          job_work_id: string | null
          order_id: string | null
          party: string | null
          quantity: number
          reference_number: string | null
          remarks: string | null
          txn_type: string
          updated_at: string
        }
        Insert: {
          allow_negative?: boolean
          at?: string | null
          by_user?: string | null
          created_at?: string
          id?: string
          item_id: string
          job_work_id?: string | null
          order_id?: string | null
          party?: string | null
          quantity?: number
          reference_number?: string | null
          remarks?: string | null
          txn_type: string
          updated_at?: string
        }
        Update: {
          allow_negative?: boolean
          at?: string | null
          by_user?: string | null
          created_at?: string
          id?: string
          item_id?: string
          job_work_id?: string | null
          order_id?: string | null
          party?: string | null
          quantity?: number
          reference_number?: string | null
          remarks?: string | null
          txn_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_work: {
        Row: {
          actual_return: string | null
          auto_stock_in_done: boolean
          created_at: string
          current_stage_index: number
          direction: string
          expected_return: string | null
          followup_notes: string | null
          id: string
          images: Json
          initial_quantity: number | null
          inventory_item_id: string | null
          inventory_transaction_id: string | null
          item: string
          next_followup_at: string | null
          notes: string | null
          number: string
          process_history: Json
          process_stage: string | null
          quantity_received: number | null
          quantity_sent: number | null
          send_date: string | null
          stages: Json
          status: string
          updated_at: string
          vendor: string | null
          work_type: string | null
        }
        Insert: {
          actual_return?: string | null
          auto_stock_in_done?: boolean
          created_at?: string
          current_stage_index?: number
          direction?: string
          expected_return?: string | null
          followup_notes?: string | null
          id?: string
          images?: Json
          initial_quantity?: number | null
          inventory_item_id?: string | null
          inventory_transaction_id?: string | null
          item: string
          next_followup_at?: string | null
          notes?: string | null
          number: string
          process_history?: Json
          process_stage?: string | null
          quantity_received?: number | null
          quantity_sent?: number | null
          send_date?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          vendor?: string | null
          work_type?: string | null
        }
        Update: {
          actual_return?: string | null
          auto_stock_in_done?: boolean
          created_at?: string
          current_stage_index?: number
          direction?: string
          expected_return?: string | null
          followup_notes?: string | null
          id?: string
          images?: Json
          initial_quantity?: number | null
          inventory_item_id?: string | null
          inventory_transaction_id?: string | null
          item?: string
          next_followup_at?: string | null
          notes?: string | null
          number?: string
          process_history?: Json
          process_stage?: string | null
          quantity_received?: number | null
          quantity_sent?: number | null
          send_date?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          vendor?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_work_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string
          created_by: string | null
          dealer_id: string | null
          dispatch_date: string | null
          expected_delivery: string | null
          id: string
          items: Json
          notes: string | null
          number: string
          order_date: string | null
          quotation_id: string | null
          revised_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          dispatch_date?: string | null
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number: string
          order_date?: string | null
          quotation_id?: string | null
          revised_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          dispatch_date?: string | null
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          order_date?: string | null
          quotation_id?: string | null
          revised_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          at: string | null
          client_id: string | null
          created_at: string
          id: string
          mode: string
          notes: string | null
          number: string
          order_id: string
          receipt_url: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          number: string
          order_id: string
          receipt_url?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          at?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          number?: string
          order_id?: string
          receipt_url?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_updates: {
        Row: {
          by_user: string | null
          created_at: string
          id: string
          item_index: number
          notes: string | null
          order_id: string
          progress: number
          stage: string
          updated_at: string
        }
        Insert: {
          by_user?: string | null
          created_at?: string
          id?: string
          item_index?: number
          notes?: string | null
          order_id: string
          progress?: number
          stage: string
          updated_at?: string
        }
        Update: {
          by_user?: string | null
          created_at?: string
          id?: string
          item_index?: number
          notes?: string | null
          order_id?: string
          progress?: number
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          default_price: number
          description: string | null
          id: string
          model_code: string | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          model_code?: string | null
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          model_code?: string | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          login_id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          id: string
          login_id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          login_id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string
          created_by: string | null
          dealer_id: string | null
          id: string
          items: Json
          notes: string | null
          number: string
          order_date: string | null
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number: string
          order_date?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string
          order_date?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          modules: Json
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          modules?: Json
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          modules?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_perm: { Args: { _action: string; _module: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dealer: { Args: never; Returns: boolean }
      my_role: { Args: never; Returns: string }
      next_doc_number: { Args: { _prefix: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "Admin"
        | "Sales"
        | "Production"
        | "QC"
        | "Accountant"
        | "Dealer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Admin", "Sales", "Production", "QC", "Accountant", "Dealer"],
    },
  },
} as const

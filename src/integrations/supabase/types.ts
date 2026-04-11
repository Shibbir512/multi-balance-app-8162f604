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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          ledger_id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          ledger_id: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          ledger_id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          ledger_id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ledger_id: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ledger_id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_batch_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          master_item_id: string | null
          name: string
          price_per_unit: number
          quantity: number
          subtotal: number
          unit: string
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          master_item_id?: string | null
          name: string
          price_per_unit?: number
          quantity?: number
          subtotal?: number
          unit?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          master_item_id?: string | null
          name?: string
          price_per_unit?: number
          quantity?: number
          subtotal?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grocery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_batch_items_master_item_id_fkey"
            columns: ["master_item_id"]
            isOneToOne: false
            referencedRelation: "grocery_master_items"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_batches: {
        Row: {
          batch_date: string
          created_at: string
          id: string
          ledger_id: string
          status: string
          total_amount: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_date?: string
          created_at?: string
          id?: string
          ledger_id: string
          status?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_date?: string
          created_at?: string
          id?: string
          ledger_id?: string
          status?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_batches_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_batches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_master_items: {
        Row: {
          average_interval: number | null
          created_at: string
          default_quantity: number
          id: string
          last_purchase_date: string | null
          ledger_id: string
          name: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_interval?: number | null
          created_at?: string
          default_quantity?: number
          id?: string
          last_purchase_date?: string | null
          ledger_id: string
          name: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_interval?: number | null
          created_at?: string
          default_quantity?: number
          id?: string
          last_purchase_date?: string | null
          ledger_id?: string
          name?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_master_items_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      ledgers: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          ledger_id: string
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          ledger_id: string
          note?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          ledger_id?: string
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      zakat_calculations: {
        Row: {
          bank_balance: number
          business_assets: number
          cash: number
          created_at: string
          gold_grams: number
          gold_value: number
          id: string
          is_zakat_due: boolean
          ledger_id: string
          loans: number
          mobile_banking: number
          net_wealth: number
          nisab_amount: number
          payables: number
          receivables: number
          silver_grams: number
          silver_value: number
          total_assets: number
          total_liabilities: number
          updated_at: string
          user_id: string
          year: number
          zakat_amount: number
        }
        Insert: {
          bank_balance?: number
          business_assets?: number
          cash?: number
          created_at?: string
          gold_grams?: number
          gold_value?: number
          id?: string
          is_zakat_due?: boolean
          ledger_id: string
          loans?: number
          mobile_banking?: number
          net_wealth?: number
          nisab_amount?: number
          payables?: number
          receivables?: number
          silver_grams?: number
          silver_value?: number
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id: string
          year: number
          zakat_amount?: number
        }
        Update: {
          bank_balance?: number
          business_assets?: number
          cash?: number
          created_at?: string
          gold_grams?: number
          gold_value?: number
          id?: string
          is_zakat_due?: boolean
          ledger_id?: string
          loans?: number
          mobile_banking?: number
          net_wealth?: number
          nisab_amount?: number
          payables?: number
          receivables?: number
          silver_grams?: number
          silver_value?: number
          total_assets?: number
          total_liabilities?: number
          updated_at?: string
          user_id?: string
          year?: number
          zakat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "zakat_calculations_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

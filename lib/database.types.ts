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
      accommodation_research: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          link: string | null
          location: string | null
          nights: number | null
          notes: string | null
          price_per_night_aed: number | null
          ranking: number | null
          selected: boolean
          total_aed: number | null
          trip_id: string
          vendor: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          link?: string | null
          location?: string | null
          nights?: number | null
          notes?: string | null
          price_per_night_aed?: number | null
          ranking?: number | null
          selected?: boolean
          total_aed?: number | null
          trip_id: string
          vendor: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          link?: string | null
          location?: string | null
          nights?: number | null
          notes?: string | null
          price_per_night_aed?: number | null
          ranking?: number | null
          selected?: boolean
          total_aed?: number | null
          trip_id?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_research_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_totals"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "accommodation_research_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          participant: Database["public"]["Enums"]["participant"]
          share_amount_aed: number
          share_percent: number | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          participant: Database["public"]["Enums"]["participant"]
          share_amount_aed?: number
          share_percent?: number | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          participant?: Database["public"]["Enums"]["participant"]
          share_amount_aed?: number
          share_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          aed_price: number
          category: string
          created_at: string
          description: string | null
          expense_date: string | null
          expense_date_text: string | null
          fx_rate_used: number | null
          id: string
          item: string
          line_no: number
          native_currency: string | null
          native_price: number | null
          paid_by: Database["public"]["Enums"]["participant"] | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_url: string | null
          split_type: Database["public"]["Enums"]["split_type"]
          trip_id: string
          updated_at: string
        }
        Insert: {
          aed_price: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_date_text?: string | null
          fx_rate_used?: number | null
          id?: string
          item: string
          line_no: number
          native_currency?: string | null
          native_price?: number | null
          paid_by?: Database["public"]["Enums"]["participant"] | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          split_type?: Database["public"]["Enums"]["split_type"]
          trip_id: string
          updated_at?: string
        }
        Update: {
          aed_price?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_date_text?: string | null
          fx_rate_used?: number | null
          id?: string
          item?: string
          line_no?: number
          native_currency?: string | null
          native_price?: number | null
          paid_by?: Database["public"]["Enums"]["participant"] | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_url?: string | null
          split_type?: Database["public"]["Enums"]["split_type"]
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_totals"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          accom_price_aed: number | null
          accommodation_name: string | null
          afternoon: string | null
          created_at: string
          day_date: string
          evening: string | null
          id: string
          location: string | null
          morning: string | null
          notes: string | null
          trip_id: string
        }
        Insert: {
          accom_price_aed?: number | null
          accommodation_name?: string | null
          afternoon?: string | null
          created_at?: string
          day_date: string
          evening?: string | null
          id?: string
          location?: string | null
          morning?: string | null
          notes?: string | null
          trip_id: string
        }
        Update: {
          accom_price_aed?: number | null
          accommodation_name?: string | null
          afternoon?: string | null
          created_at?: string
          day_date?: string
          evening?: string | null
          id?: string
          location?: string | null
          morning?: string | null
          notes?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_totals"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          archived: boolean
          created_at: string
          destination: string | null
          end_date: string | null
          fx_rate_to_aed: number
          id: string
          name: string
          native_currency: string
          notes: string | null
          participants: Database["public"]["Enums"]["participant"][]
          start_date: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          destination?: string | null
          end_date?: string | null
          fx_rate_to_aed: number
          id?: string
          name: string
          native_currency: string
          notes?: string | null
          participants?: Database["public"]["Enums"]["participant"][]
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          destination?: string | null
          end_date?: string | null
          fx_rate_to_aed?: number
          id?: string
          name?: string
          native_currency?: string
          notes?: string | null
          participants?: Database["public"]["Enums"]["participant"][]
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      category_totals: {
        Row: {
          category: string | null
          expense_count: number | null
          total_aed: number | null
          trip_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip_totals"
            referencedColumns: ["trip_id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_totals: {
        Row: {
          ash_share_aed: number | null
          end_date: string | null
          expense_count: number | null
          melly_share_aed: number | null
          name: string | null
          native_currency: string | null
          start_date: string | null
          total_aed: number | null
          trip_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_allowlisted: { Args: never; Returns: boolean }
    }
    Enums: {
      participant: "Melly" | "Ash"
      payment_method: "cash" | "card" | "mixed" | "unknown"
      split_type: "even" | "custom" | "personal" | "reference"
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
    Enums: {
      participant: ["Melly", "Ash"],
      payment_method: ["cash", "card", "mixed", "unknown"],
      split_type: ["even", "custom", "personal", "reference"],
    },
  },
} as const

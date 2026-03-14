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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliates: {
        Row: {
          commission_duration_months: number
          commission_rate: number
          created_at: string
          email: string
          id: string
          name: string
          parent_id: string | null
          role: Database["public"]["Enums"]["affiliate_role"]
          slug: string
          status: Database["public"]["Enums"]["affiliate_status"]
          sub_affiliate_duration_months: number
          sub_affiliate_rate: number
          tier_level: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_duration_months?: number
          commission_rate: number
          created_at?: string
          email: string
          id?: string
          name: string
          parent_id?: string | null
          role?: Database["public"]["Enums"]["affiliate_role"]
          slug: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          sub_affiliate_duration_months?: number
          sub_affiliate_rate?: number
          tier_level?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_duration_months?: number
          commission_rate?: number
          created_at?: string
          email?: string
          id?: string
          name?: string
          parent_id?: string | null
          role?: Database["public"]["Enums"]["affiliate_role"]
          slug?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          sub_affiliate_duration_months?: number
          sub_affiliate_rate?: number
          tier_level?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          created_at: string | null
          email: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          stripe_event_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          email?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          stripe_event_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          email?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          affiliate_id: string
          clicked_at: string
          id: string
          ip_hash: string | null
          landing_page: string | null
          referrer_url: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          customer_id: string
          id: string
          paid_at: string | null
          payment_number: number
          payout_id: string | null
          rate_snapshot: number
          status: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id: string | null
          tier_type: Database["public"]["Enums"]["commission_tier_type"]
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          paid_at?: string | null
          payment_number: number
          payout_id?: string | null
          rate_snapshot: number
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
          tier_type?: Database["public"]["Enums"]["commission_tier_type"]
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          paid_at?: string | null
          payment_number?: number
          payout_id?: string | null
          rate_snapshot?: number
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
          tier_type?: Database["public"]["Enums"]["commission_tier_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_commissions_payout"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          created_at: string
          customer_id: string
          event_type: Database["public"]["Enums"]["customer_event_type"]
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          event_type: Database["public"]["Enums"]["customer_event_type"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          event_type?: Database["public"]["Enums"]["customer_event_type"]
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          affiliate_id: string
          canceled_at: string | null
          created_at: string
          current_state: Database["public"]["Enums"]["customer_state"]
          first_payment_at: string | null
          id: string
          lead_id: string
          payment_count: number
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          stripe_customer_id: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          canceled_at?: string | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["customer_state"]
          first_payment_at?: string | null
          id?: string
          lead_id: string
          payment_count?: number
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          canceled_at?: string | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["customer_state"]
          first_payment_at?: string | null
          id?: string
          lead_id?: string
          payment_count?: number
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_reusable: boolean
          is_tracking_only: boolean
          label: string | null
          parent_affiliate_id: string | null
          used_by_affiliate_id: string | null
        }
        Insert: {
          code: string
          commission_rate: number
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_reusable?: boolean
          is_tracking_only?: boolean
          label?: string | null
          parent_affiliate_id?: string | null
          used_by_affiliate_id?: string | null
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_reusable?: boolean
          is_tracking_only?: boolean
          label?: string | null
          parent_affiliate_id?: string | null
          used_by_affiliate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_parent_affiliate_id_fkey"
            columns: ["parent_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_used_by_affiliate_id_fkey"
            columns: ["used_by_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          affiliate_id: string
          click_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          affiliate_id: string
          click_id?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          affiliate_id?: string
          click_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          campaign: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string
          folder_id: string | null
          id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          folder_id?: string | null
          id?: string
          title: string
          uploaded_by: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          folder_id?: string | null
          id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_methods: {
        Row: {
          affiliate_id: string
          created_at: string
          details: Json
          id: string
          is_primary: boolean
          method_type: Database["public"]["Enums"]["payout_method_type"]
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          details?: Json
          id?: string
          is_primary?: boolean
          method_type: Database["public"]["Enums"]["payout_method_type"]
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          details?: Json
          id?: string
          is_primary?: boolean
          method_type?: Database["public"]["Enums"]["payout_method_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payout_methods_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          affiliate_id: string
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          method: string | null
          notes: string | null
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          affiliate_id: string
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          affiliate_id?: string
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tax_documents: {
        Row: {
          affiliate_id: string
          document_type: string
          file_path: string
          id: string
          uploaded_at: string
        }
        Insert: {
          affiliate_id: string
          document_type: string
          file_path: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          affiliate_id?: string
          document_type?: string
          file_path?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_affiliate_id: { Args: never; Returns: string }
      get_admin_dashboard_stats: {
        Args: { p_start_of_last_month: string; p_start_of_month: string }
        Returns: {
          active_monthly_count: number
          annual_active_count: number
          churned_count: number
          commission_liability: number
          last_month_earned: number
          pending_amount: number
          this_month_earned: number
          total_earned: number
          total_paid_out: number
          trialing_count: number
        }[]
      }
      get_affiliate_daily_clicks: {
        Args: { p_affiliate_id: string; p_days: number; p_since: string }
        Returns: {
          click_count: number
          day_offset: number
        }[]
      }
      get_affiliate_dashboard_stats: {
        Args: {
          p_affiliate_id: string
          p_start_of_last_month: string
          p_start_of_month: string
        }
        Returns: {
          active_count: number
          churned_count: number
          last_month_earned: number
          paid_amount: number
          pending_amount: number
          this_month_earned: number
          total_customers: number
          total_earned: number
          total_leads: number
          trialing_count: number
        }[]
      }
      get_affiliate_detail_stats: {
        Args: { aff_ids: string[] }
        Returns: {
          active_annual: number
          active_monthly: number
          canceled: number
          clicks: number
          leads: number
          paid_amount: number
          pending_amount: number
          total_customers: number
          total_earned: number
          trialing: number
        }[]
      }
      get_affiliate_monthly_earnings: {
        Args: { p_affiliate_id: string; p_since: string }
        Returns: {
          month_start: string
          total_amount: number
        }[]
      }
      get_commission_totals_by_affiliate: {
        Args: never
        Returns: {
          affiliate_id: string
          total_amount: number
        }[]
      }
      get_daily_click_counts: {
        Args: { p_days: number; p_since: string }
        Returns: {
          click_count: number
          day_offset: number
        }[]
      }
      get_monthly_earnings: {
        Args: { p_since: string }
        Returns: {
          month_start: string
          total_amount: number
        }[]
      }
      get_performance_funnel: {
        Args: { aff_ids: string[]; p_clicks_since: string }
        Returns: {
          active_annual: number
          active_monthly: number
          churned: number
          clicks_30d: number
          total_customers: number
          total_leads: number
          trialing: number
        }[]
      }
      get_recent_customers: {
        Args: { aff_ids: string[]; p_limit?: number; p_offset?: number }
        Returns: {
          affiliate_id: string
          created_at: string
          current_state: string
          id: string
          lead_email: string
          lead_name: string
          plan_type: string
        }[]
      }
      get_recent_leads: {
        Args: { aff_ids: string[]; p_limit?: number; p_offset?: number }
        Returns: {
          affiliate_id: string
          created_at: string
          customer_state: string
          email: string
          id: string
          stripe_customer_id: string
        }[]
      }
      get_sub_affiliate_stats: {
        Args: { sub_ids: string[] }
        Returns: {
          affiliate_id: string
          customer_count: number
          earned: number
          lead_count: number
        }[]
      }
      get_tier2_earnings: { Args: { aff_id: string }; Returns: number }
      get_weekly_trend: {
        Args: { aff_ids: string[]; p_weeks?: number }
        Returns: {
          click_count: number
          customer_count: number
          lead_count: number
          week_offset: number
        }[]
      }
      import_stripe_affiliate_data: { Args: { p_data: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_self_or_descendant: {
        Args: { target_affiliate_id: string }
        Returns: boolean
      }
    }
    Enums: {
      affiliate_role: "affiliate" | "admin"
      affiliate_status: "invited" | "active" | "inactive"
      commission_status: "pending" | "approved" | "paid" | "voided"
      commission_tier_type: "direct" | "tier2" | "tier3"
      customer_event_type:
        | "account_created"
        | "trial_started"
        | "trial_expired"
        | "first_payment"
        | "recurring_payment"
        | "canceled"
        | "resubscribed"
      customer_state:
        | "signed_up"
        | "trialing"
        | "active_monthly"
        | "active_annual"
        | "canceled"
        | "dormant"
      payout_method_type: "paypal" | "bank_transfer"
      payout_status: "processing" | "completed"
      plan_type: "monthly" | "annual"
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
      affiliate_role: ["affiliate", "admin"],
      affiliate_status: ["invited", "active", "inactive"],
      commission_status: ["pending", "approved", "paid", "voided"],
      commission_tier_type: ["direct", "tier2", "tier3"],
      customer_event_type: [
        "account_created",
        "trial_started",
        "trial_expired",
        "first_payment",
        "recurring_payment",
        "canceled",
        "resubscribed",
      ],
      customer_state: [
        "signed_up",
        "trialing",
        "active_monthly",
        "active_annual",
        "canceled",
        "dormant",
      ],
      payout_method_type: ["paypal", "bank_transfer"],
      payout_status: ["processing", "completed"],
      plan_type: ["monthly", "annual"],
    },
  },
} as const

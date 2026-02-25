export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          stripe_customer_id: string | null
        }
        Insert: {
          affiliate_id: string
          click_id?: string | null
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
        }
        Update: {
          affiliate_id?: string
          click_id?: string | null
          created_at?: string
          email?: string
          id?: string
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
      media_folders: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
          created_by?: string
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
      media_assets: {
        Row: {
          campaign: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number
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
          file_size?: number
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
          file_size?: number
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
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]

export type Enums<
  T extends keyof DefaultSchema["Enums"],
> = DefaultSchema["Enums"][T]

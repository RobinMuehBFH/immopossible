export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: Database['public']['Enums']['user_role']
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          postal_code: string
          country: string
          property_manager_id: string | null
          erp_property_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          postal_code: string
          country?: string
          property_manager_id?: string | null
          erp_property_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          postal_code?: string
          country?: string
          property_manager_id?: string | null
          erp_property_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'properties_property_manager_id_fkey'
            columns: ['property_manager_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      tenants_properties: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          unit_number: string | null
          lease_start: string | null
          lease_end: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          unit_number?: string | null
          lease_start?: string | null
          lease_end?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          unit_number?: string | null
          lease_start?: string | null
          lease_end?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tenants_properties_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenants_properties_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      craftsmen: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          specializations: Database['public']['Enums']['damage_category'][]
          specialization_ids: string[]
          hourly_rate_chf: number | null
          is_active: boolean
          notes: string | null
          avg_rating: number | null
          avg_punctuality: number | null
          avg_quality: number | null
          avg_communication: number | null
          total_reviews: number
          total_bookings: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          specializations?: Database['public']['Enums']['damage_category'][]
          specialization_ids?: string[]
          hourly_rate_chf?: number | null
          is_active?: boolean
          notes?: string | null
          avg_rating?: number | null
          avg_punctuality?: number | null
          avg_quality?: number | null
          avg_communication?: number | null
          total_reviews?: number
          total_bookings?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          specializations?: Database['public']['Enums']['damage_category'][]
          specialization_ids?: string[]
          hourly_rate_chf?: number | null
          is_active?: boolean
          notes?: string | null
          avg_rating?: number | null
          avg_punctuality?: number | null
          avg_quality?: number | null
          avg_communication?: number | null
          total_reviews?: number
          total_bookings?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      craft_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          sort_order: number
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          sort_order?: number
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          sort_order?: number
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      specializations: {
        Row: {
          id: string
          craft_group_id: string
          name: string
          description: string | null
          sort_order: number
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          craft_group_id: string
          name: string
          description?: string | null
          sort_order?: number
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          craft_group_id?: string
          name?: string
          description?: string | null
          sort_order?: number
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'specializations_craft_group_id_fkey'
            columns: ['craft_group_id']
            referencedRelation: 'craft_groups'
            referencedColumns: ['id']
          }
        ]
      }
      craftsman_reviews: {
        Row: {
          id: string
          craftsman_id: string
          booking_id: string | null
          rating: number
          punctuality_rating: number | null
          quality_rating: number | null
          communication_rating: number | null
          comment: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          craftsman_id: string
          booking_id?: string | null
          rating: number
          punctuality_rating?: number | null
          quality_rating?: number | null
          communication_rating?: number | null
          comment?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          craftsman_id?: string
          booking_id?: string | null
          rating?: number
          punctuality_rating?: number | null
          quality_rating?: number | null
          communication_rating?: number | null
          comment?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'craftsman_reviews_craftsman_id_fkey'
            columns: ['craftsman_id']
            referencedRelation: 'craftsmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'craftsman_reviews_booking_id_fkey'
            columns: ['booking_id']
            referencedRelation: 'bookings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'craftsman_reviews_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      property_preferred_craftsmen: {
        Row: {
          id: string
          property_id: string
          craftsman_id: string
          specialization_id: string | null
          priority: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          craftsman_id: string
          specialization_id?: string | null
          priority?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          craftsman_id?: string
          specialization_id?: string | null
          priority?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_preferred_craftsmen_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_preferred_craftsmen_craftsman_id_fkey'
            columns: ['craftsman_id']
            referencedRelation: 'craftsmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'property_preferred_craftsmen_specialization_id_fkey'
            columns: ['specialization_id']
            referencedRelation: 'specializations'
            referencedColumns: ['id']
          }
        ]
      }
      damage_reports: {
        Row: {
          id: string
          tenant_id: string | null
          property_id: string | null
          title: string
          description: string
          location_in_property: string | null
          channel: Database['public']['Enums']['intake_channel']
          status: Database['public']['Enums']['report_status']
          priority: Database['public']['Enums']['priority_level'] | null
          damage_category:
            | Database['public']['Enums']['damage_category']
            | null
          estimated_cost_chf: number | null
          image_urls: string[]
          raw_input_payload: Json | null
          sender_identifier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          property_id?: string | null
          title: string
          description: string
          location_in_property?: string | null
          channel?: Database['public']['Enums']['intake_channel']
          status?: Database['public']['Enums']['report_status']
          priority?: Database['public']['Enums']['priority_level'] | null
          damage_category?:
            | Database['public']['Enums']['damage_category']
            | null
          estimated_cost_chf?: number | null
          image_urls?: string[]
          raw_input_payload?: Json | null
          sender_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          property_id?: string | null
          title?: string
          description?: string
          location_in_property?: string | null
          channel?: Database['public']['Enums']['intake_channel']
          status?: Database['public']['Enums']['report_status']
          priority?: Database['public']['Enums']['priority_level'] | null
          damage_category?:
            | Database['public']['Enums']['damage_category']
            | null
          estimated_cost_chf?: number | null
          image_urls?: string[]
          raw_input_payload?: Json | null
          sender_identifier?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'damage_reports_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'damage_reports_property_id_fkey'
            columns: ['property_id']
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          damage_report_id: string
          craftsman_id: string
          scheduled_date: string | null
          scheduled_time_start: string | null
          scheduled_time_end: string | null
          status: Database['public']['Enums']['booking_status']
          notes: string | null
          actual_cost_chf: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          damage_report_id: string
          craftsman_id: string
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          status?: Database['public']['Enums']['booking_status']
          notes?: string | null
          actual_cost_chf?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          damage_report_id?: string
          craftsman_id?: string
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          status?: Database['public']['Enums']['booking_status']
          notes?: string | null
          actual_cost_chf?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_damage_report_id_fkey'
            columns: ['damage_report_id']
            referencedRelation: 'damage_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_craftsman_id_fkey'
            columns: ['craftsman_id']
            referencedRelation: 'craftsmen'
            referencedColumns: ['id']
          }
        ]
      }
      approval_requests: {
        Row: {
          id: string
          damage_report_id: string
          agent_run_id: string | null
          requested_action: string
          estimated_cost_chf: number | null
          context: Json
          status: Database['public']['Enums']['approval_status']
          decided_by: string | null
          decided_at: string | null
          decision_notes: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          damage_report_id: string
          agent_run_id?: string | null
          requested_action: string
          estimated_cost_chf?: number | null
          context?: Json
          status?: Database['public']['Enums']['approval_status']
          decided_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          damage_report_id?: string
          agent_run_id?: string | null
          requested_action?: string
          estimated_cost_chf?: number | null
          context?: Json
          status?: Database['public']['Enums']['approval_status']
          decided_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'approval_requests_damage_report_id_fkey'
            columns: ['damage_report_id']
            referencedRelation: 'damage_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fk_approval_agent_run'
            columns: ['agent_run_id']
            referencedRelation: 'agent_runs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'approval_requests_decided_by_fkey'
            columns: ['decided_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      agent_runs: {
        Row: {
          id: string
          damage_report_id: string
          status: Database['public']['Enums']['agent_run_status']
          steps_taken: Json
          output_summary: string | null
          error_message: string | null
          tokens_used: number | null
          duration_ms: number | null
          checkpoint_data: Json | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          damage_report_id: string
          status?: Database['public']['Enums']['agent_run_status']
          steps_taken?: Json
          output_summary?: string | null
          error_message?: string | null
          tokens_used?: number | null
          duration_ms?: number | null
          checkpoint_data?: Json | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          damage_report_id?: string
          status?: Database['public']['Enums']['agent_run_status']
          steps_taken?: Json
          output_summary?: string | null
          error_message?: string | null
          tokens_used?: number | null
          duration_ms?: number | null
          checkpoint_data?: Json | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'agent_runs_damage_report_id_fkey'
            columns: ['damage_report_id']
            referencedRelation: 'damage_reports'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          damage_report_id: string | null
          recipient_id: string | null
          recipient_identifier: string | null
          channel: Database['public']['Enums']['notification_channel']
          subject: string | null
          body: string
          sent_at: string | null
          delivered_at: string | null
          failed_at: string | null
          error_message: string | null
          external_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          damage_report_id?: string | null
          recipient_id?: string | null
          recipient_identifier?: string | null
          channel: Database['public']['Enums']['notification_channel']
          subject?: string | null
          body: string
          sent_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          external_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          damage_report_id?: string | null
          recipient_id?: string | null
          recipient_identifier?: string | null
          channel?: Database['public']['Enums']['notification_channel']
          subject?: string | null
          body?: string
          sent_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          external_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_damage_report_id_fkey'
            columns: ['damage_report_id']
            referencedRelation: 'damage_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      erp_mock_data: {
        Row: {
          id: string
          entity_type: string
          external_id: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          external_id: string
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          external_id?: string
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'admin' | 'property_manager' | 'tenant'
      report_status:
        | 'received'
        | 'triaging'
        | 'waiting_for_approval'
        | 'approved'
        | 'rejected'
        | 'booking_craftsman'
        | 'booked'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
      priority_level: 'low' | 'medium' | 'high' | 'critical'
      damage_category:
        | 'plumbing'
        | 'electrical'
        | 'heating'
        | 'structural'
        | 'appliance'
        | 'pest_control'
        | 'locksmith'
        | 'roofing'
        | 'general_maintenance'
        | 'other'
      intake_channel: 'web_form' | 'email' | 'whatsapp'
      approval_status: 'pending' | 'approved' | 'rejected' | 'expired'
      agent_run_status: 'running' | 'waiting_for_human' | 'completed' | 'failed'
      booking_status:
        | 'scheduled'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
      notification_channel: 'email' | 'whatsapp' | 'in_app'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type Profile = Tables<'profiles'>
export type Property = Tables<'properties'>
export type TenantProperty = Tables<'tenants_properties'>
export type Craftsman = Tables<'craftsmen'>
export type CraftGroup = Tables<'craft_groups'>
export type Specialization = Tables<'specializations'>
export type CraftsmanReview = Tables<'craftsman_reviews'>
export type PropertyPreferredCraftsman = Tables<'property_preferred_craftsmen'>
export type DamageReport = Tables<'damage_reports'>
export type Booking = Tables<'bookings'>
export type ApprovalRequest = Tables<'approval_requests'>
export type AgentRun = Tables<'agent_runs'>
export type Notification = Tables<'notifications'>
export type ErpMockData = Tables<'erp_mock_data'>

// Enum type aliases
export type UserRole = Enums<'user_role'>
export type ReportStatus = Enums<'report_status'>
export type PriorityLevel = Enums<'priority_level'>
export type DamageCategory = Enums<'damage_category'>
export type IntakeChannel = Enums<'intake_channel'>
export type ApprovalStatus = Enums<'approval_status'>
export type AgentRunStatus = Enums<'agent_run_status'>
export type BookingStatus = Enums<'booking_status'>
export type NotificationChannel = Enums<'notification_channel'>

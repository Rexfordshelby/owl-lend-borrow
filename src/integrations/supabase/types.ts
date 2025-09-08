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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      borrow_requests: {
        Row: {
          actual_return_date: string | null
          borrower_id: string
          created_at: string
          end_date: string
          id: string
          item_id: string
          last_message_at: string | null
          message: string | null
          negotiated_duration_days: number | null
          negotiated_rate: number | null
          owner_id: string
          owner_response: string | null
          start_date: string
          status: Database["public"]["Enums"]["request_status"] | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          borrower_id: string
          created_at?: string
          end_date: string
          id?: string
          item_id: string
          last_message_at?: string | null
          message?: string | null
          negotiated_duration_days?: number | null
          negotiated_rate?: number | null
          owner_id: string
          owner_response?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["request_status"] | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          borrower_id?: string
          created_at?: string
          end_date?: string
          id?: string
          item_id?: string
          last_message_at?: string | null
          message?: string | null
          negotiated_duration_days?: number | null
          negotiated_rate?: number | null
          owner_id?: string
          owner_response?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          borrow_request_id: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          borrow_request_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          borrow_request_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_borrow_request_id_fkey"
            columns: ["borrow_request_id"]
            isOneToOne: false
            referencedRelation: "borrow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          availability_schedule: string[] | null
          category: Database["public"]["Enums"]["item_category"]
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          daily_rate: number | null
          deposit_amount: number | null
          description: string | null
          hourly_rate: number | null
          id: string
          image_urls: string[] | null
          is_available: boolean | null
          is_service: boolean | null
          location: string | null
          owner_id: string
          service_type: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          availability_schedule?: string[] | null
          category: Database["public"]["Enums"]["item_category"]
          condition: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          image_urls?: string[] | null
          is_available?: boolean | null
          is_service?: boolean | null
          location?: string | null
          owner_id: string
          service_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          availability_schedule?: string[] | null
          category?: Database["public"]["Enums"]["item_category"]
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          daily_rate?: number | null
          deposit_amount?: number | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          image_urls?: string[] | null
          is_available?: boolean | null
          is_service?: boolean | null
          location?: string | null
          owner_id?: string
          service_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string
          offer_amount: number | null
          offer_duration_days: number | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          offer_amount?: number | null
          offer_duration_days?: number | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          offer_amount?: number | null
          offer_duration_days?: number | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          major: string | null
          phone: string | null
          temple_id: string | null
          total_ratings: number | null
          trust_score: number | null
          updated_at: string
          user_id: string
          year_of_study: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          major?: string | null
          phone?: string | null
          temple_id?: string | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id: string
          year_of_study?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          major?: string | null
          phone?: string | null
          temple_id?: string | null
          total_ratings?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string
          year_of_study?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          borrow_request_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          borrow_request_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          borrow_request_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_borrow_request_id_fkey"
            columns: ["borrow_request_id"]
            isOneToOne: false
            referencedRelation: "borrow_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
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
      calculate_total_cost: {
        Args: {
          end_date_param: string
          item_id_param: string
          start_date_param: string
        }
        Returns: number
      }
    }
    Enums: {
      item_category:
        | "books"
        | "electronics"
        | "notes"
        | "bikes"
        | "sports_equipment"
        | "tools"
        | "clothing"
        | "furniture"
        | "other"
        | "services"
      item_condition: "excellent" | "good" | "fair" | "poor"
      request_status:
        | "pending"
        | "negotiating"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "active"
        | "completed"
        | "overdue"
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
      item_category: [
        "books",
        "electronics",
        "notes",
        "bikes",
        "sports_equipment",
        "tools",
        "clothing",
        "furniture",
        "other",
        "services",
      ],
      item_condition: ["excellent", "good", "fair", "poor"],
      request_status: [
        "pending",
        "negotiating",
        "accepted",
        "rejected",
        "cancelled",
        "active",
        "completed",
        "overdue",
      ],
    },
  },
} as const

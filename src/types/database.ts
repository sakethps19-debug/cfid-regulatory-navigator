// GENERATED FILE — do not hand-edit.
// Regenerate with: the Supabase MCP `generate_typescript_types` tool (or
// `supabase gen types typescript --project-id <id>` via the Supabase CLI),
// then overwrite this file, after any migration under supabase/migrations/.

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
      app_allowed_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      finding_provisions: {
        Row: {
          finding_id: string
          id: string
          provision_id: string
          relationship: string
        }
        Insert: {
          finding_id: string
          id?: string
          provision_id: string
          relationship?: string
        }
        Update: {
          finding_id?: string
          id?: string
          provision_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_provisions_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "scenario_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_provisions_provision_id_fkey"
            columns: ["provision_id"]
            isOneToOne: false
            referencedRelation: "legal_provisions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_instruments: {
        Row: {
          created_at: string
          id: string
          issuing_authority: string
          name: string
          official_source_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issuing_authority: string
          name: string
          official_source_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issuing_authority?: string
          name?: string
          official_source_url?: string | null
        }
        Relationships: []
      }
      legal_provisions: {
        Row: {
          canonical_id: string
          created_at: string
          current_text_verification_status: string
          id: string
          instrument_id: string
          law_library_note: string | null
          official_source_url: string | null
          provision_number: string
          related_provision_canonical_ids: string[]
          subject: string | null
        }
        Insert: {
          canonical_id: string
          created_at?: string
          current_text_verification_status?: string
          id?: string
          instrument_id: string
          law_library_note?: string | null
          official_source_url?: string | null
          provision_number: string
          related_provision_canonical_ids?: string[]
          subject?: string | null
        }
        Update: {
          canonical_id?: string
          created_at?: string
          current_text_verification_status?: string
          id?: string
          instrument_id?: string
          law_library_note?: string | null
          official_source_url?: string | null
          provision_number?: string
          related_provision_canonical_ids?: string[]
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_provisions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "legal_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_tests: {
        Row: {
          created_at: string
          id: string
          implementation_guardrail: string
          paragraph_anchors: string | null
          provision_or_issue: string
          working_principle: string
        }
        Insert: {
          created_at?: string
          id?: string
          implementation_guardrail: string
          paragraph_anchors?: string | null
          provision_or_issue: string
          working_principle: string
        }
        Update: {
          created_at?: string
          id?: string
          implementation_guardrail?: string
          paragraph_anchors?: string | null
          provision_or_issue?: string
          working_principle?: string
        }
        Relationships: []
      }
      noticees: {
        Row: {
          created_at: string
          entity_type: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          entity_type?: string | null
          full_name: string
          id?: string
        }
        Update: {
          created_at?: string
          entity_type?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      order_directions: {
        Row: {
          case_name: string
          created_at: string
          direction_or_outcome: string
          id: string
          official_source_url: string
          order_id: string | null
          paragraph_reference: string | null
          stage: string
        }
        Insert: {
          case_name: string
          created_at?: string
          direction_or_outcome: string
          id?: string
          official_source_url: string
          order_id?: string | null
          paragraph_reference?: string | null
          stage: string
        }
        Update: {
          case_name?: string
          created_at?: string
          direction_or_outcome?: string
          id?: string
          official_source_url?: string
          order_id?: string | null
          paragraph_reference?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_directions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_noticees: {
        Row: {
          created_at: string
          id: string
          noticee_id: string
          noticee_number: string | null
          order_id: string
          outcome_status: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          noticee_id: string
          noticee_number?: string | null
          order_id: string
          outcome_status?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          noticee_id?: string
          noticee_number?: string | null
          order_id?: string
          outcome_status?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_noticees_noticee_id_fkey"
            columns: ["noticee_id"]
            isOneToOne: false
            referencedRelation: "noticees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_noticees_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_relationships: {
        Row: {
          created_at: string
          from_order_id: string
          id: string
          note: string | null
          relationship_type: Database["public"]["Enums"]["order_relationship_type"]
          to_order_id: string
        }
        Insert: {
          created_at?: string
          from_order_id: string
          id?: string
          note?: string | null
          relationship_type: Database["public"]["Enums"]["order_relationship_type"]
          to_order_id: string
        }
        Update: {
          created_at?: string
          from_order_id?: string
          id?: string
          note?: string | null
          relationship_type?: Database["public"]["Enums"]["order_relationship_type"]
          to_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_relationships_from_order_id_fkey"
            columns: ["from_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_relationships_to_order_id_fkey"
            columns: ["to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          background_chronology: string | null
          case_name: string
          cfid_verification_source: string
          cfid_verified: boolean
          checksum: string | null
          created_at: string
          id: string
          investigation_period: string | null
          listed_entity: string | null
          official_url: string
          order_date: string | null
          order_number: string | null
          order_period_hint: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          order_type_source: string
          passing_authority: string | null
          processing_stage: Database["public"]["Enums"]["processing_stage"]
          relevant_financial_years: string | null
          retrieval_failure_reason: string | null
          retrieval_status: string
          scope_note: string | null
          source_row_ref: string | null
          updated_at: string
        }
        Insert: {
          background_chronology?: string | null
          case_name: string
          cfid_verification_source?: string
          cfid_verified?: boolean
          checksum?: string | null
          created_at?: string
          id?: string
          investigation_period?: string | null
          listed_entity?: string | null
          official_url: string
          order_date?: string | null
          order_number?: string | null
          order_period_hint?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          order_type_source?: string
          passing_authority?: string | null
          processing_stage?: Database["public"]["Enums"]["processing_stage"]
          relevant_financial_years?: string | null
          retrieval_failure_reason?: string | null
          retrieval_status?: string
          scope_note?: string | null
          source_row_ref?: string | null
          updated_at?: string
        }
        Update: {
          background_chronology?: string | null
          case_name?: string
          cfid_verification_source?: string
          cfid_verified?: boolean
          checksum?: string | null
          created_at?: string
          id?: string
          investigation_period?: string | null
          listed_entity?: string | null
          official_url?: string
          order_date?: string | null
          order_number?: string | null
          order_period_hint?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          order_type_source?: string
          passing_authority?: string | null
          processing_stage?: Database["public"]["Enums"]["processing_stage"]
          relevant_financial_years?: string | null
          retrieval_failure_reason?: string | null
          retrieval_status?: string
          scope_note?: string | null
          source_row_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      processing_runs: {
        Row: {
          created_by: string
          failures: number
          finished_at: string | null
          id: string
          orders_processed: number
          run_type: string
          started_at: string
          successes: number
          summary: string | null
        }
        Insert: {
          created_by?: string
          failures?: number
          finished_at?: string | null
          id?: string
          orders_processed?: number
          run_type: string
          started_at?: string
          successes?: number
          summary?: string | null
        }
        Update: {
          created_by?: string
          failures?: number
          finished_at?: string | null
          id?: string
          orders_processed?: number
          run_type?: string
          started_at?: string
          successes?: number
          summary?: string | null
        }
        Relationships: []
      }
      provision_versions: {
        Row: {
          created_at: string
          date_last_verified: string | null
          effective_from: string | null
          effective_to: string | null
          exact_text: string | null
          id: string
          provision_id: string
          source_url: string | null
          status: string
          version_label: string
        }
        Insert: {
          created_at?: string
          date_last_verified?: string | null
          effective_from?: string | null
          effective_to?: string | null
          exact_text?: string | null
          id?: string
          provision_id: string
          source_url?: string | null
          status?: string
          version_label: string
        }
        Update: {
          created_at?: string
          date_last_verified?: string | null
          effective_from?: string | null
          effective_to?: string | null
          exact_text?: string | null
          id?: string
          provision_id?: string
          source_url?: string | null
          status?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "provision_versions_provision_id_fkey"
            columns: ["provision_id"]
            isOneToOne: false
            referencedRelation: "legal_provisions"
            referencedColumns: ["id"]
          },
        ]
      }
      query_runs: {
        Row: {
          actor_filter: string | null
          created_at: string
          id: string
          query_text: string | null
          result_summary: Json | null
          transaction_type_filter: string | null
          user_email: string | null
        }
        Insert: {
          actor_filter?: string | null
          created_at?: string
          id?: string
          query_text?: string | null
          result_summary?: Json | null
          transaction_type_filter?: string | null
          user_email?: string | null
        }
        Update: {
          actor_filter?: string | null
          created_at?: string
          id?: string
          query_text?: string | null
          result_summary?: Json | null
          transaction_type_filter?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      residual_register: {
        Row: {
          case_or_order_name: string
          created_at: string
          id: string
          official_url: string | null
          order_identifier: string | null
          reason: string
          status: string
        }
        Insert: {
          case_or_order_name: string
          created_at?: string
          id?: string
          official_url?: string | null
          order_identifier?: string | null
          reason: string
          status: string
        }
        Update: {
          case_or_order_name?: string
          created_at?: string
          id?: string
          official_url?: string | null
          order_identifier?: string | null
          reason?: string
          status?: string
        }
        Relationships: []
      }
      scenario_findings: {
        Row: {
          actor_roles: string[]
          allegation_text: string | null
          alleged_conduct: string[]
          case_name: string
          category: string | null
          created_at: string
          evidence_types: string[]
          evidentiary_gaps: string[]
          factual_pattern: string
          final_order_id: string | null
          final_paragraph_references: string | null
          finding_status: Database["public"]["Enums"]["finding_status"]
          id: string
          ingredients_not_established: string[]
          interim_paragraph_references: string | null
          noticee_actor_names: string[]
          official_source_url: string
          order_id: string | null
          provisions_considered_raw: string | null
          qualification: string | null
          record_id: string
          scenario_title: string
          search_vector: unknown
          transaction_types: string[]
          updated_at: string
        }
        Insert: {
          actor_roles?: string[]
          allegation_text?: string | null
          alleged_conduct?: string[]
          case_name: string
          category?: string | null
          created_at?: string
          evidence_types?: string[]
          evidentiary_gaps?: string[]
          factual_pattern: string
          final_order_id?: string | null
          final_paragraph_references?: string | null
          finding_status: Database["public"]["Enums"]["finding_status"]
          id?: string
          ingredients_not_established?: string[]
          interim_paragraph_references?: string | null
          noticee_actor_names?: string[]
          official_source_url: string
          order_id?: string | null
          provisions_considered_raw?: string | null
          qualification?: string | null
          record_id: string
          scenario_title: string
          search_vector?: unknown
          transaction_types?: string[]
          updated_at?: string
        }
        Update: {
          actor_roles?: string[]
          allegation_text?: string | null
          alleged_conduct?: string[]
          case_name?: string
          category?: string | null
          created_at?: string
          evidence_types?: string[]
          evidentiary_gaps?: string[]
          factual_pattern?: string
          final_order_id?: string | null
          final_paragraph_references?: string | null
          finding_status?: Database["public"]["Enums"]["finding_status"]
          id?: string
          ingredients_not_established?: string[]
          interim_paragraph_references?: string | null
          noticee_actor_names?: string[]
          official_source_url?: string
          order_id?: string | null
          provisions_considered_raw?: string | null
          qualification?: string | null
          record_id?: string
          scenario_title?: string
          search_vector?: unknown
          transaction_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_findings_final_order_id_fkey"
            columns: ["final_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_findings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          checksum: string | null
          content_type: string | null
          created_at: string
          id: string
          order_id: string
          raw_text_excerpt: string | null
          retrieval_error: string | null
          retrieval_status: string
          retrieved_at: string | null
          url: string
        }
        Insert: {
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          order_id: string
          raw_text_excerpt?: string | null
          retrieval_error?: string | null
          retrieval_status?: string
          retrieved_at?: string | null
          url: string
        }
        Update: {
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          order_id?: string
          raw_text_excerpt?: string | null
          retrieval_error?: string | null
          retrieval_status?: string
          retrieved_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_issues: {
        Row: {
          created_at: string
          description: string
          finding_id: string | null
          id: string
          issue_type: string
          order_id: string | null
          resolved: boolean
          severity: string
          source_row_ref: string | null
        }
        Insert: {
          created_at?: string
          description: string
          finding_id?: string | null
          id?: string
          issue_type: string
          order_id?: string | null
          resolved?: boolean
          severity?: string
          source_row_ref?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          finding_id?: string | null
          id?: string
          issue_type?: string
          order_id?: string | null
          resolved?: boolean
          severity?: string
          source_row_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_issues_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "scenario_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_allowed_user: { Args: never; Returns: boolean }
    }
    Enums: {
      finding_status:
        | "alleged"
        | "prima_facie"
        | "confirmed_at_interim"
        | "upheld"
        | "partly_upheld"
        | "not_upheld"
        | "withdrawn"
        | "inconclusive"
        | "procedural_observation"
      order_relationship_type:
        | "interim_to_final"
        | "interim_to_confirmatory"
        | "confirmatory_to_revocation"
        | "corrigendum_to"
        | "related_matter"
      order_type:
        | "interim_order"
        | "interim_cum_show_cause_notice"
        | "confirmatory_order"
        | "revocation_order"
        | "final_order"
        | "adjudication_order"
        | "settlement_order"
        | "other"
      processing_stage:
        | "indexed"
        | "downloaded"
        | "text_extracted"
        | "scenario_findings_extracted"
        | "legally_reviewed"
        | "needs_manual_review"
        | "retrieval_failed"
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
      finding_status: [
        "alleged",
        "prima_facie",
        "confirmed_at_interim",
        "upheld",
        "partly_upheld",
        "not_upheld",
        "withdrawn",
        "inconclusive",
        "procedural_observation",
      ],
      order_relationship_type: [
        "interim_to_final",
        "interim_to_confirmatory",
        "confirmatory_to_revocation",
        "corrigendum_to",
        "related_matter",
      ],
      order_type: [
        "interim_order",
        "interim_cum_show_cause_notice",
        "confirmatory_order",
        "revocation_order",
        "final_order",
        "adjudication_order",
        "settlement_order",
        "other",
      ],
      processing_stage: [
        "indexed",
        "downloaded",
        "text_extracted",
        "scenario_findings_extracted",
        "legally_reviewed",
        "needs_manual_review",
        "retrieval_failed",
      ],
    },
  },
} as const

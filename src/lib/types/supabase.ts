export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string;
          id: string;
          mission_id: string | null;
          season_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          season_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          season_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "achievements_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "achievements_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "achievements_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          engaged_ms: number | null;
          event_id: string;
          event_name: string;
          gps_accuracy_m: number | null;
          gps_latitude: number | null;
          gps_longitude: number | null;
          id: number;
          max_scroll_pct: number | null;
          ms_since_page_view: number | null;
          occurred_at: string;
          page_height_px: number | null;
          page_path: string | null;
          page_query: string | null;
          page_referrer: string | null;
          page_title: string | null;
          page_view_id: string | null;
          props: Json;
          received_at: string;
          region_dwell: Json | null;
          scroll_depth_px: number | null;
          scroll_pct: number | null;
          seq: number;
          session_id: string;
          tab_id: string;
          user_id: string | null;
          visible_ms: number | null;
          visitor_id: string;
        };
        Insert: {
          engaged_ms?: number | null;
          event_id: string;
          event_name: string;
          gps_accuracy_m?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          id?: number;
          max_scroll_pct?: number | null;
          ms_since_page_view?: number | null;
          occurred_at: string;
          page_height_px?: number | null;
          page_path?: string | null;
          page_query?: string | null;
          page_referrer?: string | null;
          page_title?: string | null;
          page_view_id?: string | null;
          props?: Json;
          received_at?: string;
          region_dwell?: Json | null;
          scroll_depth_px?: number | null;
          scroll_pct?: number | null;
          seq: number;
          session_id: string;
          tab_id: string;
          user_id?: string | null;
          visible_ms?: number | null;
          visitor_id: string;
        };
        Update: {
          engaged_ms?: number | null;
          event_id?: string;
          event_name?: string;
          gps_accuracy_m?: number | null;
          gps_latitude?: number | null;
          gps_longitude?: number | null;
          id?: number;
          max_scroll_pct?: number | null;
          ms_since_page_view?: number | null;
          occurred_at?: string;
          page_height_px?: number | null;
          page_path?: string | null;
          page_query?: string | null;
          page_referrer?: string | null;
          page_title?: string | null;
          page_view_id?: string | null;
          props?: Json;
          received_at?: string;
          region_dwell?: Json | null;
          scroll_depth_px?: number | null;
          scroll_pct?: number | null;
          seq?: number;
          session_id?: string;
          tab_id?: string;
          user_id?: string | null;
          visible_ms?: number | null;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "analytics_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_sessions: {
        Row: {
          browser: string | null;
          campaign_code: string | null;
          channel: string | null;
          created_at: string;
          device_type: string | null;
          id: string;
          ip_address: unknown;
          ip_city: string | null;
          ip_country: string | null;
          ip_latitude: number | null;
          ip_longitude: number | null;
          ip_region: string | null;
          is_bot: boolean;
          landing_path: string | null;
          landing_query: string | null;
          language: string | null;
          last_seen_at: string;
          os: string | null;
          referral_code: string | null;
          referrer: string | null;
          referrer_host: string | null;
          screen_height: number | null;
          screen_width: number | null;
          started_at: string;
          timezone: string | null;
          updated_at: string;
          user_agent: string | null;
          user_id: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
          viewport_height: number | null;
          viewport_width: number | null;
          visitor_id: string;
        };
        Insert: {
          browser?: string | null;
          campaign_code?: string | null;
          channel?: string | null;
          created_at?: string;
          device_type?: string | null;
          id: string;
          ip_address?: unknown;
          ip_city?: string | null;
          ip_country?: string | null;
          ip_latitude?: number | null;
          ip_longitude?: number | null;
          ip_region?: string | null;
          is_bot?: boolean;
          landing_path?: string | null;
          landing_query?: string | null;
          language?: string | null;
          last_seen_at?: string;
          os?: string | null;
          referral_code?: string | null;
          referrer?: string | null;
          referrer_host?: string | null;
          screen_height?: number | null;
          screen_width?: number | null;
          started_at?: string;
          timezone?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          viewport_height?: number | null;
          viewport_width?: number | null;
          visitor_id: string;
        };
        Update: {
          browser?: string | null;
          campaign_code?: string | null;
          channel?: string | null;
          created_at?: string;
          device_type?: string | null;
          id?: string;
          ip_address?: unknown;
          ip_city?: string | null;
          ip_country?: string | null;
          ip_latitude?: number | null;
          ip_longitude?: number | null;
          ip_region?: string | null;
          is_bot?: boolean;
          landing_path?: string | null;
          landing_query?: string | null;
          language?: string | null;
          last_seen_at?: string;
          os?: string | null;
          referral_code?: string | null;
          referrer?: string | null;
          referrer_host?: string | null;
          screen_height?: number | null;
          screen_width?: number | null;
          started_at?: string;
          timezone?: string | null;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          viewport_height?: number | null;
          viewport_width?: number | null;
          visitor_id?: string;
        };
        Relationships: [];
      };
      lottery_settings: {
        Row: {
          button_label: string;
          description: string;
          eligible_display_from: string | null;
          form_url: string;
          id: string;
          threshold_points: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          button_label?: string;
          description?: string;
          eligible_display_from?: string | null;
          form_url?: string;
          id?: string;
          threshold_points?: number;
          title?: string;
          updated_at?: string;
        };
        Update: {
          button_label?: string;
          description?: string;
          eligible_display_from?: string | null;
          form_url?: string;
          id?: string;
          threshold_points?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mission_artifacts: {
        Row: {
          achievement_id: string;
          artifact_type: string;
          created_at: string;
          description: string | null;
          id: string;
          image_storage_path: string | null;
          link_url: string | null;
          text_content: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          artifact_type: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_storage_path?: string | null;
          link_url?: string | null;
          text_content?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          artifact_type?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_storage_path?: string | null;
          link_url?: string | null;
          text_content?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_artifacts_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: true;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_category: {
        Row: {
          category_kbn: string;
          category_title: string | null;
          created_at: string;
          del_flg: boolean;
          id: string;
          slug: string;
          sort_no: number;
          updated_at: string;
        };
        Insert: {
          category_kbn?: string;
          category_title?: string | null;
          created_at?: string;
          del_flg?: boolean;
          id: string;
          slug: string;
          sort_no?: number;
          updated_at?: string;
        };
        Update: {
          category_kbn?: string;
          category_title?: string | null;
          created_at?: string;
          del_flg?: boolean;
          id?: string;
          slug?: string;
          sort_no?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      mission_category_link: {
        Row: {
          category_id: string;
          created_at: string;
          del_flg: boolean;
          mission_id: string;
          sort_no: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          del_flg?: boolean;
          mission_id: string;
          sort_no?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          del_flg?: boolean;
          mission_id?: string;
          sort_no?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_category_link_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "mission_category";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mission_category_link_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["category_id"];
          },
          {
            foreignKeyName: "mission_category_link_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_category_link_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_category_link_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_main_links: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          link: string;
          mission_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          link: string;
          mission_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          link?: string;
          mission_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_main_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_main_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_main_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_qr_codes: {
        Row: {
          code: string;
          created_at: string;
          mission_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          mission_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          mission_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_qr_codes_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_qr_codes_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_qr_codes_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_quiz_links: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          link: string;
          mission_id: string;
          remark: string | null;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          link: string;
          mission_id: string;
          remark?: string | null;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          link?: string;
          mission_id?: string;
          remark?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mission_quiz_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_quiz_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "mission_quiz_links_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          address: string | null;
          artifact_label: string | null;
          content: string | null;
          created_at: string;
          difficulty: number;
          event_category: Database["public"]["Enums"]["event_category"] | null;
          event_date: string | null;
          event_end_date: string | null;
          event_type: string | null;
          featured_importance: number | null;
          google_map_url: string | null;
          icon_url: string | null;
          id: string;
          is_featured: boolean;
          is_hidden: boolean;
          latitude: number | null;
          longitude: number | null;
          max_achievement_count: number | null;
          ogp_image_url: string | null;
          points: number;
          quest_category: Database["public"]["Enums"]["quest_category"];
          radius_meters: number | null;
          region: Database["public"]["Enums"]["mission_region"] | null;
          required_artifact_type: string;
          slug: string;
          supplement: string | null;
          tag1: string | null;
          tag2: string | null;
          tag3: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          artifact_label?: string | null;
          content?: string | null;
          created_at?: string;
          difficulty: number;
          event_category?: Database["public"]["Enums"]["event_category"] | null;
          event_date?: string | null;
          event_end_date?: string | null;
          event_type?: string | null;
          featured_importance?: number | null;
          google_map_url?: string | null;
          icon_url?: string | null;
          id: string;
          is_featured?: boolean;
          is_hidden?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          max_achievement_count?: number | null;
          ogp_image_url?: string | null;
          points?: number;
          quest_category?: Database["public"]["Enums"]["quest_category"];
          radius_meters?: number | null;
          region?: Database["public"]["Enums"]["mission_region"] | null;
          required_artifact_type?: string;
          slug: string;
          supplement?: string | null;
          tag1?: string | null;
          tag2?: string | null;
          tag3?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          artifact_label?: string | null;
          content?: string | null;
          created_at?: string;
          difficulty?: number;
          event_category?: Database["public"]["Enums"]["event_category"] | null;
          event_date?: string | null;
          event_end_date?: string | null;
          event_type?: string | null;
          featured_importance?: number | null;
          google_map_url?: string | null;
          icon_url?: string | null;
          id?: string;
          is_featured?: boolean;
          is_hidden?: boolean;
          latitude?: number | null;
          longitude?: number | null;
          max_achievement_count?: number | null;
          ogp_image_url?: string | null;
          points?: number;
          quest_category?: Database["public"]["Enums"]["quest_category"];
          radius_meters?: number | null;
          region?: Database["public"]["Enums"]["mission_region"] | null;
          required_artifact_type?: string;
          slug?: string;
          supplement?: string | null;
          tag1?: string | null;
          tag2?: string | null;
          tag3?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      party_memberships: {
        Row: {
          badge_visibility: boolean;
          created_at: string;
          metadata: Json;
          plan: string;
          synced_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          badge_visibility?: boolean;
          created_at?: string;
          metadata?: Json;
          plan: string;
          synced_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          badge_visibility?: boolean;
          created_at?: string;
          metadata?: Json;
          plan?: string;
          synced_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      poster_activities: {
        Row: {
          address: string | null;
          board_id: string | null;
          city: string;
          created_at: string;
          id: string;
          lat: number | null;
          long: number | null;
          mission_artifact_id: string;
          name: string | null;
          note: string | null;
          number: string;
          poster_count: number;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          board_id?: string | null;
          city: string;
          created_at?: string;
          id?: string;
          lat?: number | null;
          long?: number | null;
          mission_artifact_id: string;
          name?: string | null;
          note?: string | null;
          number: string;
          poster_count: number;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          board_id?: string | null;
          city?: string;
          created_at?: string;
          id?: string;
          lat?: number | null;
          long?: number | null;
          mission_artifact_id?: string;
          name?: string | null;
          note?: string | null;
          number?: string;
          poster_count?: number;
          prefecture?: Database["public"]["Enums"]["poster_prefecture_enum"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poster_activities_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "poster_board_latest_editors";
            referencedColumns: ["board_id"];
          },
          {
            foreignKeyName: "poster_activities_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "poster_boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poster_activities_mission_artifact_id_fkey";
            columns: ["mission_artifact_id"];
            isOneToOne: false;
            referencedRelation: "mission_artifacts";
            referencedColumns: ["id"];
          },
        ];
      };
      poster_board_status_history: {
        Row: {
          board_id: string;
          created_at: string;
          id: string;
          new_status: Database["public"]["Enums"]["poster_board_status"];
          note: string | null;
          previous_status:
            | Database["public"]["Enums"]["poster_board_status"]
            | null;
          user_id: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          id?: string;
          new_status: Database["public"]["Enums"]["poster_board_status"];
          note?: string | null;
          previous_status?:
            | Database["public"]["Enums"]["poster_board_status"]
            | null;
          user_id: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["poster_board_status"];
          note?: string | null;
          previous_status?:
            | Database["public"]["Enums"]["poster_board_status"]
            | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poster_board_status_history_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "poster_board_latest_editors";
            referencedColumns: ["board_id"];
          },
          {
            foreignKeyName: "poster_board_status_history_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "poster_boards";
            referencedColumns: ["id"];
          },
        ];
      };
      poster_board_totals: {
        Row: {
          city: string | null;
          created_at: string | null;
          id: string;
          note: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          source: string | null;
          total_count: number;
          updated_at: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          note?: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          source?: string | null;
          total_count: number;
          updated_at?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          note?: string | null;
          prefecture?: Database["public"]["Enums"]["poster_prefecture_enum"];
          source?: string | null;
          total_count?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      poster_boards: {
        Row: {
          address: string | null;
          archived: boolean | null;
          city: string;
          created_at: string;
          district: string | null;
          election_term: string;
          file_name: string | null;
          id: string;
          lat: number | null;
          long: number | null;
          name: string | null;
          number: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number: number | null;
          status: Database["public"]["Enums"]["poster_board_status"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          archived?: boolean | null;
          city: string;
          created_at?: string;
          district?: string | null;
          election_term: string;
          file_name?: string | null;
          id?: string;
          lat?: number | null;
          long?: number | null;
          name?: string | null;
          number?: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number?: number | null;
          status?: Database["public"]["Enums"]["poster_board_status"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          archived?: boolean | null;
          city?: string;
          created_at?: string;
          district?: string | null;
          election_term?: string;
          file_name?: string | null;
          id?: string;
          lat?: number | null;
          long?: number | null;
          name?: string | null;
          number?: string | null;
          prefecture?: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number?: number | null;
          status?: Database["public"]["Enums"]["poster_board_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      posting_activities: {
        Row: {
          created_at: string;
          id: string;
          location_text: string;
          mission_artifact_id: string;
          posting_count: number;
          shape_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          location_text: string;
          mission_artifact_id: string;
          posting_count: number;
          shape_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location_text?: string;
          mission_artifact_id?: string;
          posting_count?: number;
          shape_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posting_activities_mission_artifact_id_fkey";
            columns: ["mission_artifact_id"];
            isOneToOne: false;
            referencedRelation: "mission_artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posting_activities_shape_id_fkey";
            columns: ["shape_id"];
            isOneToOne: false;
            referencedRelation: "posting_shapes";
            referencedColumns: ["id"];
          },
        ];
      };
      posting_events: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          slug: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          slug: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          slug?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      posting_shapes: {
        Row: {
          address: string | null;
          area_m2: number | null;
          city: string | null;
          coordinates: Json;
          created_at: string | null;
          event_id: string;
          id: string;
          lat: number | null;
          lng: number | null;
          memo: string | null;
          postcode: string | null;
          prefecture: string | null;
          properties: Json | null;
          status: Database["public"]["Enums"]["posting_shape_status"];
          type: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          area_m2?: number | null;
          city?: string | null;
          coordinates: Json;
          created_at?: string | null;
          event_id: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          memo?: string | null;
          postcode?: string | null;
          prefecture?: string | null;
          properties?: Json | null;
          status?: Database["public"]["Enums"]["posting_shape_status"];
          type: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          area_m2?: number | null;
          city?: string | null;
          coordinates?: Json;
          created_at?: string | null;
          event_id?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          memo?: string | null;
          postcode?: string | null;
          prefecture?: string | null;
          properties?: Json | null;
          status?: Database["public"]["Enums"]["posting_shape_status"];
          type?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posting_shapes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "posting_events";
            referencedColumns: ["id"];
          },
        ];
      };
      private_users: {
        Row: {
          created_at: string;
          date_of_birth: string | null;
          hubspot_contact_id: string | null;
          id: string;
          postcode: string | null;
          registered_at: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date_of_birth?: string | null;
          hubspot_contact_id?: string | null;
          id: string;
          postcode?: string | null;
          registered_at?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date_of_birth?: string | null;
          hubspot_contact_id?: string | null;
          id?: string;
          postcode?: string | null;
          registered_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      public_user_profiles: {
        Row: {
          address_prefecture: string | null;
          avatar_url: string | null;
          created_at: string;
          github_username: string | null;
          id: string;
          name: string;
          updated_at: string;
          x_username: string | null;
        };
        Insert: {
          address_prefecture?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          github_username?: string | null;
          id: string;
          name: string;
          updated_at?: string;
          x_username?: string | null;
        };
        Update: {
          address_prefecture?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          github_username?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          x_username?: string | null;
        };
        Relationships: [];
      };
      quiz_categories: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          category_id: string;
          correct_answer: number;
          created_at: string;
          explanation: string | null;
          id: string;
          is_active: boolean;
          mission_id: string | null;
          option1: string;
          option2: string;
          option3: string;
          option4: string;
          question: string;
          question_order: number | null;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          correct_answer: number;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          is_active?: boolean;
          mission_id?: string | null;
          option1: string;
          option2: string;
          option3: string;
          option4: string;
          question: string;
          question_order?: number | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          correct_answer?: number;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          is_active?: boolean;
          mission_id?: string | null;
          option1?: string;
          option2?: string;
          option3?: string;
          option4?: string;
          question?: string;
          question_order?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "quiz_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      residential_poster_placements: {
        Row: {
          address: string | null;
          city: string | null;
          count: number;
          created_at: string;
          id: string;
          is_deleted: boolean;
          is_removed: boolean;
          lat: number;
          lng: number;
          location_type: string | null;
          memo: string | null;
          mission_artifact_id: string | null;
          placed_date: string | null;
          postcode: string | null;
          poster_type: string | null;
          prefecture: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          count?: number;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          is_removed?: boolean;
          lat: number;
          lng: number;
          location_type?: string | null;
          memo?: string | null;
          mission_artifact_id?: string | null;
          placed_date?: string | null;
          postcode?: string | null;
          poster_type?: string | null;
          prefecture?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          count?: number;
          created_at?: string;
          id?: string;
          is_deleted?: boolean;
          is_removed?: boolean;
          lat?: number;
          lng?: number;
          location_type?: string | null;
          memo?: string | null;
          mission_artifact_id?: string | null;
          placed_date?: string | null;
          postcode?: string | null;
          poster_type?: string | null;
          prefecture?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "residential_poster_placements_mission_artifact_id_fkey";
            columns: ["mission_artifact_id"];
            isOneToOne: false;
            referencedRelation: "mission_artifacts";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          created_at: string | null;
          end_date: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          slug: string;
          start_date: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          slug: string;
          start_date: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          slug?: string;
          start_date?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      staging_poster_boards: {
        Row: {
          address: string | null;
          city: string;
          created_at: string;
          district: string | null;
          election_term: string | null;
          file_name: string | null;
          id: string | null;
          lat: number | null;
          long: number | null;
          name: string | null;
          number: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number: number | null;
          status: Database["public"]["Enums"]["poster_board_status"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city: string;
          created_at?: string;
          district?: string | null;
          election_term?: string | null;
          file_name?: string | null;
          id?: string | null;
          lat?: number | null;
          long?: number | null;
          name?: string | null;
          number?: string | null;
          prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number?: number | null;
          status?: Database["public"]["Enums"]["poster_board_status"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string;
          created_at?: string;
          district?: string | null;
          election_term?: string | null;
          file_name?: string | null;
          id?: string | null;
          lat?: number | null;
          long?: number | null;
          name?: string | null;
          number?: string | null;
          prefecture?: Database["public"]["Enums"]["poster_prefecture_enum"];
          row_number?: number | null;
          status?: Database["public"]["Enums"]["poster_board_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      tiktok_user_connections: {
        Row: {
          access_token: string;
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          refresh_token: string;
          refresh_token_expires_at: string | null;
          scopes: string[] | null;
          tiktok_open_id: string;
          tiktok_union_id: string | null;
          token_expires_at: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          refresh_token: string;
          refresh_token_expires_at?: string | null;
          scopes?: string[] | null;
          tiktok_open_id: string;
          tiktok_union_id?: string | null;
          token_expires_at: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          refresh_token?: string;
          refresh_token_expires_at?: string | null;
          scopes?: string[] | null;
          tiktok_open_id?: string;
          tiktok_union_id?: string | null;
          token_expires_at?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      tiktok_video_stats: {
        Row: {
          comment_count: number | null;
          created_at: string | null;
          id: string;
          like_count: number | null;
          recorded_at: string;
          share_count: number | null;
          tiktok_video_id: string | null;
          view_count: number | null;
        };
        Insert: {
          comment_count?: number | null;
          created_at?: string | null;
          id?: string;
          like_count?: number | null;
          recorded_at: string;
          share_count?: number | null;
          tiktok_video_id?: string | null;
          view_count?: number | null;
        };
        Update: {
          comment_count?: number | null;
          created_at?: string | null;
          id?: string;
          like_count?: number | null;
          recorded_at?: string;
          share_count?: number | null;
          tiktok_video_id?: string | null;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tiktok_video_stats_tiktok_video_id_fkey";
            columns: ["tiktok_video_id"];
            isOneToOne: false;
            referencedRelation: "tiktok_videos";
            referencedColumns: ["id"];
          },
        ];
      };
      tiktok_videos: {
        Row: {
          created_at: string | null;
          creator_id: string;
          creator_username: string | null;
          description: string | null;
          duration: number | null;
          id: string;
          is_active: boolean | null;
          published_at: string | null;
          tags: string[] | null;
          thumbnail_url: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
          video_id: string;
          video_url: string;
        };
        Insert: {
          created_at?: string | null;
          creator_id: string;
          creator_username?: string | null;
          description?: string | null;
          duration?: number | null;
          id?: string;
          is_active?: boolean | null;
          published_at?: string | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          video_id: string;
          video_url: string;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string;
          creator_username?: string | null;
          description?: string | null;
          duration?: number | null;
          id?: string;
          is_active?: boolean | null;
          published_at?: string | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          video_id?: string;
          video_url?: string;
        };
        Relationships: [];
      };
      user_activities: {
        Row: {
          activity_title: string;
          activity_type: string;
          created_at: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          activity_title: string;
          activity_type: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          activity_title?: string;
          activity_type?: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_badges: {
        Row: {
          achieved_at: string;
          badge_type: string;
          created_at: string;
          id: string;
          is_notified: boolean;
          rank: number;
          season_id: string | null;
          sub_type: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          achieved_at?: string;
          badge_type: string;
          created_at?: string;
          id?: string;
          is_notified?: boolean;
          rank: number;
          season_id?: string | null;
          sub_type?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          achieved_at?: string;
          badge_type?: string;
          created_at?: string;
          id?: string;
          is_notified?: boolean;
          rank?: number;
          season_id?: string | null;
          sub_type?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_campaign_attribution: {
        Row: {
          campaign_code: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          campaign_code: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          campaign_code?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_emails: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_levels: {
        Row: {
          last_notified_level: number | null;
          level: number;
          line_1000pt_audience_added_at: string | null;
          season_id: string;
          updated_at: string;
          user_id: string;
          xp: number;
        };
        Insert: {
          last_notified_level?: number | null;
          level?: number;
          line_1000pt_audience_added_at?: string | null;
          season_id: string;
          updated_at?: string;
          user_id: string;
          xp?: number;
        };
        Update: {
          last_notified_level?: number | null;
          level?: number;
          line_1000pt_audience_added_at?: string | null;
          season_id?: string;
          updated_at?: string;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_levels_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_referral: {
        Row: {
          created_at: string | null;
          del_flg: boolean;
          referral_code: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          del_flg?: boolean;
          referral_code: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          del_flg?: boolean;
          referral_code?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_registration_channels: {
        Row: {
          created_at: string;
          id: string;
          line_official_account_friend: boolean | null;
          provider: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          line_official_account_friend?: boolean | null;
          provider?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          line_official_account_friend?: boolean | null;
          provider?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      xp_transactions: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          season_id: string | null;
          source_id: string | null;
          source_type: string;
          user_id: string;
          xp_amount: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          season_id?: string | null;
          source_id?: string | null;
          source_type: string;
          user_id: string;
          xp_amount: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          season_id?: string | null;
          source_id?: string | null;
          source_type?: string;
          user_id?: string;
          xp_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "xp_transactions_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      youtube_sync_status: {
        Row: {
          id: string;
          last_synced_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          last_synced_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          last_synced_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      youtube_user_comments: {
        Row: {
          comment_id: string;
          created_at: string | null;
          detected_at: string | null;
          id: string;
          mission_artifact_id: string;
          user_id: string;
          video_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string | null;
          detected_at?: string | null;
          id?: string;
          mission_artifact_id: string;
          user_id: string;
          video_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string | null;
          detected_at?: string | null;
          id?: string;
          mission_artifact_id?: string;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_user_comments_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "youtube_video_comments";
            referencedColumns: ["comment_id"];
          },
          {
            foreignKeyName: "youtube_user_comments_mission_artifact_id_fkey";
            columns: ["mission_artifact_id"];
            isOneToOne: false;
            referencedRelation: "mission_artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "youtube_user_comments_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "youtube_videos";
            referencedColumns: ["video_id"];
          },
        ];
      };
      youtube_user_connections: {
        Row: {
          access_token: string;
          avatar_url: string | null;
          channel_id: string;
          created_at: string | null;
          display_name: string | null;
          google_user_id: string;
          id: string;
          refresh_token: string;
          scopes: string[] | null;
          token_expires_at: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          avatar_url?: string | null;
          channel_id: string;
          created_at?: string | null;
          display_name?: string | null;
          google_user_id: string;
          id?: string;
          refresh_token: string;
          scopes?: string[] | null;
          token_expires_at: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          avatar_url?: string | null;
          channel_id?: string;
          created_at?: string | null;
          display_name?: string | null;
          google_user_id?: string;
          id?: string;
          refresh_token?: string;
          scopes?: string[] | null;
          token_expires_at?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      youtube_video_comments: {
        Row: {
          author_channel_id: string;
          author_display_name: string | null;
          comment_id: string;
          created_at: string | null;
          id: string;
          published_at: string;
          text_display: string | null;
          text_original: string | null;
          video_id: string;
        };
        Insert: {
          author_channel_id: string;
          author_display_name?: string | null;
          comment_id: string;
          created_at?: string | null;
          id?: string;
          published_at: string;
          text_display?: string | null;
          text_original?: string | null;
          video_id: string;
        };
        Update: {
          author_channel_id?: string;
          author_display_name?: string | null;
          comment_id?: string;
          created_at?: string | null;
          id?: string;
          published_at?: string;
          text_display?: string | null;
          text_original?: string | null;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_video_comments_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "youtube_videos";
            referencedColumns: ["video_id"];
          },
        ];
      };
      youtube_video_likes: {
        Row: {
          created_at: string | null;
          detected_at: string | null;
          id: string;
          mission_artifact_id: string;
          user_id: string;
          video_id: string;
        };
        Insert: {
          created_at?: string | null;
          detected_at?: string | null;
          id?: string;
          mission_artifact_id: string;
          user_id: string;
          video_id: string;
        };
        Update: {
          created_at?: string | null;
          detected_at?: string | null;
          id?: string;
          mission_artifact_id?: string;
          user_id?: string;
          video_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_video_likes_mission_artifact_id_fkey";
            columns: ["mission_artifact_id"];
            isOneToOne: false;
            referencedRelation: "mission_artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "youtube_video_likes_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "youtube_videos";
            referencedColumns: ["video_id"];
          },
        ];
      };
      youtube_video_stats: {
        Row: {
          comment_count: number | null;
          created_at: string | null;
          id: string;
          like_count: number | null;
          recorded_at: string;
          video_id: string;
          view_count: number | null;
        };
        Insert: {
          comment_count?: number | null;
          created_at?: string | null;
          id?: string;
          like_count?: number | null;
          recorded_at: string;
          video_id: string;
          view_count?: number | null;
        };
        Update: {
          comment_count?: number | null;
          created_at?: string | null;
          id?: string;
          like_count?: number | null;
          recorded_at?: string;
          video_id?: string;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_video_stats_video_id_fkey";
            columns: ["video_id"];
            isOneToOne: false;
            referencedRelation: "youtube_videos";
            referencedColumns: ["video_id"];
          },
        ];
      };
      youtube_videos: {
        Row: {
          channel_id: string;
          channel_title: string | null;
          comments_synced_at: string | null;
          created_at: string | null;
          description: string | null;
          duration: string | null;
          is_active: boolean | null;
          published_at: string | null;
          tags: string[] | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
          video_id: string;
          video_url: string;
        };
        Insert: {
          channel_id: string;
          channel_title?: string | null;
          comments_synced_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          duration?: string | null;
          is_active?: boolean | null;
          published_at?: string | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
          video_id: string;
          video_url: string;
        };
        Update: {
          channel_id?: string;
          channel_title?: string | null;
          comments_synced_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          duration?: string | null;
          is_active?: boolean | null;
          published_at?: string | null;
          tags?: string[] | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
          video_id?: string;
          video_url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      activity_timeline_view: {
        Row: {
          activity_type: string | null;
          address_prefecture: string | null;
          avatar_url: string | null;
          created_at: string | null;
          id: string | null;
          mission_id: string | null;
          mission_slug: string | null;
          name: string | null;
          title: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mission_achievement_count_view: {
        Row: {
          achievement_count: number | null;
          mission_id: string | null;
        };
        Relationships: [];
      };
      mission_category_view: {
        Row: {
          address: string | null;
          artifact_label: string | null;
          category_id: string | null;
          category_kbn: string | null;
          category_sort_no: number | null;
          category_title: string | null;
          content: string | null;
          created_at: string | null;
          difficulty: number | null;
          event_category: Database["public"]["Enums"]["event_category"] | null;
          event_date: string | null;
          event_end_date: string | null;
          event_type: string | null;
          google_map_url: string | null;
          icon_url: string | null;
          is_featured: boolean | null;
          is_hidden: boolean | null;
          latitude: number | null;
          link_sort_no: number | null;
          longitude: number | null;
          max_achievement_count: number | null;
          mission_id: string | null;
          ogp_image_url: string | null;
          points: number | null;
          quest_category: Database["public"]["Enums"]["quest_category"] | null;
          radius_meters: number | null;
          region: Database["public"]["Enums"]["mission_region"] | null;
          required_artifact_type: string | null;
          slug: string | null;
          supplement: string | null;
          tag1: string | null;
          tag2: string | null;
          tag3: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      mission_quiz_with_links: {
        Row: {
          category_description: string | null;
          category_id: string | null;
          category_name: string | null;
          correct_answer: number | null;
          explanation: string | null;
          mission_id: string | null;
          mission_links: Json | null;
          option1: string | null;
          option2: string | null;
          option3: string | null;
          option4: string | null;
          question: string | null;
          question_id: string | null;
          question_order: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "quiz_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      poster_board_latest_editors: {
        Row: {
          archived: boolean | null;
          board_id: string | null;
          district: string | null;
          last_edited_at: string | null;
          last_editor_id: string | null;
          lat: number | null;
          long: number | null;
          new_status: Database["public"]["Enums"]["poster_board_status"] | null;
          prefecture:
            | Database["public"]["Enums"]["poster_prefecture_enum"]
            | null;
          previous_status:
            | Database["public"]["Enums"]["poster_board_status"]
            | null;
          status: Database["public"]["Enums"]["poster_board_status"] | null;
        };
        Relationships: [];
      };
      quiz_questions_with_category: {
        Row: {
          category_description: string | null;
          category_display_order: number | null;
          category_id: string | null;
          category_name: string | null;
          correct_answer: number | null;
          created_at: string | null;
          explanation: string | null;
          id: string | null;
          is_active: boolean | null;
          mission_id: string | null;
          option1: string | null;
          option2: string | null;
          option3: string | null;
          option4: string | null;
          question: string | null;
          question_order: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "quiz_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_achievement_count_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "mission_category_view";
            referencedColumns: ["mission_id"];
          },
          {
            foreignKeyName: "quiz_questions_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      residential_poster_city_stats: {
        Row: {
          avg_lat: number | null;
          avg_lng: number | null;
          city: string | null;
          placement_count: number | null;
          prefecture: string | null;
          total_count: number | null;
        };
        Relationships: [];
      };
      user_ranking_view: {
        Row: {
          address_prefecture: string | null;
          level: number | null;
          name: string | null;
          rank: number | null;
          updated_at: string | null;
          user_id: string | null;
          xp: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      analytics_acquisitions: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          achievements: number;
          campaign_code: string;
          channel: string;
          mission_id: string;
          mission_slug: string;
          mission_title: string;
          referrer_host: string;
          users: number;
        }[];
      };
      analytics_by_channel: {
        Args: { from_ts: string; to_ts: string };
        Returns: {
          achievements: number;
          avg_engaged_seconds: number;
          channel: string;
          page_views: number;
          sessions: number;
          signups: number;
          visitors: number;
        }[];
      };
      analytics_by_hour: {
        Args: { from_ts: string; to_ts: string };
        Returns: {
          day_of_week: number;
          hour_of_day: number;
          sessions: number;
          visitors: number;
        }[];
      };
      analytics_by_location: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          ip_city: string;
          ip_country: string;
          ip_region: string;
          sessions: number;
          visitors: number;
        }[];
      };
      analytics_by_page: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          avg_engaged_seconds: number;
          avg_max_scroll_pct: number;
          entries: number;
          exits: number;
          median_engaged_seconds: number;
          page_path: string;
          page_title: string;
          page_views: number;
          read_to_bottom_rate: number;
          visitors: number;
        }[];
      };
      analytics_by_referrer: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          campaign_code: string;
          channel: string;
          referrer_host: string;
          sessions: number;
          utm_campaign: string;
          utm_medium: string;
          utm_source: string;
          visitors: number;
        }[];
      };
      analytics_click_targets: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          clicks: number;
          element_path: string;
          href: string;
          is_outbound: boolean;
          label: string;
          page_path: string;
          visitors: number;
        }[];
      };
      analytics_content_dwell: {
        Args: {
          content_type?: string;
          from_ts: string;
          row_limit?: number;
          to_ts: string;
        };
        Returns: {
          avg_max_visible_pct: number;
          avg_seconds: number;
          content_id: string;
          content_label: string;
          content_type_out: string;
          fully_seen_rate: number;
          impressions: number;
          page_path: string;
          total_seconds: number;
          visitors: number;
        }[];
      };
      analytics_overview: {
        Args: { from_ts: string; to_ts: string };
        Returns: {
          avg_engaged_seconds: number;
          avg_max_scroll_pct: number;
          bounce_rate: number;
          logged_in_users: number;
          page_views: number;
          sessions: number;
          visitors: number;
        }[];
      };
      analytics_page_bands: {
        Args: { from_ts: string; target_path?: string; to_ts: string };
        Returns: {
          avg_seconds: number;
          band_index: number;
          page_views: number;
          total_seconds: number;
        }[];
      };
      analytics_page_flow: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          from_path: string;
          step_index: number;
          to_path: string;
          transitions: number;
        }[];
      };
      analytics_page_sections: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          avg_seconds: number;
          page_path: string;
          page_views: number;
          section_label: string;
          section_top: number;
          total_seconds: number;
        }[];
      };
      analytics_recent_sessions: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          achievements: number;
          browser: string;
          channel: string;
          device_type: string;
          engaged_seconds: number;
          ip_city: string;
          ip_region: string;
          landing_path: string;
          last_seen_at: string;
          page_views: number;
          referrer_host: string;
          session_id: string;
          started_at: string;
          user_id: string;
          visitor_id: string;
        }[];
      };
      analytics_session_timeline: {
        Args: { row_limit?: number; target_session_id: string };
        Returns: {
          engaged_ms: number;
          event_name: string;
          gps_latitude: number;
          gps_longitude: number;
          max_scroll_pct: number;
          ms_since_page_view: number;
          occurred_at: string;
          page_path: string;
          page_title: string;
          props: Json;
          scroll_pct: number;
          seq: number;
        }[];
      };
      analytics_visit_frequency: {
        Args: { from_ts: string; to_ts: string };
        Returns: {
          logged_in_visitors: number;
          visit_count: number;
          visitors: number;
        }[];
      };
      analytics_visitor_activity: {
        Args: { from_ts: string; row_limit?: number; to_ts: string };
        Returns: {
          achievements: number;
          channels: string;
          devices: string;
          engaged_seconds: number;
          first_seen_at: string;
          last_seen_at: string;
          locations: string;
          page_views: number;
          user_id: string;
          user_name: string;
          visitor_id: string;
          visits: number;
        }[];
      };
      delete_user_account: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      get_action_stats_summary: {
        Args: { end_date?: string; start_date?: string };
        Returns: {
          active_users: number;
          daily_actions_increase: number;
          daily_users_increase: number;
          total_actions: number;
        }[];
      };
      get_archived_poster_board_stats: {
        Args: { p_election_term: string };
        Returns: {
          count: number;
          prefecture: string;
          status: Database["public"]["Enums"]["poster_board_status"];
        }[];
      };
      get_campaign_attribution_stats: {
        Args: {
          campaign_code_prefix?: string;
          registered_before?: string;
          registered_from?: string;
        };
        Returns: {
          campaign_code: string;
          first_registered_at: string;
          last_registered_at: string;
          registrations: number;
        }[];
      };
      get_daily_action_history: {
        Args: { end_date?: string; start_date?: string };
        Returns: {
          count: number;
          date: string;
        }[];
      };
      get_daily_active_users_history: {
        Args: { end_date?: string; start_date?: string };
        Returns: {
          count: number;
          date: string;
        }[];
      };
      get_mission_action_ranking: {
        Args: { end_date?: string; limit_count?: number; start_date?: string };
        Returns: {
          action_count: number;
          icon_url: string;
          is_hidden: boolean;
          mission_id: string;
          mission_slug: string;
          mission_title: string;
        }[];
      };
      get_mission_links: {
        Args: { p_mission_id: string };
        Returns: {
          display_order: number;
          link: string;
          remark: string;
        }[];
      };
      get_mission_quiz_questions: {
        Args: { p_mission_id: string };
        Returns: {
          category_description: string;
          category_id: string;
          category_name: string;
          correct_answer: number;
          explanation: string;
          mission_links: Json;
          option1: string;
          option2: string;
          option3: string;
          option4: string;
          question: string;
          question_id: string;
          question_order: number;
        }[];
      };
      get_mission_ranking: {
        Args: { limit_count?: number; mission_id: string };
        Returns: {
          address_prefecture: string;
          clear_count: number;
          level: number;
          rank: number;
          total_points: number;
          updated_at: string;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_period_mission_ranking: {
        Args: {
          p_limit?: number;
          p_mission_id: string;
          p_season_id?: string;
          p_start_date?: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          mission_id: string;
          rank: number;
          total_points: number;
          updated_at: string;
          user_achievement_count: number;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_period_prefecture_ranking: {
        Args: {
          p_limit?: number;
          p_prefecture: string;
          p_season_id?: string;
          p_start_date?: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          name: string;
          rank: number;
          updated_at: string;
          user_id: string;
          xp: number;
        }[];
      };
      get_period_ranking: {
        Args: {
          p_end_date?: string;
          p_limit?: number;
          p_season_id?: string;
          p_start_date?: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          name: string;
          rank: number;
          updated_at: string;
          user_id: string;
          xp: number;
        }[];
      };
      get_poster_board_stats: {
        Args: never;
        Returns: {
          count: number;
          prefecture: string;
          status: Database["public"]["Enums"]["poster_board_status"];
        }[];
      };
      get_poster_board_stats_optimized: {
        Args: {
          target_prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
        };
        Returns: {
          status_counts: Json;
          total_count: number;
        }[];
      };
      get_prefecture_ranking: {
        Args: { limit_count?: number; prefecture: string };
        Returns: {
          address_prefecture: string;
          level: number;
          rank: number;
          updated_at: string;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_prefecture_team_ranking: {
        Args: { p_limit?: number; p_season_id?: string };
        Returns: {
          prefecture: string;
          total_xp: number;
          user_count: number;
        }[];
      };
      get_top_users_posting_count: {
        Args: { user_ids: string[] };
        Returns: {
          posting_count: number;
          user_id: string;
        }[];
      };
      get_top_users_posting_count_by_mission: {
        Args: {
          p_season_id?: string;
          target_mission_id: string;
          user_ids: string[];
        };
        Returns: {
          posting_count: number;
          user_id: string;
        }[];
      };
      get_total_posting_count_by_mission: {
        Args: { p_season_id?: string; target_mission_id: string };
        Returns: number;
      };
      get_user_by_email: {
        Args: { user_email: string };
        Returns: {
          email: string;
          id: string;
          user_metadata: Json;
        }[];
      };
      get_user_by_line_id: {
        Args: { line_user_id: string };
        Returns: {
          email: string;
          id: string;
          user_metadata: Json;
        }[];
      };
      get_user_edited_boards_by_prefecture: {
        Args: {
          target_prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          target_user_id: string;
        };
        Returns: {
          board_id: string;
        }[];
      };
      get_user_edited_boards_with_details: {
        Args: {
          target_prefecture: Database["public"]["Enums"]["poster_prefecture_enum"];
          target_user_id: string;
        };
        Returns: {
          board_id: string;
          last_edited_at: string;
          lat: number;
          long: number;
          status: Database["public"]["Enums"]["poster_board_status"];
        }[];
      };
      get_user_mission_ranking: {
        Args: { mission_id: string; user_id: string };
        Returns: {
          address_prefecture: string;
          clear_count: number;
          level: number;
          rank: number;
          total_points: number;
          updated_at: string;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_user_period_mission_ranking: {
        Args: {
          p_mission_id: string;
          p_season_id?: string;
          p_start_date?: string;
          p_user_id: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          mission_id: string;
          rank: number;
          total_points: number;
          updated_at: string;
          user_achievement_count: number;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_user_period_prefecture_ranking: {
        Args: {
          p_prefecture: string;
          p_season_id?: string;
          p_start_date?: string;
          p_user_id: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          name: string;
          rank: number;
          updated_at: string;
          user_id: string;
          xp: number;
        }[];
      };
      get_user_period_ranking: {
        Args: {
          p_season_id?: string;
          start_date?: string;
          target_user_id: string;
        };
        Returns: {
          address_prefecture: string;
          level: number;
          name: string;
          rank: number;
          updated_at: string;
          user_id: string;
          xp: number;
        }[];
      };
      get_user_posting_count: {
        Args: { target_user_id: string };
        Returns: number;
      };
      get_user_posting_count_by_mission: {
        Args: {
          p_season_id?: string;
          target_mission_id: string;
          target_user_id: string;
        };
        Returns: number;
      };
      get_user_prefecture_contribution: {
        Args: { p_season_id?: string; p_user_id: string };
        Returns: {
          prefecture: string;
          prefecture_total_xp: number;
          user_rank_in_prefecture: number;
          user_xp: number;
        }[];
      };
      get_user_prefecture_ranking: {
        Args: { prefecture: string; target_user_id: string };
        Returns: {
          address_prefecture: string;
          level: number;
          rank: number;
          updated_at: string;
          user_id: string;
          user_name: string;
          xp: number;
        }[];
      };
      get_users_by_emails: {
        Args: { email_list: string[] };
        Returns: {
          email: string;
          id: string;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_internal_analytics_path: { Args: { path: string }; Returns: boolean };
      is_posting_admin: { Args: never; Returns: boolean };
      purge_analytics_older_than: {
        Args: { retention_days?: number };
        Returns: number;
      };
    };
    Enums: {
      event_category: "SPOT" | "SPORTS" | "ART" | "FOOD" | "MIXED";
      mission_region:
        | "IWAKI"
        | "HIRONO"
        | "NARAHA"
        | "TOMIOKA"
        | "OKUMA"
        | "FUTABA"
        | "NAMIE"
        | "KATSURAO"
        | "KAWAUCHI"
        | "MINAMISOMA"
        | "IITATE"
        | "SHINCHI"
        | "SOMA"
        | "TOKYO"
        | "WIDE";
      poster_board_status:
        | "not_yet"
        | "reserved"
        | "done"
        | "error_wrong_place"
        | "error_damaged"
        | "error_wrong_poster"
        | "other"
        | "not_yet_dangerous";
      poster_prefecture_enum:
        | "北海道"
        | "宮城県"
        | "埼玉県"
        | "千葉県"
        | "東京都"
        | "神奈川県"
        | "長野県"
        | "愛知県"
        | "大阪府"
        | "兵庫県"
        | "愛媛県"
        | "福岡県"
        | "京都府";
      posting_shape_status: "planned" | "completed" | "unavailable" | "other";
      quest_category:
        | "PERMANENT"
        | "SPECIAL_HAMADORI"
        | "SPECIAL_TOKYO"
        | "SNS";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_category: ["SPOT", "SPORTS", "ART", "FOOD", "MIXED"],
      mission_region: [
        "IWAKI",
        "HIRONO",
        "NARAHA",
        "TOMIOKA",
        "OKUMA",
        "FUTABA",
        "NAMIE",
        "KATSURAO",
        "KAWAUCHI",
        "MINAMISOMA",
        "IITATE",
        "SHINCHI",
        "SOMA",
        "TOKYO",
        "WIDE",
      ],
      poster_board_status: [
        "not_yet",
        "reserved",
        "done",
        "error_wrong_place",
        "error_damaged",
        "error_wrong_poster",
        "other",
        "not_yet_dangerous",
      ],
      poster_prefecture_enum: [
        "北海道",
        "宮城県",
        "埼玉県",
        "千葉県",
        "東京都",
        "神奈川県",
        "長野県",
        "愛知県",
        "大阪府",
        "兵庫県",
        "愛媛県",
        "福岡県",
        "京都府",
      ],
      posting_shape_status: ["planned", "completed", "unavailable", "other"],
      quest_category: ["PERMANENT", "SPECIAL_HAMADORI", "SPECIAL_TOKYO", "SNS"],
    },
  },
} as const;

// Tipi del DB nel formato compatibile con `@supabase/postgrest-js` v2.
// Da rigenerare con `supabase gen types typescript` quando cambia lo schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "superadmin" | "artist" | "user";
export type ArtistStatus = "pending" | "approved" | "rejected";
export type LeadStatus = "new" | "contacted" | "closed";
export type AvailabilityStatus = "available" | "busy";
export type EventCategory =
  | "music"
  | "clubs"
  | "festivals"
  | "dating"
  | "culture"
  | "art"
  | "food"
  | "workshops"
  | "comedy"
  | "business";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Role;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: Role;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: Role;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          id: string;
          user_id: string | null;
          stage_name: string;
          slug: string;
          bio: string | null;
          genre: string[];
          city: string | null;
          cover_image: string | null;
          gallery: string[];
          social_links: Json;
          base_fee: number | null;
          status: ArtistStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          stage_name: string;
          slug: string;
          bio?: string | null;
          genre?: string[];
          city?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          social_links?: Json;
          base_fee?: number | null;
          status?: ArtistStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          stage_name?: string;
          slug?: string;
          bio?: string | null;
          genre?: string[];
          city?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          social_links?: Json;
          base_fee?: number | null;
          status?: ArtistStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      artist_availability: {
        Row: {
          id: string;
          artist_id: string;
          date: string;
          status: AvailabilityStatus;
        };
        Insert: {
          id?: string;
          artist_id: string;
          date: string;
          status?: AvailabilityStatus;
        };
        Update: {
          id?: string;
          artist_id?: string;
          date?: string;
          status?: AvailabilityStatus;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          category: EventCategory;
          date: string;
          city: string;
          venue: string | null;
          price: number | null;
          cover_image: string | null;
          description: string | null;
          featured: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          category: EventCategory;
          date: string;
          city: string;
          venue?: string | null;
          price?: number | null;
          cover_image?: string | null;
          description?: string | null;
          featured?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          category?: EventCategory;
          date?: string;
          city?: string;
          venue?: string | null;
          price?: number | null;
          cover_image?: string | null;
          description?: string | null;
          featured?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          artist_id: string;
          requester_user_id: string | null;
          event_date: string;
          event_location: string;
          budget: number | null;
          message: string;
          contact_email: string;
          contact_phone: string | null;
          status: LeadStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          requester_user_id?: string | null;
          event_date: string;
          event_location: string;
          budget?: number | null;
          message: string;
          contact_email: string;
          contact_phone?: string | null;
          status?: LeadStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          requester_user_id?: string | null;
          event_date?: string;
          event_location?: string;
          budget?: number | null;
          message?: string;
          contact_email?: string;
          contact_phone?: string | null;
          status?: LeadStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      artist_applications: {
        Row: {
          id: string;
          name: string;
          email: string;
          stage_name: string;
          genre: string[];
          bio: string | null;
          links: Json;
          status: ArtistStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          stage_name: string;
          genre?: string[];
          bio?: string | null;
          links?: Json;
          status?: ArtistStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          stage_name?: string;
          genre?: string[];
          bio?: string | null;
          links?: Json;
          status?: ArtistStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject?: string | null;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string | null;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      collaborations: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          link: string | null;
          description: string | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          link?: string | null;
          description?: string | null;
          order_index?: number;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          link?: string | null;
          description?: string | null;
          order_index?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      role_enum: Role;
      artist_status_enum: ArtistStatus;
      lead_status_enum: LeadStatus;
      availability_status_enum: AvailabilityStatus;
      event_category_enum: EventCategory;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

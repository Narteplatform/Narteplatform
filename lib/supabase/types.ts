// Tipi del DB. Da rigenerare con `supabase gen types typescript` quando cambia lo schema.
export type Role = "superadmin" | "artist" | "user";
export type ArtistStatus = "pending" | "approved" | "rejected";
export type LeadStatus = "new" | "contacted" | "closed";
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

export type Database = {
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
        Insert: { id: string; role?: Role; full_name?: string | null; avatar_url?: string | null };
        Update: Partial<{ role: Role; full_name: string | null; avatar_url: string | null }>;
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
          social_links: Record<string, string>;
          base_fee: number | null;
          status: ArtistStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artists"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["artists"]["Insert"]>;
      };
      artist_availability: {
        Row: { id: string; artist_id: string; date: string; status: "available" | "busy" };
        Insert: Omit<Database["public"]["Tables"]["artist_availability"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["artist_availability"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "status"> & {
          id?: string;
          status?: LeadStatus;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      artist_applications: {
        Row: {
          id: string;
          name: string;
          email: string;
          stage_name: string;
          genre: string[];
          bio: string | null;
          links: Record<string, string>;
          status: ArtistStatus;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["artist_applications"]["Row"], "id" | "created_at" | "status"> & {
          id?: string;
          status?: ArtistStatus;
        };
        Update: Partial<Database["public"]["Tables"]["artist_applications"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["contact_messages"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Insert"]>;
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
        Insert: Omit<Database["public"]["Tables"]["collaborations"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["collaborations"]["Insert"]>;
      };
    };
  };
};

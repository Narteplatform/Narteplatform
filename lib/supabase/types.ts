// Tipi del DB nel formato compatibile con `@supabase/postgrest-js` v2.
// Da rigenerare con `supabase gen types typescript` quando cambia lo schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "superadmin" | "artist" | "user" | "organizer" | "consultant";
export type ArtistStatus = "pending" | "approved" | "rejected";
export type LeadStatus = "new" | "contacted" | "closed";
export type AvailabilityStatus = "available" | "busy";
export type PriceBand = "budget" | "standard" | "premium" | "luxury";
export type ArtistTier = "free" | "pro" | "max";
export type ArtistPath = "cover_artist" | "tribute_band" | "progetto_inedito";
export type VenueType = "club" | "pub" | "festival" | "teatro" | "locale" | "privato" | "altro";
export type BookingStatus = "pending" | "in_trattativa" | "confermata" | "rifiutata" | "annullata";
export type ChatMessageKind = "text" | "offer" | "system" | "image" | "document" | "voice";
export type ChatOfferStatus = "pending" | "accepted" | "rejected" | "superseded";
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
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
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
          instruments: string[];
          city: string | null;
          cover_image: string | null;
          gallery: string[];
          videos: string[];
          social_links: Json;
          base_fee: number | null;
          price_band: PriceBand;
          status: ArtistStatus;
          tier: ArtistTier;
          tier_override: ArtistTier | null;
          tier_override_expires_at: string | null;
          tier_override_reason: string | null;
          plan_suspended: boolean;
          plan_suspended_at: string | null;
          /** Colonna generata: status = 'approved' and not plan_suspended. Sola lettura. */
          is_public: boolean;
          percorso_artistico: ArtistPath | null;
          price_range: string | null;
          gig_min_minutes: number | null;
          gig_max_minutes: number | null;
          languages: string[];
          what_to_expect: string | null;
          about_extended: string | null;
          personnel: Json;
          set_list: string | null;
          influences: string[];
          setup_requirements: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          stage_name: string;
          slug: string;
          bio?: string | null;
          genre?: string[];
          instruments?: string[];
          city?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          videos?: string[];
          social_links?: Json;
          base_fee?: number | null;
          price_band?: PriceBand;
          status?: ArtistStatus;
          tier?: ArtistTier;
          percorso_artistico?: ArtistPath | null;
          price_range?: string | null;
          gig_min_minutes?: number | null;
          gig_max_minutes?: number | null;
          languages?: string[];
          what_to_expect?: string | null;
          about_extended?: string | null;
          personnel?: Json;
          set_list?: string | null;
          influences?: string[];
          setup_requirements?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          stage_name?: string;
          slug?: string;
          bio?: string | null;
          genre?: string[];
          instruments?: string[];
          city?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          videos?: string[];
          social_links?: Json;
          base_fee?: number | null;
          price_band?: PriceBand;
          status?: ArtistStatus;
          tier?: ArtistTier;
          percorso_artistico?: ArtistPath | null;
          price_range?: string | null;
          gig_min_minutes?: number | null;
          gig_max_minutes?: number | null;
          languages?: string[];
          what_to_expect?: string | null;
          about_extended?: string | null;
          personnel?: Json;
          set_list?: string | null;
          influences?: string[];
          setup_requirements?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: {
          id: string;
          name: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          order_index?: number;
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
          end_at: string | null;
          city: string;
          venue: string | null;
          price: number | null;
          cover_image: string | null;
          cover_image_home: string | null;
          gallery: string[];
          videos: string[];
          description: string | null;
          featured: boolean;
          ticket_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          category: EventCategory;
          date: string;
          end_at?: string | null;
          city: string;
          venue?: string | null;
          price?: number | null;
          cover_image?: string | null;
          cover_image_home?: string | null;
          gallery?: string[];
          videos?: string[];
          description?: string | null;
          featured?: boolean;
          ticket_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          category?: EventCategory;
          date?: string;
          end_at?: string | null;
          city?: string;
          venue?: string | null;
          price?: number | null;
          cover_image?: string | null;
          cover_image_home?: string | null;
          gallery?: string[];
          videos?: string[];
          description?: string | null;
          featured?: boolean;
          ticket_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      artist_default_slots: {
        Row: {
          id: string;
          artist_id: string;
          label: string | null;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          label?: string | null;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          label?: string | null;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      artist_date_slots: {
        Row: {
          id: string;
          artist_id: string;
          date: string;
          label: string | null;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          date: string;
          label?: string | null;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          date?: string;
          label?: string | null;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          artist_id: string | null;
          requester_user_id: string | null;
          event_date: string | null;
          event_location: string | null;
          budget: number | null;
          message: string;
          contact_email: string;
          contact_phone: string | null;
          status: LeadStatus;
          tags: string[];
          event_time: string | null;
          source: string;
          contact_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id?: string | null;
          requester_user_id?: string | null;
          event_date?: string | null;
          event_location?: string | null;
          budget?: number | null;
          message: string;
          contact_email: string;
          contact_phone?: string | null;
          status?: LeadStatus;
          tags?: string[];
          event_time?: string | null;
          source?: string;
          contact_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string | null;
          requester_user_id?: string | null;
          event_date?: string | null;
          event_location?: string | null;
          budget?: number | null;
          message?: string;
          contact_email?: string;
          contact_phone?: string | null;
          status?: LeadStatus;
          tags?: string[];
          event_time?: string | null;
          source?: string;
          contact_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      formats: {
        Row: {
          id: string;
          slug: string;
          title: string;
          tagline: string | null;
          description: string | null;
          cover_image: string | null;
          gallery: string[];
          videos: string[];
          icon: string | null;
          order_index: number;
          details: Json;
          seo_title: string | null;
          seo_description: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          tagline?: string | null;
          description?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          videos?: string[];
          icon?: string | null;
          order_index?: number;
          details?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          tagline?: string | null;
          description?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          videos?: string[];
          icon?: string | null;
          order_index?: number;
          details?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
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
          video_url: string | null;
          video_path: string | null;
          instruments: string[];
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
          video_url?: string | null;
          video_path?: string | null;
          instruments?: string[];
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
          video_url?: string | null;
          video_path?: string | null;
          instruments?: string[];
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
      organizers: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          is_brand: boolean;
          is_private: boolean;
          phone: string | null;
          website: string | null;
          instagram: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_brand?: boolean;
          is_private?: boolean;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_brand?: boolean;
          is_private?: boolean;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          id: string;
          organizer_id: string;
          name: string;
          slug: string | null;
          address: string | null;
          city: string | null;
          region: string | null;
          postal_code: string | null;
          capacity: number | null;
          venue_type: VenueType;
          description: string | null;
          cover_image: string | null;
          gallery: string[];
          website: string | null;
          instagram: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          name: string;
          slug?: string | null;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          postal_code?: string | null;
          capacity?: number | null;
          venue_type?: VenueType;
          description?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          website?: string | null;
          instagram?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          name?: string;
          slug?: string | null;
          address?: string | null;
          city?: string | null;
          region?: string | null;
          postal_code?: string | null;
          capacity?: number | null;
          venue_type?: VenueType;
          description?: string | null;
          cover_image?: string | null;
          gallery?: string[];
          website?: string | null;
          instagram?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      booking_requests: {
        Row: {
          id: string;
          organizer_id: string;
          venue_id: string | null;
          artist_id: string;
          event_date: string;
          time_slot: string | null;
          budget_offer: number | null;
          message: string;
          status: BookingStatus;
          artist_accepted_at: string | null;
          organizer_confirmed_at: string | null;
          notes_artist: string | null;
          final_price: number | null;
          final_price_proposed_by: string | null;
          final_price_proposed_at: string | null;
          final_price_confirmed_by: string | null;
          final_price_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          venue_id?: string | null;
          artist_id: string;
          event_date: string;
          time_slot?: string | null;
          budget_offer?: number | null;
          message: string;
          status?: BookingStatus;
          artist_accepted_at?: string | null;
          organizer_confirmed_at?: string | null;
          notes_artist?: string | null;
          final_price?: number | null;
          final_price_proposed_by?: string | null;
          final_price_proposed_at?: string | null;
          final_price_confirmed_by?: string | null;
          final_price_confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          venue_id?: string | null;
          artist_id?: string;
          event_date?: string;
          time_slot?: string | null;
          budget_offer?: number | null;
          message?: string;
          status?: BookingStatus;
          artist_accepted_at?: string | null;
          organizer_confirmed_at?: string | null;
          notes_artist?: string | null;
          final_price?: number | null;
          final_price_proposed_by?: string | null;
          final_price_proposed_at?: string | null;
          final_price_confirmed_by?: string | null;
          final_price_confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_page_permissions: {
        Row: {
          user_id: string;
          page_key: string;
          can_view: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          page_key: string;
          can_view?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          page_key?: string;
          can_view?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      artist_videos: {
        Row: {
          id: string;
          artist_id: string;
          url: string;
          storage_path: string;
          title: string | null;
          duration_ms: number | null;
          size_bytes: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          url: string;
          storage_path: string;
          title?: string | null;
          duration_ms?: number | null;
          size_bytes?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          url?: string;
          storage_path?: string;
          title?: string | null;
          duration_ms?: number | null;
          size_bytes?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          booking_request_id: string;
          organizer_id: string;
          artist_id: string;
          rating: number;
          body: string;
          hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_request_id: string;
          organizer_id: string;
          artist_id: string;
          rating: number;
          body: string;
          hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_request_id?: string;
          organizer_id?: string;
          artist_id?: string;
          rating?: number;
          body?: string;
          hidden?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_feedback: {
        Row: {
          id: string;
          user_id: string;
          role: Role;
          category: "generale" | "bug" | "suggerimento" | "altro";
          subject: string | null;
          body: string;
          rating: number | null;
          status: "new" | "read" | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: Role;
          category?: "generale" | "bug" | "suggerimento" | "altro";
          subject?: string | null;
          body: string;
          rating?: number | null;
          status?: "new" | "read" | "archived";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Role;
          category?: "generale" | "bug" | "suggerimento" | "altro";
          subject?: string | null;
          body?: string;
          rating?: number | null;
          status?: "new" | "read" | "archived";
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          artist_id: string;
          organizer_id: string;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          organizer_id: string;
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          organizer_id?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          to_addresses: string[];
          subject: string;
          template: string | null;
          status: "sent" | "failed" | "skipped";
          provider_id: string | null;
          error: string | null;
          meta: Json;
          sent_at: string;
        };
        Insert: {
          id?: string;
          to_addresses: string[];
          subject: string;
          template?: string | null;
          status: "sent" | "failed" | "skipped";
          provider_id?: string | null;
          error?: string | null;
          meta?: Json;
          sent_at?: string;
        };
        Update: {
          id?: string;
          to_addresses?: string[];
          subject?: string;
          template?: string | null;
          status?: "sent" | "failed" | "skipped";
          provider_id?: string | null;
          error?: string | null;
          meta?: Json;
          sent_at?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          cover_image: string | null;
          content: string;
          seo_title: string | null;
          seo_description: string | null;
          author_name: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          cover_image?: string | null;
          content: string;
          seo_title?: string | null;
          seo_description?: string | null;
          author_name?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          cover_image?: string | null;
          content?: string;
          seo_title?: string | null;
          seo_description?: string | null;
          author_name?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          sender_role: Role;
          kind: ChatMessageKind;
          body: string | null;
          offer_event_date: string | null;
          offer_time_slot: string | null;
          offer_budget_cents: number | null;
          offer_description: string | null;
          offer_status: ChatOfferStatus | null;
          offer_responded_at: string | null;
          offer_booking_request_id: string | null;
          read_by_artist_at: string | null;
          read_by_organizer_at: string | null;
          attachment_url: string | null;
          attachment_type: string | null;
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          sender_role: Role;
          kind?: ChatMessageKind;
          body?: string | null;
          offer_event_date?: string | null;
          offer_time_slot?: string | null;
          offer_budget_cents?: number | null;
          offer_description?: string | null;
          offer_status?: ChatOfferStatus | null;
          offer_responded_at?: string | null;
          offer_booking_request_id?: string | null;
          read_by_artist_at?: string | null;
          read_by_organizer_at?: string | null;
          attachment_url?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string | null;
          sender_role?: Role;
          kind?: ChatMessageKind;
          body?: string | null;
          offer_event_date?: string | null;
          offer_time_slot?: string | null;
          offer_budget_cents?: number | null;
          offer_description?: string | null;
          offer_status?: ChatOfferStatus | null;
          offer_responded_at?: string | null;
          offer_booking_request_id?: string | null;
          read_by_artist_at?: string | null;
          read_by_organizer_at?: string | null;
          attachment_url?: string | null;
          attachment_type?: string | null;
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_duration_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      booking_requests_public: {
        Row: {
          id: string;
          artist_id: string;
          event_date: string;
          status: BookingStatus;
          time_slot: string | null;
          organizer_id: string;
          organizer_name: string;
          organizer_avatar: string | null;
          venue_id: string | null;
          venue_name: string | null;
          venue_city: string | null;
          venue_cover: string | null;
        };
        // Obbligatorio: `GenericView` di postgrest-js lo richiede anche per le
        // view non aggiornabili. Se manca, `Views` non soddisfa `GenericSchema`
        // e l'intero schema `public` collassa a `never`.
        Relationships: [];
      };
    };
    Functions: {
      promote_user_to_organizer: {
        Args: { uid: string };
        Returns: void;
      };
      get_or_create_conversation: {
        Args: { p_artist_id: string; p_organizer_id: string };
        Returns: string;
      };
      accept_offer_v2: {
        Args: { p_message_id: string };
        Returns: Json;
      };
      compute_artist_tier: {
        Args: { p_artist_id: string };
        Returns: ArtistTier;
      };
      account_tier: {
        Args: { p_user_id: string };
        Returns: ArtistTier;
      };
      sync_account_tiers: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      sync_artist_tier: {
        Args: { p_artist_id: string };
        Returns: ArtistTier;
      };
      admin_set_artist_tier: {
        Args: {
          p_artist_id: string;
          p_tier: ArtistTier;
          p_expires_at?: string | null;
          p_reason?: string | null;
        };
        Returns: ArtistTier;
      };
    };
    Enums: {
      role_enum: Role;
      artist_status_enum: ArtistStatus;
      lead_status_enum: LeadStatus;
      availability_status_enum: AvailabilityStatus;
      event_category_enum: EventCategory;
      price_band_enum: PriceBand;
      venue_type_enum: VenueType;
      booking_status_enum: BookingStatus;
      chat_message_kind: ChatMessageKind;
      chat_offer_status: ChatOfferStatus;
      artist_tier_enum: ArtistTier;
      artist_path_enum: ArtistPath;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

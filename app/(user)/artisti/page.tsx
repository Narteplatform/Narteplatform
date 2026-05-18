import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Reveal } from "@/components/animations/Reveal";
import { ArtistsExplorer } from "@/components/marketing/ArtistsExplorer";
import { ArtistiTabs } from "@/components/marketing/ArtistiTabs";
import { ConsultantPanel, type ConsultantSlot } from "@/components/marketing/ConsultantPanel";
import type { PriceBand } from "@/lib/supabase/types";

export const metadata = { title: "Artisti — N'arte" };

export default async function ArtistiPage() {
  const supabase = createAdminClient();
  type ArtistRow = {
    id: string;
    slug: string;
    stage_name: string;
    city: string | null;
    cover_image: string | null;
    genre: string[] | null;
    instruments?: string[] | null;
    price_band?: PriceBand | null;
  };
  let rows: ArtistRow[] = [];
  {
    const full = await supabase
      .from("artists")
      .select("id, slug, stage_name, city, genre, instruments, cover_image, price_band")
      .eq("status", "approved")
      .order("stage_name", { ascending: true });
    if (full.error) {
      console.error("[ArtistiPage] full select error", full.error);
      const minimal = await supabase
        .from("artists")
        .select("id, slug, stage_name, city, genre, cover_image")
        .eq("status", "approved")
        .order("stage_name", { ascending: true });
      if (minimal.error) console.error("[ArtistiPage] minimal select error", minimal.error);
      rows = ((minimal.data ?? []) as unknown) as ArtistRow[];
    } else {
      rows = ((full.data ?? []) as unknown) as ArtistRow[];
    }
  }

  const viewer = await getCurrentUser();
  const isGuest = !viewer;
  const canSeePrice =
    viewer?.profile?.role === "organizer" || viewer?.profile?.role === "superadmin";

  const artists = rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    stage_name: a.stage_name,
    city: a.city,
    cover_image: a.cover_image,
    genre: (a.genre ?? []) as string[],
    instruments: (a.instruments ?? []) as string[],
    price_band: (a.price_band ?? "standard") as PriceBand,
  }));

  // Slot consulenza futuri (next 30 giorni)
  const nowIso = new Date().toISOString();
  const { data: slotsRaw } = await supabase
    .from("consultant_slots")
    .select("id, slot_at, duration_min")
    .eq("is_active", true)
    .gte("slot_at", nowIso)
    .order("slot_at", { ascending: true })
    .limit(60);

  // Esclude slot già prenotati
  const slotIds = (slotsRaw ?? []).map((s) => s.id);
  let bookedSet = new Set<string>();
  if (slotIds.length > 0) {
    const { data: booked } = await supabase
      .from("consultations")
      .select("slot_id")
      .in("slot_id", slotIds)
      .in("status", ["requested", "confirmed"]);
    bookedSet = new Set((booked ?? []).map((b) => b.slot_id as string));
  }
  const slots: ConsultantSlot[] = ((slotsRaw ?? []) as unknown as ConsultantSlot[]).filter(
    (s) => !bookedSet.has(s.id)
  );

  const artistsPanel =
    artists.length === 0 ? (
      <p className="text-center text-muted-foreground">Nessun artista ancora pubblicato.</p>
    ) : (
      <ArtistsExplorer artists={artists} canSeePrice={canSeePrice} isGuest={isGuest} />
    );

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-10 md:pt-32 md:pb-14">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">roster</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">Gli artisti</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Sfoglia il roster di artisti emergenti N&apos;arte oppure prenota una chiamata
              gratuita con un nostro consulente per ricevere supporto su misura.
            </p>
          </Reveal>
        </div>
      </section>

      {/* TABS */}
      <section className="bg-muted py-12 md:py-16">
        <div className="container-narte">
          <ArtistiTabs
            artistsPanel={artistsPanel}
            consultantPanel={<ConsultantPanel slots={slots} />}
          />
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArtistCard, type ArtistCardProps } from "./ArtistCard";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";

async function getStars(limit = 8): Promise<ArtistCardProps[]> {
  try {
    // Admin client server-side: bypassa RLS (lettura di dati pubblici approved).
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("artists")
      .select("id, slug, stage_name, city, cover_image, genre, tier")
      // ⚠️  `is_public` NON è opzionale: è la colonna generata
      //     (status='approved' and not plan_suspended, 0043) che decide chi
      //     esiste sul sito pubblico. Senza, la home mostrerebbe profili non
      //     approvati o sospesi per piano, con un link che porta a 404 — la
      //     pagina più visitata del sito che manda le persone nel vuoto.
      .eq("is_public", true)
      // Stesso ranking della pagina /artisti: `artist_tier_enum` è dichiarato
      // ('free','pro','max') e Postgres ordina gli enum per ordine di
      // dichiarazione, quindi `desc` è già max → pro → free.
      //
      // ⚠️  Con `limit` a 8, quando gli artisti Pro/Max saranno almeno otto
      //     questa vetrina smetterà di mostrare i Free e di ruotare all'arrivo
      //     di nuovi iscritti. È voluto: la home è la prima superficie in cui
      //     l'abbonamento deve valere qualcosa.
      .order("tier", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((a) => ({
      artistId: a.id,
      slug: a.slug,
      stageName: a.stage_name,
      city: a.city,
      coverImage: a.cover_image,
      genres: a.genre,
      tier: a.tier,
    }));
  } catch {
    return [];
  }
}

export async function StarsSection() {
  const [artists, viewer] = await Promise.all([getStars(), getCurrentUser()]);
  const isGuest = !viewer;

  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">il roster</p>
        </Reveal>
        <div className="mb-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Guardali suonare prima di scegliere
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <Button asChild variant="accent" size="md">
              <Link href="/artisti">Vedi tutti gli artisti</Link>
            </Button>
          </Reveal>
        </div>
        <Reveal delay={0.25}>
          <p className="mb-10 max-w-xl text-pretty text-sm text-notte/70 md:text-base">
            Ogni profilo ha video, generi, formazione e fascia di cachet. Nessuna
            serata prenotata al buio.
          </p>
        </Reveal>

        {artists.length === 0 ? (
          <p className="text-sm text-notte/60">
            Stiamo aggiornando il roster. Torna a trovarci a breve.
          </p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a) => (
              <ArtistCard key={a.slug} {...a} isGuest={isGuest} />
            ))}
          </StaggerList>
        )}
      </div>
    </section>
  );
}

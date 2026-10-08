import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArtistCard, type ArtistCardProps } from "./ArtistCard";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

/**
 * Vetrina per chi ha una sessione: schede complete.
 */
async function getStars(limit = 8): Promise<ArtistCardProps[]> {
  try {
    // Admin client server-side: bypassa RLS (lettura di dati pubblici approved).
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("artists")
      .select("id, slug, stage_name, city, cover_image, genre, tier")
      // ⚠️  `is_public` NON è opzionale: è la colonna generata
      //     (status='approved' and not plan_suspended, 0043) che decide chi
      //     esiste sul sito pubblico.
      .eq("is_public", true)
      // `artist_tier_enum` è dichiarato ('free','pro','max'): `desc` = max → pro → free.
      .order("tier", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      logger.error("StarsSection", "lettura roster fallita", error);
      return [];
    }
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

/**
 * Vetrina per gli ospiti. Legge SOLO le colonne concesse al ruolo anonimo dalla
 * migration 0070 (id, genre, instruments, tier, is_public): nessun nome, slug,
 * città o copertina esce dal server. `id` serve a richiedere l'anteprima
 * sfocata (/api/anteprima-artista), già ridotta e sfocata dal server.
 */
async function getAnonymousStars(limit = 8): Promise<ArtistCardProps[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("artists")
      .select("id, genre, tier")
      .eq("is_public", true)
      .order("tier", { ascending: false })
      .limit(limit);
    if (error) {
      logger.error("StarsSection", "lettura vetrina ospiti fallita", error);
      return [];
    }
    return (data ?? []).map((a) => ({
      id: a.id,
      genres: a.genre ?? [],
      tier: a.tier,
    }));
  } catch {
    return [];
  }
}

export async function StarsSection() {
  const viewer = await getCurrentUser();
  const isGuest = !viewer;
  const artists = isGuest ? await getAnonymousStars() : await getStars();

  return (
    <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        {/* ⚠️  La centratura sta su questo blocco e non sul contenitore:
            `text-center` eredita, e sul contenitore avrebbe centrato anche il
            testo dentro le card degli artisti qui sotto. Finché la sezione è
            una colonna sola — sotto `md`, dove titolo, pulsante e testo si
            impilano — l'intestazione è centrata; da `md` torna ai due bordi. */}
        <div className="text-center md:text-left">
          <Reveal>
            <p className="accent-label mb-3">il roster</p>
          </Reveal>
          <div className={`${isGuest ? "mb-10" : "mb-4"} flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between`}>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
                Sfoglia gli artisti e scegli il più adatto a te
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <Button asChild variant="accent" size="md">
                {isGuest ? (
                  <Link href="/login?next=/artisti">Accedi per visualizzare</Link>
                ) : (
                  <Link href="/artisti">Vedi tutti gli artisti</Link>
                )}
              </Button>
            </Reveal>
          </div>
          {!isGuest && (
            <Reveal delay={0.25}>
              <p className="mx-auto mb-10 max-w-xl text-pretty text-sm text-notte/70 md:mx-0 md:text-base">
                Scopri i dettagli degli artisti e fai una richiesta di booking.
              </p>
            </Reveal>
          )}
        </div>

        {artists.length === 0 ? (
          <p className="text-sm text-notte/60">
            Stiamo aggiornando il roster. Torna a trovarci a breve.
          </p>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {artists.map((a, i) =>
              isGuest ? (
                <ArtistCard key={`anon-${i}`} {...a} isGuest />
              ) : (
                <ArtistCard key={a.slug} {...a} />
              )
            )}
          </StaggerList>
        )}

        {isGuest && (
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl bg-notte px-6 py-10 text-center text-palco">
              <p className="font-display text-2xl text-balance md:text-4xl">
                Accedi o iscriviti gratis per vedere nomi, foto e profili completi.
              </p>
              <Button asChild variant="accent" size="lg">
                <Link href="/login?next=/artisti">Accedi per visualizzare</Link>
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

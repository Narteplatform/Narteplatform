import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";
import { requireRole } from "@/lib/auth/guards";
import { getActiveArtistRow } from "@/lib/artist/current";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ArtistVideoItem } from "@/components/forms/VideoUpload";
import type { ArtistProfileData } from "@/components/dashboard/profile/types";
import { InfoArtistaBlock } from "@/components/dashboard/profile/blocks/InfoArtistaBlock";
import { GalleryBlock } from "@/components/dashboard/profile/blocks/GalleryBlock";
import { VideoBlock } from "@/components/dashboard/profile/blocks/VideoBlock";
import { AudioBlock } from "@/components/dashboard/profile/blocks/AudioBlock";
import { BookingBlock } from "@/components/dashboard/profile/blocks/BookingBlock";
import { SocialBlock } from "@/components/dashboard/profile/blocks/SocialBlock";
import { AccountBlock } from "@/components/dashboard/profile/blocks/AccountBlock";

export const metadata = { title: "Profilo artista — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistProfileEditPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  // Profilo ATTIVO, non "il" profilo: un account può averne fino a 5.
  const artist = await getActiveArtistRow(user.id);

  if (!artist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessun profilo artista collegato</CardTitle>
          <CardDescription>
            Il tuo account non è ancora associato a un profilo artista. Contatta l&apos;amministratore.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [{ data: genresData }, { data: videosData }, ent] = await Promise.all([
    supabase.from("genres").select("name").order("order_index"),
    supabase
      .from("artist_videos")
      .select(
        "id, url, storage_path, title, duration_ms, size_bytes, mime_type, created_at, provider, bunny_guid, playback_state, upload_state, bunny_error"
      )
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false }),
    // Il tetto video dipende dal PIANO. Prima VideoUpload mostrava a tutti la
    // costante piatta MAX_VIDEO_PER_ARTIST = 3: un artista Free leggeva
    // "max 3 video" e scopriva il vero limite (1) solo quando il server lo
    // bloccava.
    getEntitlements(artist.id),
  ]);

  const genreOptions = (genresData ?? []).map((g) => g.name as string);
  const initialVideos: ArtistVideoItem[] = (videosData ?? []).map((v) => ({
    id: v.id,
    url: v.url,
    storage_path: v.storage_path,
    title: v.title,
    duration_ms: v.duration_ms,
    size_bytes: v.size_bytes,
    mime_type: v.mime_type,
    created_at: v.created_at,
    provider: v.provider,
    bunny_guid: v.bunny_guid,
    playback_state: v.playback_state,
    upload_state: v.upload_state,
    bunny_error: v.bunny_error,
  }));

  // getActiveArtistRow torna un record non tipizzato: il cast si fa qui una
  // volta sola, non dentro ogni blocco.
  const profile = artist as unknown as ArtistProfileData;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Profilo artista</h1>
          <p className="text-sm text-muted-foreground">
            Ogni sezione si apre e si salva per conto suo. Tutto quello che salvi qui viene
            aggiornato in automatico sulla tua pagina pubblica.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/artisti/${artist.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Apri pagina pubblica
          </Link>
        </Button>
      </header>

      <div className="space-y-3">
        <InfoArtistaBlock artist={profile} genreOptions={genreOptions} />
        <GalleryBlock artist={profile} />
        <VideoBlock artist={profile} initialVideos={initialVideos} videoMax={ent.videoMax} />
        <AudioBlock artist={profile} />
        <BookingBlock artist={profile} />
        <SocialBlock artist={profile} />
        <AccountBlock
          email={user.email ?? ""}
          fullName={user.profile?.full_name ?? ""}
          avatarUrl={user.profile?.avatar_url ?? ""}
        />
      </div>
    </div>
  );
}

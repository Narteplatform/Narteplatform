import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { getActiveArtistRow } from "@/lib/artist/current";
import { ArtistProfileForm } from "@/components/forms/ArtistProfileForm";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ArtistVideoItem } from "@/components/forms/VideoUpload";

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

  const [{ data: genresData }, { data: videosData }] = await Promise.all([
    supabase.from("genres").select("name").order("order_index"),
    supabase
      .from("artist_videos")
      .select("id, url, storage_path, title, duration_ms, size_bytes, mime_type, created_at")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false }),
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
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Profilo artista</h1>
          <p className="text-sm text-muted-foreground">
            Tutto quello che salvi qui viene aggiornato in automatico nella tua pagina pubblica e
            nella sezione &quot;Gli artisti&quot; della home.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/artisti/${artist.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Apri pagina pubblica
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Modifica profilo</CardTitle>
          <CardDescription>
            Foto, video, generi, bio. Tutti i campi sono modificabili e si salvano singolarmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArtistProfileForm
            artist={artist}
            genreOptions={genreOptions}
            artistId={artist.id}
            initialVideos={initialVideos}
          />
        </CardContent>
      </Card>

      {/* Account — Card sorella e non fieldset dentro ArtistProfileForm:
          AccountSettingsForm ha i propri <form>, annidarli sarebbe HTML non valido. */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Nome visualizzato, foto profilo e password di accesso alla piattaforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSettingsForm
            email={user.email ?? ""}
            defaults={{
              fullName: user.profile?.full_name ?? "",
              avatarUrl: user.profile?.avatar_url ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

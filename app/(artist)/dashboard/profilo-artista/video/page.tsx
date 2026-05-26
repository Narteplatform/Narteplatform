import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { VideoUpload } from "@/components/forms/VideoUpload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video — N'arte Artist" };

export default async function ArtistVideoPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, stage_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato. Contatta l&apos;amministratore.
        </CardContent>
      </Card>
    );
  }

  const { data: videos } = await supabase
    .from("artist_videos")
    .select("id, url, storage_path, title, size_bytes, mime_type, created_at")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">I tuoi video</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Carica direttamente dal tuo dispositivo brevi performance, demo live o show reel. I
          formati supportati sono mp4, webm e mov (max 50MB ciascuno).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestione video</CardTitle>
          <CardDescription>
            I video appaiono sulla tua pagina pubblica e nelle proposte agli organizzatori.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoUpload
            artistId={artist.id}
            initialVideos={(videos ?? []).map((v) => ({
              id: v.id,
              url: v.url,
              storage_path: v.storage_path,
              title: v.title,
              size_bytes: v.size_bytes,
              mime_type: v.mime_type,
              created_at: v.created_at,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

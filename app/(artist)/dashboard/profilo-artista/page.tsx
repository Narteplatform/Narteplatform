import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { ArtistProfileForm } from "@/components/forms/ArtistProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Profilo artista — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistProfileEditPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

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

  const { data: genresData } = await supabase
    .from("genres")
    .select("name")
    .order("order_index");
  const genreOptions = (genresData ?? []).map((g) => g.name as string);

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
          <ArtistProfileForm artist={artist} genreOptions={genreOptions} />
        </CardContent>
      </Card>
    </div>
  );
}

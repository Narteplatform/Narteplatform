import { createAdminClient } from "@/lib/supabase/server";
import { GenresManager } from "@/components/admin/GenresManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminGenresPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("genres")
    .select("id, name, order_index")
    .order("order_index", { ascending: true });

  const genres = data ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Generi musicali</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista dei generi disponibili nel menu a tendina del profilo artista. Aggiungi o rimuovi
          voci.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Catalogo generi</CardTitle>
          <Badge variant="muted">{genres.length} totali</Badge>
        </CardHeader>
        <CardContent>
          <GenresManager genres={genres} />
        </CardContent>
      </Card>
    </div>
  );
}

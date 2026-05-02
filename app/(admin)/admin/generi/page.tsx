import { createAdminClient } from "@/lib/supabase/server";
import { GenresManager } from "@/components/admin/GenresManager";

export default async function AdminGenresPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("genres")
    .select("id, name, order_index")
    .order("order_index", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Generi musicali</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lista dei generi disponibili nel menu a tendina del profilo artista.
          Aggiungi o rimuovi voci.
        </p>
      </div>
      <GenresManager genres={data ?? []} />
    </div>
  );
}

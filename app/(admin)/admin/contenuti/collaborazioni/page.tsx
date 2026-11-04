import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/Card";
import { ContenutiNav } from "@/components/admin/ContenutiNav";
import { CollaborazioniEditor, type CollaborazioneRiga } from "@/components/admin/CollaborazioniEditor";

export const metadata = { title: "Loghi delle collaborazioni — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCollaborazioniPage() {
  await requireAdminPageAccess("contenuti");
  const { data, error } = await createAdminClient()
    .from("collaborations")
    .select("id, name, logo_url, link, order_index")
    .order("order_index", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="font-display text-3xl">Contenuti del sito</h1>
        <ContenutiNav attiva="/admin/contenuti/collaborazioni" />
        <p className="max-w-2xl text-sm text-muted-foreground">
          I loghi che scorrono in home e nella pagina Collaborazioni, nell&apos;ordine del nastro.
          Meglio PNG con sfondo trasparente e logo chiaro: il nastro è su fondo scuro.
        </p>
      </header>
      {error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Non è stato possibile leggere le collaborazioni ({error.message}).
          </CardContent>
        </Card>
      ) : (
        <CollaborazioniEditor voci={(data ?? []) as CollaborazioneRiga[]} />
      )}
    </div>
  );
}

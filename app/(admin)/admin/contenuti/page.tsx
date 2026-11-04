import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { getContenutiPerModifica } from "@/lib/content/site-settings-server";
import { Card, CardContent } from "@/components/ui/Card";
import { ContenutiForm } from "@/components/admin/ContenutiForm";
import { ContenutiNav } from "@/components/admin/ContenutiNav";

export const metadata = { title: "Contenuti del sito — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminContenutiPage() {
  await requireAdminPageAccess("contenuti");
  const esito = await getContenutiPerModifica();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="font-display text-3xl">Contenuti del sito</h1>
        <ContenutiNav attiva="/admin/contenuti" />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Testi e foto delle pagine pubbliche (home, Chi siamo, intestazioni), telefono e social.
          Le modifiche sono online appena salvi. I dati del titolare (nome, P.IVA, indirizzo, email) stanno nei documenti legali e
          non si cambiano da qui.
        </p>
      </header>

      {esito.ok ? (
        <ContenutiForm valori={esito.valori} salvati={[...esito.salvati]} />
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{esito.error}</CardContent>
        </Card>
      )}
    </div>
  );
}

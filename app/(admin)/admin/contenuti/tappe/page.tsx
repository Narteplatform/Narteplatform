import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { leggiTappe } from "@/lib/content/milestones-server";
import { Card, CardContent } from "@/components/ui/Card";
import { ContenutiNav } from "@/components/admin/ContenutiNav";
import { TappeEditor } from "@/components/admin/TappeEditor";

export const metadata = { title: "Tappe di Chi siamo — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminTappePage() {
  await requireAdminPageAccess("contenuti");
  const tappe = await leggiTappe();
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="font-display text-3xl">Contenuti del sito</h1>
        <ContenutiNav attiva="/admin/contenuti/tappe" />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Le tappe della linea del tempo su Chi siamo, nell&apos;ordine in cui compaiono. Ogni tappa
          si salva da sola ed è online subito. Foto quadrata, soggetto al centro.
        </p>
      </header>
      {tappe === null ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Le tappe non si possono ancora modificare da qui: va applicata la migration 0076 dal SQL
            editor di Supabase. Fino ad allora il sito mostra le tappe attuali.
          </CardContent>
        </Card>
      ) : (
        <TappeEditor tappe={tappe} />
      )}
    </div>
  );
}

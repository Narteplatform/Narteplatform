import { requireRootSuperadmin } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { dataLeggibile, GIORNI_PREAVVISO_MODIFICHE, modificheAnnunciate } from "@/lib/legal/avviso-modifiche";
import { chiaveInvioAvviso, destinatariAvviso } from "@/lib/legal/avviso-destinatari";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InviaAvvisoModifiche } from "./InviaAvvisoModifiche";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avviso modifiche ai termini — N'arte Admin" };

/** Solo root: preavviso via email delle modifiche ai documenti contrattuali. */
export default async function AvvisoModifichePage() {
  await requireRootSuperadmin();
  const m = modificheAnnunciate();

  let stato: string | null = null;
  let destinatari: number | null = null;
  if (m) {
    const admin = createAdminClient();
    const [gia, dest] = await Promise.all([
      admin.from("site_settings").select("value").eq("key", chiaveInvioAvviso(m.inVigoreDal)).maybeSingle(),
      destinatariAvviso(),
    ]);
    stato = gia.error ? "non leggibile" : (gia.data?.value ?? null);
    destinatari = dest.ok ? dest.email.length : null;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Avviso modifiche ai termini</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le modifiche sostanziali ai documenti contrattuali si comunicano con almeno {GIORNI_PREAVVISO_MODIFICHE}{" "}
          giorni di anticipo (Reg. UE 2019/1150). Si annunciano in <code>lib/legal/avviso-modifiche.ts</code>; da
          qui si invia l&apos;email a tutti gli utenti attivi.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modifiche annunciate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!m ? (
            <p className="text-muted-foreground">Nessuna modifica annunciata.</p>
          ) : (
            <>
              <p>
                In vigore dal <strong>{dataLeggibile(m.inVigoreDal)}</strong>. {m.sintesi}
              </p>
              <p className="text-muted-foreground">
                Destinatari: {destinatari ?? "non leggibili"}. Stato invio: {stato ?? "non ancora inviato"}.
              </p>
              {!stato && destinatari !== null && <InviaAvvisoModifiche destinatari={destinatari} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import { GIORNI_MINIMI } from "@/lib/legal/completa-cancellazione";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AccountDeletionRunner } from "@/components/admin/AccountDeletionRunner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancellazioni account — N'arte Admin" };

const LIMITE = 100;

function data(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

export default async function CancellazioniPage() {
  await requireRootSuperadmin();
  const admin = createAdminClient();

  const { data: righe, error } = await admin
    .from("account_deletion_requests")
    .select("id, user_id, requested_at, expires_at, confirmed_at, cancelled_at, completed_at")
    .order("requested_at", { ascending: false })
    .limit(LIMITE);

  // Una lettura fallita NON deve sembrare «nessuna richiesta».
  if (error || !righe) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl tracking-tight">Cancellazioni account</h1>
        <p className="text-sm text-red-600">
          Impossibile leggere le richieste ({error?.message ?? "risposta vuota"}). Se la migration 0060 non è
          applicata la tabella non esiste ancora.
        </p>
      </div>
    );
  }

  const utenti = await Promise.all(
    righe.map(async (r) => {
      const { data: u, error: e } = await admin.auth.admin.getUserById(r.user_id);
      return { id: r.id, email: u?.user?.email ?? null, errore: e?.message ?? null };
    })
  );
  const emailDi = new Map(utenti.map((u) => [u.id, u]));

  const adesso = Date.now();
  const inAttesa = righe.filter((r) => !r.confirmed_at && !r.cancelled_at && !r.completed_at);
  const confermate = righe.filter((r) => r.confirmed_at && !r.cancelled_at && !r.completed_at);
  // Una richiesta con completed_at e utente ancora presente è un'anomalia (il
  // completamento cancella l'utente e la riga cade a cascata).
  const anomale = righe.filter((r) => r.completed_at);

  const { data: completate, error: erroreCompletate } = await admin
    .from("moderation_actions")
    .select("id, created_at, target_id, affected_email")
    .eq("action", "cancellazione_completata")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/impostazioni" className="text-xs text-muted-foreground hover:underline">
          ← Impostazioni
        </Link>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Cancellazioni account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rimozione definitiva di un account che ha già chiesto e confermato la cancellazione. Procedura ordinaria:
          dopo {GIORNI_MINIMI} giorni dalla conferma. Ogni esecuzione è irreversibile.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confermate ({confermate.length})</CardTitle>
          <CardDescription>
            Account già disattivati. Leggi l&apos;anteprima prima di eseguire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {confermate.length === 0 && <p className="text-sm text-muted-foreground">Nessuna richiesta confermata.</p>}
          {confermate.map((r) => {
            const giorni = Math.floor((adesso - new Date(r.confirmed_at as string).getTime()) / 86_400_000);
            const u = emailDi.get(r.id);
            return (
              <div key={r.id} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{u?.email ?? "email non leggibile"}</span>
                  <Badge variant={giorni >= GIORNI_MINIMI ? "success" : "warning"}>
                    {giorni} giorni dalla conferma
                  </Badge>
                  <span className="text-muted-foreground">confermata il {data(r.confirmed_at)}</span>
                </div>
                {u?.email ? (
                  <AccountDeletionRunner richiestaId={r.id} email={u.email} />
                ) : (
                  <p className="text-sm text-red-600">
                    Account non leggibile ({u?.errore ?? "utente inesistente"}): esecuzione non disponibile.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">In attesa di conferma ({inAttesa.length})</CardTitle>
          <CardDescription>L&apos;interessato non ha ancora cliccato il collegamento: nulla da fare.</CardDescription>
        </CardHeader>
        <CardContent>
          {inAttesa.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {inAttesa.map((r) => (
                <li key={r.id}>
                  {emailDi.get(r.id)?.email ?? "email non leggibile"} — richiesta il {data(r.requested_at)}, scade il{" "}
                  {data(r.expires_at)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {anomale.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Da controllare ({anomale.length})</CardTitle>
            <CardDescription>
              Segnate come completate ma con l&apos;account ancora presente: il completamento si è interrotto. Vedi i log.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {anomale.map((r) => (
                <li key={r.id}>
                  {emailDi.get(r.id)?.email ?? "email non leggibile"} — completata il {data(r.completed_at)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completate</CardTitle>
          <CardDescription>
            Dal registro delle decisioni: la richiesta stessa cade insieme all&apos;account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {erroreCompletate ? (
            <p className="text-sm text-red-600">Registro non leggibile: {erroreCompletate.message}</p>
          ) : !completate || completate.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {completate.map((c) => (
                <li key={c.id}>
                  {data(c.created_at)} — {c.affected_email ?? "email non registrata"}{" "}
                  <span className="text-muted-foreground">({c.target_id})</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

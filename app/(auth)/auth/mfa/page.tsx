import { requireUser } from "@/lib/auth/guards";
import { percorsoSicuro } from "@/lib/auth/percorso";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { TITOLARE } from "@/lib/legal/titolare";
import { MfaGate } from "./MfaGate";

export const metadata = {
  title: "Verifica in due passaggi — N'arte",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Secondo passaggio dell'accesso: il middleware manda qui chi entra in /admin
 * con un fattore TOTP attivo ma una sessione non ancora verificata (aal1).
 * Fuori da /admin di proposito (niente cicli) e sotto /auth/, esente dal gate
 * dei consensi.
 */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = percorsoSicuro((await searchParams).next, "/admin");
  await requireUser({ next: `/auth/mfa?next=${encodeURIComponent(next)}` });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <NarteLogo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <p className="accent-label mb-3">verifica in due passaggi</p>
          <h1 className="display-xl text-3xl">Inserisci il codice</h1>
          <p className="mt-3 mb-6 text-muted-foreground">
            Apri l&rsquo;app di autenticazione sul telefono e inserisci il codice di 6 cifre
            per N&rsquo;arte.
          </p>
          <MfaGate next={next} />
          <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
            Hai perso l&rsquo;accesso all&rsquo;app? Scrivi a{" "}
            <a href={`mailto:${TITOLARE.emailContatti}`} className="underline underline-offset-4">
              {TITOLARE.emailContatti}
            </a>
            .{" "}
            <form action="/logout" method="post" className="inline">
              <button type="submit" className="underline underline-offset-4">
                Esci
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { GestioneMfa } from "./GestioneMfa";

export const metadata = { title: "Sicurezza dell'account — N'arte" };

/** Dipende dall'utente: non deve finire in nessuna cache. */
export const dynamic = "force-dynamic";

/**
 * Verifica in due passaggi (TOTP). Disponibile a tutti; obbligatoria per
 * superadmin e consulenti solo con `MFA_ADMIN_OBBLIGATORIA=1` (il middleware
 * li manda qui con `?obbligatoria=1` finché non la attivano).
 */
export default async function SicurezzaPage({
  searchParams,
}: {
  searchParams: Promise<{ obbligatoria?: string | string[] }>;
}) {
  await requireUser({ next: "/account/sicurezza" });
  const obbligatoria = (await searchParams).obbligatoria === "1";

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-2xl">
          <p className="accent-label mb-3">
            <Link href="/account" className="hover:underline">
              il tuo account
            </Link>
          </p>
          <h1 className="display-xl text-4xl md:text-5xl">Verifica in due passaggi</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Un secondo controllo all&rsquo;accesso: anche se qualcuno scoprisse la tua password, senza
            il telefono non potrebbe entrare.
          </p>
          <section className="mt-10 rounded-2xl border border-border p-6">
            <GestioneMfa obbligatoria={obbligatoria} />
          </section>
          <p className="mt-6 text-xs text-muted-foreground">
            Quando la attivi, le altre sessioni aperte del tuo account vengono chiuse.
          </p>
        </div>
      </div>
    </article>
  );
}

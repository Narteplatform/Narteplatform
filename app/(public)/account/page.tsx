import Link from "next/link";
import { ChevronRight, Download, ShieldCheck, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { metodiDiAccesso } from "@/lib/auth/riautenticazione";
import { AccountSettingsForm } from "@/components/forms/AccountSettingsForm";
import { EmailForm } from "./EmailForm";

export const metadata = { title: "Il mio account — N'arte" };

/** Dipende dall'utente: non deve finire in nessuna cache. */
export const dynamic = "force-dynamic";

const AREA: Record<string, { href: string; label: string } | undefined> = {
  superadmin: { href: "/admin", label: "Vai al pannello admin" },
  consultant: { href: "/admin/consulenza", label: "Vai alle consulenze" },
  artist: { href: "/dashboard", label: "Vai alla dashboard" },
  organizer: { href: "/organizzatore", label: "Vai all'area organizzatore" },
};

/**
 * Account, per tutti e cinque i ruoli: nome e foto, password, email, sicurezza
 * (verifica in due passaggi), i propri dati e la cancellazione.
 *
 * Sta in `(public)` come «I miei dati»: serve a tutti, e le aree per ruolo
 * hanno layout e guardie diverse. L'accesso lo governa `requireUser()`.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const user = await requireUser({ next: "/account" });
  const metodi = metodiDiAccesso(user);
  const emailConfermata = (await searchParams).email === "confermata";
  const duePassaggi = (user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
  const area = AREA[user.profile?.role ?? ""];

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-4xl">
          <p className="accent-label mb-3">il tuo account</p>
          <h1 className="display-xl text-4xl md:text-5xl">Il mio account</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Nome e foto, accesso e sicurezza, i tuoi dati.
            {area && (
              <>
                {" "}
                <Link href={area.href} className="underline underline-offset-4">
                  {area.label}
                </Link>
                .
              </>
            )}
          </p>

          {emailConfermata && (
            <p
              role="status"
              className="mt-8 rounded-xl border border-azzurro/30 bg-azzurro/10 px-4 py-3 text-sm"
            >
              Conferma registrata. Se ti è arrivato un link anche all&rsquo;altro indirizzo, aprilo:
              il cambio diventa effettivo dopo entrambe le conferme.
            </p>
          )}

          <section className="mt-12">
            <AccountSettingsForm
              email={user.email ?? ""}
              defaults={{
                fullName: user.profile?.full_name ?? "",
                avatarUrl: user.profile?.avatar_url ?? "",
              }}
              metodi={{
                email: user.email ?? "",
                password: metodi.password,
                google: metodi.google,
                emailInAttesa: user.new_email ?? null,
              }}
            />
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-display text-2xl">Email</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              L&rsquo;indirizzo con cui accedi e a cui ti scriviamo. Per cambiarlo ti mandiamo una
              conferma a entrambi gli indirizzi.
            </p>
            <div className="max-w-md">
              <EmailForm
                emailAttuale={user.email ?? ""}
                conPassword={metodi.password}
                emailInAttesa={user.new_email ?? null}
              />
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-display text-2xl">Sicurezza e dati</h2>
            <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
              <VoceLink
                href="/account/sicurezza"
                icona={<ShieldCheck className="size-5" />}
                titolo="Verifica in due passaggi"
                testo={duePassaggi ? "Attiva: all'accesso ti chiediamo anche il codice dell'app." : "Non attiva. Aggiungi un codice da un'app di autenticazione."}
              />
              <VoceLink
                href="/account/i-miei-dati"
                icona={<Download className="size-5" />}
                titolo="I miei dati"
                testo="Consensi, copia dei tuoi dati, comunicazioni promozionali."
              />
              <VoceLink
                href="/account/i-miei-dati#motivo-cancellazione"
                icona={<Trash2 className="size-5" />}
                titolo="Cancella l'account"
                testo="Chiedi la chiusura dell'account e la cancellazione dei dati."
              />
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}

function VoceLink({
  href,
  icona,
  titolo,
  testo,
}: {
  href: string;
  icona: React.ReactNode;
  titolo: string;
  testo: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
        <span className="text-muted-foreground">{icona}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{titolo}</span>
          <span className="block text-sm text-muted-foreground">{testo}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </li>
  );
}

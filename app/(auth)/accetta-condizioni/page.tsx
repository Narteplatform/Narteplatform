import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import {
  hasAcceptedCurrentLegal,
  legalV2Attivo,
  syncLegalVersionFromConsents,
} from "@/lib/legal/consents";
import { findLegalDoc } from "@/lib/legal/content";
import { iubendaDocUrl } from "@/lib/legal/iubenda";
import { AcceptLegalForm } from "@/components/legal/AcceptLegalForm";
import { NarteLogo } from "@/components/layout/NarteLogo";

export const metadata = { title: "Termini e privacy — N'arte" };

/** Dipende dall'utente: non deve finire in nessuna cache. */
export const dynamic = "force-dynamic";

/** Solo percorsi interni: `//host` è un indirizzo assoluto travestito. */
function safeNext(value?: string | string[]) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

/**
 * Schermata di accettazione di termini e informativa.
 *
 * CHI CI FINISCE. Chiunque abbia un account e non risulti aver accettato la
 * versione in vigore: gli artisti, i consulenti e i superadmin — che sono stati
 * creati da un amministratore e non hanno mai visto una casella — e chi si era
 * iscritto prima che i documenti esistessero.
 *
 * PERCHÉ NON USA `AuthSplit`. Quel guscio è costruito per invogliare a entrare:
 * porta con sé la colonna promozionale e il selettore «Accedi / Iscriviti».
 * Qui la persona è già dentro e deve fare una cosa sola; offrirle due
 * scorciatoie verso altre pagine sarebbe un gate solo nel nome.
 */
export default async function AccettaCondizioniPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await requireUser();
  const next = safeNext((await searchParams).next) ?? "/";

  // RIMEDIO AL DISALLINEAMENTO — è ciò che rende impossibile restare chiusi
  // fuori. Se il registro dice che questa persona ha già accettato ma la
  // colonna che il middleware legge dice il contrario, non le si ripropone un
  // modulo già compilato: si riallinea la colonna e la si rimanda dov'era
  // diretta. Senza questo controllo ogni disallineamento diventerebbe un
  // account permanentemente bloccato.
  // Documenti per ruolo: attivi solo col flag v2. Spento, `ruoloGate` è null e
  // tutto resta com'era.
  const ruoloProfilo = user.profile?.role ?? null;
  const ruoloGate =
    legalV2Attivo() && (ruoloProfilo === "artist" || ruoloProfilo === "organizer")
      ? ruoloProfilo
      : null;

  if (await hasAcceptedCurrentLegal(user.id, ruoloProfilo)) {
    await syncLegalVersionFromConsents(user.id);
    redirect(next);
  }

  const privacy = findLegalDoc("privacy");
  const termini = findLegalDoc("termini");
  const urlPrivacy = iubendaDocUrl("privacy");
  // I termini non passano da iubenda: qui si mostra sempre il testo locale.
  const urlTermini = "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <NarteLogo />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <p className="accent-label mb-3">prima di proseguire</p>
          <h1 className="display-xl text-3xl md:text-4xl">
            Abbiamo bisogno del tuo consenso
          </h1>
          <p className="mt-4 text-muted-foreground">
            Abbiamo pubblicato i termini d&rsquo;uso e l&rsquo;informativa
            privacy di N&rsquo;arte. Il tuo account è stato creato prima che
            esistessero, quindi non ti è mai stato chiesto di accettarli: ci
            serve farlo ora, una volta sola.
          </p>

          {/* I documenti in linea, non solo linkati: chi deve accettare deve
              poterli leggere senza lasciare la pagina. I collegamenti restano
              per chi preferisce la pagina intera o vuole conservarla. */}
          <div className="mt-8 space-y-3">
            <DocumentoInLinea
              titolo="Informativa privacy"
              corpo={privacy?.body}
              urlEsterno={urlPrivacy}
              rottaInterna="/privacy"
            />
            <DocumentoInLinea
              titolo="Termini e condizioni d'uso"
              corpo={termini?.body}
              urlEsterno={urlTermini}
              rottaInterna="/termini"
            />
          </div>

          <div className="mt-8">
            <AcceptLegalForm next={next} ruolo={ruoloGate} />
          </div>

          {/* Via d'uscita. Senza, chi non vuole accettare resterebbe prigioniero
              del proprio account: ogni pagina lo rimanderebbe qui. */}
          <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
            Non vuoi accettare?{" "}
            {/* L'uscita è una POST, non un collegamento: una GET che termina la
                sessione verrebbe eseguita da qualunque prefetch o scansione. */}
            <form action="/logout" method="post" className="inline">
              <button type="submit" className="underline underline-offset-4">
                Esci dall&rsquo;account
              </button>
            </form>
            . Puoi continuare a navigare le pagine pubbliche.
          </div>
        </div>
      </div>
    </main>
  );
}

function DocumentoInLinea({
  titolo,
  corpo,
  urlEsterno,
  rottaInterna,
}: {
  titolo: string;
  corpo?: string;
  urlEsterno: string;
  rottaInterna: string;
}) {
  return (
    <details className="group rounded-xl border border-border bg-muted/40">
      <summary className="cursor-pointer select-none px-4 py-3 font-display text-base">
        {titolo}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          leggi
        </span>
      </summary>
      <div className="border-t border-border px-4 py-4">
        {urlEsterno ? (
          <p className="text-sm text-muted-foreground">
            Questo documento è gestito e mantenuto aggiornato tramite iubenda.{" "}
            <a
              href={urlEsterno}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Aprilo in una nuova scheda
            </a>
            .
          </p>
        ) : corpo ? (
          <>
            <div
              className="blog-prose max-h-80 overflow-y-auto pr-2 text-sm"
              dangerouslySetInnerHTML={{ __html: corpo }}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              <Link
                href={rottaInterna}
                target="_blank"
                className="underline underline-offset-4"
              >
                Apri la pagina intera
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </details>
  );
}

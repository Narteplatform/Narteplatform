import Link from "next/link";
import { verificaTokenOptout } from "@/lib/referrals/optout";
import { disattivaSegnalazioniAction } from "./_actions";

export const metadata = {
  title: "Smetti di ricevere segnalazioni — N'arte",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Disattivazione delle segnalazioni di profilo, raggiunta dal link in fondo
 * all'email. Non richiede una sessione. APRIRE LA PAGINA NON DISATTIVA NULLA:
 * serve l'invio del modulo (POST), altrimenti gli antivirus della posta e le
 * anteprime dei link disattiverebbero al posto del destinatario.
 */
export default async function StopSegnalazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[]; esito?: string | string[] }>;
}) {
  const sp = await searchParams;
  const primo = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const token = primo(sp.t);
  const esito = primo(sp.esito);

  let titolo = "Smetti di ricevere segnalazioni";
  let corpo: React.ReactNode;

  if (esito === "fatto") {
    titolo = "Fatto";
    corpo = (
      <p>
        Non ti invieremo più segnalazioni di profili artistici a questo indirizzo. Se cambi idea,
        scrivici dalla pagina contatti.
      </p>
    );
  } else if (esito === "errore") {
    titolo = "Non è andata a buon fine";
    corpo = (
      <p>
        Non siamo riusciti a registrare la richiesta. Riprova fra un momento, oppure scrivici dalla
        pagina contatti e ci pensiamo noi.
      </p>
    );
  } else if (esito === "non-valido" || !verificaTokenOptout(token)) {
    titolo = "Collegamento non valido";
    corpo = (
      <p>
        Il collegamento non è valido o è incompleto. Usa quello presente nell&rsquo;ultima email
        ricevuta, oppure scrivici dalla pagina contatti.
      </p>
    );
  } else {
    corpo = (
      <>
        <p>
          N&rsquo;arte segnala ogni tanto i profili di artisti emergenti a strutture che potrebbero
          essere in linea con loro. Se non vuoi più riceverne, conferma qui sotto.
        </p>
        <form action={disattivaSegnalazioniAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-notte px-6 text-sm font-semibold text-white hover:opacity-90"
          >
            Non voglio più ricevere segnalazioni
          </button>
        </form>
      </>
    );
  }

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl tracking-tight">{titolo}</h1>
          <div className="mt-4 space-y-3 text-muted-foreground">{corpo}</div>
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Per qualunque cosa,{" "}
            <Link href="/contatti" className="underline">
              scrivici
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getLatestConsents } from "@/lib/legal/consents";
import { GestioneDatiPersonali } from "@/components/legal/GestioneDatiPersonali";

export const metadata = { title: "I miei dati — N'arte" };

/** Dipende dall'utente: non deve finire in nessuna cache. */
export const dynamic = "force-dynamic";

/**
 * «I miei dati» — l'esercizio dei diritti dell'interessato, in autonomia.
 *
 * Esisteva un problema prima di questa pagina: l'informativa privacy e due
 * articoli del centro assistenza promettevano che l'utente potesse accedere ai
 * propri dati, esportarli, revocare il consenso al marketing e chiedere la
 * cancellazione dell'account. Nessuna di queste quattro cose era costruita.
 * Promettere un diritto e non fornire il modo di esercitarlo è peggio che non
 * menzionarlo: fissa un'aspettativa e la disattende per iscritto.
 *
 * Sta in `(public)` e non in una delle aree per ruolo perché serve a TUTTI —
 * artisti, organizzatori, utenti, consulenti, staff — e duplicarla in quattro
 * aree significherebbe che tre resteranno indietro. L'accesso lo governa
 * `requireUser()`, non il middleware: `/account` non è fra i prefissi protetti.
 */
export default async function IMieiDatiPage() {
  const utente = await requireUser();
  const consensi = await getLatestConsents(utente.id);

  const marketingAttivo = consensi.marketing?.accepted === true;

  const storico = [
    { chiave: "privacy" as const, etichetta: "Informativa privacy" },
    { chiave: "termini" as const, etichetta: "Termini e condizioni" },
    { chiave: "marketing" as const, etichetta: "Comunicazioni promozionali" },
  ];

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-3xl">
          <p className="accent-label mb-3">il tuo account</p>
          <h1 className="display-xl text-4xl md:text-5xl">I miei dati</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Da qui puoi vedere cosa hai accettato, scaricare una copia dei tuoi
            dati, cambiare idea sulle comunicazioni promozionali e chiedere la
            cancellazione dell&rsquo;account.
          </p>

          {/* STORICO DEI CONSENSI. La tabella `user_consents` esisteva da un mese
              e nessuna riga di codice la leggeva: il consenso veniva registrato e
              poi non era consultabile da nessuno, nemmeno da chi lo aveva dato. */}
          <section className="mt-12">
            <h2 className="font-display text-xl">Cosa hai accettato</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-normal">Documento</th>
                    <th scope="col" className="py-2 pr-4 font-normal">Stato</th>
                    <th scope="col" className="py-2 pr-4 font-normal">Versione</th>
                    <th scope="col" className="py-2 font-normal">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {storico.map(({ chiave, etichetta }) => {
                    const riga = consensi[chiave];
                    return (
                      <tr key={chiave} className="border-b border-border/60">
                        <th scope="row" className="py-3 pr-4 font-normal">
                          {etichetta}
                        </th>
                        <td className="py-3 pr-4">
                          {!riga ? (
                            <span className="text-muted-foreground">
                              {chiave === "marketing" ? "non dato" : "nessuna traccia"}
                            </span>
                          ) : riga.accepted ? (
                            "accettato"
                          ) : (
                            "ritirato"
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {riga?.version ?? "—"}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {riga
                            ? new Date(riga.accepted_at).toLocaleString("it-IT", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Teniamo l&rsquo;intero storico, non solo l&rsquo;ultimo stato: un
              consenso ritirato non cancella la registrazione precedente, perché
              quella dimostra che fino a quel momento il trattamento era
              legittimo.
            </p>
          </section>

          <div className="mt-12">
            <GestioneDatiPersonali marketingAttivo={marketingAttivo} />
          </div>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-display text-xl">Gli altri diritti</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Correggere un dato sbagliato lo puoi fare dal tuo profilo. Per
              limitare o opporti a un trattamento, o per qualunque altra richiesta
              sui tuoi dati, scrivici dalla{" "}
              <Link href="/contatti" className="underline underline-offset-4">
                pagina contatti
              </Link>
              . Puoi anche rivolgerti al Garante per la protezione dei dati
              personali.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Come trattiamo i tuoi dati è descritto nell&rsquo;
              <Link href="/privacy" className="underline underline-offset-4">
                informativa privacy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}

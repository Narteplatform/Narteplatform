import Link from "next/link";
import { TITOLARE } from "@/lib/legal/titolare";

export const metadata = {
  title: "Recesso dall'abbonamento — N'arte",
  description: "Come recedere da un abbonamento N'arte entro 14 giorni, con il modulo di recesso tipo.",
};

/**
 * Diritto di recesso del consumatore (doc. 02, art. 7; artt. 52-59 Cod. consumo).
 *
 * Tre strade, tutte valide: il pulsante «Recedi dal contratto qui» nella pagina
 * Abbonamento (immediato, con rimborso automatico), un'email al recapito
 * unico, oppure il modulo tipo qui sotto (Allegato I, parte B, Cod. consumo),
 * da stampare o copiare. I recessi ricevuti per email o modulo li registra il
 * team da /admin/abbonamenti.
 */
export default function RecessoPage() {
  const t = TITOLARE;
  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-2xl">
          <p className="accent-label mb-3">abbonamenti</p>
          <h1 className="display-xl text-3xl md:text-4xl">Recedere dall&rsquo;abbonamento</h1>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              Se ti sei abbonato come <strong>consumatore</strong> (senza partita IVA) puoi recedere
              entro <strong>14 giorni</strong> dalla sottoscrizione, senza dare motivazioni. Se avevi
              chiesto di iniziare subito, paghi solo la parte di servizio già fruita e ti rimborsiamo
              il resto, sullo stesso metodo di pagamento, entro 14 giorni.
            </p>
            <p>Puoi farlo in uno di questi modi:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                dalla pagina{" "}
                <Link href="/dashboard/abbonamento" className="underline underline-offset-4">
                  Abbonamento
                </Link>{" "}
                con il pulsante <strong>«Recedi dal contratto qui»</strong> (il più rapido);
              </li>
              <li>
                scrivendo a{" "}
                <a href={`mailto:${t.emailContatti}`} className="underline underline-offset-4">
                  {t.emailContatti}
                </a>{" "}
                dall&rsquo;indirizzo con cui sei registrato;
              </li>
              <li>usando, se preferisci, il modulo qui sotto.</li>
            </ol>
            <p>Ti confermiamo sempre per email di aver ricevuto la tua comunicazione.</p>
            <p className="text-sm">
              Il recesso è diverso dalla <strong>disdetta</strong>: la disdetta si può fare in qualunque
              momento, ferma il rinnovo e lascia attivo il piano fino alla fine del periodo già pagato,
              senza rimborso.
            </p>
          </div>

          <section className="mt-10 rounded-2xl border border-border p-6 text-sm leading-relaxed print:border-black">
            <h2 className="font-display text-xl text-foreground">Modulo di recesso tipo</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Allegato I, parte B, Codice del consumo — da compilare e restituire solo se si desidera
              recedere dal contratto.
            </p>
            <div className="mt-5 space-y-4">
              <p>
                Destinatario: {t.denominazione} — N&rsquo;arte, {t.indirizzo}, {t.cap} {t.citta} —
                email {t.emailContatti}
              </p>
              <p>
                Con la presente io/noi (*) notifico/notifichiamo (*) il recesso dal mio/nostro (*)
                contratto di prestazione del seguente servizio: Abbonamento N&rsquo;arte, piano
                ____________ mensile / annuale (*)
              </p>
              <p>Sottoscritto il (*) ________________________________</p>
              <p>Nome del/dei consumatore(i) ________________________________</p>
              <p>Email dell&rsquo;account N&rsquo;arte ________________________________</p>
              <p>Indirizzo del/dei consumatore(i) ________________________________</p>
              <p>
                Firma del/dei consumatore(i) (solo se il presente modulo è notificato in versione
                cartacea) ________________________________
              </p>
              <p>Data ________________________________</p>
              <p className="text-xs text-muted-foreground">(*) Cancellare la dicitura inutile.</p>
            </div>
          </section>

          <p className="mt-6 text-sm text-muted-foreground">
            Le condizioni complete sono nelle{" "}
            <Link href="/termini" className="underline underline-offset-4">
              condizioni d&rsquo;uso
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}

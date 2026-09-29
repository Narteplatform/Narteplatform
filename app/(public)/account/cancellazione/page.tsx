import Link from "next/link";
import { confermaCancellazione } from "@/lib/legal/cancellazione";

export const metadata = { title: "Cancellazione account — N'arte" };
export const dynamic = "force-dynamic";

/**
 * La conferma della cancellazione, raggiunta dal collegamento inviato per email.
 *
 * NON RICHIEDE UNA SESSIONE, ed è deliberato: chi possiede il token ha accesso
 * alla casella di posta dell'interessato, che è la prova che serviva. Obbligare
 * a rifare l'accesso significherebbe chiedere di autenticarsi per esercitare il
 * diritto di andarsene — e chi apre il messaggio dal telefono, con la sessione
 * aperta altrove, si troverebbe bloccato proprio nel momento in cui vuole
 * chiudere.
 *
 * ⚠️ Questa pagina HA UN EFFETTO. È un caso raro in cui una richiesta GET
 * modifica qualcosa, e va detto: aprirla conferma. Il motivo è che deve
 * funzionare da un collegamento in un'email, dove non c'è un modulo da inviare.
 * La protezione è il token — lungo, casuale, a scadenza — e il fatto che
 * l'effetto sia reversibile per trenta giorni.
 */
export default async function ConfermaCancellazionePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const grezzo = (await searchParams).token;
  const token = Array.isArray(grezzo) ? grezzo[0] : grezzo;

  const esito = token
    ? await confermaCancellazione(token)
    : ({ ok: false, motivo: "non-trovata" } as const);

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-2xl">
          {esito.ok ? <Confermata /> : <NonConfermata motivo={esito.motivo} />}

          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            Per qualunque cosa,{" "}
            <Link href="/contatti" className="underline underline-offset-4">
              scrivici
            </Link>
            .
          </p>
        </div>
      </div>
    </article>
  );
}

function Confermata() {
  return (
    <>
      <p className="accent-label mb-3">richiesta confermata</p>
      <h1 className="display-xl text-3xl md:text-4xl">
        Il tuo account è stato disattivato
      </h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          L&rsquo;accesso è chiuso e il tuo profilo pubblico, se ne avevi uno, non
          è più visibile sul sito.
        </p>
        <p>
          La <strong>rimozione definitiva</strong> dei dati e dei file avviene
          entro trenta giorni. Restano soltanto i documenti contabili degli
          abbonamenti, che siamo tenuti a conservare per legge, e i messaggi che
          hai inviato in chat, che restano visibili a chi li ha ricevuti: una
          conversazione ha due lati, e non possiamo cancellare la copia altrui.
        </p>
        <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <strong>Hai cambiato idea?</strong> Finché la rimozione non è stata
          eseguita si può tornare indietro. Scrivici entro trenta giorni
          dall&rsquo;indirizzo con cui eri registrato.
        </p>
      </div>
    </>
  );
}

function NonConfermata({
  motivo,
}: {
  motivo: "non-trovata" | "scaduta" | "annullata" | "errore";
}) {
  const testi: Record<typeof motivo, { titolo: string; spiegazione: string }> = {
    "non-trovata": {
      titolo: "Questo collegamento non è valido",
      spiegazione:
        "Può succedere se è stato copiato male, o se ne è stato richiesto uno più recente: in quel caso vale solo l'ultimo ricevuto.",
    },
    scaduta: {
      titolo: "Questo collegamento è scaduto",
      spiegazione:
        "I collegamenti di conferma durano poche ore, di proposito. Il tuo account non è stato toccato: se vuoi ancora cancellarlo, rifai la richiesta dalla pagina «I miei dati».",
    },
    annullata: {
      titolo: "Questa richiesta è stata annullata",
      spiegazione:
        "È stata sostituita da una più recente, oppure annullata. Il tuo account non è stato toccato.",
    },
    errore: {
      titolo: "Qualcosa non ha funzionato",
      spiegazione:
        "Non siamo riusciti a completare l'operazione. Il tuo account non è stato cancellato. Riprova più tardi, oppure scrivici e ce ne occupiamo noi.",
    },
  };

  const t = testi[motivo];

  return (
    <>
      <p className="accent-label mb-3">cancellazione account</p>
      <h1 className="display-xl text-3xl md:text-4xl">{t.titolo}</h1>
      <p className="mt-6 text-muted-foreground">{t.spiegazione}</p>
      <Link
        href="/account/i-miei-dati"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Vai a «I miei dati»
      </Link>
    </>
  );
}

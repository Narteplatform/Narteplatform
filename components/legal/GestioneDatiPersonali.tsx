"use client";

import { useState, useTransition } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Input";
import {
  aggiornaConsensoMarketing,
  richiediCancellazioneAccount,
  scaricaImieiDati,
} from "@/app/(public)/account/i-miei-dati/_actions";

/**
 * I comandi della pagina «I miei dati».
 *
 * Lo scaricamento avviene nel browser e non con un collegamento a un file: il
 * contenuto arriva dalla server action, che ha già verificato di chi è la
 * sessione. Un indirizzo che servisse il file sarebbe una cosa da proteggere in
 * più, e prima o poi qualcuno lo condividerebbe per sbaglio.
 */
export function GestioneDatiPersonali({
  marketingAttivo,
}: {
  marketingAttivo: boolean;
}) {
  return (
    <div className="space-y-10">
      <Esportazione />
      <Marketing iniziale={marketingAttivo} />
      <Cancellazione />
    </div>
  );
}

function Esportazione() {
  const [pending, start] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  function scarica() {
    setErrore(null);
    start(async () => {
      try {
        const res = await scaricaImieiDati();
        const blob = new Blob([res.contenuto], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.nomeFile;
        a.click();
        // Senza `revokeObjectURL` il file resta in memoria per tutta la vita
        // della scheda: su un export di qualche megabyte si nota.
        URL.revokeObjectURL(url);
      } catch {
        setErrore("Non è stato possibile preparare il file. Riprova.");
      }
    });
  }

  return (
    <section>
      <h2 className="font-display text-xl">Scarica i tuoi dati</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Un file leggibile con tutto quello che conserviamo su di te: profilo,
        consensi, contenuti caricati, richieste, recensioni, abbonamento. Dei file
        (foto, tracce, video) trovi l&rsquo;elenco degli indirizzi da cui
        scaricarli.
      </p>
      {errore && <p className="mt-3 text-sm text-error">{errore}</p>}
      <Button onClick={scarica} disabled={pending} className="mt-4" variant="outline">
        <Download className="size-4" aria-hidden />
        {pending ? "Preparo il file…" : "Scarica tutto"}
      </Button>
    </section>
  );
}

function Marketing({ iniziale }: { iniziale: boolean }) {
  const [attivo, setAttivo] = useState(iniziale);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cambia(nuovo: boolean) {
    setErrore(null);
    setSalvato(false);
    // Si muove subito: un interruttore che aspetta la rete sembra rotto. Se la
    // scrittura fallisce torna indietro, che è l'unica cosa onesta da fare.
    setAttivo(nuovo);
    start(async () => {
      const res = await aggiornaConsensoMarketing(nuovo);
      if (!res.ok) {
        setAttivo(!nuovo);
        setErrore(res.error);
        return;
      }
      setSalvato(true);
    });
  }

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-xl">Comunicazioni promozionali</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Riguarda solo le novità su eventi e opportunità. Le comunicazioni di
        servizio — conferme, notifiche di una richiesta, promemoria — fanno parte
        del servizio e non si disattivano da qui.
      </p>
      <div className="mt-4">
        <Checkbox
          checked={attivo}
          disabled={pending}
          onChange={(e) => cambia(e.target.checked)}
          label="Voglio ricevere novità sugli eventi e sulle opportunità N'arte."
          hint={
            errore ??
            (salvato
              ? attivo
                ? "Consenso registrato."
                : "Consenso ritirato. Non cancelliamo la registrazione precedente: resta come prova che fino a oggi l'invio era legittimo."
              : "Puoi cambiare idea quando vuoi.")
          }
          error={errore ?? undefined}
        />
      </div>
    </section>
  );
}

function Cancellazione() {
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [fatto, setFatto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function invia() {
    setErrore(null);
    start(async () => {
      const res = await richiediCancellazioneAccount({ motivo: motivo || undefined });
      if (!res.ok) {
        setErrore(res.error);
        return;
      }
      setFatto(true);
    });
  }

  if (fatto) {
    return (
      <section className="border-t border-border pt-10">
        <h2 className="font-display text-xl">Richiesta ricevuta</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Abbiamo registrato la tua richiesta di cancellazione. Ti ricontattiamo
            per confermarla e completarla entro un mese, come prevede la legge.
            Fino ad allora il tuo account continua a funzionare: se cambi idea,
            scrivici.
          </span>
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-xl">Cancellare l&rsquo;account</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Puoi chiedere la cancellazione dell&rsquo;account e dei dati collegati.
        Alcune cose restano, e sono quelle che la legge ci obbliga a conservare —
        i documenti contabili di un abbonamento, per esempio. I messaggi che hai
        scambiato in una trattativa restano visibili all&rsquo;altra parte, che ha
        diritto a conservare la propria conversazione.
      </p>

      {!aperto ? (
        <Button onClick={() => setAperto(true)} variant="ghost" className="mt-4">
          Chiedi la cancellazione
        </Button>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <label className="block text-sm" htmlFor="motivo-cancellazione">
            Vuoi dirci perché? (facoltativo)
          </label>
          <Textarea
            id="motivo-cancellazione"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Non è obbligatorio, ma ci aiuta a capire cosa non funziona."
          />
          {errore && <p className="text-sm text-error">{errore}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={invia} disabled={pending}>
              {pending ? "Invio…" : "Invia la richiesta"}
            </Button>
            <Button variant="ghost" onClick={() => setAperto(false)} disabled={pending}>
              Annulla
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

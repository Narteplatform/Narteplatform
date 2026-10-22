"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ottieniLinkCalendario } from "@/lib/calendar/actions";
import type { LinkCalendario } from "@/lib/calendar/feed";

/**
 * Collegamento del calendario N'arte a Google Calendar (e Apple/Outlook).
 *
 * Il link si crea solo quando l'utente lo chiede, non all'apertura della
 * pagina. Si apre poi con un vero link e non con window.open dopo l'attesa:
 * i browser bloccano le finestre aperte fuori dal clic.
 */
export function CollegaCalendario({ descrizione }: { descrizione: string }) {
  const [link, setLink] = useState<LinkCalendario | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [rigenerato, setRigenerato] = useState(false);
  const [pending, start] = useTransition();

  function carica(rigenera: boolean) {
    setErrore(null);
    start(async () => {
      const res = await ottieniLinkCalendario(rigenera);
      if (!res.ok) {
        setErrore(res.error);
        return;
      }
      setLink(res.link);
      setRigenerato(rigenera);
    });
  }

  async function copia() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.https);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore("Copia non riuscita: seleziona il link e copialo a mano.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{descrizione}</p>

      {!link ? (
        <Button type="button" variant="outline" size="sm" onClick={() => carica(false)} disabled={pending}>
          <CalendarPlus className="size-4" />
          {pending ? "Preparo il link…" : "Collega a Google Calendar"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={link.google} target="_blank" rel="noopener noreferrer">
                <CalendarPlus className="size-4" /> Aggiungi a Google Calendar
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={link.webcal}>Apple Calendar / Outlook</a>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link.https}
              aria-label="Link del calendario"
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs"
            />
            <Button type="button" size="sm" variant="ghost" onClick={copia} aria-label="Copia il link">
              {copiato ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Google aggiorna i calendari collegati ogni qualche ora: una data appena confermata può
            comparire con un po&apos; di ritardo. Il link è personale: chi lo ha vede le tue date.
          </p>
          <button
            type="button"
            onClick={() => carica(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <RefreshCw className="size-3.5" />
            {rigenerato
              ? "Link rigenerato: il precedente non funziona più"
              : "Rigenera il link (il precedente smette di funzionare)"}
          </button>
        </div>
      )}

      {errore && (
        <p role="alert" className="text-sm text-red-600">
          {errore}
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/**
 * Il link d'invito e i modi per condividerlo. Il messaggio è precompilato e
 * modificabile: l'artista lo manda col proprio tono, non con quello di N'arte.
 *
 * Testi: N'arte è solo promozionale (parere legale 05/11/2026). Si parla di
 * «farsi trovare», mai di date o ingaggi garantiti.
 */
const TONI = [
  {
    id: "amichevole",
    etichetta: "Amichevole",
    testo: (link: string) =>
      `Ciao! Sto usando N'arte per farmi trovare da locali e organizzatori che cercano musica dal vivo. Candidarsi è gratis: se ti va, entra dal mio link ${link}`,
  },
  {
    id: "diretto",
    etichetta: "Diretto",
    testo: (link: string) =>
      `Sei un artista? Su N'arte locali, festival e organizzatori cercano musica dal vivo. Il profilo è gratuito e il cachet lo decidi tu. Candidati da qui: ${link}`,
  },
] as const;

type Tono = (typeof TONI)[number]["id"];

export function LinkInvito({ link }: { link: string }) {
  const [tono, setTono] = useState<Tono>("amichevole");
  const [messaggio, setMessaggio] = useState<string>(TONI[0].testo(link));
  const [modificato, setModificato] = useState(false);
  const [copiato, setCopiato] = useState<"link" | "messaggio" | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [puoCondividere, setPuoCondividere] = useState(false);

  // navigator.share esiste solo nel browser (e quasi solo su mobile): si
  // decide dopo il montaggio, così il server e il primo render coincidono.
  useEffect(() => {
    setPuoCondividere(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  function scegliTono(id: Tono) {
    setTono(id);
    const t = TONI.find((x) => x.id === id) ?? TONI[0];
    setMessaggio(t.testo(link));
    setModificato(false);
  }

  async function copia(cosa: "link" | "messaggio") {
    setErrore(null);
    try {
      await navigator.clipboard.writeText(cosa === "link" ? link : messaggio);
      setCopiato(cosa);
      setTimeout(() => setCopiato(null), 2000);
    } catch {
      setErrore("Copia non riuscita: seleziona il testo e copialo a mano.");
    }
  }

  async function condividi() {
    try {
      await navigator.share({ title: "Ti invito su N'arte", text: messaggio });
    } catch {
      // Annullata dall'utente: nulla da segnalare.
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(messaggio)}`;
  const email = `mailto:?subject=${encodeURIComponent("Ti invito su N'arte")}&body=${encodeURIComponent(messaggio)}`;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="link-invito" className="text-sm font-medium">
          Il tuo link personale
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="link-invito"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-sm"
          />
          <Button type="button" variant="accent" onClick={() => copia("link")} className="shrink-0">
            {copiato === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiato === "link" ? "Copiato" : "Copia link"}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="messaggio-invito" className="text-sm font-medium">
            Messaggio da mandare
          </label>
          <div role="radiogroup" aria-label="Tono del messaggio" className="inline-flex rounded-pill border border-border p-0.5">
            {TONI.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tono === t.id && !modificato}
                onClick={() => scegliTono(t.id)}
                className={cn(
                  "rounded-pill px-3 py-1 text-xs transition-colors",
                  tono === t.id && !modificato
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.etichetta}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          id="messaggio-invito"
          rows={4}
          value={messaggio}
          onChange={(e) => {
            setMessaggio(e.target.value);
            setModificato(true);
          }}
          className="mt-2 text-sm"
        />
        {!messaggio.includes(link) && (
          <p className="mt-1.5 text-xs text-amber-700">
            Il messaggio non contiene più il tuo link: senza, l&apos;invito non ti viene attribuito.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={email}>
            <Mail className="size-4" />
            Email
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => copia("messaggio")}>
          {copiato === "messaggio" ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiato === "messaggio" ? "Copiato" : "Copia messaggio"}
        </Button>
        {puoCondividere && (
          <Button type="button" variant="outline" size="sm" onClick={condividi}>
            <Share2 className="size-4" />
            Condividi
          </Button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {copiato === "link" ? "Link copiato negli appunti" : copiato === "messaggio" ? "Messaggio copiato negli appunti" : ""}
      </p>
      {errore && <p className="text-sm text-destructive">{errore}</p>}
    </div>
  );
}

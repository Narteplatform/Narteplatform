import { Clock3, Music4, XCircle } from "lucide-react";
import type { MediaSubmissionNotice } from "@/components/dashboard/profile/types";

/**
 * Le anteprime dei contenuti in attesa di approvazione, o rifiutati.
 *
 * PERCHÉ ESISTE. Da quando i media passano dall'approvazione, una foto appena
 * caricata esce dalla galleria pubblicata e al salvataggio successivo spariva
 * dallo schermo: l'artista la vedeva un attimo, premeva Salva e non la trovava
 * più. Tecnicamente era in coda, ma nessuno lo direbbe guardando una griglia in
 * cui la propria foto non c'è: la reazione naturale è ricaricarla, e ricaricarla
 * crea una seconda richiesta.
 *
 * Qui la foto resta visibile dov'era, con sopra scritto che cosa sta
 * aspettando. È la stessa griglia dell'uploader — stesse misure, stessi angoli
 * — così le due file si leggono come un'unica galleria in due stati, non come
 * due sezioni diverse.
 */
export function PendingMediaThumbs({
  items,
  kind = "image",
}: {
  items: MediaSubmissionNotice[];
  /** Le tracce audio non hanno un'anteprima da mostrare: si rende un riquadro. */
  kind?: "image" | "audio";
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        In attesa di approvazione
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => {
          const rifiutato = item.status === "rejected";
          return (
            <figure
              key={item.id}
              className={`relative aspect-square overflow-hidden rounded-md border bg-muted ${
                rifiutato ? "border-red-300" : "border-amber-300"
              }`}
            >
              {kind === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.url}
                  alt={item.title ?? "Contenuto in attesa di approvazione"}
                  className={`h-full w-full object-cover ${
                    rifiutato ? "opacity-40 grayscale" : "opacity-70"
                  }`}
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music4 className="size-8 text-muted-foreground" aria-hidden />
                </div>
              )}

              {/* La targhetta sta SOPRA l'immagine, non accanto: deve essere
                  impossibile guardare la foto senza leggere il suo stato. */}
              <figcaption
                className={`absolute inset-x-0 bottom-0 flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold leading-tight text-white ${
                  rifiutato ? "bg-red-600/90" : "bg-amber-600/90"
                }`}
              >
                {rifiutato ? (
                  <>
                    <XCircle className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">Non approvata</span>
                  </>
                ) : (
                  <>
                    <Clock3 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">In attesa</span>
                  </>
                )}
              </figcaption>

              {item.title && (
                <span className="sr-only">{item.title}</span>
              )}
            </figure>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {items.some((i) => i.status === "rejected")
          ? "I contenuti non approvati non compaiono sul profilo pubblico. Puoi caricarne altri."
          : "Compariranno sul tuo profilo pubblico appena lo staff N’arte li approva."}
      </p>
    </div>
  );
}

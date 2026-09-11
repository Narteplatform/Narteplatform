import { XCircle } from "lucide-react";
import type { MediaSubmissionNotice } from "@/components/dashboard/profile/types";

/**
 * Striscia da montare dentro i blocchi di editing del profilo artista
 * (galleria, audio, info) quando ci sono contenuti in attesa di approvazione
 * o rifiutati dal superadmin.
 *
 * Si occupa dei soli contenuti RIFIUTATI, perché sono gli unici che hanno
 * qualcosa da spiegare a parole: la motivazione del rifiuto. Per quelli in
 * attesa c'è PendingMediaThumbs, che li mostra dove l'artista li cerca —
 * fra le proprie foto — invece di annunciarli in una riga di testo. Prima
 * questa striscia diceva anche "hai N contenuti in attesa", e insieme alla
 * griglia diventava lo stesso avviso ripetuto due volte.
 *
 * Non ha stato proprio: niente hook, nessuna interattività. Può essere
 * importato sia da blocchi "use client" (diventa parte del loro bundle) sia,
 * in futuro, da un contesto server.
 */
export function PendingMediaNotice({ items }: { items: MediaSubmissionNotice[] }) {
  const rejected = items.filter((i) => i.status === "rejected");
  if (rejected.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {rejected.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg border border-corallo/30 bg-corallo/10 px-3 py-2 text-sm text-corallo-dark"
        >
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {item.title ? <>«{item.title}»</> : "Un contenuto che hai caricato"} non è stato
            approvato.
            {item.review_note ? (
              <>
                {" "}
                Motivo: <span className="font-medium">{item.review_note}</span>
              </>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

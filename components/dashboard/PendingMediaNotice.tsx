import { Clock3, XCircle } from "lucide-react";
import type { MediaSubmissionNotice } from "@/components/dashboard/profile/types";

/**
 * Striscia da montare dentro i blocchi di editing del profilo artista
 * (galleria, audio, info) quando ci sono contenuti in attesa di approvazione
 * o rifiutati dal superadmin.
 *
 * Senza questo avviso l'artista carica una foto, non la vede comparire da
 * nessuna parte e pensa che il sito sia rotto: il caricamento invece è
 * riuscito, il contenuto è solo in coda di moderazione (vedi
 * lib/media/moderation.ts e la migration 0051).
 *
 * Non ha stato proprio: niente hook, nessuna interattività. Può essere
 * importato sia da blocchi "use client" (diventa parte del loro bundle) sia,
 * in futuro, da un contesto server.
 */
export function PendingMediaNotice({ items }: { items: MediaSubmissionNotice[] }) {
  if (items.length === 0) return null;

  const pending = items.filter((i) => i.status === "pending");
  const rejected = items.filter((i) => i.status === "rejected");

  return (
    <div className="mb-4 space-y-2">
      {pending.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-azzurro/30 bg-azzurro/10 px-3 py-2 text-sm text-azzurro">
          <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {pending.length === 1
              ? "Hai caricato 1 contenuto che è in attesa di approvazione."
              : `Hai caricato ${pending.length} contenuti in attesa di approvazione.`}{" "}
            Non è un errore: comparirà sul tuo profilo pubblico appena un membro dello staff
            N&apos;arte lo approva.
          </p>
        </div>
      )}
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

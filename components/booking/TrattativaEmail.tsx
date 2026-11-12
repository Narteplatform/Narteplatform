import Link from "next/link";
import { Mail, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Trattativa via email (artista sul piano Free): niente chat, per nessuna
 * delle due parti. Mostra il recapito della controparte con un pulsante che
 * apre il client di posta con l'oggetto già compilato.
 */
export function TrattativaEmail({
  ruolo,
  controparte,
  oggetto,
}: {
  /** Chi guarda: decide i testi e il rimando all'abbonamento. */
  ruolo: "artist" | "organizer";
  controparte: { nome: string; email: string | null; telefono?: string | null };
  /** Oggetto precompilato dell'email. */
  oggetto: string;
}) {
  const mailto = controparte.email
    ? `mailto:${controparte.email}?subject=${encodeURIComponent(oggetto)}`
    : null;

  return (
    <div className="rounded-xl border border-[#E8A030]/40 bg-[#E8A030]/[0.06] p-4 text-sm">
      <p className="inline-flex items-center gap-2 font-display text-base tracking-tight">
        <Mail className="size-4 text-[#B87020]" aria-hidden="true" /> Trattativa via email
      </p>
      <p className="mt-1.5 text-muted-foreground">
        {ruolo === "artist"
          ? "Con il piano Free la chat non è disponibile: accordati con l'organizzatore via email su data e compenso."
          : "L'artista è sul piano Free: la chat non è disponibile. Accordatevi via email su data e compenso, poi registra l'accordo qui sotto."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {controparte.email ? (
          <a
            href={mailto ?? undefined}
            className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline break-all"
          >
            <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {controparte.email}
          </a>
        ) : (
          <span className="text-muted-foreground">
            Indirizzo non disponibile: rispondi all&apos;email di notifica che hai ricevuto.
          </span>
        )}
        {controparte.telefono && (
          <a
            href={`tel:${controparte.telefono}`}
            className="inline-flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline"
          >
            <Phone className="size-3.5" aria-hidden="true" /> {controparte.telefono}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {mailto && (
          <Button asChild size="sm">
            <a href={mailto}>
              <Mail className="size-4" aria-hidden="true" /> Scrivi via email a {controparte.nome}
            </a>
          </Button>
        )}
        {ruolo === "artist" && (
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/abbonamento">
              <Lock className="size-4" aria-hidden="true" /> Passa a Pro per trattare in chat
            </Link>
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {ruolo === "artist"
          ? "Quando vi siete accordati, l'organizzatore registra data e compenso: lo ritrovi qui e lo confermi per bloccare la data."
          : "La data si blocca quando l'artista conferma l'accordo che registri."}
      </p>
    </div>
  );
}

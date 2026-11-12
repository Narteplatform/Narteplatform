"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Mail, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";
import {
  artistAcceptRequest,
  artistDeclineRequest,
} from "@/app/(organizer)/organizzatore/_actions";
import type { BookingStatus } from "@/lib/supabase/types";
import type { CanaleTrattativa } from "@/lib/booking/etichette";

/**
 * Risposta dell'artista a una nuova richiesta: «Inizia trattativa» o
 * «Rifiuta». Iniziare la trattativa non conferma nulla: la data si blocca solo
 * con la doppia conferma del prezzo (offerta in chat, o accordo registrato e
 * confermato se si tratta via email).
 */
export function ArtistRequestActions({
  requestId,
  status,
  canale,
}: {
  requestId: string;
  status: BookingStatus;
  /** Piano attuale del profilo: chat (Pro/Max) o email (Free). */
  canale: CanaleTrattativa;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  if (status !== "pending") return null;

  function avvia() {
    start(async () => {
      setError(null);
      const r = await artistAcceptRequest(requestId, notes);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.canale === "chat" && r.conversationId) {
        router.push(`/dashboard/chat/${r.conversationId}`);
        return;
      }
      // Trattativa via email (o chat non creata): la richiesta passa nella
      // scheda «In trattativa», dove ci sono i recapiti dell'organizzatore.
      router.push(`/dashboard/leads?status=in_trattativa&highlight=${requestId}`);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      {showNotes && (
        <div className="space-y-1">
          <Label htmlFor={`notes-${requestId}`}>Messaggio per l&apos;organizzatore (opzionale)</Label>
          <Textarea
            id={`notes-${requestId}`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Es. disponibilità di orario, fee indicativa, esigenze tecniche…"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => (showNotes ? avvia() : setShowNotes(true))}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : canale === "chat" ? (
            <MessageSquare className="size-4" />
          ) : (
            <Mail className="size-4" />
          )}
          {showNotes
            ? canale === "chat"
              ? "Inizia trattativa e apri la chat"
              : "Inizia trattativa via email"
            : "Inizia trattativa"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await artistDeclineRequest(requestId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          <X className="size-4" /> Rifiuta
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {canale === "chat" ? (
          <>
            Iniziare la trattativa non conferma la data: si apre la chat con l&apos;organizzatore e la
            data si blocca quando uno dei due accetta l&apos;offerta dell&apos;altro, al prezzo
            indicato.
          </>
        ) : (
          <>
            Con il piano Free la trattativa si svolge via email: ti mostreremo l&apos;indirizzo
            dell&apos;organizzatore. La chat con offerte è inclusa in{" "}
            <Link href="/dashboard/abbonamento" className="font-medium text-azzurro underline-offset-4 hover:underline">
              Pro e Max
            </Link>
            .
          </>
        )}
      </p>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

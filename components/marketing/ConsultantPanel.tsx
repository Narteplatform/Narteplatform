"use client";

import { useMemo, useState, useTransition } from "react";
import { Phone, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestConsultation } from "@/app/(user)/artisti/_actions";

export type ConsultantSlot = {
  id: string;
  slot_at: string;
  duration_min: number;
};

export function ConsultantPanel({ slots }: { slots: ConsultantSlot[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [needs, setNeeds] = useState("");
  const [openCalendar, setOpenCalendar] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();

  const slotsByDate = useMemo(() => {
    const map = new Map<string, ConsultantSlot[]>();
    for (const s of slots) {
      const d = new Date(s.slot_at).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  function openSelector() {
    setError(null);
    if (name.trim().length < 2) return setError("Inserisci il tuo nome.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Email non valida.");
    if (phone.trim().length < 5) return setError("Inserisci un numero di telefono valido.");
    if (needs.trim().length < 10) return setError("Descrivi brevemente le tue necessità.");
    setOpenCalendar(true);
  }

  function submitSlot(slotId: string) {
    setError(null);
    setSelectedSlot(slotId);
    start(async () => {
      const res = await requestConsultation({ slotId, name, email, phone, needs });
      if (!res.ok) {
        setError(res.error ?? "Errore. Riprova.");
        setSelectedSlot(null);
        return;
      }
      setSuccess(true);
      setOpenCalendar(false);
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-accent" />
        <h3 className="mt-4 font-display text-2xl">Richiesta inviata!</h3>
        <p className="mt-2 text-muted-foreground">
          Riceverai una email di conferma. Un consulente N&apos;arte ti contatterà a breve per
          finalizzare l&apos;appuntamento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* LEFT — Pitch */}
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="size-3.5" /> Gratuito
        </span>
        <h2 className="mt-5 font-display text-3xl md:text-5xl">
          Parla con un consulente N&apos;arte.
        </h2>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          Sei alla ricerca dell&apos;artista giusto, vuoi capire come organizzare un evento o
          serve un consiglio su budget e disponibilità? Prenota una chiamata gratuita di 30
          minuti con un nostro consulente.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {[
            "Consulenza dedicata su misura",
            "Suggerimenti su artisti, format e budget",
            "Supporto nella scelta della struttura",
            "Nessun costo, nessun impegno",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT — Form */}
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Phone className="size-5" />
          </span>
          <h3 className="font-display text-xl">Prenota la tua chiamata</h3>
        </div>

        <div className="mt-5 grid gap-3">
          <Field label="Nome e cognome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="h-11 w-full rounded-md border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              placeholder="Mario Rossi"
            />
          </Field>
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="h-11 w-full rounded-md border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              placeholder="mario@esempio.it"
            />
          </Field>
          <Field label="Telefono">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="h-11 w-full rounded-md border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              placeholder="+39 333 1234567"
            />
          </Field>
          <Field label="Le tue necessità">
            <textarea
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
              placeholder="Es: cerco un duo acustico per matrimonio a luglio, capienza 80 persone, budget 1500€…"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="button"
            variant="accent"
            size="md"
            onClick={openSelector}
            className="mt-1"
          >
            <Calendar className="size-4" /> Prenota chiamata gratuita
          </Button>
        </div>
      </div>

      {openCalendar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-dialog-title"
          onClick={() => !pending && setOpenCalendar(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="slot-dialog-title"className="font-display text-2xl">
              Scegli uno slot
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Seleziona quando vuoi essere chiamato. Durata indicativa 30 minuti.
            </p>

            {slotsByDate.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Al momento non ci sono slot disponibili. Riprova tra qualche giorno o scrivici a{" "}
                <a href="mailto:hello@narte.it" className="text-accent underline">
                  hello@narte.it
                </a>
                .
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {slotsByDate.map(([date, list]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {date}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {list.map((s) => {
                        const time = new Date(s.slot_at).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const isLoading = pending && selectedSlot === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={pending}
                            onClick={() => submitSlot(s.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-4 py-2 text-sm transition hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                          >
                            {isLoading ? "..." : time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setOpenCalendar(false)}
              >
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

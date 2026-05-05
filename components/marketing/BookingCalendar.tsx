"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";
import "react-day-picker/style.css";
import { toast } from "sonner";
import { Clock, X, CheckCircle2, ArrowRight, CalendarCheck2 } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatSlot, normalizeTime, resolveSlotsForDate, type Slot } from "@/lib/slots";
import type { ArtistInterestInput } from "@/app/(user)/artisti/[slug]/_schema";

type DefaultSlot = {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

type DateSlot = {
  id: string;
  date: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

type Props = {
  artistId: string;
  artistName: string;
  busyDates: string[];
  defaultSlots?: DefaultSlot[];
  dateSlots?: DateSlot[];
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHuman(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type FormValues = {
  name: string;
  email: string;
  phone: string;
  location: string;
  message: string;
};

export function BookingCalendar({
  artistId,
  artistName,
  busyDates,
  defaultSlots = [],
  dateSlots = [],
}: Props) {
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const busy = busyDates.map((d) => new Date(d));
  const busySet = useMemo(() => new Set(busyDates), [busyDates]);

  const dateSlotsByDate = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of dateSlots) {
      const list = m.get(s.date) ?? [];
      list.push({ id: s.id, label: s.label, start_time: s.start_time, end_time: s.end_time });
      m.set(s.date, list);
    }
    return m;
  }, [dateSlots]);

  const availableSlots: Slot[] = useMemo(() => {
    if (!selectedISO) return [];
    return resolveSlotsForDate({
      isBusyDay: busySet.has(selectedISO),
      dateSlots: dateSlotsByDate.get(selectedISO) ?? [],
      defaultSlots: defaultSlots.map((s) => ({
        id: s.id,
        label: s.label,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    });
  }, [selectedISO, busySet, dateSlotsByDate, defaultSlots]);

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: { name: "", email: "", phone: "", location: "", message: "" },
  });

  useEffect(() => {
    setError(null);
    setSelectedSlot(null);
    setSubmitted(false);
  }, [selectedISO]);

  function onDayClick(day: Date) {
    if (day < today) return;
    const iso = toIsoDate(day);
    if (busySet.has(iso)) return;
    setSelectedISO(iso);
  }

  function openForm(slot?: string) {
    if (!selectedISO) return;
    if (slot !== undefined) setSelectedSlot(slot);
    setFormOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (!selectedISO) return;
    setError(null);
    const payload: ArtistInterestInput = {
      artistId,
      date: selectedISO,
      timeSlot: selectedSlot ?? undefined,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      location: values.location || undefined,
      message: values.message,
    };
    try {
      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { ok: boolean; rid?: string; error?: string; leadId?: string } = await r
        .json()
        .catch(() => ({ ok: false, error: "Risposta non valida dal server" }));
      if (!json.ok) {
        const msg = json.error ?? "Errore durante l'invio";
        const full = json.rid ? `${msg} [${json.rid}]` : msg;
        setError(full);
        toast.error(full);
        return;
      }
      toast.success("Richiesta d'interesse inviata correttamente");
      reset();
      setSubmitted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore di rete";
      setError(msg);
      toast.error(msg);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setError(null);
    setSubmitted(false);
  }

  function clearSelection() {
    setSelectedISO(null);
    setSelectedSlot(null);
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
        {/* CALENDAR */}
        <div>
          <DayPicker
            mode="single"
            locale={it}
            weekStartsOn={1}
            disabled={[{ before: today }, ...busy]}
            modifiers={{ busy }}
            modifiersClassNames={{
              busy: "bg-foreground text-background line-through opacity-60",
            }}
            onDayClick={onDayClick}
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="inline-block size-3 border border-foreground" /> Libero — clicca
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block size-3 bg-foreground" /> Occupato
            </span>
          </div>
        </div>

        {/* SLOT PREVIEW PANEL */}
        <div className="rounded-2xl border border-border bg-muted p-5 md:p-6">
          {!selectedISO ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <CalendarCheck2 className="size-8 text-muted-foreground" />
              <p className="accent-label mt-4">seleziona</p>
              <p className="mt-2 font-display text-lg uppercase">
                Scegli un giorno
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Clicca un giorno libero sul calendario per vedere gli orari disponibili.
              </p>
            </div>
          ) : (
            <>
              <p className="accent-label">data scelta</p>
              <h3 className="mt-1 font-display text-lg uppercase md:text-xl">
                {formatHuman(selectedISO)}
              </h3>

              <div className="mt-5">
                <Label className="flex items-center gap-2 text-xs">
                  <Clock className="size-3" /> Turni disponibili
                </Label>

                {availableSlots.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => openForm("")}
                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/20 bg-background px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
                  >
                    <span>
                      <span className="block font-display text-sm uppercase">
                        Disponibile in qualunque orario
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Nessun turno preimpostato. Indica tu l&apos;orario nel form.
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {availableSlots.map((s, i) => {
                      const value = `${normalizeTime(s.start_time)}–${normalizeTime(s.end_time)}${
                        s.label ? ` (${s.label})` : ""
                      }`;
                      return (
                        <li key={s.id ?? `${s.start_time}-${i}`}>
                          <button
                            type="button"
                            onClick={() => openForm(value)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/20 bg-background px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
                          >
                            <span>
                              <span className="block font-display text-sm uppercase">
                                {normalizeTime(s.start_time)}–{normalizeTime(s.end_time)}
                              </span>
                              {s.label && (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {s.label}
                                </span>
                              )}
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={clearSelection}
                className="mt-5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Cambia giorno
              </button>
            </>
          )}
        </div>
      </div>

      {/* FORM MODAL */}
      {formOpen && selectedISO && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 pt-24 backdrop-blur-sm sm:items-center sm:p-6 sm:pt-28"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Chiudi"
            className="absolute inset-0"
            onClick={closeForm}
          />
          <div className="relative z-10 max-h-[calc(100svh-7rem)] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:max-h-[calc(100svh-9rem)] sm:rounded-2xl sm:p-8">
            <button
              type="button"
              onClick={closeForm}
              aria-label="Chiudi"
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            {submitted ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <CheckCircle2 className="size-9" />
                </div>
                <p className="accent-label mt-6">richiesta inviata</p>
                <h3 className="mt-2 font-display text-2xl uppercase md:text-3xl">
                  Richiesta d&apos;interesse inviata correttamente
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Abbiamo ricevuto la tua richiesta per <strong>{artistName}</strong> il{" "}
                  {formatHuman(selectedISO)}. L&apos;artista e il nostro team la valutano e ti
                  rispondono via email entro 48h.
                </p>
                <Button
                  type="button"
                  variant="accent"
                  size="lg"
                  className="mt-8 min-w-[200px]"
                  onClick={() => {
                    closeForm();
                    clearSelection();
                  }}
                >
                  Chiudi
                </Button>
              </div>
            ) : (
              <>
                <p className="accent-label">interessato</p>
                <h3 className="mt-1 font-display text-2xl uppercase md:text-3xl">
                  {artistName} — {formatHuman(selectedISO)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedSlot
                    ? `Turno: ${selectedSlot}`
                    : "Disponibile in qualunque orario — indica i dettagli sotto."}
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome" error={errors.name && "Inserisci il nome (min 2 caratteri)"}>
                      <Input {...register("name", { required: true, minLength: 2 })} />
                    </Field>
                    <Field label="Email" error={errors.email && "Email obbligatoria"}>
                      <Input type="email" {...register("email", { required: true })} />
                    </Field>
                    <Field label="Telefono">
                      <Input type="tel" {...register("phone")} />
                    </Field>
                    <Field label="Luogo evento">
                      <Input placeholder="Città / venue" {...register("location")} />
                    </Field>
                  </div>
                  <Field
                    label="Dettagli"
                    error={errors.message && "Scrivi qualche dettaglio (min 5 caratteri)"}
                  >
                    <Textarea
                      rows={4}
                      placeholder="Tipo di evento, pubblico, qualunque dettaglio utile…"
                      {...register("message", { required: true, minLength: 5 })}
                    />
                  </Field>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      className="min-w-[200px]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Invio…" : "Invia richiesta"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeForm}>
                      Annulla
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | false;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

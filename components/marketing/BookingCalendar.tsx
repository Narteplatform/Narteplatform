"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";
import "react-day-picker/style.css";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatSlot, normalizeTime, resolveSlotsForDate, type Slot } from "@/lib/slots";
import {
  submitArtistInterest,
  type ArtistInterestInput,
} from "@/app/(user)/artisti/[slug]/_actions";

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
  const [error, setError] = useState<string | null>(null);
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
    if (selectedISO) {
      setError(null);
      setSelectedSlot(null);
    }
  }, [selectedISO]);

  function onDayClick(day: Date) {
    if (day < today) return;
    const iso = toIsoDate(day);
    if (busySet.has(iso)) return;
    setSelectedISO(iso);
  }

  async function onSubmit(values: FormValues) {
    if (!selectedISO) return;
    if (availableSlots.length > 0 && !selectedSlot) {
      setError("Seleziona uno slot orario");
      return;
    }
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
    const res = await submitArtistInterest(payload);
    if (!res.ok) {
      const msg = res.error ?? "Errore durante l'invio";
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success("Richiesta inviata correttamente", {
      description: `Abbiamo ricevuto la tua richiesta per ${artistName}. Ti ricontattiamo entro 48h.`,
    });
    reset();
    close();
  }

  function close() {
    setSelectedISO(null);
    setSelectedSlot(null);
    setError(null);
  }

  return (
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
          <span className="inline-block size-3 border border-foreground" /> Libero — clicca per prenotare
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 bg-foreground" /> Occupato
        </span>
      </div>

      {selectedISO && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 pt-24 backdrop-blur-sm sm:items-center sm:p-6 sm:pt-28"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Chiudi"
            className="absolute inset-0"
            onClick={close}
          />
          <div className="relative z-10 max-h-[calc(100svh-7rem)] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:max-h-[calc(100svh-9rem)] sm:rounded-2xl sm:p-8">
            <button
              type="button"
              onClick={close}
              aria-label="Chiudi"
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <p className="accent-label">interessato</p>
            <h3 className="mt-1 font-display text-2xl uppercase md:text-3xl">
              {artistName} — {formatHuman(selectedISO)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lascia i tuoi contatti: l&apos;artista e il nostro team valutano la richiesta
              e ti rispondono entro 48h.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Clock className="size-3" /> Slot orario
                  </Label>
                  {availableSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nessuno slot configurato per questo giorno: indica l&apos;orario nei dettagli.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((s, i) => {
                        const value = `${normalizeTime(s.start_time)}–${normalizeTime(s.end_time)}${s.label ? ` (${s.label})` : ""}`;
                        const active = selectedSlot === value;
                        return (
                          <button
                            key={s.id ?? `${s.start_time}-${i}`}
                            type="button"
                            onClick={() => setSelectedSlot(active ? null : value)}
                            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/30 hover:border-foreground"
                            }`}
                            aria-pressed={active}
                          >
                            {formatSlot(s)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

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
                  <Button type="button" variant="ghost" onClick={close}>
                    Annulla
                  </Button>
                </div>
              </form>
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

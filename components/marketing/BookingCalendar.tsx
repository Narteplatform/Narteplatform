"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { X } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  submitArtistInterest,
  type ArtistInterestInput,
} from "@/app/(user)/artisti/[slug]/_actions";

type Props = {
  artistId: string;
  artistName: string;
  busyDates: string[]; // ISO yyyy-mm-dd
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

export function BookingCalendar({ artistId, artistName, busyDates }: Props) {
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const busy = busyDates.map((d) => new Date(d));

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: "", email: "", phone: "", location: "", message: "" },
  });

  useEffect(() => {
    if (selectedISO) {
      setSuccess(false);
      setError(null);
    }
  }, [selectedISO]);

  function onDayClick(day: Date) {
    if (day < today) return;
    const iso = toIsoDate(day);
    if (busyDates.includes(iso)) return;
    setSelectedISO(iso);
  }

  async function onSubmit(values: FormValues) {
    if (!selectedISO) return;
    setError(null);
    const payload: ArtistInterestInput = {
      artistId,
      date: selectedISO,
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      location: values.location || undefined,
      message: values.message,
    };
    const res = await submitArtistInterest(payload);
    if (!res.ok) {
      setError(res.error ?? "Errore");
      return;
    }
    setSuccess(true);
    reset();
  }

  function close() {
    setSelectedISO(null);
    setSuccess(false);
    setError(null);
  }

  return (
    <div>
      <DayPicker
        mode="single"
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Chiudi"
            className="absolute inset-0"
            onClick={close}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto bg-background p-6 shadow-2xl sm:rounded-lg sm:p-8">
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

            {success ? (
              <div className="mt-6 border border-foreground/20 bg-muted p-6 text-center">
                <p className="font-display text-xl uppercase">Grazie!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Abbiamo ricevuto la tua richiesta. Ti ricontattiamo presto.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={close}>
                  Chiudi
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome">
                    <Input {...register("name", { required: true, minLength: 2 })} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" {...register("email", { required: true })} />
                  </Field>
                  <Field label="Telefono">
                    <Input type="tel" {...register("phone")} />
                  </Field>
                  <Field label="Luogo evento">
                    <Input placeholder="Città / venue" {...register("location")} />
                  </Field>
                </div>
                <Field label="Dettagli">
                  <Textarea
                    rows={4}
                    placeholder="Tipo di evento, orario, pubblico, qualunque dettaglio utile…"
                    {...register("message", { required: true, minLength: 5 })}
                  />
                </Field>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="accent" disabled={isSubmitting}>
                    {isSubmitting ? "Invio…" : "Invia richiesta"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={close}>
                    Annulla
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

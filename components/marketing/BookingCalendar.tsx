"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";
import "react-day-picker/style.css";
import { toast } from "sonner";
import { Clock, X, CheckCircle2, ArrowRight, CalendarCheck2 } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CityAutocomplete } from "@/components/forms/CityAutocomplete";
import { BUDGET_RANGES, rangeToMin, type BudgetRangeValue } from "@/lib/constants/budget-ranges";
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

export type ViewerRole = "anon" | "user" | "organizer" | "artist" | "superadmin";

export type ConfirmedBookingInfo = {
  date: string;
  organizerName: string;
  organizerAvatar: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueCover: string | null;
};

type Props = {
  artistId: string;
  artistName: string;
  busyDates: string[];
  defaultSlots?: DefaultSlot[];
  dateSlots?: DateSlot[];
  viewerRole?: ViewerRole;
  viewerEmail?: string | null;
  viewerName?: string | null;
  organizerVenues?: { id: string; name: string }[];
  confirmedBookings?: ConfirmedBookingInfo[];
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
  // signup (solo non loggati)
  email: string;
  password: string;
  displayName: string;
  phone: string;
  venueName: string;
  venueCity: string;
  // dati richiesta
  message: string;
  budgetRange: BudgetRangeValue | "";
  venueId: string;
};

export function BookingCalendar({
  artistId,
  artistName,
  busyDates,
  defaultSlots = [],
  dateSlots = [],
  viewerRole = "anon",
  viewerEmail = null,
  viewerName = null,
  organizerVenues = [],
  confirmedBookings = [],
}: Props) {
  const canSubmit = viewerRole !== "artist"; // tutti tranne artist
  const needsSignup = viewerRole === "anon";
  const isUserToPromote = viewerRole === "user";
  const confirmedByDate = useMemo(() => {
    const m = new Map<string, ConfirmedBookingInfo>();
    for (const b of confirmedBookings) m.set(b.date, b);
    return m;
  }, [confirmedBookings]);
  const [selectedRedDate, setSelectedRedDate] = useState<string | null>(null);
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

  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm<FormValues>({
    defaultValues: {
      email: viewerEmail ?? "",
      password: "",
      displayName: viewerName ?? "",
      phone: "",
      venueName: "",
      venueCity: "",
      message: "",
      budgetRange: "",
      venueId: organizerVenues[0]?.id ?? "",
    },
  });

  useEffect(() => {
    setError(null);
    setSelectedSlot(null);
    setSubmitted(false);
  }, [selectedISO]);

  function onDayClick(day: Date) {
    if (day < today) return;
    const iso = toIsoDate(day);
    if (busySet.has(iso)) {
      setSelectedRedDate(iso);
      setSelectedISO(null);
      return;
    }
    setSelectedRedDate(null);
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
    const budgetMin = rangeToMin(values.budgetRange);
    const payload: Record<string, unknown> = {
      artistId,
      date: selectedISO,
      timeSlot: selectedSlot ?? undefined,
      message: values.message,
      budgetOffer: budgetMin ?? undefined,
      budgetRange: values.budgetRange || undefined,
    };
    if (needsSignup) {
      payload.email = values.email;
      payload.password = values.password;
      payload.displayName = values.displayName;
      payload.phone = values.phone || undefined;
      payload.venueName = values.venueName || undefined;
      payload.venueCity = values.venueCity || undefined;
    } else {
      if (values.venueId) payload.venueId = values.venueId;
      else if (values.venueName) {
        payload.venueName = values.venueName;
        payload.venueCity = values.venueCity || undefined;
      }
      if (values.phone) payload.phone = values.phone;
    }
    try {
      const r = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: {
        ok: boolean;
        rid?: string;
        error?: string;
        requestId?: string;
        sessionCreated?: boolean;
      } = await r.json().catch(() => ({ ok: false, error: "Risposta non valida dal server" }));
      if (!json.ok) {
        const msg = json.error ?? "Errore durante l'invio";
        const full = json.rid ? `${msg} [${json.rid}]` : msg;
        setError(full);
        toast.error(full);
        return;
      }
      toast.success("Richiesta inviata. L'artista la valuterà entro 48h.");
      reset();
      setSubmitted(true);
      // Se signup, redirect al pannello organizzatore
      if (json.sessionCreated) {
        setTimeout(() => {
          window.location.href = "/organizzatore/richieste";
        }, 1500);
      }
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
            disabled={[{ before: today }]}
            modifiers={{ busy }}
            modifiersClassNames={{
              busy: "bg-foreground text-background line-through opacity-70 cursor-pointer",
            }}
            onDayClick={onDayClick}
          />
          {selectedRedDate && (() => {
            const info = confirmedByDate.get(selectedRedDate);
            if (!info) {
              return (
                <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                  Data non disponibile.
                </div>
              );
            }
            return (
              <div className="mt-3 rounded-xl border border-foreground/20 bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Data bloccata
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {info.venueCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.venueCover}
                      alt=""
                      className="size-10 rounded-md object-cover"
                    />
                  ) : info.organizerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.organizerAvatar}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {info.venueName ?? info.organizerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {info.venueName ? info.organizerName : ""}
                      {info.venueCity ? ` · ${info.venueCity}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
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
              <p className="mt-2 font-display text-lg">
                Scegli un giorno
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Clicca un giorno libero sul calendario per vedere gli orari disponibili.
              </p>
            </div>
          ) : (
            <>
              <p className="accent-label">data scelta</p>
              <h3 className="mt-1 font-display text-lg md:text-xl">
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
                      <span className="block font-display text-sm">
                        Disponibile in qualunque orario
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Nessun turno preimpostato. Indica tu l&rsquo;orario nel form.
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
                              <span className="block font-display text-sm">
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
                <h3 className="mt-2 font-display text-2xl md:text-3xl">
                  Richiesta d&rsquo;interesse inviata correttamente
                </h3>
                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Abbiamo ricevuto la tua richiesta per <strong>{artistName}</strong> il{" "}
                  {formatHuman(selectedISO)}. L&rsquo;artista e il nostro team la valutano e ti
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
                <h3 className="mt-1 font-display text-2xl md:text-3xl">
                  {artistName} — {formatHuman(selectedISO)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedSlot
                    ? `Turno: ${selectedSlot}`
                    : "Disponibile in qualunque orario — indica i dettagli sotto."}
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
                  {needsSignup && (
                    <>
                      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs">
                        <p className="font-medium text-accent">
                          Crea il tuo profilo organizzatore
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Per inviare la richiesta devi avere un profilo organizzatore.
                          Registrati ora e accederai subito al pannello dedicato.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field
                          label="Email *"
                          error={errors.email && "Email obbligatoria"}
                        >
                          <Input type="email" {...register("email", { required: true })} />
                        </Field>
                        <Field
                          label="Password *"
                          error={errors.password && "Min 8 caratteri"}
                        >
                          <Input
                            type="password"
                            {...register("password", { required: true, minLength: 8 })}
                          />
                        </Field>
                        <Field
                          label="Nome / brand *"
                          error={errors.displayName && "Inserisci un nome"}
                        >
                          <Input
                            placeholder="Es. Mario Rossi o Brand Eventi SRL"
                            {...register("displayName", { required: true, minLength: 2 })}
                          />
                        </Field>
                        <Field label="Telefono">
                          <Input type="tel" {...register("phone")} />
                        </Field>
                        <Field label="Nome struttura">
                          <Input
                            placeholder="Es. Bar Centrale"
                            {...register("venueName")}
                          />
                        </Field>
                        <Field label="Città struttura">
                          <Controller
                            control={control}
                            name="venueCity"
                            render={({ field }) => (
                              <CityAutocomplete
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Cerca città italiana…"
                              />
                            )}
                          />
                        </Field>
                      </div>
                    </>
                  )}
                  {!needsSignup && organizerVenues.length > 0 && (
                    <Field label="Struttura per cui prenoti">
                      <select
                        className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        {...register("venueId")}
                      >
                        <option value="">Nessuna (definirò poi)</option>
                        {organizerVenues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {!needsSignup && organizerVenues.length === 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome struttura">
                        <Input
                          placeholder="Es. Bar Centrale"
                          {...register("venueName")}
                        />
                      </Field>
                      <Field label="Città struttura">
                        <Controller
                          control={control}
                          name="venueCity"
                          render={({ field }) => (
                            <CityAutocomplete
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Cerca città italiana…"
                            />
                          )}
                        />
                      </Field>
                    </div>
                  )}
                  <Field label="Range di budget">
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      {...register("budgetRange")}
                    >
                      <option value="">Seleziona un range</option>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Messaggio per l'artista *"
                    error={errors.message && "Almeno 20 caratteri con i dettagli dell'evento"}
                  >
                    <Textarea
                      rows={4}
                      placeholder="Tipo di evento, pubblico atteso, qualunque dettaglio utile…"
                      {...register("message", { required: true, minLength: 20 })}
                    />
                  </Field>
                  {isUserToPromote && (
                    <p className="text-xs text-muted-foreground">
                      Inviando questa richiesta il tuo profilo verrà aggiornato a
                      &quot;organizzatore&quot; per gestire date e prenotazioni.
                    </p>
                  )}
                  {!canSubmit && (
                    <p className="text-sm text-red-500">
                      Il profilo artista non può inviare richieste.
                    </p>
                  )}
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      className="min-w-[200px]"
                      disabled={isSubmitting || !canSubmit}
                    >
                      {isSubmitting
                        ? "Invio…"
                        : needsSignup
                          ? "Registrati & invia richiesta"
                          : "Invia richiesta"}
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

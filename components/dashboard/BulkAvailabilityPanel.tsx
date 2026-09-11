"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarRange, CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  bulkSetAvailability,
  type BulkSlotMode,
} from "@/app/(artist)/dashboard/_actions";

export type BulkDefaultSlot = {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

type Props = {
  artistId: string;
  defaultSlots: BulkDefaultSlot[];
};

type CustomSlot = { label: string; start_time: string; end_time: string };

type Preview = { applied: number; skipped: string[] };

const GIORNI = [
  { n: 1, short: "Lun", long: "lunedì" },
  { n: 2, short: "Mar", long: "martedì" },
  { n: 3, short: "Mer", long: "mercoledì" },
  { n: 4, short: "Gio", long: "giovedì" },
  { n: 5, short: "Ven", long: "venerdì" },
  { n: 6, short: "Sab", long: "sabato" },
  { n: 0, short: "Dom", long: "domenica" },
] as const;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function todayIso() {
  return iso(new Date());
}

/** Ultimo giorno del mese corrente: "tutti i lunedì del mese" parte da qui. */
function fineMeseIso() {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function fraTrentaGiorniIso() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return iso(d);
}

function dataBreve(isoDate: string): string {
  const [y, m, g] = isoDate.split("-");
  return `${g}/${m}/${y.slice(2)}`;
}

/**
 * Modifica in massa del calendario.
 *
 * Il caso d'uso vero non è "da qui a qui": è «tutti i lunedì del mese sono
 * occupati», oppure «i venerdì e i sabati di giugno sono liberi dalle 21 alle
 * 24». Per questo accanto all'intervallo ci sono i giorni della settimana e le
 * fasce orarie, e per questo prima di scrivere si vede un'anteprima:
 * un'operazione che tocca sessanta giorni non deve partire alla cieca.
 *
 * Le date già confermate con un organizzatore non vengono mai modificate. Il
 * server le esclude e le rimanda indietro, e qui si elencano per esteso: un
 * conteggio che non torna è peggio di un'operazione che non parte.
 */
export function BulkAvailabilityPanel({ artistId, defaultSlots }: Props) {
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(fineMeseIso);
  const [status, setStatus] = useState<"available" | "busy">("available");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [slotMode, setSlotMode] = useState<BulkSlotMode>("keep");
  const [slotIds, setSlotIds] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState<CustomSlot[]>([
    { label: "", start_time: "21:00", end_time: "23:30" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<Preview | null>(null);
  const [pending, startTransition] = useTransition();

  const riepilogoGiorni = useMemo(() => {
    if (weekdays.size === 0) return "tutti i giorni";
    const scelti = GIORNI.filter((g) => weekdays.has(g.n));
    if (scelti.length === 1) return `tutti i ${scelti[0].long}`;
    return scelti.map((g) => g.long).join(", ");
  }, [weekdays]);

  function reset() {
    setError(null);
    setPreview(null);
    setDone(null);
  }

  function toggleWeekday(n: number) {
    reset();
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function toggleSlot(id: string) {
    reset();
    setSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function payload(dryRun: boolean) {
    return {
      artist_id: artistId,
      date_from: from,
      date_to: to,
      status,
      weekdays: weekdays.size > 0 ? Array.from(weekdays) : undefined,
      slot_mode: slotMode,
      slot_ids: slotMode === "defaults" ? Array.from(slotIds) : undefined,
      custom_slots:
        slotMode === "custom"
          ? custom.map((c) => ({
              label: c.label.trim() || null,
              start_time: c.start_time,
              end_time: c.end_time,
            }))
          : undefined,
      dry_run: dryRun,
    };
  }

  function anteprima() {
    reset();
    if (!from || !to) {
      setError("Imposta entrambe le date");
      return;
    }
    startTransition(async () => {
      const res = await bulkSetAvailability(payload(true));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview({ applied: res.applied, skipped: res.skipped });
    });
  }

  function applica() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await bulkSetAvailability(payload(false));
      if (!res.ok) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(null);
      setDone({ applied: res.applied, skipped: res.skipped });
    });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <header className="mb-1 flex items-center gap-2">
        <CalendarRange className="size-4 text-azzurro" />
        <h3 className="font-display text-sm">Modifica in massa</h3>
      </header>
      <p className="mb-4 text-xs text-muted-foreground">
        Imposta più giorni in una volta sola. Le date già confermate con un
        organizzatore non vengono mai modificate.
      </p>

      {/* Intervallo */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Dal giorno</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              reset();
              setFrom(e.target.value);
            }}
          />
        </div>
        <div>
          <Label>Al giorno</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              reset();
              setTo(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setFrom(todayIso());
            setTo(fineMeseIso());
          }}
        >
          Questo mese
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setFrom(todayIso());
            setTo(fraTrentaGiorniIso());
          }}
        >
          Prossimi 30 giorni
        </Button>
      </div>

      {/* Giorni della settimana */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label className="!mb-0">Solo in questi giorni</Label>
          {weekdays.size > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setWeekdays(new Set());
              }}
            >
              Azzera
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GIORNI.map((g) => {
            const on = weekdays.has(g.n);
            return (
              <button
                key={g.n}
                type="button"
                onClick={() => toggleWeekday(g.n)}
                aria-pressed={on}
                className={`min-w-12 rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? "border-azzurro bg-azzurro text-white"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.short}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Nessuna selezione: vale per tutti i giorni dell&rsquo;intervallo.
        </p>
      </div>

      {/* Stato */}
      <div className="mt-4">
        <Label className="!mb-2">Stato da applicare</Label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              setStatus("available");
            }}
            aria-pressed={status === "available"}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              status === "available"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            Disponibile
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setStatus("busy");
            }}
            aria-pressed={status === "busy"}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
              status === "busy"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            Occupato
          </button>
        </div>
      </div>

      {/* Orari */}
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium">Orari di questi giorni</legend>
        <div className="space-y-1.5">
          {(
            [
              ["keep", "Lascia gli orari come sono", "Cambia solo verde/rosso. Gli orari già impostati giorno per giorno restano intatti."],
              ["defaults", "Applica i turni abituali", "Copia su ogni giorno i turni che hai salvato qui sopra."],
              ["custom", "Applica una fascia oraria", "Per esempio solo 21:00–23:30, senza toccare i turni abituali."],
              ["clear", "Togli tutti gli orari", "Cancella gli orari specifici di questi giorni. Restano validi i turni abituali."],
            ] as const
          ).map(([value, titolo, spiegazione]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-2.5 rounded-md border p-2.5 transition ${
                slotMode === value
                  ? "border-azzurro bg-background"
                  : "border-border bg-background/60 hover:bg-background"
              }`}
            >
              <input
                type="radio"
                name="slot-mode"
                value={value}
                checked={slotMode === value}
                onChange={() => {
                  reset();
                  setSlotMode(value);
                }}
                className="mt-0.5 size-4 shrink-0 accent-azzurro"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{titolo}</span>
                <span className="block text-xs text-muted-foreground">
                  {spiegazione}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {slotMode === "defaults" && (
        <div className="mt-3">
          {defaultSlots.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Non hai ancora salvato nessun turno abituale. Aggiungine uno nel
              riquadro «Turni abituali» qui sopra, oppure scegli «Applica una
              fascia oraria».
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <Label className="!mb-0">Turni da applicare</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      reset();
                      setSlotIds(new Set(defaultSlots.map((s) => s.id)));
                    }}
                  >
                    Tutti
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      reset();
                      setSlotIds(new Set());
                    }}
                  >
                    Nessuno
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {defaultSlots.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={slotIds.has(s.id)}
                      onChange={() => toggleSlot(s.id)}
                      className="size-4 accent-azzurro"
                    />
                    <span className="flex-1 truncate">
                      <span className="font-medium">{s.label ?? "Turno"}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {slotMode === "custom" && (
        <div className="mt-3 space-y-2">
          {custom.map((c, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-32 flex-1">
                <Label>Nome (facoltativo)</Label>
                <Input
                  value={c.label}
                  placeholder="Secondo set"
                  onChange={(e) => {
                    reset();
                    setCustom((p) =>
                      p.map((s, j) => (j === i ? { ...s, label: e.target.value } : s))
                    );
                  }}
                />
              </div>
              <div className="w-28">
                <Label>Dalle</Label>
                <Input
                  type="time"
                  value={c.start_time}
                  onChange={(e) => {
                    reset();
                    setCustom((p) =>
                      p.map((s, j) => (j === i ? { ...s, start_time: e.target.value } : s))
                    );
                  }}
                />
              </div>
              <div className="w-28">
                <Label>Alle</Label>
                <Input
                  type="time"
                  value={c.end_time}
                  onChange={(e) => {
                    reset();
                    setCustom((p) =>
                      p.map((s, j) => (j === i ? { ...s, end_time: e.target.value } : s))
                    );
                  }}
                />
              </div>
              {custom.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Rimuovi fascia"
                  onClick={() => {
                    reset();
                    setCustom((p) => p.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {custom.length < 12 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                setCustom((p) => [...p, { label: "", start_time: "21:00", end_time: "23:30" }]);
              }}
            >
              <Plus className="size-4" /> Aggiungi fascia
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Anteprima: cosa succederà, prima che succeda */}
      {preview && (
        <div className="mt-4 rounded-md border border-azzurro/40 bg-background p-3">
          <p className="text-sm">
            {preview.applied === 0 ? (
              <>Nessun giorno da modificare.</>
            ) : (
              <>
                Stai per segnare{" "}
                <strong>
                  {preview.applied} {preview.applied === 1 ? "giorno" : "giorni"}
                </strong>{" "}
                come <strong>{status === "available" ? "disponibili" : "occupati"}</strong>{" "}
                ({riepilogoGiorni}).
              </>
            )}
          </p>
          {preview.skipped.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {preview.skipped.length}{" "}
                {preview.skipped.length === 1 ? "data verrà saltata" : "date verranno saltate"}{" "}
                perché già confermate con un organizzatore:{" "}
                {preview.skipped.map(dataBreve).join(", ")}.
              </span>
            </p>
          )}
          {preview.applied > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={applica} disabled={pending}>
                {pending ? "Applico…" : "Conferma e applica"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                disabled={pending}
              >
                Annulla
              </Button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="inline-flex items-center gap-1.5 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" aria-hidden />
            {done.applied === 0
              ? "Nessun giorno modificato."
              : `${done.applied} ${done.applied === 1 ? "giorno aggiornato" : "giorni aggiornati"}.`}
          </p>
          {done.skipped.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                {done.skipped.length === 1 ? "Saltata" : "Saltate"}{" "}
                {done.skipped.map(dataBreve).join(", ")}: {done.skipped.length === 1 ? "è" : "sono"}{" "}
                già {done.skipped.length === 1 ? "confermata" : "confermate"} con un
                organizzatore.
              </span>
            </p>
          )}
        </div>
      )}

      {!preview && (
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={anteprima} disabled={pending}>
            {pending ? "Calcolo…" : "Vedi cosa cambia"}
          </Button>
        </div>
      )}
    </div>
  );
}

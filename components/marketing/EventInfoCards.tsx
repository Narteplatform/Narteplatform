"use client";

import { useState } from "react";
import { Calendar, MapPin, Clock, Euro, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Props = {
  date: string;
  endAt: string | null;
  city: string;
  venue: string | null;
  price: number | null;
};

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Pill = {
  key: string;
  icon: React.ReactNode;
  label: string;
  detailTitle: string;
  detail: React.ReactNode;
};

export function EventInfoCards({ date, endAt, city, venue, price }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const isPast = new Date(endAt ?? date) < new Date();

  const startTime = formatTime(date);
  const endTime = endAt ? formatTime(endAt) : null;
  const orarioLabel = endTime ? `${startTime} – ${endTime}` : startTime;

  const pills: Pill[] = [
    {
      key: "date",
      icon: <Calendar className="size-4" />,
      label: formatDateShort(date),
      detailTitle: "Data",
      detail: (
        <p className="text-sm">
          {formatDateLong(date)}
          {endAt && new Date(endAt).toDateString() !== new Date(date).toDateString() && (
            <> → {formatDateLong(endAt)}</>
          )}
        </p>
      ),
    },
    {
      key: "orario",
      icon: <Clock className="size-4" />,
      label: orarioLabel,
      detailTitle: "Orario",
      detail: (
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Inizio:</span> {startTime}
          </p>
          {endTime ? (
            <p>
              <span className="text-muted-foreground">Fine:</span> {endTime}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Orario di fine non comunicato.
            </p>
          )}
        </div>
      ),
    },
    {
      key: "location",
      icon: <MapPin className="size-4" />,
      label: venue ? `${venue}, ${city}` : city,
      detailTitle: "Location",
      detail: (
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Città:</span> {city}
          </p>
          {venue && (
            <p>
              <span className="text-muted-foreground">Venue:</span> {venue}
            </p>
          )}
        </div>
      ),
    },
    ...(!isPast
      ? [
          {
            key: "price",
            icon: <Euro className="size-4" />,
            label: formatPrice(price),
            detailTitle: "Prezzo",
            detail: (
              <p className="text-sm">
                {price == null
                  ? "Prezzo non comunicato."
                  : Number(price) === 0
                    ? "Ingresso gratuito."
                    : `Biglietto a partire da € ${Number(price).toFixed(2)}`}
              </p>
            ),
          } satisfies Pill,
        ]
      : []),
  ];

  const active = pills.find((p) => p.key === open);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => {
          const isActive = open === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setOpen(isActive ? null : p.key)}
              aria-pressed={isActive}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 h-11 text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                isActive
                  ? "bg-foreground text-background border border-foreground"
                  : "border border-foreground/40 text-foreground hover:bg-foreground hover:text-background",
              ].join(" ")}
            >
              <span aria-hidden>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="relative border border-border bg-muted/40 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {active.detailTitle}
              </p>
              <div className="mt-1">{active.detail}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Chiudi dettaglio"
              className="-mr-2 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

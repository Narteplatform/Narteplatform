"use client";

import { useState } from "react";
import { Calendar, MapPin, Clock, Euro, ChevronDown } from "lucide-react";
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Card = {
  key: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  detail: React.ReactNode;
};

export function EventInfoCards({ date, endAt, city, venue, price }: Props) {
  const [open, setOpen] = useState<string | null>("date");

  const startTime = formatTime(date);
  const endTime = endAt ? formatTime(endAt) : null;
  const orarioSummary = endTime ? `${startTime} – ${endTime}` : startTime;

  const cards: Card[] = [
    {
      key: "date",
      icon: <Calendar className="size-4" />,
      title: "Data",
      summary: new Date(date).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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
      title: "Orario",
      summary: orarioSummary,
      detail: (
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Inizio:</span> {startTime}
          </p>
          {endTime && (
            <p>
              <span className="text-muted-foreground">Fine:</span> {endTime}
            </p>
          )}
          {!endTime && (
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
      title: "Location",
      summary: venue ? `${venue}, ${city}` : city,
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
    {
      key: "price",
      icon: <Euro className="size-4" />,
      title: "Prezzo",
      summary: formatPrice(price),
      detail: (
        <p className="text-sm">
          {price == null
            ? "Prezzo non comunicato."
            : price === 0
              ? "Ingresso gratuito."
              : `Biglietto a partire da € ${Number(price).toFixed(2)}`}
        </p>
      ),
    },
  ];

  return (
    <ul className="divide-y divide-border border border-border">
      {cards.map((c) => {
        const isOpen = open === c.key;
        return (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : c.key)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.title}
                  </p>
                  <p className="truncate text-sm font-medium">{c.summary}</p>
                </div>
              </div>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-border bg-muted/40 px-4 py-3">{c.detail}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

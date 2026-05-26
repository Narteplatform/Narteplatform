"use client";

import * as React from "react";
import {
  CalendarCheck2,
  ClipboardList,
  Globe2,
  ListMusic,
  Sparkles,
  Users2,
  Wrench,
} from "lucide-react";

type PersonnelMember = { name: string; role?: string };

export type BookingInformationProps = {
  bio: string | null;
  priceRange: string | null;
  gigMinMinutes: number | null;
  gigMaxMinutes: number | null;
  languages: string[];
  whatToExpect: string | null;
  aboutExtended: string | null;
  personnel: PersonnelMember[];
  setList: string | null;
  influences: string[];
  setupRequirements: string | null;
};

type TabKey =
  | "profilo"
  | "personale"
  | "setlist"
  | "influenze"
  | "requisiti";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profilo", label: "Profilo", icon: <Sparkles className="size-3.5" /> },
  { key: "personale", label: "Personale", icon: <Users2 className="size-3.5" /> },
  { key: "setlist", label: "Set list", icon: <ListMusic className="size-3.5" /> },
  { key: "influenze", label: "Influenze", icon: <Globe2 className="size-3.5" /> },
  { key: "requisiti", label: "Requisiti tecnici", icon: <Wrench className="size-3.5" /> },
];

function formatDuration(minMin: number | null, maxMin: number | null): string | null {
  if (minMin == null && maxMin == null) return null;
  if (minMin != null && maxMin != null) return `${minMin} – ${maxMin} minuti`;
  if (minMin != null) return `da ${minMin} minuti`;
  if (maxMin != null) return `fino a ${maxMin} minuti`;
  return null;
}

export function BookingInformation(props: BookingInformationProps) {
  const [active, setActive] = React.useState<TabKey>("profilo");
  const [expanded, setExpanded] = React.useState(false);

  const duration = formatDuration(props.gigMinMinutes, props.gigMaxMinutes);
  const hasAnyData =
    props.bio ||
    props.priceRange ||
    duration ||
    props.languages.length > 0 ||
    props.whatToExpect ||
    props.aboutExtended ||
    props.personnel.length > 0 ||
    props.setList ||
    props.influences.length > 0 ||
    props.setupRequirements;

  if (!hasAnyData) return null;

  return (
    <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-accent" />
        <h2 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
          Booking information
        </h2>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        className="mt-5 flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {active === "profilo" && (
          <ProfileTab
            priceRange={props.priceRange}
            duration={duration}
            languages={props.languages}
            whatToExpect={props.whatToExpect}
            about={props.aboutExtended ?? props.bio}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
        )}
        {active === "personale" && <PersonnelTab list={props.personnel} />}
        {active === "setlist" && <PreformattedTab text={props.setList} empty="Set list non ancora pubblicata." />}
        {active === "influenze" && <ChipsTab items={props.influences} empty="Nessuna influenza dichiarata." />}
        {active === "requisiti" && (
          <PreformattedTab
            text={props.setupRequirements}
            empty="Requisiti tecnici non ancora forniti."
            icon={<Wrench className="size-4 text-accent" />}
          />
        )}
      </div>
    </div>
  );
}

function ProfileTab({
  priceRange,
  duration,
  languages,
  whatToExpect,
  about,
  expanded,
  onToggle,
}: {
  priceRange: string | null;
  duration: string | null;
  languages: string[];
  whatToExpect: string | null;
  about: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const TRUNC = 380;
  const expectFull = whatToExpect ?? "";
  const needsCollapse = expectFull.length > TRUNC;
  const expectShown =
    needsCollapse && !expanded ? `${expectFull.slice(0, TRUNC).trim()}…` : expectFull;

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {/* Key facts */}
      <dl className="grid gap-3 sm:grid-cols-2">
        {priceRange && (
          <FactRow label="Fascia di prezzo" value={priceRange} />
        )}
        {languages.length > 0 && (
          <FactRow label="Lingue" value={languages.join(", ")} />
        )}
        {duration && (
          <FactRow
            label="Durata performance"
            value={duration}
            icon={<CalendarCheck2 className="size-3.5 text-accent" />}
          />
        )}
      </dl>

      {whatToExpect && (
        <section>
          <h3 className="font-display text-lg uppercase tracking-tight">
            Cosa aspettarsi
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{expectShown}</p>
          {needsCollapse && (
            <button
              type="button"
              onClick={onToggle}
              className="mt-2 text-sm font-medium text-accent hover:underline"
            >
              {expanded ? "Mostra meno" : "Mostra di più"}
            </button>
          )}
        </section>
      )}

      {about && (
        <section>
          <h3 className="font-display text-lg uppercase tracking-tight">About</h3>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{about}</p>
        </section>
      )}
    </div>
  );
}

function FactRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 inline-flex items-center gap-2 text-sm text-foreground">
        {icon}
        <span>{value}</span>
      </dd>
    </div>
  );
}

function PersonnelTab({ list }: { list: PersonnelMember[] }) {
  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">Formazione non ancora pubblicata.</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {list.map((m, i) => (
        <li
          key={`${m.name}-${i}`}
          className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
            {m.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{m.name}</p>
            {m.role && (
              <p className="truncate text-xs text-muted-foreground">{m.role}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChipsTab({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li
          key={it}
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs lowercase tracking-wide"
        >
          {it}
        </li>
      ))}
    </ul>
  );
}

function PreformattedTab({
  text,
  empty,
  icon,
}: {
  text: string | null;
  empty: string;
  icon?: React.ReactNode;
}) {
  if (!text) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {icon && <div>{icon}</div>}
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
        {text}
      </pre>
    </div>
  );
}

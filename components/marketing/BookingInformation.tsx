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

function formatDuration(minMin: number | null, maxMin: number | null): string | null {
  if (minMin == null && maxMin == null) return null;
  if (minMin != null && maxMin != null) return `${minMin} – ${maxMin} minuti`;
  if (minMin != null) return `da ${minMin} minuti`;
  if (maxMin != null) return `fino a ${maxMin} minuti`;
  return null;
}

export function BookingInformation(props: BookingInformationProps) {
  const duration = formatDuration(props.gigMinMinutes, props.gigMaxMinutes);
  const aboutText = props.aboutExtended ?? props.bio;
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
    <div className="rounded-2xl border border-palco-60 bg-white p-6 text-notte shadow-sm md:p-10">
      <div className="flex items-center gap-3">
        <ClipboardList className="size-7 text-azzurro" />
        <h2 className="display-xl text-3xl uppercase tracking-tight md:text-4xl">
          Informazioni di booking
        </h2>
      </div>

      {/* Quick facts */}
      {(props.priceRange || duration || props.languages.length > 0) && (
        <dl className="mt-7 grid gap-3 sm:grid-cols-3">
          {props.priceRange && (
            <FactRow label="Fascia di prezzo" value={props.priceRange} />
          )}
          {duration && (
            <FactRow
              label="Durata performance"
              value={duration}
              icon={<CalendarCheck2 className="size-4 text-azzurro" />}
            />
          )}
          {props.languages.length > 0 && (
            <FactRow
              label="Lingue"
              value={props.languages.join(", ")}
              icon={<Globe2 className="size-4 text-azzurro" />}
            />
          )}
        </dl>
      )}

      {/* What to expect */}
      {props.whatToExpect && (
        <Section
          title="Cosa aspettarsi"
          icon={<Sparkles className="size-5 text-azzurro" />}
        >
          <p className="whitespace-pre-wrap text-notte/75">{props.whatToExpect}</p>
        </Section>
      )}

      {/* About */}
      {aboutText && (
        <Section title="About" icon={<ClipboardList className="size-5 text-azzurro" />}>
          <p className="whitespace-pre-wrap text-notte/75">{aboutText}</p>
        </Section>
      )}

      {/* Personale */}
      {props.personnel.length > 0 && (
        <Section title="Personale" icon={<Users2 className="size-5 text-azzurro" />}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {props.personnel.map((m, i) => (
              <li
                key={`${m.name}-${i}`}
                className="flex items-start gap-3 rounded-lg border border-palco-60 bg-palco/50 p-3"
              >
                <div className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-azzurro/10 text-sm font-bold text-azzurro">
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-notte">{m.name}</p>
                  {m.role && (
                    <p className="truncate text-xs text-notte/55">{m.role}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Set list */}
      {props.setList && (
        <Section title="Set list" icon={<ListMusic className="size-5 text-azzurro" />}>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
            {props.setList}
          </pre>
        </Section>
      )}

      {/* Influenze */}
      {props.influences.length > 0 && (
        <Section title="Influenze" icon={<Globe2 className="size-5 text-azzurro" />}>
          <ul className="flex flex-wrap gap-2">
            {props.influences.map((it) => (
              <li
                key={it}
                className="rounded-full border border-palco-60 bg-palco/70 px-3 py-1 text-xs lowercase tracking-wide text-notte/80"
              >
                {it}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Requisiti tecnici */}
      {props.setupRequirements && (
        <Section
          title="Requisiti tecnici"
          icon={<Wrench className="size-5 text-azzurro" />}
        >
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
            {props.setupRequirements}
          </pre>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-palco-60 pt-6">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="font-display text-xl uppercase tracking-tight text-notte md:text-2xl">
          {title}
        </h3>
      </div>
      {children}
    </section>
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
    <div className="rounded-lg border border-palco-60 bg-palco/50 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-notte/55">
        {label}
      </dt>
      <dd className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-notte">
        {icon}
        <span>{value}</span>
      </dd>
    </div>
  );
}

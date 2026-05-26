import * as React from "react";
import { CalendarCheck2 } from "lucide-react";

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
  const hasProfile =
    props.priceRange ||
    duration ||
    props.languages.length > 0 ||
    props.whatToExpect ||
    aboutText;
  const hasAnyData =
    hasProfile ||
    props.personnel.length > 0 ||
    props.setList ||
    props.influences.length > 0 ||
    props.setupRequirements;

  if (!hasAnyData) return null;

  const nav: { id: string; label: string }[] = [];
  if (hasProfile) nav.push({ id: "booking-profilo", label: "Profilo" });
  if (props.personnel.length > 0) nav.push({ id: "booking-personale", label: "Personale" });
  if (props.setList) nav.push({ id: "booking-setlist", label: "Set list" });
  if (props.influences.length > 0) nav.push({ id: "booking-influenze", label: "Influenze" });
  if (props.setupRequirements) nav.push({ id: "booking-setup", label: "Setup tecnico" });

  return (
    <div className="rounded-2xl bg-white p-6 text-notte md:p-10">
      <div className="flex items-center gap-3">
        <CalendarCheck2 className="size-7 text-azzurro" />
        <h2 className="display-xl text-3xl uppercase tracking-tight md:text-4xl">
          Informazioni di booking
        </h2>
      </div>

      {nav.length > 1 && (
        <nav
          aria-label="Sezioni informazioni di booking"
          className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-notte/10 pb-3"
        >
          {nav.map((n, i) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={
                "text-sm font-medium transition hover:text-azzurro " +
                (i === 0 ? "text-azzurro" : "text-notte/65")
              }
            >
              {n.label}
            </a>
          ))}
        </nav>
      )}

      {hasProfile && (
        <section id="booking-profilo" className="scroll-mt-28 pt-7">
          {(props.priceRange || duration || props.languages.length > 0) && (
            <dl className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
              {props.priceRange && (
                <FactRow label="Fascia di prezzo" value={props.priceRange} />
              )}
              {duration && <FactRow label="Durata performance" value={duration} />}
              {props.languages.length > 0 && (
                <FactRow label="Lingue" value={props.languages.join(", ")} />
              )}
            </dl>
          )}

          {props.whatToExpect && (
            <SubSection title="Cosa aspettarsi">
              <p className="whitespace-pre-wrap text-notte/75">{props.whatToExpect}</p>
            </SubSection>
          )}

          {aboutText && (
            <SubSection title="About">
              <p className="whitespace-pre-wrap text-notte/75">{aboutText}</p>
            </SubSection>
          )}
        </section>
      )}

      {props.personnel.length > 0 && (
        <section id="booking-personale" className="scroll-mt-28">
          <SubSection title="Personale">
            <ul className="grid gap-2 sm:grid-cols-2">
              {props.personnel.map((m, i) => (
                <li
                  key={`${m.name}-${i}`}
                  className="flex items-start gap-3 border-b border-notte/10 py-3"
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
          </SubSection>
        </section>
      )}

      {props.setList && (
        <section id="booking-setlist" className="scroll-mt-28">
          <SubSection title="Set list">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
              {props.setList}
            </pre>
          </SubSection>
        </section>
      )}

      {props.influences.length > 0 && (
        <section id="booking-influenze" className="scroll-mt-28">
          <SubSection title="Influenze">
            <ul className="flex flex-wrap gap-2">
              {props.influences.map((it) => (
                <li
                  key={it}
                  className="rounded-full border border-notte/15 bg-white px-3 py-1 text-xs lowercase tracking-wide text-notte/80"
                >
                  {it}
                </li>
              ))}
            </ul>
          </SubSection>
        </section>
      )}

      {props.setupRequirements && (
        <section id="booking-setup" className="scroll-mt-28">
          <SubSection title="Setup tecnico">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
              {props.setupRequirements}
            </pre>
          </SubSection>
        </section>
      )}
    </div>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h3 className="font-display text-xl uppercase tracking-tight text-notte md:text-2xl">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="text-sm font-semibold text-notte">{label}:</dt>
      <dd className="text-sm text-notte/75">{value}</dd>
    </div>
  );
}

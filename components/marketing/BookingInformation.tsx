"use client";

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

type TabId = "profilo" | "personale" | "setlist" | "influenze" | "setup";

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
    !!props.priceRange ||
    !!duration ||
    props.languages.length > 0 ||
    !!props.whatToExpect ||
    !!aboutText;

  const tabs: { id: TabId; label: string }[] = [];
  if (hasProfile) tabs.push({ id: "profilo", label: "Profilo" });
  if (props.personnel.length > 0) tabs.push({ id: "personale", label: "Personale" });
  if (props.setList) tabs.push({ id: "setlist", label: "Set list" });
  if (props.influences.length > 0) tabs.push({ id: "influenze", label: "Influenze" });
  if (props.setupRequirements) tabs.push({ id: "setup", label: "Setup tecnico" });

  const [active, setActive] = React.useState<TabId | null>(tabs[0]?.id ?? null);

  if (tabs.length === 0 || !active) return null;

  return (
    <div className="rounded-2xl bg-white p-6 text-notte md:p-10">
      <div className="flex items-center gap-3">
        <CalendarCheck2 className="size-7 text-azzurro" />
        <h2 className="display-xl text-3xl uppercase tracking-tight md:text-4xl">
          Informazioni di booking
        </h2>
      </div>

      <div
        role="tablist"
        aria-label="Sezioni informazioni di booking"
        className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-notte/10 pb-3"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`booking-panel-${t.id}`}
              id={`booking-tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={
                "text-sm font-medium transition hover:text-azzurro " +
                (isActive ? "text-azzurro" : "text-notte/65")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        {active === "profilo" && hasProfile && (
          <div
            role="tabpanel"
            id="booking-panel-profilo"
            aria-labelledby="booking-tab-profilo"
          >
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
          </div>
        )}

        {active === "personale" && props.personnel.length > 0 && (
          <div
            role="tabpanel"
            id="booking-panel-personale"
            aria-labelledby="booking-tab-personale"
          >
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
          </div>
        )}

        {active === "setlist" && props.setList && (
          <div
            role="tabpanel"
            id="booking-panel-setlist"
            aria-labelledby="booking-tab-setlist"
          >
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
              {props.setList}
            </pre>
          </div>
        )}

        {active === "influenze" && props.influences.length > 0 && (
          <div
            role="tabpanel"
            id="booking-panel-influenze"
            aria-labelledby="booking-tab-influenze"
          >
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
          </div>
        )}

        {active === "setup" && props.setupRequirements && (
          <div
            role="tabpanel"
            id="booking-panel-setup"
            aria-labelledby="booking-tab-setup"
          >
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-notte/75">
              {props.setupRequirements}
            </pre>
          </div>
        )}
      </div>
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
    <div className="mt-8 first:mt-0">
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

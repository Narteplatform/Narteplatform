import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { NARTE_STATS } from "@/lib/content/stats";

/**
 * Guscio comune dei pannelli di autenticazione: foto e argomenti a sinistra,
 * campi a destra. Lo usano /login, /register, /recupero-password e
 * /reset-password.
 *
 * Le pagine condividono tutto tranne il modulo, e prima erano copie della
 * stessa impaginazione centrata — con logo, titolo e link ripetuti a mano.
 *
 * La colonna della foto esiste solo da `lg`: sotto quella soglia occuperebbe
 * mezzo schermo per non dire nulla di utile a chi deve solo digitare
 * un'email, e allontanerebbe il primo campo dal pollice. Gli argomenti però
 * non spariscono: si ripresentano in forma compatta sopra il modulo, perché
 * è lì che si decide se vale la pena iscriversi.
 */

/** Vantaggi reali della piattaforma, non promesse: ognuno corrisponde a una funzione che esiste. */
const POINTS = [
  "Profili completi: video, generi, formazione e disponibilità",
  "Richieste di booking dirette all'artista",
  "I tuoi preferiti salvati, da qualunque dispositivo",
];

export function AuthSplit({
  active,
  eyebrow,
  title,
  subtitle,
  /** Preserva la destinazione (`?next=`) quando si passa da un pannello all'altro. */
  next,
  /** I pannelli di recupero password non sono un terzo modo di entrare: niente selettore. */
  showTabs = true,
  children,
  footer,
}: {
  active: "login" | "register";
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  next?: string | null;
  showTabs?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const isSignup = active === "register" && showTabs;
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const tabs = [
    { key: "login" as const, label: "Accedi", href: `/login${q}` },
    { key: "register" as const, label: "Iscriviti", href: `/register${q}` },
  ];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* COLONNA SINISTRA — foto, argomenti, numeri */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-notte p-10 text-palco lg:flex xl:p-14">
        <Image
          src="/hero-terrazza.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover object-[center_35%] opacity-45"
          priority
        />
        {/* Doppia velatura: verticale per staccare logo e numeri dai bordi,
            orizzontale per tenere scuro il lato che confina con il modulo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-notte/80 via-notte/50 to-notte/90"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-transparent to-notte/70"
        />

        <Link href="/" aria-label="Home N'arte" className="relative z-10 inline-flex w-fit">
          <NarteLogo variant="dark" width={130} className="h-9 w-auto" priority />
        </Link>

        <div className="relative z-10">
          <h2 className="display-xl max-w-md text-balance text-4xl xl:text-5xl">
            Il palco che cercavi è a una richiesta di distanza.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-palco/85 xl:text-base">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-azzurro-light/20 text-azzurro-light">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* I numeri arrivano da lib/content/stats: cambiano lì e si propagano. */}
        <dl className="relative z-10 grid grid-cols-3 gap-4 border-t border-palco/15 pt-6">
          {NARTE_STATS.map((s) => (
            <div key={s.label}>
              <dt className="font-display text-2xl font-bold tabular-nums xl:text-3xl">
                {s.value}
              </dt>
              <dd className="mt-1 text-[11px] uppercase tracking-wider text-palco/60">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* COLONNA DESTRA — il modulo */}
      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Il logo torna qui quando la colonna di sinistra sparisce: senza,
              sotto `lg` la pagina non direbbe di che sito è. */}
          <Link href="/" aria-label="Home N'arte" className="inline-flex lg:hidden">
            <NarteLogo variant="light" width={120} className="h-8 w-auto" priority />
          </Link>

          {showTabs && (
            /* Selettore fra i due pannelli: sono due passi della stessa cosa e
               un link testuale in fondo alla pagina li faceva sembrare due
               percorsi separati. */
            <div className="mt-7 inline-flex w-full rounded-full border border-border bg-muted p-1 lg:mt-0">
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={active === t.key ? "page" : undefined}
                  className={`flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold transition-colors ${
                    active === t.key
                      ? "bg-azzurro text-white shadow-[0_2px_12px_rgba(26,107,173,0.35)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          )}

          <p className={`accent-label ${showTabs ? "mt-7" : "mt-7 lg:mt-0"}`}>{eyebrow}</p>
          {/* Stessa scala del titolo nella colonna di sinistra (`text-5xl`).
              Il carattere era già lo stesso — Space Grotesk 700 in entrambi —
              ma a 36px su fondo chiaro, e su una riga sola, sembrava un altro
              font: il corpo più grande e l'andare a capo su due righe gli
              ridanno la stessa compattezza. `text-balance` distribuisce le due
              righe invece di lasciarne una monca. */}
          <h1 className="display-xl mt-2 text-balance text-4xl md:text-5xl">{title}</h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>

          {/* Argomenti e rassicurazione servono a chi deve ancora decidere,
              quindi stanno solo sul pannello di iscrizione: a chi rientra
              interessa il campo email, non il perché. Sotto `lg` sono anche
              l'unico posto in cui quel contenuto esiste, visto che la colonna
              con la foto lì non c'è. */}
          {isSignup && (
            <ul className="mt-6 space-y-2 rounded-xl border border-border bg-muted/60 p-4 lg:hidden">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] leading-snug">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-azzurro" strokeWidth={3} />
                  <span className="text-pretty text-foreground/80">{p}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7">{children}</div>

          {/* Utenti e organizzatori non pagano nulla: i piani di N'arte
              riguardano gli artisti. */}
          {isSignup && (
            <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-azzurro" />
              Iscrizione gratuita. Nessuna carta richiesta.
            </p>
          )}

          {footer && <div className="mt-7 border-t border-border pt-6">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

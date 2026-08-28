import Link from "next/link";
import type { Metadata } from "next";

/**
 * 404 di sito.
 *
 * Prima non esisteva: le 21 chiamate a `notFound()` sparse nelle pagine
 * cadevano tutte sulla schermata grezza di Next, in inglese e senza alcuna via
 * d'uscita. Su un sito dove metà degli URL è generata da uno slug di database
 * (artisti, eventi, format, articoli), finire su un 404 è un evento normale:
 * merita una pagina che rimetta in strada.
 *
 * Non usa il layout pubblico — `app/not-found.tsx` sta sopra i route group,
 * quindi niente header e footer — e per questo si porta i propri colori invece
 * di ereditarli.
 */

export const metadata: Metadata = {
  title: "Pagina non trovata — N'arte",
  robots: { index: false, follow: true },
};

const DESTINAZIONI = [
  { href: "/eventi", label: "Eventi", desc: "Le date in arrivo e quelle passate" },
  { href: "/artisti", label: "Artisti", desc: "Il catalogo degli artisti N'arte" },
  { href: "/format", label: "Format", desc: "NaJam, NuLive, NaBand, NaCena" },
  { href: "/help", label: "Centro assistenza", desc: "Le risposte alle domande frequenti" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-notte text-palco">
      <main className="container-narte flex flex-1 flex-col justify-center py-20">
        <p className="accent-label mb-4">errore 404</p>

        <h1 className="display-xl max-w-3xl text-4xl md:text-6xl">
          Questa pagina non c&rsquo;è.
        </h1>

        <p className="mt-6 max-w-xl text-base text-palco/70 md:text-lg">
          Può darsi che l&rsquo;indirizzo sia sbagliato, o che il contenuto sia
          stato spostato. Da qui puoi ripartire.
        </p>

        <ul className="mt-12 grid max-w-3xl gap-3 sm:grid-cols-2">
          {DESTINAZIONI.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                className="group block rounded-2xl border border-palco/15 p-5 transition-colors hover:border-palco/40 hover:bg-palco/5"
              >
                <span className="font-display text-lg text-palco">{d.label}</span>
                <span className="mt-1 block text-sm text-palco/60">{d.desc}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-palco px-6 py-3 font-display text-notte transition-opacity hover:opacity-90"
          >
            Torna alla home
          </Link>
          <Link
            href="/contatti"
            className="text-palco/60 underline-offset-4 transition-colors hover:text-palco hover:underline"
          >
            Segnalaci il problema
          </Link>
        </div>
      </main>
    </div>
  );
}

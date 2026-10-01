import Link from "next/link";
import { Instagram, Facebook, Phone } from "lucide-react";
import { NarteLogo } from "@/components/layout/NarteLogo";
import { CookiePreferencesLink } from "@/components/legal/CookiePreferencesLink";
import { titolareInLinea } from "@/lib/legal/titolare";
import { LEGAL_V2_ROTTE, legalV2Pubblicato } from "@/lib/legal/v2";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-notte-60 bg-notte text-palco">
      <div className="container-narte py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <Link href="/" aria-label="Home N'Arte" className="inline-flex">
              <NarteLogo variant="dark" width={140} className="h-9 w-auto" />
            </Link>
            <p className="mt-5 text-sm text-notte-20 leading-relaxed">
              La community napoletana degli artisti emergenti. Booking professionale di live
              music dal 2018.
            </p>
            <div className="mt-6 flex items-center gap-4 text-palco">
              <a
                href="https://instagram.com/narte.official"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram N'Arte"
                className="transition-opacity hover:opacity-75"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="https://facebook.com/narteofficiall"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook N'Arte"
                className="transition-opacity hover:opacity-75"
              >
                <Facebook className="size-5" />
              </a>
              <a
                href="tel:+393335860066"
                aria-label="Chiama N'Arte"
                className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-75"
              >
                <Phone className="size-4" /> +39 333 586 0066
              </a>
            </div>
          </div>
          <div>
            <h4 className="narte-label text-notte-40">Sito</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/eventi" className="transition-opacity hover:opacity-75">Eventi</Link></li>
              <li><Link href="/artisti" className="transition-opacity hover:opacity-75">Artisti</Link></li>
              <li><Link href="/format" className="transition-opacity hover:opacity-75">Format</Link></li>
              <li><Link href="/blog" className="transition-opacity hover:opacity-75">Blog</Link></li>
              <li><Link href="/chi-siamo" className="transition-opacity hover:opacity-75">Chi siamo</Link></li>
              <li><Link href="/collaborazioni" className="transition-opacity hover:opacity-75">Collaborazioni</Link></li>
              <li><Link href="/contatti" className="transition-opacity hover:opacity-75">Contatti</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="narte-label text-notte-40">Per gli artisti</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/candidatura-artista" className="transition-opacity hover:opacity-75">Candidati</Link></li>
              <li><Link href="/prezzi" className="transition-opacity hover:opacity-75">Piani e prezzi</Link></li>
              <li><Link href="/login" className="transition-opacity hover:opacity-75">Area artista</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="narte-label text-notte-40">Aiuto</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/help" className="transition-opacity hover:opacity-75">Centro Assistenza</Link></li>
              <li><Link href="/contatti" className="transition-opacity hover:opacity-75">Contatti</Link></li>
              <li><Link href="/login" className="transition-opacity hover:opacity-75">Accedi</Link></li>
              <li><Link href="/register" className="transition-opacity hover:opacity-75">Iscriviti</Link></li>
            </ul>
          </div>
        </div>
        {/* I documenti legali stanno nella barra inferiore e non fra le colonne
            tematiche: è la convenzione che chiunque si aspetta, e sono link che
            si cercano di proposito, non si scoprono navigando. Prima non c'era
            alcun collegamento legale nel sito. */}
        {/* DATI DEL TITOLARE. Non è un adempimento formale da sbrigare in piccolo:
            è ciò che permette a chi legge di sapere con chi sta trattando, e
            senza il quale un'informativa che dice «il titolare è N'arte» non
            identifica nessuno. Denominazione, partita IVA e sede vengono da
            lib/legal/titolare.ts, lo stesso punto che alimenta i documenti: qui
            e là non possono divergere. */}
        <p className="mt-12 border-t border-notte-60 pt-6 text-xs text-notte-40">
          {titolareInLinea()}
        </p>

        <div className="mt-4 flex flex-col items-start justify-between gap-4 text-xs text-notte-40 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} N&rsquo;Arte — Tutti i diritti riservati.</span>

          <nav aria-label="Documenti legali">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <li>
                <Link href="/privacy" className="transition-opacity hover:opacity-75">
                  Privacy
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href="/cookie-policy" className="transition-opacity hover:opacity-75">
                  Cookie
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <Link href="/termini" className="transition-opacity hover:opacity-75">
                  Termini
                </Link>
              </li>
              {legalV2Pubblicato() &&
                LEGAL_V2_ROTTE.map((r) => (
                  <li key={r.slug} className="contents">
                    <span aria-hidden="true">·</span>
                    <Link href={r.href} className="transition-opacity hover:opacity-75">
                      {r.etichetta}
                    </Link>
                  </li>
                ))}
              <li aria-hidden="true">·</li>
              <li>
                {/* Il posto dove si esercitano i diritti va accanto ai documenti
                    che li descrivono: è lì che una persona li cerca. Chi non ha
                    una sessione viene mandato all'accesso e poi qui. */}
                <Link
                  href="/account/i-miei-dati"
                  className="transition-opacity hover:opacity-75"
                >
                  I miei dati
                </Link>
              </li>
              <li>
                <Link href="/recesso" className="transition-opacity hover:opacity-75">
                  Recesso
                </Link>
              </li>
              <li>
                <Link href="/segnalazioni" className="transition-opacity hover:opacity-75">
                  Segnalazioni
                </Link>
              </li>
              {/* Compare da sé quando la gestione del consenso è attiva, e
                  scompare — separatore incluso — quando non c'è nulla da
                  gestire. */}
              <CookiePreferencesLink className="transition-opacity hover:opacity-75" />
            </ul>
          </nav>

          <span>Made with passion in Napoli.</span>
        </div>
      </div>
    </footer>
  );
}

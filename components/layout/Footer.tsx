import Link from "next/link";
import { Instagram, Facebook, Phone } from "lucide-react";
import { NarteLogo } from "@/components/layout/NarteLogo";

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
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-notte-60 pt-6 text-xs text-notte-40 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} N&rsquo;Arte — Tutti i diritti riservati.</span>
          <span>Made with passion in Napoli.</span>
        </div>
      </div>
    </footer>
  );
}

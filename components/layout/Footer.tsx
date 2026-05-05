import Link from "next/link";
import { Instagram, Facebook, Phone } from "lucide-react";
import { NarteLogo } from "@/components/layout/NarteLogo";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-white/10 bg-[#080808] text-white">
      <div className="container-narte py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <Link href="/" aria-label="Home N'arte" className="inline-flex">
              <NarteLogo variant="dark" width={140} className="h-11 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-white/60">
              La tua musica dal vivo. Eventi musicali, artisti emergenti e cultura nel cuore di
              Napoli dal 2018.
            </p>
            <div className="mt-6 flex items-center gap-4 text-white/80">
              <a
                href="https://instagram.com/narte.official"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram N'arte"
                className="hover:text-accent"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="https://facebook.com/narteofficiall"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook N'arte"
                className="hover:text-accent"
              >
                <Facebook className="size-5" />
              </a>
              <a
                href="tel:+393335860066"
                aria-label="Chiama N'arte"
                className="flex items-center gap-1 text-xs hover:text-accent"
              >
                <Phone className="size-4" /> +39 333 586 0066
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/50">Sito</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/eventi" className="hover:underline">Eventi</Link></li>
              <li><Link href="/artisti" className="hover:underline">Artisti</Link></li>
              <li><Link href="/chi-siamo" className="hover:underline">Chi siamo</Link></li>
              <li><Link href="/collaborazioni" className="hover:underline">Collaborazioni</Link></li>
              <li><Link href="/contatti" className="hover:underline">Contatti</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/50">Per gli artisti</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/candidatura-artista" className="hover:underline">Candidati</Link></li>
              <li><Link href="/login" className="hover:underline">Area artista</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/50">Account</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/login" className="hover:underline">Sign in</Link></li>
              <li><Link href="/register" className="hover:underline">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} N&apos;arte — Tutti i diritti riservati.</span>
          <span>Made with passion in Napoli.</span>
        </div>
      </div>
    </footer>
  );
}

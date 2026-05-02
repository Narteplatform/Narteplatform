import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border bg-foreground text-background">
      <div className="container-narte py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <div className="font-display text-2xl leading-none">N&apos;ARTE</div>
            <p className="mt-4 text-sm text-background/70">
              Find your vibe. Eventi musicali, artisti emergenti, cultura intorno alla città.
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-background/60">Sito</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/eventi" className="hover:underline">Eventi</Link></li>
              <li><Link href="/chi-siamo" className="hover:underline">Chi siamo</Link></li>
              <li><Link href="/collaborazioni" className="hover:underline">Collaborazioni</Link></li>
              <li><Link href="/contatti" className="hover:underline">Contatti</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-background/60">Artisti</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/candidatura-artista" className="hover:underline">Sei un artista?</Link></li>
              <li><Link href="/login" className="hover:underline">Area artista</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-background/60">Account</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/login" className="hover:underline">Sign in</Link></li>
              <li><Link href="/register" className="hover:underline">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-background/20 pt-6 text-xs text-background/60 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} N&apos;arte — Tutti i diritti riservati.</span>
          <span>Made with passion in Italy.</span>
        </div>
      </div>
    </footer>
  );
}

import { Download } from "lucide-react";
import {
  BRAND_KIT_COLORI,
  BRAND_KIT_LOGHI,
  BRAND_KIT_REGOLE,
} from "@/lib/brand-kit/contenuti";

/**
 * Kit brand delle aree riservate: loghi scaricabili, colori e regole d'uso,
 * più una parte dedicata al ruolo (`html`, da lib/brand-kit/contenuti.ts).
 * Nel Centro Assistenza pubblico resta solo la versione essenziale.
 */
export function BrandKit({ intro, html }: { intro: string; html: string }) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl tracking-tight md:text-3xl">Kit brand</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intro}</p>
      </header>

      <section aria-labelledby="kit-loghi">
        <h2 id="kit-loghi" className="font-display text-lg">
          Loghi
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {BRAND_KIT_LOGHI.map((l) => (
            <li key={l.href} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div
                className={`flex h-32 items-center justify-center p-6 ${l.fondoScuro ? "bg-notte" : "bg-palco"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.href} alt={l.titolo} className="max-h-16 w-auto object-contain" />
              </div>
              <div className="space-y-2 p-4">
                <p className="text-sm font-medium">{l.titolo}</p>
                <p className="text-xs text-muted-foreground">{l.uso}</p>
                <a
                  href={l.href}
                  download
                  className="inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline"
                >
                  <Download className="size-4" aria-hidden /> Scarica PNG
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="kit-colori">
        <h2 id="kit-colori" className="font-display text-lg">
          Colori
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BRAND_KIT_COLORI.map((c) => (
            <li key={c.hex} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="h-16 border-b border-border" style={{ backgroundColor: c.hex }} />
              <div className="p-3">
                <p className="text-sm font-medium">{c.nome}</p>
                <p className="font-mono text-xs">{c.hex}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.uso}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="blog-prose max-w-3xl" dangerouslySetInnerHTML={{ __html: html + BRAND_KIT_REGOLE }} />
    </div>
  );
}

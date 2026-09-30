import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/animations/Reveal";
import { LEGAL_V2_ROTTE, legalV2Pubblicato, testoV2 } from "@/lib/legal/v2";

/**
 * Documenti legali v2: una sola rotta per condizioni-abbonamento,
 * condizioni-artisti, condizioni-organizzatori, regolamento-recensioni e
 * criteri-di-posizionamento. Gli URL pubblici arrivano tramite riscrittura
 * (next.config.ts). Con il flag `NEXT_PUBLIC_LEGAL_V2_PUBBLICATO` spento ogni
 * indirizzo risponde 404, come prima dell'introduzione.
 *
 * I segnaposto `<span class="seg">` restano visibili: non devono esistere in
 * produzione, vanno compilati prima di attivare il flag.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return LEGAL_V2_ROTTE.map((r) => ({ doc: r.slug }));
}

function documento(slug: string) {
  if (!legalV2Pubblicato()) return null;
  if (!LEGAL_V2_ROTTE.some((r) => r.slug === slug)) return null;
  return testoV2(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const d = documento(doc);
  if (!d) return { title: "Documento non trovato — N'arte" };
  const path = `/${d.slug}`;
  return {
    title: `${d.titolo} — N'arte`,
    description: d.sottotitolo,
    alternates: { canonical: path },
    openGraph: { title: d.titolo, description: d.sottotitolo, url: path },
  };
}

export default async function LegalV2Page({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const d = documento(doc);
  if (!d) notFound();

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="accent-label mb-3">documenti</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="display-xl text-4xl md:text-5xl">{d.titolo}</h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg text-muted-foreground">{d.sottotitolo}</p>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              {d.inVigoreDal ? `Testo in vigore dal ${d.inVigoreDal}` : null}
              {d.inVigoreDal ? " · " : null}
              Versione: {d.versione}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div
              className="blog-prose mt-10"
              dangerouslySetInnerHTML={{ __html: d.body }}
            />
          </Reveal>

          <Reveal delay={0.25}>
            <nav className="mt-16 border-t border-border pt-8" aria-label="Altri documenti">
              <p className="narte-label mb-4">altri documenti</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <li>
                  <Link
                    href="/termini"
                    className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Termini e condizioni
                  </Link>
                </li>
                {LEGAL_V2_ROTTE.filter((r) => r.slug !== d.slug).map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={r.href}
                      className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {r.etichetta}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>
        </div>
      </div>
    </article>
  );
}

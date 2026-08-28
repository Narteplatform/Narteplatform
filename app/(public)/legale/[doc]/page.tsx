import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { LEGAL_DOCS, findLegalDoc, iubendaUrlFor } from "@/lib/legal/content";

/**
 * Le tre pagine legali — privacy, cookie policy e termini — servite da una sola
 * rotta, perché condividono struttura e impaginazione e differiscono solo nel
 * testo.
 *
 * Le rotte pubbliche restano `/privacy`, `/cookie-policy` e `/termini`: sono
 * indirizzi che finiscono nelle informative, nei contratti e nelle email, e
 * devono essere brevi e stabili. Ci arrivano tramite riscrittura (vedi
 * `next.config.ts`), così l'URL che l'utente vede non contiene mai `/legale/`.
 *
 * QUANDO ARRIVERÀ IUBENDA: se la variabile d'ambiente del documento è
 * valorizzata, la pagina smette di mostrare la bozza locale e rimanda al
 * documento ospitato da iubenda, sempre aggiornato. Nessuna rotta cambia e
 * nessun collegamento si rompe.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  const found = findLegalDoc(doc);
  if (!found) return { title: "Documento non trovato — N'arte" };

  const path = `/${found.slug}`;
  return {
    title: `${found.title} — N'arte`,
    description: found.standfirst,
    alternates: { canonical: path },
    openGraph: { title: found.title, description: found.standfirst, url: path },
  };
}

function dataEstesa(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const documento = findLegalDoc(doc);
  if (!documento) notFound();

  const urlIubenda = iubendaUrlFor(documento.slug);

  return (
    <article className="pb-24 pt-28 md:pt-36">
      <div className="container-narte">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="accent-label mb-3">documenti</p>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="display-xl text-4xl md:text-5xl">{documento.title}</h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-5 text-lg text-muted-foreground">
              {documento.standfirst}
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              Ultimo aggiornamento: {dataEstesa(documento.updatedAt)}
            </p>
          </Reveal>

          {urlIubenda ? (
            /* Documento ospitato da iubenda: è la versione che fa fede. */
            <Reveal delay={0.2}>
              <div className="mt-10 rounded-2xl border border-border bg-muted p-6">
                <p className="text-sm text-muted-foreground">
                  Questo documento è gestito e mantenuto aggiornato tramite
                  iubenda.
                </p>
                <a
                  href={urlIubenda}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-display text-sm text-background transition-opacity hover:opacity-90"
                >
                  Leggi il documento completo
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.2}>
              {/* Avviso onesto: finché l'avvocato non ha revisionato, chi legge
                  deve sapere che sta guardando una bozza. Sparisce da solo nel
                  momento in cui i documenti passano a iubenda. */}
              <div className="mt-10 rounded-2xl border border-warning/40 bg-warning/10 p-5">
                <p className="text-sm">
                  <strong>Documento in fase di revisione legale.</strong> Il
                  testo qui sotto è una versione di lavoro: descrive fedelmente
                  come funziona la piattaforma, ma è in attesa di validazione
                  professionale. Per qualunque chiarimento{" "}
                  <Link href="/contatti" className="underline underline-offset-4">
                    scrivici
                  </Link>
                  .
                </p>
              </div>

              <div
                className="blog-prose mt-10"
                dangerouslySetInnerHTML={{ __html: documento.body }}
              />
            </Reveal>
          )}

          <Reveal delay={0.25}>
            <nav className="mt-16 border-t border-border pt-8">
              <p className="narte-label mb-4">altri documenti</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {LEGAL_DOCS.filter((d) => d.slug !== documento.slug).map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/${d.slug}`}
                      className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {d.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/help"
                    className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Centro assistenza
                  </Link>
                </li>
              </ul>
            </nav>
          </Reveal>
        </div>
      </div>
    </article>
  );
}

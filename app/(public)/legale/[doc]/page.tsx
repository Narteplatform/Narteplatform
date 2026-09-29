import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/animations/Reveal";
import {
  INTEGRAZIONI_NARTE,
  LEGAL_DOCS,
  findLegalDoc,
} from "@/lib/legal/content";
import { iubendaDocUrl } from "@/lib/legal/iubenda";
import { IubendaPolicyEmbed } from "@/components/legal/IubendaPolicyEmbed";

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
 * DUE FONTI, UNA PAGINA. Privacy e cookie policy, quando iubenda è
 * configurato, arrivano da lui: sono documenti standard che hanno valore
 * soprattutto se restano aggiornati da soli al variare della normativa e dei
 * fornitori. I TERMINI restano invece sempre locali — vedi
 * `TERMINI_SONO_LOCALI` in lib/legal/iubenda.ts per il perché.
 *
 * E sotto l'informativa di iubenda la pagina aggiunge comunque le cinque
 * descrizioni su misura di N'arte, che il suo catalogo non contiene e che il
 * piano Essentials non permette di inserire come clausole personalizzate.
 * Senza quella sezione, il giorno in cui iubenda si accende l'informativa
 * smetterebbe di descrivere la metà delle cose che accadono davvero qui.
 *
 * Nessuna rotta cambia in nessuno dei due casi, e nessun collegamento si rompe.
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

  // I termini non passano da iubenda: la stringa resta vuota e si mostra sempre
  // il documento locale.
  const urlIubenda =
    documento.slug === "termini" ? "" : iubendaDocUrl(documento.slug);

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
            <Reveal delay={0.2}>
              <IubendaPolicyEmbed
                doc={documento.slug === "privacy" ? "privacy" : "cookie-policy"}
                titolo={documento.title}
              />

              {/* Le cinque descrizioni che il catalogo di iubenda non copre.
                  Restano sulla nostra pagina, sotto il documento generato, e
                  sono indicate come parte dell'informativa e non come una nota
                  a margine: sono trattamenti, non commenti. */}
              {documento.slug === "privacy" && (
                <section className="mt-12 border-t border-border pt-10">
                  <p className="narte-label mb-4">
                    integrazione specifica di N&rsquo;arte
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quanto segue fa parte dell&rsquo;informativa a tutti gli
                    effetti. Riguarda trattamenti propri di questa piattaforma,
                    che un documento generato da un catalogo standard non
                    descrive.
                  </p>
                  <div
                    className="blog-prose mt-8"
                    dangerouslySetInnerHTML={{ __html: INTEGRAZIONI_NARTE }}
                  />
                </section>
              )}
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

import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { heroImageFor } from "@/lib/content/hero-images";
import { FormatInterestForm } from "@/components/marketing/FormatInterestForm";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Format — N'arte",
  description:
    "I format N'arte: contenitori di musica live curati per club, festival e brand. Scopri come portare un format N'arte nel tuo evento.",
  alternates: { canonical: "/format" },
};

export const dynamic = "force-dynamic";

/**
 * Colori delle card, assegnati ciclicamente su order_index: un format nuovo
 * prende il colore successivo. Non sono token del design system perché sono
 * identità dei singoli format, non ruoli semantici.
 */
const CARD_GRADIENTS = [
  "bg-[linear-gradient(160deg,#4a7fb5_0%,#2c5c8f_100%)]",
  "bg-[linear-gradient(160deg,#5395cf_0%,#3d7ab5_100%)]",
  "bg-[linear-gradient(160deg,#1c3049_0%,#0d1b2a_100%)]",
  "bg-[linear-gradient(160deg,#dc5a2e_0%,#b8431f_100%)]",
] as const;

type FormatRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  icon: string | null;
  order_index: number;
};

async function getFormats(): Promise<FormatRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("formats")
    .select("id, slug, title, tagline, description, cover_image, icon, order_index")
    .eq("published", true)
    .order("order_index", { ascending: true });
  return (data ?? []) as unknown as FormatRow[];
}

export default async function FormatPage() {
  const formats = await getFormats();

  return (
    <>
      <PageHero
        image={heroImageFor("format")}
        label="format"
        title="I format"
        description={
          <>
            Contenitori di musica live curati da N&rsquo;arte: format pensati per club,
            festival e brand che vogliono offrire al pubblico un&rsquo;esperienza riconoscibile
            e di qualità.
          </>
        }
      />

      <section className="container-narte py-16 md:py-24">
        {formats.length === 0 ? (
          <Reveal>
            <p className="text-center text-muted-foreground">
              Nessun format disponibile al momento.
            </p>
          </Reveal>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {formats.map((f, i) => (
              <Reveal key={f.id} delay={i * 0.08}>
                <Link
                  href={`/format/${f.slug}`}
                  className={cn(
                    "group flex aspect-[4/5] flex-col justify-end rounded-3xl p-8 text-palco transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                    CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                  )}
                >
                  <h2 className="font-display text-4xl leading-none">{f.title}</h2>
                  {f.description && (
                    <p className="mt-4 text-base leading-relaxed text-palco/85 line-clamp-4">
                      {f.description}
                    </p>
                  )}
                  <hr className="mt-6 border-palco/25" />
                  {f.tagline && <p className="mt-4 text-sm text-palco">{f.tagline}</p>}
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {/* #17 — Form interesse format */}
        <Reveal delay={0.2}>
          <div className="mt-24">
            <FormatInterestForm />
          </div>
        </Reveal>
      </section>
    </>
  );
}

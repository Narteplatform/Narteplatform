import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { FormatInterestForm } from "@/components/marketing/FormatInterestForm";

export const metadata: Metadata = {
  title: "Format — N'arte",
  description:
    "I format N'arte: contenitori di musica live curati per club, festival e brand. Scopri come portare un format N'arte nel tuo evento.",
  alternates: { canonical: "/format" },
};

export const dynamic = "force-dynamic";

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
    <div className="bg-background pt-32 pb-24">
      <section className="container-narte">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Format
          </span>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
            I format N&apos;arte
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Contenitori di musica live curati da N&apos;arte: format pensati per club,
            festival e brand che vogliono offrire al pubblico un&apos;esperienza riconoscibile
            e di qualità.
          </p>
        </Reveal>

        {formats.length === 0 ? (
          <Reveal delay={0.1}>
            <p className="mt-16 text-center text-muted-foreground">
              Nessun format disponibile al momento.
            </p>
          </Reveal>
        ) : (
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {formats.map((f, i) => (
              <Reveal key={f.id} delay={i * 0.08}>
                <Link
                  href={`/format/${f.slug}`}
                  className="card-lift group flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {f.cover_image ? (
                    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.cover_image}
                        alt={f.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <span className="font-display text-xl uppercase">
                        {f.icon ?? f.title.slice(0, 1)}
                      </span>
                    </div>
                  )}
                  <div>
                    {f.tagline && (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {f.tagline}
                      </p>
                    )}
                    <h2 className="mt-2 font-display text-2xl leading-tight group-hover:text-accent">
                      {f.title}
                    </h2>
                  </div>
                  {f.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {f.description}
                    </p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                    Scopri <ArrowRight className="size-3.5" />
                  </span>
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
    </div>
  );
}

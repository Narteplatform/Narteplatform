import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { EventMediaGallery } from "@/components/marketing/EventMediaGallery";

export const dynamic = "force-dynamic";

type FormatRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image: string | null;
  gallery: string[] | null;
  videos: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
};

async function getFormat(slug: string): Promise<FormatRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("formats")
    .select(
      "id, slug, title, tagline, description, cover_image, gallery, videos, seo_title, seo_description"
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data as unknown as FormatRow | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const format = await getFormat(slug);
  if (!format) return { title: "Format non trovato — N'arte" };
  const title = format.seo_title || `${format.title} | N'arte`;
  const description = format.seo_description || format.tagline || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/format/${format.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: format.cover_image ? [{ url: format.cover_image }] : undefined,
    },
  };
}

export default async function FormatDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const format = await getFormat(slug);
  if (!format) notFound();

  const gallery = Array.isArray(format.gallery) ? format.gallery : [];
  const videos = Array.isArray(format.videos) ? format.videos : [];
  const hasMedia = gallery.length > 0 || videos.length > 0;

  return (
    <article>
      {/* HERO: cover sx + titolo dx */}
      <section className="relative overflow-hidden border-b border-border pt-28 pb-16 md:pt-36 md:pb-20">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 grid items-start gap-8 md:grid-cols-2 md:gap-10 lg:gap-14">
          {/* Cover portrait */}
          {format.cover_image && (
            <Reveal>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-muted md:sticky md:top-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={format.cover_image}
                  alt={format.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </Reveal>
          )}

          {/* Info column */}
          <div className={`flex flex-col ${!format.cover_image ? "md:col-span-2 max-w-3xl" : ""}`}>
            <Reveal>
              <Link
                href="/format"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-accent"
              >
                <ArrowLeft className="size-3.5" /> Tutti i format
              </Link>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Format
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl lg:text-6xl">
                {format.title}
              </h1>
            </Reveal>
            {format.tagline && (
              <Reveal delay={0.15}>
                <p className="mt-5 text-lg text-muted-foreground md:text-xl">
                  {format.tagline}
                </p>
              </Reveal>
            )}
            {format.description && (
              <Reveal delay={0.2}>
                <div className="mt-8 rounded-2xl border border-border bg-muted p-5 md:p-6">
                  <p className="accent-label mb-3">descrizione</p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground md:text-base">
                    {format.description}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* GALLERY + VIDEO */}
      {hasMedia && (
        <section className="bg-muted py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">galleria</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Foto e video.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8">
                <EventMediaGallery gallery={gallery} videos={videos} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <div className="container-narte py-10">
        <Link
          href="/format"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Torna a tutti i format
        </Link>
      </div>
    </article>
  );
}

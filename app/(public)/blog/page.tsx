import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";

export const metadata: Metadata = {
  title: "Blog — N'arte",
  description:
    "Approfondimenti, guide e storie dalla scena musicale live italiana. Booking, format, artisti emergenti.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog N'arte",
    description: "Storie e guide sulla scena musicale live emergente in Italia.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string;
  published_at: string;
};

export default async function BlogIndexPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, author_name, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  const posts = (data ?? []) as unknown as Post[];

  return (
    <>
      <PageHero
        label="blog"
        title="Blog"
        description={
          <>
            Consigli pratici per organizzatori, ritratti di artisti emergenti e
            approfondimenti sui format musicali N&rsquo;arte.
          </>
        }
      />

      <section className="container-narte py-16 md:py-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground">
              Nessun articolo pubblicato al momento.
            </p>
          ) : (
            posts.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.05}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-accent"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {p.cover_image ? (
                      <Image
                        src={p.cover_image}
                        alt={p.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-2xl text-muted-foreground">
                        N&rsquo;arte
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <time className="text-xs uppercase tracking-wider text-muted-foreground">
                      {new Date(p.published_at).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                    <h2 className="font-display text-xl leading-tight transition-colors group-hover:text-accent">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                    )}
                    <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-accent">
                      Leggi l&rsquo;articolo →
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))
          )}
        </div>
      </section>
    </>
  );
}

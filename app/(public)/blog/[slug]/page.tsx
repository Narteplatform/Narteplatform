import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { ReadingProgress } from "@/components/blog/ReadingProgress";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  author_name: string;
  published_at: string;
  updated_at: string;
};

type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string;
  published_at: string;
};

async function getPost(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, cover_image, content, seo_title, seo_description, author_name, published_at, updated_at"
    )
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  return data as unknown as Post | null;
}

async function getRelatedPosts(currentId: string): Promise<PostCard[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, author_name, published_at")
    .not("published_at", "is", null)
    .neq("id", currentId)
    .order("published_at", { ascending: false })
    .limit(3);
  return (data ?? []) as unknown as PostCard[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Articolo non trovato — N'arte" };
  const title = post.seo_title || `${post.title} | N'arte`;
  const description = post.seo_description || post.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
    twitter: {
      card: post.cover_image ? "summary_large_image" : "summary",
      title,
      description,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const relatedPosts = await getRelatedPosts(post.id);

  const publishedDate = new Date(post.published_at);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image ? [post.cover_image] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: "N'arte",
    },
  };

  return (
    <article className="bg-background pt-28 pb-24">
      {/* #19 — Barra di avanzamento lettura */}
      <ReadingProgress />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="container-narte">
        <Reveal>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-accent"
          >
            <ArrowLeft className="size-3.5" /> Torna al blog
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {publishedDate.toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            <span className="mx-2 text-border">·</span>
            {post.author_name}
          </p>
          <h1 className="mt-4 font-display text-4xl uppercase leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">{post.excerpt}</p>
          )}
        </Reveal>
      </header>

      {post.cover_image && (
        <Reveal delay={0.08}>
          <div className="container-narte mt-12">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                priority
                sizes="(min-width: 1200px) 1200px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.12}>
        <div className="container-narte mt-16 max-w-3xl">
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </Reveal>

      {/* #20 — Articoli correlati */}
      {relatedPosts.length > 0 && (
        <section className="container-narte mt-24">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Continua a leggere
            </span>
            <h2 className="mt-3 font-display text-3xl uppercase leading-tight tracking-tight md:text-4xl">
              Articoli correlati
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((p, i) => (
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
                        N&apos;arte
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
                    <h3 className="font-display text-xl uppercase leading-tight tracking-tight transition-colors group-hover:text-accent">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                    )}
                    <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-accent">
                      Leggi l&apos;articolo →
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

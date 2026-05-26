import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";

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

      <Reveal delay={0.2}>
        <div className="container-narte mt-20 max-w-3xl">
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-8 text-center">
            <h2 className="font-display text-2xl uppercase tracking-tight">
              Trova l&apos;artista per il tuo prossimo evento
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Esplora gli artisti emergenti N&apos;arte e invia la tua richiesta in pochi click.
            </p>
            <Link
              href="/artisti"
              className="mt-5 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-90"
            >
              Sfoglia gli artisti
            </Link>
          </div>
        </div>
      </Reveal>
    </article>
  );
}

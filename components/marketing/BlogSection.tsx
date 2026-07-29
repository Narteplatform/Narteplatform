import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { createAdminClient } from "@/lib/supabase/server";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string;
  published_at: string;
};

async function getPosts(limit = 4): Promise<Post[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image, author_name, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as unknown as Post[];
  } catch (err) {
    console.error("[BlogSection] blog_posts fetch error", err);
    return [];
  }
}

export async function BlogSection() {
  const posts = await getPosts();
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-border bg-background py-20 md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">blog</p>
        </Reveal>
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-4xl md:text-6xl">Il magazine N&rsquo;arte</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              Racconti, interviste e retroscena dal mondo N&rsquo;arte.
            </p>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.25}>
        <div className="container-narte px-0 md:px-6">
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 md:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {posts.map((p) => (
              <article
                key={p.id}
                className="group relative flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] sm:w-[360px]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-notte-80">
                  {p.cover_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.cover_image}
                      alt={p.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center font-display text-2xl text-palco/25">
                      N&rsquo;arte
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-notte via-notte/20 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-notte/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-palco backdrop-blur-sm">
                    {p.author_name ||
                      new Date(p.published_at).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-lg leading-tight md:text-xl">{p.title}</h3>
                  {p.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
                  )}
                  <Link
                    href={`/blog/${p.slug}`}
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
                  >
                    Leggi l&rsquo;articolo <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="container-narte mt-10">
        <Reveal delay={0.3}>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition hover:gap-2.5"
          >
            Tutti gli articoli <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

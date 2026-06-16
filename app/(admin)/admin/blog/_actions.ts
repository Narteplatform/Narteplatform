"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatContentToSeoHtml, deriveSeoMeta } from "@/lib/blog/seo-format";

async function ensureSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "superadmin") {
    return { ok: false as const, error: "Permessi insufficienti" };
  }
  return { ok: true as const };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const postSchema = z.object({
  title: z.string().trim().min(3, "Titolo troppo corto").max(160),
  slug: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  excerpt: z.string().trim().max(400).optional().or(z.literal("").transform(() => undefined)),
  coverImage: z.string().url("URL non valido").optional().or(z.literal("").transform(() => undefined)),
  content: z.string().min(20, "Contenuto troppo breve"),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("").transform(() => undefined)),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("").transform(() => undefined)),
  authorName: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  publish: z.boolean().optional(),
});

export type BlogPostInput = z.infer<typeof postSchema>;

/**
 * Prepara contenuto e meta SEO senza mai alterare le parole:
 * - se il contenuto è testo semplice viene formattato in HTML (idempotente:
 *   formatContentToSeoHtml restituisce l'input invariato se è già HTML).
 * - se seo_title/seo_description mancano vengono derivati da titolo + testo.
 */
function buildSeoFields(d: {
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
}): { content: string; seoTitle: string; seoDescription: string } {
  const content = formatContentToSeoHtml(d.content);
  const derived = deriveSeoMeta(d.title, content);
  return {
    content,
    seoTitle: d.seoTitle?.trim() ? d.seoTitle.trim() : derived.seoTitle,
    seoDescription: d.seoDescription?.trim() ? d.seoDescription.trim() : derived.seoDescription,
  };
}

export async function createBlogPost(input: BlogPostInput) {
  const ctx = await ensureSuperadmin();
  if (!ctx.ok) return ctx;
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const baseSlug = d.slug || slugify(d.title);
  if (!baseSlug) return { ok: false as const, error: "Slug non valido" };

  const admin = createAdminClient();
  // Ensure unique slug
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const { data: ex } = await admin.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (!ex) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const seo = buildSeoFields(d);
  const { data, error } = await admin
    .from("blog_posts")
    .insert({
      slug,
      title: d.title,
      excerpt: d.excerpt ?? null,
      cover_image: d.coverImage ?? null,
      content: seo.content,
      seo_title: seo.seoTitle,
      seo_description: seo.seoDescription,
      author_name: d.authorName || "N'arte",
      published_at: d.publish ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  return { ok: true as const, id: (data as { id: string } | null)?.id ?? null };
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  const ctx = await ensureSuperadmin();
  if (!ctx.ok) return ctx;
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("blog_posts")
    .select("slug, published_at")
    .eq("id", id)
    .maybeSingle();
  const existingRow = existing as { slug: string; published_at: string | null } | null;
  if (!existingRow) return { ok: false as const, error: "Articolo non trovato" };

  let nextSlug = existingRow.slug;
  if (d.slug && d.slug !== existingRow.slug) {
    let candidate = slugify(d.slug);
    let n = 1;
    while (true) {
      const { data: ex } = await admin
        .from("blog_posts")
        .select("id")
        .eq("slug", candidate)
        .neq("id", id)
        .maybeSingle();
      if (!ex) break;
      n += 1;
      candidate = `${slugify(d.slug)}-${n}`;
    }
    nextSlug = candidate;
  }

  // Toggle publish state: if d.publish true and not yet published, set now. If false, set null.
  let published_at: string | null = existingRow.published_at;
  if (d.publish === true && !existingRow.published_at) {
    published_at = new Date().toISOString();
  } else if (d.publish === false) {
    published_at = null;
  }

  const seo = buildSeoFields(d);
  const { error } = await admin
    .from("blog_posts")
    .update({
      slug: nextSlug,
      title: d.title,
      excerpt: d.excerpt ?? null,
      cover_image: d.coverImage ?? null,
      content: seo.content,
      seo_title: seo.seoTitle,
      seo_description: seo.seoDescription,
      author_name: d.authorName || "N'arte",
      published_at,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${id}`);
  revalidatePath("/blog");
  revalidatePath(`/blog/${nextSlug}`);
  if (existingRow.slug !== nextSlug) revalidatePath(`/blog/${existingRow.slug}`);
  return { ok: true as const };
}

export async function deleteBlogPost(id: string) {
  const ctx = await ensureSuperadmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("blog_posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  const { error } = await admin.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (existing && (existing as { slug: string }).slug) {
    revalidatePath(`/blog/${(existing as { slug: string }).slug}`);
  }
  redirect("/admin/blog");
}

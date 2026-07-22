"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { deriveFullSeo } from "@/lib/blog/seo-format";
import {
  createBlogPost,
  updateBlogPost,
} from "@/app/(admin)/admin/blog/_actions";

type Initial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[] | null;
  ogImage: string | null;
  authorName: string;
  publishedAt: string | null;
};

export function BlogPostForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    coverImage: initial?.coverImage ?? "",
    content: initial?.content ?? "",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
    keywords: initial?.keywords ?? [],
    ogImage: initial?.ogImage ?? "",
    authorName: initial?.authorName ?? "N'arte",
    publish: Boolean(initial?.publishedAt),
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Auto-compila i parametri SEO (deterministico) e li applica live nel form. */
  function autofillSeo() {
    const res = deriveFullSeo(form.title, form.content, form.coverImage);
    setForm((f) => ({
      ...f,
      // Lo slug si compila solo se vuoto: riscriverlo romperebbe URL pubblicati.
      slug: f.slug.trim() ? f.slug : res.slug,
      excerpt: res.excerpt,
      seoTitle: res.seoTitle,
      seoDescription: res.seoDescription,
      keywords: res.keywords,
      ogImage: f.ogImage.trim() ? f.ogImage : res.ogImage ?? "",
    }));
  }

  function addKeyword(raw: string) {
    const v = raw.trim();
    if (!v) return;
    setForm((f) => (f.keywords.includes(v) ? f : { ...f, keywords: [...f.keywords, v] }));
  }
  function removeKeyword(k: string) {
    setForm((f) => ({ ...f, keywords: f.keywords.filter((x) => x !== k) }));
  }
  function onKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(e.currentTarget.value);
      e.currentTarget.value = "";
    }
  }

  function submit() {
    setError(null);
    if (form.title.trim().length < 3) {
      setError("Titolo troppo corto.");
      return;
    }
    if (form.content.replace(/<[^>]*>/g, "").trim().length < 20) {
      setError("Contenuto troppo breve.");
      return;
    }
    start(async () => {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        coverImage: form.coverImage.trim() || undefined,
        content: form.content,
        seoTitle: form.seoTitle.trim() || undefined,
        seoDescription: form.seoDescription.trim() || undefined,
        keywords: form.keywords.length ? form.keywords : undefined,
        ogImage: form.ogImage.trim() || undefined,
        authorName: form.authorName.trim() || undefined,
        publish: form.publish,
      };
      const res = initial?.id
        ? await updateBlogPost(initial.id, payload)
        : await createBlogPost(payload);
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      if (!initial?.id && "id" in res && res.id) {
        router.push(`/admin/blog/${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titolo">
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </Field>
        <Field label="Slug (URL)" hint="Lascia vuoto per generarlo dal titolo">
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="es. come-organizzare-evento"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-mono"
          />
        </Field>
      </div>

      <Field label="Excerpt (riassunto breve)" hint="Mostrato in lista blog e meta description fallback">
        <textarea
          value={form.excerpt}
          onChange={(e) => update("excerpt", e.target.value)}
          rows={2}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </Field>

      <ImageUpload
        label="Cover image"
        value={form.coverImage}
        onChange={(url) => update("coverImage", url)}
        kind="blog"
      />

      <div>
        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contenuto
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={autofillSeo}
          >
            Auto-compila SEO
          </Button>
        </div>
        <RichTextEditor
          value={form.content}
          onChange={(html) => update("content", html)}
        />
      </div>

      <details className="rounded-md border border-border bg-muted/40 p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">SEO (avanzate)</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="SEO Title (override)">
            <input
              value={form.seoTitle}
              onChange={(e) => update("seoTitle", e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Autore">
            <input
              value={form.authorName}
              onChange={(e) => update("authorName", e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="SEO Description (override)" className="md:col-span-2">
            <textarea
              value={form.seoDescription}
              onChange={(e) => update("seoDescription", e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Parole chiave (keywords)" className="md:col-span-2" hint="Invio o virgola per aggiungere">
            <div className="flex flex-wrap gap-2">
              {form.keywords.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Nessuna keyword. Usa &quot;Auto-compila SEO&quot; o aggiungile qui sotto.
                </span>
              )}
              {form.keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs"
                >
                  {k}
                  <button
                    type="button"
                    onClick={() => removeKeyword(k)}
                    aria-label={`Rimuovi ${k}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Aggiungi keyword…"
              onKeyDown={onKeywordKeyDown}
              className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </Field>
          <div className="md:col-span-2">
            <ImageUpload
              label="OG image (social) — opzionale, fallback alla cover"
              value={form.ogImage}
              onChange={(url) => update("ogImage", url)}
              kind="blog"
            />
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.publish}
          onChange={(e) => update("publish", e.target.checked)}
        />
        <span>{form.publish ? "Pubblicato" : "Bozza"} — spunta per pubblicare</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? "Salvataggio..." : initial?.id ? "Salva modifiche" : "Crea articolo"}
      </Button>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

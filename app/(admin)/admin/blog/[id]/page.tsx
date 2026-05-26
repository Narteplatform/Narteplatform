import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { DeleteBlogPostButton } from "@/components/admin/DeleteBlogPostButton";

export const metadata = { title: "Modifica articolo — N'arte Admin" };
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
  published_at: string | null;
};

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, cover_image, content, seo_title, seo_description, author_name, published_at"
    )
    .eq("id", id)
    .maybeSingle();
  const post = data as unknown as Post | null;
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli articoli
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">{post.title}</h1>
        <DeleteBlogPostButton id={post.id} title={post.title} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenuto</CardTitle>
        </CardHeader>
        <CardContent>
          <BlogPostForm
            initial={{
              id: post.id,
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              coverImage: post.cover_image,
              content: post.content,
              seoTitle: post.seo_title,
              seoDescription: post.seo_description,
              authorName: post.author_name,
              publishedAt: post.published_at,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

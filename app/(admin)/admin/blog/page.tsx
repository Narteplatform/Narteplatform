import Link from "next/link";
import { Plus, Eye, EyeOff } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Blog — N'arte Admin" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
  updated_at: string;
};

export default async function AdminBlogPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blog_posts")
    .select("id, title, slug, published_at, updated_at")
    .order("updated_at", { ascending: false });
  const posts = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Articoli del blog pubblico N&apos;arte.
          </p>
        </div>
        <Button asChild variant="accent" size="sm">
          <Link href="/admin/blog/new">
            <Plus className="size-4" /> Nuovo articolo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {posts.length} {posts.length === 1 ? "articolo" : "articoli"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun articolo. Creane uno per iniziare.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {posts.map((p) => {
                const published = Boolean(p.published_at);
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/blog/${p.id}`}
                        className="font-display text-base hover:text-accent"
                      >
                        {p.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        /blog/{p.slug}
                        <span className="mx-2">·</span>
                        Aggiornato il{" "}
                        {new Date(p.updated_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant={published ? "success" : "muted"} dot>
                      {published ? (
                        <>
                          <Eye className="size-3" /> Pubblicato
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3" /> Bozza
                        </>
                      )}
                    </Badge>
                    {published && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/blog/${p.slug}`} target="_blank">
                          Apri
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/blog/${p.id}`}>Modifica</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

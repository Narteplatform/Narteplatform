import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Image as ImageIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { FormatForm } from "@/components/forms/FormatForm";
import { DeleteFormatButton } from "@/components/forms/DeleteFormatButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function EditFormatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: fmt } = await supabase.from("formats").select("*").eq("id", id).single();
  if (!fmt) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/format"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti i format
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {fmt.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fmt.cover_image} alt={fmt.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  {fmt.icon ? (
                    <span className="text-3xl">{fmt.icon}</span>
                  ) : (
                    <ImageIcon className="size-6" />
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight">{fmt.title}</h1>
              {fmt.tagline && (
                <p className="mt-1 text-sm text-muted-foreground">{fmt.tagline}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="muted">Ordine {fmt.order_index}</Badge>
                {fmt.published ? (
                  <Badge variant="success" dot>
                    Pubblicato
                  </Badge>
                ) : (
                  <Badge variant="muted">Bozza</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/format/${fmt.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Pagina pubblica
              </Link>
            </Button>
            <DeleteFormatButton id={fmt.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modifica format</CardTitle>
        </CardHeader>
        <CardContent>
          <FormatForm
            defaultValues={{
              title: fmt.title,
              tagline: fmt.tagline ?? "",
              description: fmt.description ?? "",
              icon: fmt.icon ?? "",
              order_index: fmt.order_index?.toString() ?? "0",
              cover_image: fmt.cover_image ?? "",
              gallery: fmt.gallery ?? [],
              videos: fmt.videos ?? [],
              seo_title: fmt.seo_title ?? "",
              seo_description: fmt.seo_description ?? "",
              published: fmt.published ?? true,
            }}
            formatId={fmt.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

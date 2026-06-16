import Link from "next/link";
import { ExternalLink, Image as ImageIcon, Pencil, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export const dynamic = "force-dynamic";

export default async function AdminFormatPage() {
  const supabase = createAdminClient();
  const { data: formats } = await supabase
    .from("formats")
    .select("id, slug, title, tagline, icon, order_index, published, cover_image")
    .order("order_index", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Format</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci i format musicali della piattaforma.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/format/nuovo">
            <Plus className="size-4" /> Nuovo format
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Lista format</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Format</TableHead>
                <TableHead>Ordine</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(formats ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nessun format trovato.{" "}
                    <Link href="/admin/format/nuovo" className="underline">
                      Crea il primo format
                    </Link>
                    .
                  </TableCell>
                </TableRow>
              ) : (
                (formats ?? []).map((fmt) => (
                  <TableRow key={fmt.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                          {fmt.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={fmt.cover_image}
                              alt={fmt.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              {fmt.icon ? (
                                <span className="text-lg">{fmt.icon}</span>
                              ) : (
                                <ImageIcon className="size-4" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground line-clamp-1">{fmt.title}</p>
                          <p className="text-xs text-muted-foreground">/format/{fmt.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmt.order_index}</TableCell>
                    <TableCell>
                      {fmt.published ? (
                        <Badge variant="success" dot>
                          Pubblicato
                        </Badge>
                      ) : (
                        <Badge variant="muted">Bozza</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton aria-label="Modifica format" variant="ghost" size="sm" asChild>
                          <Link href={`/admin/format/${fmt.id}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton aria-label="Apri format pubblico" variant="ghost" size="sm" asChild>
                          <Link href={`/format/${fmt.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" />
                          </Link>
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

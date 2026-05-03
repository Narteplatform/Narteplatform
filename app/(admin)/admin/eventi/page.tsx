import Link from "next/link";
import { ExternalLink, Image as ImageIcon, Pencil, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { cn, formatEventDate } from "@/lib/utils";

type Filter = "all" | "upcoming" | "past" | "featured";

const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "upcoming", label: "Prossimi" },
  { value: "past", label: "Passati" },
  { value: "featured", label: "In primo piano" },
];

export const dynamic = "force-dynamic";

export default async function AdminEventiPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: Filter = (TABS.find((t) => t.value === params.filter)?.value ?? "all") as Filter;
  const q = (params.q ?? "").trim().toLowerCase();

  const supabase = createAdminClient();
  let query = supabase
    .from("events")
    .select("id, slug, title, category, date, city, featured, cover_image")
    .order("date", { ascending: false });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  if (filter === "upcoming") query = query.gte("date", todayIso);
  else if (filter === "past") query = query.lt("date", todayIso);
  else if (filter === "featured") query = query.eq("featured", true);

  const { data: events } = await query;
  const filtered = (events ?? []).filter((e) =>
    q ? `${e.title} ${e.city} ${e.category}`.toLowerCase().includes(q) : true
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Eventi</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci tutti gli eventi pubblicati sul sito.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/eventi/new">
            <Plus className="size-4" /> Nuovo evento
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader className="flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Lista eventi</CardTitle>
          <form action="/admin/eventi" className="flex w-full max-w-sm items-center gap-2">
            <input type="hidden" name="filter" value={filter} />
            <SearchInput
              name="q"
              defaultValue={q}
              placeholder="Cerca per titolo, città, categoria…"
              variant="compact"
            />
          </form>
        </CardHeader>

        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1">
            {TABS.map((tab) => {
              const params = new URLSearchParams();
              if (tab.value !== "all") params.set("filter", tab.value);
              if (q) params.set("q", q);
              const href = `/admin/eventi${params.size > 0 ? `?${params}` : ""}`;
              const active = filter === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Evento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Città</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nessun evento trovato.{" "}
                    <Link href="/admin/eventi/new" className="underline">
                      Crea il primo evento
                    </Link>
                    .
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((event) => {
                  const past = new Date(event.date) < today;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                            {event.cover_image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={event.cover_image}
                                alt={event.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground line-clamp-1">{event.title}</p>
                            <p className="text-xs text-muted-foreground">/eventi/{event.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{event.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatEventDate(event.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{event.city}</TableCell>
                      <TableCell>
                        {event.featured ? (
                          <Badge variant="accent" dot>
                            In primo piano
                          </Badge>
                        ) : past ? (
                          <Badge variant="muted">Concluso</Badge>
                        ) : (
                          <Badge variant="success" dot>
                            Pubblicato
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton aria-label="Modifica evento" variant="ghost" size="sm" asChild>
                            <Link href={`/admin/eventi/${event.id}`}>
                              <Pencil className="size-4" />
                            </Link>
                          </IconButton>
                          <IconButton aria-label="Apri evento pubblico" variant="ghost" size="sm" asChild>
                            <Link href={`/eventi/${event.slug}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                            </Link>
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ExternalLink, Pencil, Plus, UserPlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { ApplicationActions } from "@/components/admin/ApplicationActions";
import { DeleteArtistButton } from "@/components/admin/DeleteArtistButton";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { cn } from "@/lib/utils";

type Filter = "all" | "approved" | "pending" | "rejected";

const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "approved", label: "Approvati" },
  { value: "pending", label: "In attesa" },
  { value: "rejected", label: "Rifiutati" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approvato",
  pending: "In attesa",
  rejected: "Rifiutato",
};

export const dynamic = "force-dynamic";

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: Filter = (TABS.find((t) => t.value === params.filter)?.value ?? "all") as Filter;
  const q = (params.q ?? "").trim().toLowerCase();

  const supabase = createAdminClient();
  const [{ data: applications }, { data: artists }] = await Promise.all([
    supabase
      .from("artist_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("artists")
      .select("id, slug, stage_name, status, city, cover_image, genre")
      .order("stage_name"),
  ]);

  const filteredArtists = (artists ?? [])
    .filter((a) => (filter === "all" ? true : a.status === filter))
    .filter((a) =>
      q ? `${a.stage_name} ${a.city ?? ""} ${a.genre.join(" ")}`.toLowerCase().includes(q) : true
    );

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Artisti</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci candidature e roster artisti del sito.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/artisti/new">
            <Plus className="size-4" /> Nuovo artista
          </Link>
        </Button>
      </header>

      {applications && applications.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Candidature in attesa</CardTitle>
              <Badge variant="accent">{applications.length}</Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Approva o rifiuta dalle card.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea snap className="-mx-2 px-2">
              <div className="flex gap-3 pb-2">
                {applications.map((a) => (
                  <article
                    key={a.id}
                    className="flex w-[320px] shrink-0 flex-col gap-3 rounded-2xl border border-border bg-background p-4 snap-start"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={a.stage_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base leading-tight tracking-tight truncate">
                          {a.stage_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.name} · {a.email}
                        </p>
                      </div>
                    </div>
                    {a.genre.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.genre.slice(0, 4).map((g) => (
                          <Badge key={g} variant="muted">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {a.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {a.bio}
                      </p>
                    )}
                    {a.video_url && (
                      <video
                        controls
                        preload="metadata"
                        src={a.video_url}
                        className="aspect-video w-full rounded-xl border border-border bg-black object-cover"
                      >
                        Il tuo browser non supporta la riproduzione video.
                      </video>
                    )}
                    <div className="mt-auto pt-2 border-t border-border">
                      <ApplicationActions applicationId={a.id} />
                    </div>
                  </article>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Roster artisti</CardTitle>
            <Badge variant="muted">{filteredArtists.length}</Badge>
          </div>
          <form action="/admin/artisti" className="flex w-full max-w-sm items-center gap-2">
            <input type="hidden" name="filter" value={filter} />
            <SearchInput
              name="q"
              defaultValue={q}
              placeholder="Cerca per nome, città, genere…"
              variant="compact"
            />
          </form>
        </CardHeader>

        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1">
            {TABS.map((tab) => {
              const sp = new URLSearchParams();
              if (tab.value !== "all") sp.set("filter", tab.value);
              if (q) sp.set("q", q);
              const href = `/admin/artisti${sp.size > 0 ? `?${sp}` : ""}`;
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
                <TableHead className="w-[40%]">Artista</TableHead>
                <TableHead>Città</TableHead>
                <TableHead>Generi</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArtists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nessun artista trovato.{" "}
                    <Link href="/admin/artisti/new" className="underline">
                      Aggiungi il primo
                    </Link>
                    .
                    <UserPlus className="sr-only" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredArtists.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar src={a.cover_image} name={a.stage_name} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground line-clamp-1">{a.stage_name}</p>
                          <p className="text-xs text-muted-foreground">/artisti/{a.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.genre.length > 0 ? (
                        <span className="line-clamp-1">{a.genre.slice(0, 2).join(", ")}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status] ?? "muted"} dot>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <IconButton aria-label="Modifica artista" variant="ghost" size="sm" asChild>
                          <Link href={`/admin/artisti/${a.id}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton
                          aria-label="Apri profilo pubblico"
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/artisti/${a.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" />
                          </Link>
                        </IconButton>
                        <DeleteArtistButton artistId={a.id} artistName={a.stage_name} />
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

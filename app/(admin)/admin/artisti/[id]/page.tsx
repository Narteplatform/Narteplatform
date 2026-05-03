import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { ArtistStatusToggle } from "@/components/admin/ArtistStatusToggle";
import { ArtistEditForm } from "@/components/admin/ArtistEditForm";
import { DeleteArtistButton } from "@/components/admin/DeleteArtistButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SocialLinks = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  spotify?: string | null;
  website?: string | null;
};

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

export default async function AdminArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const [{ data: artist }, { data: genresData }] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).single(),
    supabase.from("genres").select("name").order("order_index"),
  ]);
  if (!artist) notFound();

  const social = (artist.social_links ?? {}) as SocialLinks;
  const genreOptions = (genresData ?? []).map((g) => g.name as string);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/artisti"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli artisti
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={artist.cover_image} name={artist.stage_name} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight">{artist.stage_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {artist.city ?? "Città non impostata"} · /artisti/{artist.slug}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[artist.status] ?? "muted"} dot>
                  {STATUS_LABEL[artist.status] ?? artist.status}
                </Badge>
                {artist.genre.slice(0, 3).map((g) => (
                  <Badge key={g} variant="muted">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/artisti/${artist.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Pagina pubblica
              </Link>
            </Button>
            <DeleteArtistButton artistId={artist.id} artistName={artist.stage_name} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stato pubblicazione</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ArtistStatusToggle artistId={artist.id} status={artist.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anagrafica e profilo</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistEditForm
            artistId={artist.id}
            genreOptions={genreOptions}
            defaults={{
              stage_name: artist.stage_name,
              city: artist.city ?? "",
              genre: artist.genre ?? [],
              instruments: artist.instruments ?? [],
              bio: artist.bio ?? "",
              cover_image: artist.cover_image ?? "",
              instagram: social.instagram ?? "",
              facebook: social.facebook ?? "",
              tiktok: social.tiktok ?? "",
              youtube: social.youtube ?? "",
              spotify: social.spotify ?? "",
              website: social.website ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

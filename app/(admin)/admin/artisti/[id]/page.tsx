import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArtistStatusToggle } from "@/components/admin/ArtistStatusToggle";
import { ArtistEditForm } from "@/components/admin/ArtistEditForm";
import { DeleteArtistButton } from "@/components/admin/DeleteArtistButton";

type SocialLinks = { instagram?: string | null; spotify?: string | null; website?: string | null };

export default async function AdminArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("*").eq("id", id).single();
  if (!artist) notFound();

  const social = (artist.social_links ?? {}) as SocialLinks;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/artisti" className="text-xs uppercase tracking-wider text-muted-foreground hover:underline">
            ← Roster
          </Link>
          <h1 className="display-xl text-4xl">{artist.stage_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {artist.city ?? "—"} · slug <code>{artist.slug}</code>
          </p>
        </div>
        <DeleteArtistButton artistId={artist.id} artistName={artist.stage_name} />
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg uppercase">Stato pubblicazione</h2>
        <ArtistStatusToggle artistId={artist.id} status={artist.status} />
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-lg uppercase">Anagrafica</h2>
        <ArtistEditForm
          artistId={artist.id}
          defaults={{
            stage_name: artist.stage_name,
            city: artist.city ?? "",
            genre: artist.genre.join(", "),
            bio: artist.bio ?? "",
            cover_image: artist.cover_image ?? "",
            base_fee: artist.base_fee != null ? String(artist.base_fee) : "",
            instagram: social.instagram ?? "",
            spotify: social.spotify ?? "",
            website: social.website ?? "",
          }}
        />
      </section>
    </div>
  );
}

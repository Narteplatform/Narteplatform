import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArtistStatusToggle } from "@/components/admin/ArtistStatusToggle";

export default async function AdminArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("*").eq("id", id).single();
  if (!artist) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="display-xl text-4xl">{artist.stage_name}</h1>
      <p className="text-sm text-muted-foreground">
        {artist.city ?? "—"} · {artist.genre.join(", ") || "—"}
      </p>
      <ArtistStatusToggle artistId={artist.id} status={artist.status} />
      {artist.bio && <p className="whitespace-pre-wrap">{artist.bio}</p>}
    </div>
  );
}

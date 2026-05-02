import Link from "next/link";
import { ExternalLink, ImageIcon, Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { ArtistProfileForm } from "@/components/forms/ArtistProfileForm";

export const metadata = { title: "Profilo artista — N'arte" };

export default async function ArtistDashboardPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return (
      <div className="space-y-4">
        <h1 className="display-xl text-4xl">Profilo artista</h1>
        <p className="text-muted-foreground">
          Nessun profilo artista collegato al tuo account. Contatta l&apos;amministratore.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: dates }, { data: genresData }] = await Promise.all([
    supabase
      .from("artist_availability")
      .select("date, status")
      .eq("artist_id", artist.id)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(8),
    supabase.from("genres").select("name").order("order_index"),
  ]);
  const genreOptions = (genresData ?? []).map((g) => g.name as string);

  const gallery = artist.gallery ?? [];
  const videos = artist.videos ?? [];

  return (
    <div className="space-y-10">
      {/* Hero preview */}
      <section className="relative overflow-hidden border border-border bg-foreground text-background">
        <div className="grid gap-0 md:grid-cols-[2fr_3fr]">
          <div className="aspect-[4/5] w-full overflow-hidden bg-foreground">
            {artist.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.cover_image}
                alt={artist.stage_name}
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-5xl text-background/30">
                {artist.stage_name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-4 p-6 md:p-10">
            <p className="text-xs uppercase tracking-wider text-background/60">
              Anteprima profilo pubblico
            </p>
            <h1 className="font-display text-4xl uppercase leading-none md:text-6xl">
              {artist.stage_name}
            </h1>
            <p className="text-sm uppercase tracking-wide text-background/70">
              {artist.city ?? "—"} · {artist.genre.join(" / ") || "—"}
            </p>
            {artist.bio && (
              <p className="max-w-prose whitespace-pre-wrap text-sm text-background/80">
                {artist.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/artisti/${artist.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-full border border-background/40 px-4 py-2 text-xs uppercase hover:bg-background hover:text-foreground"
              >
                Vedi pagina pubblica <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Galleria + Video + Prossime date in 3 cards */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card icon={<ImageIcon className="size-4" />} title={`Galleria foto · ${gallery.length}`}>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna foto ancora.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {gallery.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ))}
            </div>
          )}
        </Card>

        <Card icon={<Video className="size-4" />} title={`Video · ${videos.length}`}>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun video ancora.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {videos.slice(0, 4).map((v) => (
                <li key={v} className="truncate">
                  <a
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                  >
                    {v}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Prossime date">
          {!dates || dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna data nei prossimi giorni. Vai su <Link href="/dashboard/calendario" className="underline">Calendario</Link>.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {dates.map((d) => (
                <li key={d.date} className="flex items-center justify-between">
                  <span>{new Date(d.date).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}</span>
                  <span
                    className={
                      d.status === "available"
                        ? "rounded-full bg-green-500/10 px-2 py-0.5 text-xs uppercase text-green-700"
                        : "rounded-full bg-red-500/10 px-2 py-0.5 text-xs uppercase text-red-700"
                    }
                  >
                    {d.status === "available" ? "libero" : "occupato"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Form completo */}
      <section className="space-y-4">
        <header>
          <h2 className="font-display text-2xl uppercase">Modifica profilo</h2>
          <p className="text-sm text-muted-foreground">
            Tutto quello che salvi qui viene aggiornato in automatico nella tua pagina
            pubblica e nella sezione &quot;Gli artisti&quot; della home.
          </p>
        </header>
        <ArtistProfileForm artist={artist} genreOptions={genreOptions} />
      </section>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border border-border p-5">
      <header className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{title}</span>
      </header>
      {children}
    </div>
  );
}

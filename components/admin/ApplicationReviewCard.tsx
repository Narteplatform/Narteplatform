import { ExternalLink } from "lucide-react";
import { isBunnyEmbedUrl } from "@/lib/storage/bunny/urls";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ApplicationActions } from "@/components/admin/ApplicationActions";

/**
 * Scheda di revisione di una candidatura artista.
 *
 * Prima la candidatura stava in una card da 320px dentro un carosello: la bio
 * era tagliata a tre righe, i link e gli strumenti non comparivano e il video
 * caricato su Bunny (un URL di embed, cioè una pagina) finiva dentro un tag
 * <video>, che non lo riproduce. Chi approva deve vedere TUTTO ciò che il
 * candidato ha inviato, nella forma in cui l'ha inviato.
 */

export type CandidaturaDaRivedere = {
  id: string;
  name: string;
  email: string;
  stage_name: string;
  genre: string[];
  instruments: string[] | null;
  bio: string | null;
  links: unknown;
  created_at: string;
};

const LINK_LABEL: Record<string, string> = {
  instagram: "Instagram",
  spotify: "Spotify",
  website: "Sito web",
};

/**
 * Instagram arriva spesso come handle («@nome» o «nome»), non come URL: lo si
 * trasforma in un link apribile. Tutto il resto si apre solo se è già un URL
 * http(s); altrimenti si mostra come testo, senza inventare indirizzi.
 */
function hrefDi(chiave: string, valore: string): string | null {
  const v = valore.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v)) return `https://${v}`;
  if (chiave === "instagram") {
    const handle = v.replace(/^@/, "");
    if (/^[\w.]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
  }
  return null;
}

function linkDi(links: unknown): { chiave: string; valore: string; href: string | null }[] {
  if (!links || typeof links !== "object" || Array.isArray(links)) return [];
  return Object.entries(links as Record<string, unknown>)
    .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim().length > 0)
    .map(([chiave, valore]) => ({ chiave, valore, href: hrefDi(chiave, valore) }));
}

const dataFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function ApplicationReviewCard({
  candidatura: a,
  videoUrl,
}: {
  candidatura: CandidaturaDaRivedere;
  videoUrl: string | null;
}) {
  const links = linkDi(a.links);
  const strumenti = (a.instruments ?? []).filter(Boolean);

  return (
    <article className="grid gap-5 rounded-2xl border border-border bg-background p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={a.stage_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight tracking-tight break-words">
              {a.stage_name}
            </p>
            <p className="text-sm text-muted-foreground break-words">
              {a.name} ·{" "}
              <a href={`mailto:${a.email}`} className="underline-offset-2 hover:underline">
                {a.email}
              </a>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Inviata il {dataFmt.format(new Date(a.created_at))}
            </p>
          </div>
        </div>

        {(a.genre.length > 0 || strumenti.length > 0) && (
          <dl className="grid gap-2 text-sm">
            {a.genre.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <dt className="mr-1 text-xs font-medium text-muted-foreground">Generi</dt>
                {a.genre.map((g) => (
                  <dd key={g}>
                    <Badge variant="muted">{g}</Badge>
                  </dd>
                ))}
              </div>
            )}
            {strumenti.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <dt className="mr-1 text-xs font-medium text-muted-foreground">Strumenti</dt>
                {strumenti.map((s) => (
                  <dd key={s}>
                    <Badge variant="muted">{s}</Badge>
                  </dd>
                ))}
              </div>
            )}
          </dl>
        )}

        <section>
          <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Descrizione</h3>
          {a.bio?.trim() ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
              {a.bio.trim()}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Nessuna descrizione inserita.</p>
          )}
        </section>

        {links.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Link</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {links.map((l) => (
                <li key={l.chiave} className="min-w-0">
                  <span className="text-muted-foreground">{LINK_LABEL[l.chiave] ?? l.chiave}: </span>
                  {l.href ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 break-all underline underline-offset-2 hover:text-accent"
                    >
                      {l.valore}
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="break-all">{l.valore}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-auto border-t border-border pt-3">
          <ApplicationActions applicationId={a.id} />
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Video</h3>
        {videoUrl ? (
          isBunnyEmbedUrl(videoUrl) ? (
            <iframe
              src={videoUrl}
              title={`Video di candidatura di ${a.stage_name}`}
              loading="lazy"
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="aspect-video w-full rounded-xl border border-border bg-black"
            />
          ) : (
            // object-contain: i video girati in verticale col telefono non
            // vanno ritagliati, chi valuta deve vedere l'inquadratura intera.
            <video
              controls
              preload="metadata"
              playsInline
              src={videoUrl}
              className="aspect-video w-full rounded-xl border border-border bg-black object-contain"
            >
              Il tuo browser non supporta la riproduzione video.
            </video>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nessun video allegato.
          </p>
        )}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Apri il video in una nuova scheda <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

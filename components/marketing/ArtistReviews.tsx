import { Reveal } from "@/components/animations/Reveal";
import { StarRating } from "@/components/feedback/StarRating";
import type { PublicReviews } from "@/lib/feedback/queries";

/**
 * Le recensioni sul profilo pubblico dell'artista.
 *
 * Fino a ora esistevano tabella, modulo di invio e moderazione, ma i voti si
 * vedevano soltanto nella dashboard dell'artista e nel pannello admin: cioè
 * ovunque tranne che dove servono. Un organizzatore che valuta chi ingaggiare
 * non ne ha mai vista una.
 *
 * La sezione non compare del tutto quando non ci sono recensioni. L'alternativa
 * — mostrarla vuota con "ancora nessuna recensione" — su un profilo appena
 * pubblicato comunica solo che l'artista non ha mai lavorato, che è l'opposto
 * di quello che il profilo deve fare.
 */

function dataBreve(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}

export function ArtistReviews({
  data,
  artistName,
}: {
  data: PublicReviews;
  artistName: string;
}) {
  if (data.count === 0) return null;

  return (
    <section className="border-t border-border bg-background py-16 md:py-24">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">recensioni</p>
        </Reveal>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-3xl md:text-5xl">
              Chi l&rsquo;ha già ingaggiato.
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex items-center gap-3">
              <StarRating value={data.average} size="lg" />
              <span className="font-display text-2xl tabular-nums">
                {data.average.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-sm text-muted-foreground">
                su {data.count}{" "}
                {data.count === 1 ? "recensione" : "recensioni"}
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.reviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base">
                      {r.organizer_name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dataBreve(r.created_at)}
                    </p>
                  </div>
                  <StarRating value={r.rating} size="sm" className="shrink-0" />
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        {data.count > data.reviews.length && (
          <Reveal delay={0.25}>
            <p className="mt-6 text-sm text-muted-foreground">
              Mostrate le {data.reviews.length} più recenti di {data.count}{" "}
              recensioni ricevute da {artistName}.
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

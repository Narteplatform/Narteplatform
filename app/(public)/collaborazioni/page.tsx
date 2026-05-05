import { createClient } from "@/lib/supabase/server";
import { Reveal, StaggerList } from "@/components/animations/Reveal";

export const metadata = { title: "Collaborazioni — N'arte" };

export default async function CollaborazioniPage() {
  let collaborations: { id: string; name: string; logo_url: string | null; link: string | null; description: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("collaborations")
      .select("id, name, logo_url, link, description")
      .order("order_index", { ascending: true });
    collaborations = data ?? [];
  } catch {
    collaborations = [];
  }

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border pt-24 pb-12 md:pt-32 md:pb-16">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 text-center">
          <Reveal>
            <p className="accent-label mb-4">collaborazioni</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="display-xl text-5xl md:text-7xl lg:text-8xl">
              Le realtà con cui costruiamo cultura.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Partner, location e sponsor che rendono possibile la nostra missione: portare
              musica e cultura nei luoghi più iconici di Napoli e oltre.
            </p>
          </Reveal>
        </div>
      </section>

      {/* GRID */}
      <section className="bg-muted py-20 md:py-28">
        <div className="container-narte">
          {collaborations.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Stiamo aggiornando la lista delle collaborazioni.
            </p>
          ) : (
            <StaggerList className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {collaborations.map((c) => (
                <a
                  key={c.id}
                  href={c.link ?? "#"}
                  target={c.link ? "_blank" : undefined}
                  rel={c.link ? "noreferrer" : undefined}
                  className="group block rounded-2xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:border-accent hover:shadow-[0_18px_40px_-12px_rgba(37,99,235,0.45)]"
                >
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="h-12 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex h-12 items-center font-display text-lg uppercase text-muted-foreground">
                      {c.name}
                    </div>
                  )}
                  <h3 className="mt-6 font-display text-xl uppercase transition group-hover:text-accent">
                    {c.name}
                  </h3>
                  {c.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                </a>
              ))}
            </StaggerList>
          )}
        </div>
      </section>
    </>
  );
}

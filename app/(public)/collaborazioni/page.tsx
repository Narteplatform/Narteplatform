import { createClient } from "@/lib/supabase/server";
import { StaggerList } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";

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
      <PageHero
        label="collaborazioni"
        title="Le realtà con cui costruiamo cultura."
        description={
          <>
            Partner, location e sponsor che rendono possibile la nostra missione: portare
            musica e cultura nei luoghi più iconici di Napoli e oltre.
          </>
        }
      />

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
                    <div className="flex h-12 items-center font-display text-lg text-muted-foreground">
                      {c.name}
                    </div>
                  )}
                  <h3 className="mt-6 font-display text-xl transition group-hover:text-accent">
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

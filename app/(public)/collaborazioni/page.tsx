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
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">collaborazioni</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Le realtà con cui costruiamo cultura.</h1>
      </Reveal>

      <div className="mt-12">
        {collaborations.length === 0 ? (
          <p className="text-muted-foreground">Stiamo aggiornando la lista delle collaborazioni.</p>
        ) : (
          <StaggerList className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {collaborations.map((c) => (
              <a
                key={c.id}
                href={c.link ?? "#"}
                target={c.link ? "_blank" : undefined}
                rel={c.link ? "noreferrer" : undefined}
                className="block border border-border p-6 transition hover:border-foreground"
              >
                {c.logo_url && (
                  <img src={c.logo_url} alt={c.name} className="h-12 w-auto object-contain" />
                )}
                <h3 className="mt-4 font-display text-xl uppercase">{c.name}</h3>
                {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
              </a>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}

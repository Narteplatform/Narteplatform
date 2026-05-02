import { createAdminClient } from "@/lib/supabase/server";
import { Reveal, StaggerList } from "@/components/animations/Reveal";

type Collab = {
  id: string;
  name: string;
  logo_url: string | null;
  link: string | null;
};

async function getCollabs(): Promise<Collab[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("collaborations")
      .select("id, name, logo_url, link")
      .order("order_index", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function CollaborationsSection() {
  const collabs = await getCollabs();
  if (collabs.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted py-20 md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">insieme a noi</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display-xl text-4xl md:text-6xl">Collaborazioni</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            I partner che rendono possibile la nostra missione: portare la musica dal vivo
            nei luoghi più iconici di Napoli e oltre.
          </p>
        </Reveal>

        <StaggerList className="mt-12 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border md:grid-cols-3 lg:grid-cols-4">
          {collabs.map((c) => (
            <LogoCell key={c.id} collab={c} />
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

function LogoCell({ collab }: { collab: Collab }) {
  const inner = (
    <div className="flex aspect-[2/1] w-full items-center justify-center bg-background p-6 transition group-hover:bg-foreground">
      {collab.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collab.logo_url}
          alt={collab.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain transition group-hover:invert"
        />
      ) : (
        <span className="font-display text-xl uppercase text-foreground transition group-hover:text-background">
          {collab.name}
        </span>
      )}
    </div>
  );
  if (collab.link) {
    return (
      <a
        href={collab.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        aria-label={`Visita ${collab.name}`}
      >
        {inner}
      </a>
    );
  }
  return <div className="group block">{inner}</div>;
}

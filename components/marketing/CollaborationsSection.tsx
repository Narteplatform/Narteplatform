import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { Marquee } from "@/components/animations/Marquee";

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
    <section className="border-t border-palco-60 bg-[#F7F5F2] py-20 text-notte md:py-28">
      <div className="container-narte">
        <Reveal>
          <p className="accent-label mb-3">insieme a noi</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display-xl text-4xl text-notte md:text-6xl">Collaborazioni</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-xl text-sm text-notte/70 md:text-base">
            I partner che rendono possibile la nostra missione: portare la musica dal vivo
            nei luoghi più iconici di Napoli e oltre.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.25}>
        <div className="relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          {/* `speed` è la durata in secondi di un giro completo, non una
              velocità: più basso = scorrimento più veloce. */}
          <Marquee speed={30}>
            {collabs.map((c) => (
              <LogoCell key={c.id} collab={c} />
            ))}
          </Marquee>
        </div>
      </Reveal>
    </section>
  );
}

function LogoCell({ collab }: { collab: Collab }) {
  const inner = (
    <div className="flex h-[110px] w-[220px] shrink-0 items-center justify-center rounded-xl border border-border bg-background p-5 shadow-sm transition group-hover:border-accent group-hover:shadow-md">
      {collab.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collab.logo_url}
          alt={collab.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="font-display text-base text-foreground">
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

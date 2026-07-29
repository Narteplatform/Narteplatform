import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/animations/Reveal";
import { LogoMarquee, type CollabLogo } from "@/components/marketing/LogoMarquee";

async function getCollabs(): Promise<CollabLogo[]> {
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
          <p className="accent-label mb-3">chi ci ha già chiamato</p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
            Parchi, ristoranti, comuni, festival.
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-xl text-pretty text-sm text-notte/70 md:text-base">
            Chi organizza a Napoli e in Campania ci chiama quando serve musica dal
            vivo. Qualcuno una volta, qualcun altro ogni settimana.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.25}>
        <LogoMarquee logos={collabs} speed={30} className="mt-12" />
      </Reveal>

      <div className="container-narte">
        <Reveal delay={0.3}>
          <div className="mt-12 flex justify-center">
            <Link
              href="/collaborazioni"
              className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-azzurro transition-colors hover:text-azzurro-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro focus-visible:ring-offset-2"
            >
              Guarda gli eventi che abbiamo prodotto
              <ArrowRight className="size-4 transition-transform duration-220 ease-[var(--ease-out)] group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

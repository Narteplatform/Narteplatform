import { Marquee } from "@/components/animations/Marquee";

export type CollabLogo = {
  id: string;
  name: string;
  logo_url: string | null;
  link: string | null;
};

/**
 * Sotto questa soglia il binario resta più stretto del viewport e fra una copia
 * e l'altra si apre un buco visibile. Con tre partner a DB succede sempre,
 * quindi l'elenco si ripete finché non è abbastanza lungo.
 */
const MIN_CELLS = 6;

/**
 * Nastro scorrevole dei loghi partner. Usato sia dalla sezione della home sia
 * in fondo a /collaborazioni: un solo posto dove sistemare celle e sfumature.
 */
export function LogoMarquee({
  logos,
  speed = 30,
  className,
}: {
  logos: CollabLogo[];
  speed?: number;
  className?: string;
}) {
  if (logos.length === 0) return null;

  const cells: CollabLogo[] = [];
  while (cells.length < MIN_CELLS) cells.push(...logos);

  return (
    <div
      className={`relative [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] ${className ?? ""}`}
    >
      <Marquee speed={speed}>
        {cells.map((c, i) => (
          <LogoCell key={`${c.id}-${i}`} collab={c} />
        ))}
      </Marquee>
    </div>
  );
}

function LogoCell({ collab }: { collab: CollabLogo }) {
  const inner = (
    <div className="flex h-[110px] w-[220px] shrink-0 items-center justify-center rounded-xl border border-border bg-background p-5 shadow-sm transition-[border-color,box-shadow] duration-220 ease-[var(--ease-out)] group-hover:border-accent group-hover:shadow-md">
      {collab.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collab.logo_url}
          alt={collab.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-center font-display text-base text-foreground">
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
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={`Visita ${collab.name}`}
        title={collab.name}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="group block" title={collab.name}>
      {inner}
    </div>
  );
}

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

/**
 * Cella del nastro. Nessuna cornice: i loghi stanno direttamente sul fondo
 * della sezione (#F7F5F2 in entrambe le pagine che usano il marquee).
 *
 * ⚠️  La cella resta di dimensione fissa anche senza riquadro — 200×80 px, con
 *     `object-contain` — ed è il contratto con cui vanno esportati i file:
 *     tela di 400×160 px (2×) trasparente, logo centrato, ~16 px di margine
 *     per lato. Un logo consegnato con proporzioni diverse non rompe niente,
 *     ma verrà rimpicciolito fino a entrare qui dentro e apparirà più leggero
 *     degli altri: la cella garantisce lo stesso spazio, non lo stesso peso
 *     ottico. Cambiando queste misure va aggiornata anche la richiesta ai
 *     partner.
 *
 * Senza cornice serve un altro segnale di hover per i loghi cliccabili:
 * l'opacità sostituisce bordo e ombra.
 */
function LogoCell({ collab }: { collab: CollabLogo }) {
  const inner = (
    <div className="flex h-20 w-[200px] shrink-0 items-center justify-center transition-opacity duration-220 ease-[var(--ease-out)] group-hover:opacity-70">
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
        className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4"
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

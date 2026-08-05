import { Marquee } from "@/components/animations/Marquee";

export type CollabLogo = {
  id: string;
  name: string;
  logo_url: string | null;
  link: string | null;
};

/**
 * Sotto questa soglia il binario resta più stretto del viewport e fra una copia
 * e l'altra si apre un buco visibile. Con pochi partner a DB succede sempre,
 * quindi l'elenco si ripete finché non è abbastanza lungo.
 *
 * Il conto: cella 200px + gap 48px = 248px per logo, quindi 12 celle fanno
 * 2976px di binario. Finché il viewport resta sotto quella misura la giunzione
 * non si vede. Con 6 celle il binario si fermava a 1488px e il buco compariva
 * già su un portatile da 1512px. Se cambiano larghezza della cella o gap
 * (`gap-12` dentro Marquee), questo numero va rifatto.
 */
const MIN_CELLS = 12;

/**
 * Fondo su cui poggia il nastro. I loghi partner sono monocromi scuri (grigio
 * ~#787878): sul fondo chiaro delle sezioni vanno bene così, sul nero della
 * hero sarebbero illeggibili.
 *
 * `on-dark` li ribalta a negativo — `invert(1) brightness(1.7)` — e non a
 * bianco pieno. La differenza si vede sui marchi che hanno disegno interno:
 * `brightness(0) invert(1)` porta ogni pixel a 255 e la facciata del Teatro
 * Augusteo diventa un quadrato bianco pieno, lo stemma del Comune di Napoli
 * una sagoma. Il negativo mantiene i rapporti di tono interni e quindi il
 * disegno.
 */
export type LogoMarqueeSurface = "on-light" | "on-dark";

/**
 * Nastro scorrevole dei loghi partner. Usato in fondo alla hero, nella sezione
 * "I nostri partner" della home e in fondo a /collaborazioni: un solo posto
 * dove sistemare celle, sfumature e trattamento del colore.
 */
export function LogoMarquee({
  logos,
  speed = 30,
  surface = "on-light",
  className,
}: {
  logos: CollabLogo[];
  speed?: number;
  surface?: LogoMarqueeSurface;
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
          <LogoCell key={`${c.id}-${i}`} collab={c} surface={surface} />
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
 * l'opacità sostituisce bordo e ombra. Sul fondo scuro la direzione si
 * inverte — i loghi partono attenuati e si accendono — perché lì sono già
 * bianchi al massimo della resa.
 */
function LogoCell({
  collab,
  surface,
}: {
  collab: CollabLogo;
  surface: LogoMarqueeSurface;
}) {
  const tone =
    surface === "on-dark"
      ? "opacity-90 group-hover:opacity-100 [filter:invert(1)_brightness(1.7)]"
      : "group-hover:opacity-70";

  const inner = (
    <div
      className={`flex h-20 w-[200px] shrink-0 items-center justify-center transition-opacity duration-220 ease-[var(--ease-out)] ${tone}`}
    >
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

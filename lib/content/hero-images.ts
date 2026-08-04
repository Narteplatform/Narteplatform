import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Immagine di sfondo dell'intestazione di ogni pagina pubblica.
 *
 * Due sorgenti, in ordine di precedenza:
 *  1. `public/hero/<chiave>.jpg` — la foto vera di N'arte, se c'è;
 *  2. l'URL Unsplash di riserva, così nessuna pagina resta senza sfondo.
 *
 * Il senso è che le foto vere si caricano una alla volta, quando ci sono, senza
 * toccare una riga di codice: appena il file compare in `public/hero/`, prende
 * il posto dello stock al primo build.
 *
 * ⚠️  Il controllo del filesystem gira al momento del render, quindi in
 *     sviluppo basta ricaricare la pagina; in produzione il valore è quello
 *     rilevato al primo render dell'istanza, perché la mappa è memoizzata a
 *     livello di modulo (vedi `resolved`). Se l'accesso al filesystem non è
 *     possibile — qualunque runtime, qualunque motivo — si degrada allo stock:
 *     mai un errore, mai una pagina senza sfondo.
 *
 * Gli URL Unsplash sono stati verificati raggiungibili: un id sbagliato non
 * darebbe un errore, darebbe un'intestazione muta. Se ne cambi uno, controllalo.
 * Il dominio è già in `next.config.ts` → `images.remotePatterns`.
 */

export type HeroKey =
  | "artisti"
  | "eventi"
  | "format"
  | "blog"
  | "help"
  | "chi-siamo"
  | "collaborazioni"
  | "contatti"
  | "prezzi"
  | "candidatura-artista";

export type HeroImage = {
  src: string;
  /**
   * Sempre stringa vuota: l'immagine è decorativa e il titolo della pagina dice
   * già tutto. Un alt descrittivo qui farebbe annunciare a uno screen reader
   * "folla a un concerto" prima del titolo, che è rumore.
   */
  alt: "";
};

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=70`;

/** Foto di riserva, una per pagina, scelte per attinenza al contenuto. */
const STOCK: Record<HeroKey, string> = {
  artisti: UNSPLASH("photo-1501281668745-f7f57925c3b4"), // musicista sul palco
  eventi: UNSPLASH("photo-1459749411175-04bf5292ceea"), // concerto dal palco
  format: UNSPLASH("photo-1540039155733-5bb30b53aa14"), // luci e palco allestito
  blog: UNSPLASH("photo-1516450360452-9312f5e86fc7"), // chitarra e appunti
  help: UNSPLASH("photo-1522071820081-009f0129c71c"), // persone che si confrontano
  "chi-siamo": UNSPLASH("photo-1493225457124-a3eb161ffa5f"), // band dal vivo
  collaborazioni: UNSPLASH("photo-1511671782779-c97d3d27a1d4"), // stretta di mano / incontro
  contatti: UNSPLASH("photo-1514320291840-2e0a9bf2a9ae"), // microfono da vicino
  prezzi: UNSPLASH("photo-1465146344425-f00d5f5c8f07"), // luce calda, neutra
  "candidatura-artista": UNSPLASH("photo-1524368535928-5b5e00ddc76b"), // artista che si prepara
};

/** Cartella e nomi file attesi per le foto vere. Vedi public/hero/README.md. */
const LOCAL_DIR = "hero";
const LOCAL_EXTS = [".jpg", ".jpeg", ".webp", ".png"] as const;

const resolved = new Map<HeroKey, HeroImage>();

function findLocal(key: HeroKey): string | null {
  try {
    const base = path.join(process.cwd(), "public", LOCAL_DIR);
    for (const ext of LOCAL_EXTS) {
      if (existsSync(path.join(base, `${key}${ext}`))) {
        return `/${LOCAL_DIR}/${key}${ext}`;
      }
    }
  } catch {
    // Filesystem non leggibile: non è un errore da propagare, è solo "non c'è
    // una foto locale". Lo stock copre il caso.
  }
  return null;
}

export function heroImageFor(key: HeroKey): HeroImage {
  const cached = resolved.get(key);
  if (cached) return cached;

  const image: HeroImage = { src: findLocal(key) ?? STOCK[key], alt: "" };
  resolved.set(key, image);
  return image;
}

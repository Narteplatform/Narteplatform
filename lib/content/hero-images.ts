import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { getContenuti } from "@/lib/content/site-settings-server";

/**
 * Immagine di sfondo dell'intestazione di ogni pagina pubblica.
 *
 * Due sorgenti, in ordine di precedenza:
 *  1. `public/hero/<chiave>.(jpg|jpeg|webp|png)` — il file presente in cartella;
 *  2. `/hero/<chiave>.jpg`, la copia locale della foto stock.
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
 * Per sostituire una foto basta sovrascrivere il file in `public/hero/`
 * oppure caricarla da /admin/contenuti.
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

/**
 * Foto di riserva, una per pagina: copie locali in `public/hero/` delle foto
 * Unsplash usate in origine (licenza Unsplash). Servite dal nostro dominio, così
 * il browser del visitatore non contatta server negli Stati Uniti (parere
 * legale, novembre 2026). Un file con estensione diversa, se presente, ha la
 * precedenza (vedi `findLocal`).
 */
const STOCK: Record<HeroKey, string> = {
  artisti: "/hero/artisti.jpg",
  eventi: "/hero/eventi.jpg",
  format: "/hero/format.jpg",
  blog: "/hero/blog.jpg",
  help: "/hero/help.jpg",
  "chi-siamo": "/hero/chi-siamo.jpg",
  collaborazioni: "/hero/collaborazioni.jpg",
  contatti: "/hero/contatti.jpg",
  prezzi: "/hero/prezzi.jpg",
  "candidatura-artista": "/hero/candidatura-artista.jpg",
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

/**
 * Come `heroImageFor`, ma con la foto caricata da /admin/contenuti
 * (chiave `hero.<pagina>`, trattini → trattini bassi) al primo posto.
 * Vuota o non leggibile = la foto di sempre.
 */
export async function heroImageConContenuti(key: HeroKey): Promise<HeroImage> {
  const contenuti = await getContenuti();
  const chiave = `hero.${key.replace(/-/g, "_")}` as keyof typeof contenuti;
  const caricata = contenuti[chiave];
  return caricata ? { src: caricata, alt: "" } : heroImageFor(key);
}

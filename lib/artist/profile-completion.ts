/**
 * Completamento del profilo artista — unica fonte di verità.
 *
 * Usato sia dal blocco in fondo alla sidebar (components/dashboard/AppShellData.tsx)
 * sia dalla card in dashboard (components/dashboard/ProfileCompletionCard.tsx):
 * due percentuali diverse nella stessa schermata sarebbero un bug visibile.
 */

/** Colonne di `artists` da selezionare per calcolare il completamento. */
export const PROFILE_COMPLETION_COLUMNS =
  "cover_image, bio, gallery, videos, genre, price_range, languages";

/** Un profilo con bio più corta di così non dice nulla di utile a un organizzatore. */
const MIN_BIO_LENGTH = 30;
const MIN_GALLERY = 3;

export type ProfileCompletionSource = {
  cover_image?: string | null;
  bio?: string | null;
  gallery?: unknown[] | null;
  videos?: unknown[] | null;
  genre?: unknown[] | null;
  price_range?: string | null;
  languages?: unknown[] | null;
};

export type CompletionItem = {
  key: string;
  /** Etichetta breve, usata nella lista dei mancanti in sidebar. */
  label: string;
  /** Frase d'azione, usata nella checklist della card. */
  action: string;
  done: boolean;
};

export type ProfileCompletion = {
  items: CompletionItem[];
  filled: number;
  total: number;
  /** Percentuale intera 0-100. */
  pct: number;
  isComplete: boolean;
  missing: CompletionItem[];
  /** Riepilogo dei primi mancanti, per il blocco sidebar. */
  hint: string;
};

export function computeProfileCompletion(
  artist: ProfileCompletionSource | null | undefined
): ProfileCompletion {
  const a = artist ?? {};
  const items: CompletionItem[] = [
    {
      key: "cover_image",
      label: "foto copertina",
      action: "Carica una foto di copertina",
      done: Boolean(a.cover_image),
    },
    {
      key: "bio",
      label: "bio",
      action: `Scrivi una bio di almeno ${MIN_BIO_LENGTH} caratteri`,
      done: Boolean(a.bio && a.bio.trim().length > MIN_BIO_LENGTH),
    },
    {
      key: "gallery",
      label: `galleria (min ${MIN_GALLERY})`,
      action: `Aggiungi almeno ${MIN_GALLERY} foto in galleria`,
      done: (a.gallery?.length ?? 0) >= MIN_GALLERY,
    },
    {
      key: "videos",
      label: "video",
      action: "Aggiungi almeno un video",
      done: (a.videos?.length ?? 0) >= 1,
    },
    {
      key: "genre",
      label: "genere",
      action: "Indica almeno un genere musicale",
      done: (a.genre?.length ?? 0) >= 1,
    },
    {
      key: "price_range",
      label: "fascia prezzo",
      action: "Indica la tua fascia di prezzo",
      done: Boolean(a.price_range),
    },
    {
      key: "languages",
      label: "lingue",
      action: "Indica le lingue in cui canti o parli",
      done: (a.languages?.length ?? 0) > 0,
    },
  ];

  const missing = items.filter((i) => !i.done);
  const filled = items.length - missing.length;
  const total = items.length;

  return {
    items,
    filled,
    total,
    pct: Math.round((filled / total) * 100),
    isComplete: missing.length === 0,
    missing,
    hint:
      missing.length > 0
        ? `Mancano: ${missing.slice(0, 3).map((m) => m.label).join(", ")}${
            missing.length > 3 ? "…" : ""
          }`
        : "Profilo completo al 100%",
  };
}

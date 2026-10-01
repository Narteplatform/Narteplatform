/**
 * Allegati delle segnalazioni: regole condivise fra client, rotta di firma e
 * server action. Senza dipendenze, perché le usa anche il modulo nel browser.
 */
export const REPORT_BUCKET = "report-attachments";
export const REPORT_MAX_FILES = 3;
export const REPORT_MAX_BYTES = 5 * 1024 * 1024;
export const REPORT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type ReportMime = (typeof REPORT_MIME)[number];

/** Percorso provvisorio, prima che la segnalazione abbia un riferimento. */
export const PENDING_PATH_RE = /^pending\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/;

export function nomeSicuro(nome: string): string {
  const pulito = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (pulito || "allegato").slice(-80);
}

/** Riconosce il tipo vero del file dai primi byte: il nome e il MIME dichiarato non bastano. */
export function tipoDaiByte(b: Uint8Array): ReportMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

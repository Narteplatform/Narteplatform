/** Testo che sostituisce un messaggio rimosso dal Team. */
export const MESSAGGIO_RIMOSSO = "Messaggio rimosso dal team N'arte";

/**
 * Il percorso di un allegato nel bucket privato `chat-attachments`.
 *
 * Il caricamento (lib/chat/upload.ts) salva il PERCORSO `<conversazione>/<id>-<nome>`;
 * le righe più vecchie possono contenere un indirizzo completo del bucket.
 * Restituisce `null` se il valore non è riconducibile a un percorso della
 * conversazione indicata: in quel caso non si cancella nulla.
 */
export function percorsoAllegatoChat(valore: string, conversationId: string): string | null {
  const marker = "/chat-attachments/";
  const i = valore.indexOf(marker);
  let p = i >= 0 ? valore.slice(i + marker.length) : valore;
  p = p.split("?")[0] ?? "";
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  p = p.replace(/^\/+/, "");
  if (!p || p.includes("..")) return null;
  if (!p.startsWith(`${conversationId}/`)) return null;
  return p;
}

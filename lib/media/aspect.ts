/**
 * Rapporto del contenitore di un video.
 *
 * IL PROBLEMA. Un contenitore fisso 16:9 va bene per un video girato in
 * orizzontale, ma un video verticale — cioè quasi tutto ciò che si riprende con
 * un telefono — finisce schiacciato al centro fra due grosse barre nere che
 * occupano due terzi della larghezza.
 *
 * LA REGOLA. Il contenitore prende il rapporto REALE del video, con due limiti:
 * non più largo di 16:9 (per non spezzare la griglia con un ultrapanoramico) e
 * non più alto di un quadrato (per non trasformare la pagina in una colonna).
 * Un video verticale diventa quindi un quadrato, non un rettangolo largo.
 *
 * Senza dimensioni note si ricade su 16:9, che è il comportamento di sempre.
 */
export function videoAspectRatio(
  width: number | null | undefined,
  height: number | null | undefined
): string {
  if (!width || !height || width <= 0 || height <= 0) return "16 / 9";
  const ratio = width / height;
  if (ratio >= 16 / 9) return "16 / 9";
  if (ratio <= 1) return "1 / 1";
  return `${width} / ${height}`;
}

/** true se il video è più alto che largo: serve a scegliere come ritagliarlo. */
export function isPortraitVideo(
  width: number | null | undefined,
  height: number | null | undefined
): boolean {
  return Boolean(width && height && height > width);
}

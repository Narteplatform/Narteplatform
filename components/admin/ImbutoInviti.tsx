/**
 * Imbuto del programma inviti: una barra per passo, larghezza proporzionale
 * al primo passo con un valore. Una sola serie e un solo colore (l'accento);
 * il valore e la percentuale sul passo precedente sono scritti in chiaro,
 * quindi il dato non dipende mai dal colore. Server component, nessun JS.
 */

export type PassoImbuto = {
  etichetta: string;
  /** null = dato non disponibile (es. aperture senza la migration 0079). */
  valore: number | null;
  nota?: string;
};

function percento(n: number, base: number): string {
  if (base <= 0) return "—";
  const p = (n / base) * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1).replace(".", ",")}%`;
}

export function ImbutoInviti({ passi, titolo }: { passi: PassoImbuto[]; titolo: string }) {
  const base = passi.find((p) => (p.valore ?? 0) > 0)?.valore ?? 0;

  return (
    <figure className="space-y-3">
      <figcaption className="sr-only">{titolo}</figcaption>
      <ol className="space-y-3">
        {passi.map((p, i) => {
          const precedente = passi.slice(0, i).reverse().find((x) => x.valore !== null)?.valore ?? null;
          const larghezza = p.valore !== null && base > 0 ? Math.max((p.valore / base) * 100, p.valore > 0 ? 1.5 : 0) : 0;
          return (
            <li key={p.etichetta} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[12rem_1fr_7rem]">
              <span className="text-sm">
                {p.etichetta}
                {p.nota && <span className="block text-[11px] text-muted-foreground">{p.nota}</span>}
              </span>
              <span className="relative h-3 rounded bg-muted" aria-hidden="true">
                {larghezza > 0 && (
                  <span className="absolute inset-y-0 left-0 rounded bg-corallo" style={{ width: `${larghezza}%` }} />
                )}
              </span>
              <span className="text-right tabular-nums">
                <span className="font-display text-lg leading-none tracking-tight">
                  {p.valore === null ? "—" : p.valore.toLocaleString("it-IT")}
                </span>
                {i > 0 && p.valore !== null && precedente !== null && (
                  <span className="block text-[11px] text-muted-foreground">{percento(p.valore, precedente)} del passo prima</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

import { Lock } from "lucide-react";
import { BUDGET_RANGES, type BudgetRangeValue } from "@/lib/constants/budget-ranges";

/**
 * Fascia di prezzo mostrata nel catalogo.
 *
 * La fonte è `artists.price_range`, l'unico campo che l'artista compila
 * (blocco «Informazioni di booking»). `price_band` non lo scrive nessuno e vale
 * «standard» per tutti: mostrarlo voleva dire inventare un «€€» uguale per ogni
 * scheda. Qui si legge solo ciò che l'artista ha indicato davvero.
 *
 * Formati presenti in colonna:
 *  - la label di BUDGET_RANGES («100 — 300 €»): è ciò che salva il validatore;
 *  - il value («100-300»): profili salvati prima;
 *  - testo libero: profili ancora più vecchi, mostrato com'è scritto.
 * Vuoto o assente: nessuna fascia, e il catalogo non mostra nulla.
 */
export type FasciaPrezzo = {
  /** Valore di BUDGET_RANGES, o null per un testo libero non riconosciuto. */
  value: BudgetRangeValue | null;
  label: string;
};

function normalizza(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—−-]/g, "-")
    .replace(/[\s.€]/g, "");
}

export function fasciaDaPriceRange(raw: string | null | undefined): FasciaPrezzo | null {
  const testo = (raw ?? "").trim();
  if (!testo) return null;

  const esatta =
    BUDGET_RANGES.find((r) => r.value === testo || r.label === testo) ??
    BUDGET_RANGES.find((r) => normalizza(r.label) === normalizza(testo) || r.value === normalizza(testo));
  if (esatta) return { value: esatta.value, label: esatta.label };

  // Testo libero: lo si mostra com'è scritto (accorciato). Ricondurlo a una
  // fascia standard («250-400» → «100 — 300 €») direbbe una cifra che
  // l'artista non ha mai indicato.
  return { value: null, label: testo.length > 32 ? `${testo.slice(0, 31)}…` : testo };
}

/**
 * Pillola della fascia. Sempre uno <span>: la scheda del catalogo è già un
 * link, e un link dentro un link non è HTML valido.
 *
 * `canSee` false: la cifra non arriva nemmeno al componente (la pagina passa
 * `fascia: null`), si mostra solo che una fascia esiste.
 */
export function PriceBandBadge({
  fascia,
  canSee,
}: {
  fascia: FasciaPrezzo | null;
  canSee: boolean;
}) {
  if (!canSee) {
    return (
      <span
        className="relative inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
        title="Accedi come organizzatore per vedere la fascia di prezzo"
        aria-label="Fascia di prezzo visibile agli organizzatori"
      >
        <span
          aria-hidden="true"
          className="select-none font-display tracking-tight text-foreground/80 blur-[3.5px]"
        >
          000 — 000 €
        </span>
        <Lock className="size-3 text-palco-20" aria-hidden="true" />
      </span>
    );
  }
  if (!fascia) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-azzurro/10 px-2.5 py-1 text-xs font-semibold text-azzurro">
      {fascia.label}
    </span>
  );
}

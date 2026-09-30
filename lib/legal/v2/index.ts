import { TESTI_V2, type TestoLegaleV2 } from "@/lib/legal/v2/testi";

/**
 * Documenti legali v2 (fascicolo 0.95+), pubblicabili solo dopo l'approvazione
 * del legale.
 *
 * Interruttore: `NEXT_PUBLIC_LEGAL_V2_PUBBLICATO=1`. Qualunque altro valore, o
 * variabile assente, lascia il sito esattamente com'era. Essendo NEXT_PUBLIC_,
 * il valore è incorporato al build: attivarlo richiede un redeploy.
 */
export function legalV2Pubblicato(): boolean {
  return process.env.NEXT_PUBLIC_LEGAL_V2_PUBBLICATO === "1";
}


/** Documenti v2 con una pagina propria (il doc. 01 vive su /termini). */
export const LEGAL_V2_ROTTE: { slug: string; href: string; etichetta: string }[] = [
  { slug: "condizioni-abbonamento", href: "/condizioni-abbonamento", etichetta: "Condizioni di abbonamento" },
  { slug: "condizioni-artisti", href: "/condizioni-artisti", etichetta: "Condizioni artisti" },
  { slug: "condizioni-organizzatori", href: "/condizioni-organizzatori", etichetta: "Condizioni organizzatori" },
  { slug: "regolamento-recensioni", href: "/regolamento-recensioni", etichetta: "Regolamento recensioni" },
  { slug: "criteri-di-posizionamento", href: "/criteri-di-posizionamento", etichetta: "Criteri di posizionamento" },
];

export function testoV2(slug: string): TestoLegaleV2 | null {
  return TESTI_V2.find((t) => t.slug === slug) ?? null;
}

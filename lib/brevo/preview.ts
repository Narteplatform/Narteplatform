/**
 * Approssimazione locale del motore di templating di Brevo.
 *
 * Serve solo alla preview e alla validazione: NON viene mai usata per
 * inviare. Il rendering vero lo fa Brevo, e le due cose possono divergere —
 * per questo `scripts/brevo-preview.mjs` confronta questo output con quello
 * di `POST /smtp/template/preview`, che è il motore reale.
 */

/** `{{params.nome}}` */
const PARAM_RE = /\{\{\s*params\.(\w+)\s*\}\}/g;
/** `{% if params.nome %}...{% endif %}`, senza annidamenti. */
const IF_RE = /\{%\s*if\s+params\.(\w+)\s*%\}((?:(?!\{%\s*if\s)[\s\S])*?)\{%\s*endif\s*%\}/;

/** Un valore è "vuoto" per Brevo se è assente, stringa vuota o `false`. */
function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || v === false;
}

/**
 * Tutti i parametri realmente presenti nell'HTML, sia come valore che come
 * condizione. È la lista che `brevo-sync` confronta con i tipi TypeScript:
 * un `{{params.artistNmae}}` scritto male non darebbe errore da nessuna
 * parte, arriverebbe semplicemente vuoto nella casella del destinatario.
 */
export function usedParams(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(PARAM_RE)) found.add(m[1]);
  for (const m of html.matchAll(/\{%\s*if\s+params\.(\w+)\s*%\}/g)) found.add(m[1]);
  return [...found].sort();
}

/**
 * Sostituisce condizionali e placeholder con i valori dati. I `{% if %}`
 * vengono risolti dal più interno verso l'esterno, così un blocco annidato
 * non lascia residui.
 */
export function renderLocal(html: string, params: Readonly<Record<string, unknown>>): string {
  let out = html;

  // Ogni passata risolve i condizionali senza `if` al proprio interno.
  // Il limite di iterazioni evita un ciclo infinito su markup malformato.
  for (let i = 0; i < 20; i++) {
    const before = out;
    out = out.replace(IF_RE, (_full, name: string, inner: string) =>
      isEmpty(params[name]) ? "" : inner
    );
    if (out === before) break;
  }

  return out.replace(PARAM_RE, (_full, name: string) => {
    const v = params[name];
    return isEmpty(v) ? "" : String(v);
  });
}

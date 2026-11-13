/**
 * Serializza un valore come JSON da mettere DENTRO un tag <script> (JSON-LD,
 * dati iniziali, ecc.).
 *
 * PERCHÉ NON BASTA `JSON.stringify`. Il parser HTML non sa niente di JSON: dentro
 * uno <script> cerca soltanto la sequenza `</script`. Una bio d'artista che
 * contiene `</script><script>…</script>` esce intatta da `JSON.stringify` (è una
 * stringa valida) e chiude il tag in anticipo: tutto ciò che segue viene
 * eseguito come codice della pagina. È un XSS memorizzato, servito a ogni
 * visitatore del profilo.
 *
 * Qui si sostituiscono con la loro escape Unicode i caratteri che possono
 * cambiare il significato del contenuto per il parser HTML (`<`, `>`, `&`) e i
 * due separatori di riga che alcuni motori JavaScript trattano come fine riga
 * (U+2028, U+2029). Il risultato resta JSON valido e, una volta interpretato,
 * identico all'originale: `<` è `<`.
 *
 * Unico punto in cui si fa: ogni `dangerouslySetInnerHTML` con JSON passa da qui.
 */
export function serializeJsonForScript(value: unknown): string {
  const json = JSON.stringify(value);
  // `JSON.stringify(undefined)` restituisce undefined: un <script> vuoto va bene.
  if (json === undefined) return "";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

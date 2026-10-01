#!/usr/bin/env node
/**
 * Controlla che ogni rinvio interno del fascicolo («doc. 0X, art. N»,
 * «art. N del doc. 0X») punti a un articolo che esiste davvero.
 * Da lanciare dopo ogni modifica ai sorgenti:  node docs/legale/controlla-rinvii.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "src");
const files = readdirSync(dir).filter((f) => /^\d\d-.*\.html$/.test(f));
const arts = {}, heads = {};
for (const f of files) {
  const h = readFileSync(join(dir, f), "utf8"), c = f.slice(0, 2);
  arts[c] = new Set([...h.matchAll(/<span class="art">([\d.]+)/g)].map((m) => m[1]));
  heads[c] = new Set([...h.matchAll(/<h2[^>]*>(\d+)\./g)].map((m) => m[1]));
}
const esiste = (c, n) =>
  arts[c]?.has(n) || heads[c]?.has(n) || [...(arts[c] ?? [])].some((a) => a.startsWith(n + "."));
let rotti = 0;
for (const f of files) {
  const txt = readFileSync(join(dir, f), "utf8").replace(/<[^>]+>/g, "");
  for (const m of txt.matchAll(/doc\.\s*(0\d)(?:,|\s)\s*artt?\.\s*([\d.]+(?:\s*(?:,|e|–|-)\s*[\d.]+)*)/g))
    for (const n of m[2].split(/\s*(?:,|e|–|-)\s*/).map((s) => s.replace(/\.$/, "")).filter(Boolean))
      if (!esiste(m[1], n)) { rotti++; console.log(`${f}: doc. ${m[1]} art. ${n} NON ESISTE`); }
  for (const m of txt.matchAll(/artt?\.\s*([\d.]+)\s+del doc\.\s*(0\d)/g))
    if (!esiste(m[2], m[1].replace(/\.$/, ""))) { rotti++; console.log(`${f}: art. ${m[1]} del doc. ${m[2]} NON ESISTE`); }
}
console.log(rotti ? `${rotti} rinvii rotti` : "Tutti i rinvii del fascicolo sono risolti.");
process.exit(rotti ? 1 : 0);

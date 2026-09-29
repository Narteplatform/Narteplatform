// Registra su iubenda il testo dei documenti che iubenda NON genera.
//
// Esegui con:  npm run iubenda:notices
//              npm run iubenda:notices -- --dry-run     (non scrive niente)
//
// ────────────────────────────────────────────────────────────────────────────
// A COSA SERVE, E PERCHÉ NON SI FA DAL PANNELLO.
//
// La Consent Database di iubenda archivia le prove di consenso, e ogni prova
// rimanda a un «legal notice»: l'etichetta del testo che l'utente aveva davanti.
// Per i documenti generati da iubenda — la nostra informativa privacy — esiste
// una casella nel pannello che li sincronizza da sé:
//     Dashboard → [sito] → Consent Database → EMBED
//         ☑ Sync your iubenda legal documents with the Consent Database
//
// Per i TERMINI non funziona, perché iubenda non li genera: il generatore parte
// dal piano Advanced, e le tre clausole che contano per N'arte nessun generatore
// le produrrebbe comunque. Il pannello non offre un modo per registrare un
// documento ospitato altrove. Lo si fa con questa chiamata.
//
// COSA CAMBIA IN CONCRETO. Senza, la prova di consenso porta l'etichetta
// «terms» e nulla più. Con, porta il testo esatto che la persona ha accettato,
// conservato da un terzo. La differenza si vede solo il giorno in cui qualcuno
// sostiene di aver accettato qualcos'altro.
//
// QUANDO RIESEGUIRLO: ogni volta che il testo dei Termini cambia in modo
// sostanziale. iubenda assegna un numero di versione progressivo a ogni invio e
// conserva i precedenti, quindi le prove già raccolte restano agganciate alla
// versione che era in vigore allora.
// ────────────────────────────────────────────────────────────────────────────
//
// ⛔ SCRIVE, e scrive su un servizio esterno. Con `--dry-run` mostra solo cosa
//    invierebbe. Non tocca in alcun modo il database di N'arte.

const DRY_RUN = process.argv.includes("--dry-run");

/** `--site=https://...` per leggere i Termini da un indirizzo diverso da quello
 *  configurato: serve a provare l'estrazione contro la produzione mentre in
 *  locale `NEXT_PUBLIC_SITE_URL` punta a localhost. */
const SITE_ARG = process.argv
  .find((a) => a.startsWith("--site="))
  ?.slice("--site=".length);

const API_KEY = process.env.IUBENDA_CONSENT_API_KEY;
const SITE = (SITE_ARG || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

// In prova la chiave non serve: si verifica solo che il testo si estragga bene.
if (!API_KEY && !DRY_RUN) {
  console.error(
    "❌ IUBENDA_CONSENT_API_KEY mancante.\n" +
      "   Serve la chiave PRIVATA: quella pubblica non è ammessa su questo endpoint.\n" +
      "   Pannello iubenda → Consent Database → API keys."
  );
  process.exit(1);
}
if (!SITE) {
  console.error(
    "❌ NEXT_PUBLIC_SITE_URL mancante: non so da quale indirizzo leggere i Termini."
  );
  process.exit(1);
}

// ─────────────────────────────────────────── il testo, letto dal sito pubblicato
//
// Si legge dalla pagina invece che dal sorgente per una ragione precisa: così si
// registra ciò che gli utenti VEDONO DAVVERO, non ciò che sta nel ramo corrente.
// Se il deploy è indietro rispetto al codice, questo script se ne accorge — e in
// una prova di consenso quella differenza conta.
async function leggiTermini() {
  const url = `${SITE}/termini`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} ha risposto ${r.status}`);
  const html = await r.text();

  // Il corpo del documento è reso in un solo contenitore `.blog-prose` e contiene
  // esclusivamente h2/h3/p/ul/li: nessun <div> annidato, quindi fermarsi al primo
  // </div> è corretto. Se un domani la struttura cambia, le verifiche qui sotto
  // fanno fallire lo script invece di registrare un testo troncato.
  const m = html.match(/class="blog-prose[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) throw new Error("blocco .blog-prose non trovato in /termini");

  const testo = m[1].trim();
  if (testo.length < 3000) {
    throw new Error(`testo troppo corto (${testo.length} caratteri): estrazione sospetta`);
  }
  for (const atteso of ["Il ruolo di N", "adempimenti dell", "Contenuti caricati"]) {
    if (!testo.includes(atteso)) {
      throw new Error(`manca la sezione attesa «${atteso}»: estrazione incompleta`);
    }
  }
  return testo;
}

async function registra(identifier, content) {
  if (DRY_RUN) {
    console.log(`   (prova) invierei «${identifier}», ${content.length} caratteri`);
    return;
  }
  const r = await fetch("https://consent.iubenda.com/legal_notices", {
    method: "POST",
    headers: { ApiKey: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, content }),
  });
  const corpo = await r.text();
  if (!r.ok) {
    throw new Error(`iubenda ha risposto ${r.status}: ${corpo.slice(0, 400)}`);
  }
  let versione = "?";
  try {
    versione = JSON.parse(corpo).version ?? "?";
  } catch {
    /* la risposta è comunque andata a buon fine */
  }
  console.log(`   ✅ «${identifier}» registrato — versione iubenda ${versione}`);
}

console.log(`🔎 Leggo i Termini da ${SITE}/termini`);
const termini = await leggiTermini();
console.log(`   trovati ${termini.length} caratteri`);

if (DRY_RUN) console.log("\n🔸 Modalità prova: nessuna scrittura.\n");
else console.log("");

await registra("terms", termini);

console.log(`
─────────────────────────────────────────────────────────────────
L'informativa privacy NON va registrata da qui: la genera iubenda,
e si sincronizza da sé attivando la casella nel pannello —
  Dashboard → [sito] → Consent Database → EMBED
    ☑ Sync your iubenda legal documents with the Consent Database

Rieseguire questo comando quando il testo dei Termini cambia.
`);

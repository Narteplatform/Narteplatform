/**
 * Video presenti su bunny.net che nessuna riga del database nomina.
 *
 * DA DOVE VENGONO. La riga su Bunny nasce al momento della firma, prima che il
 * trasferimento cominci: è voluto, serve a non avere guid inventati dal client
 * e a occupare subito lo slot del piano. Ma se l'artista chiude la pagina a
 * metà caricamento, su Bunny resta un video che il database non nominerà mai —
 * invisibile nell'interfaccia e a pagamento per sempre. Lo stesso vale per le
 * prove fatte a mano dal pannello Bunny.
 *
 * SOLA LETTURA PER DIFETTO. Senza argomenti elenca e basta. Cancella solo con
 * --elimina, e solo i video che nessuna riga nomina: quelli referenziati non
 * vengono toccati in nessun caso.
 *
 *   npm run bunny:orfani              elenca
 *   npm run bunny:orfani -- --elimina rimuove gli orfani
 */
import { createClient } from "@supabase/supabase-js";

const LIB =
  process.env.BUNNY_STREAM_LIBRARY_ID ?? process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID;
const KEY = process.env.BUNNY_STREAM_API_KEY;
const ELIMINA = process.argv.includes("--elimina");

if (!LIB || !KEY) {
  console.error("Mancano BUNNY_STREAM_LIBRARY_ID o BUNNY_STREAM_API_KEY.");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const STATI = {
  0: "in coda", 1: "caricato", 2: "conversione", 3: "finita",
  4: "pronto", 5: "FALLITO", 6: "presentato", 7: "riprova",
};
const mb = (n) => (n / 1024 / 1024).toFixed(1);
const GUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

async function videoDellaLibrary() {
  const tutti = [];
  for (let page = 1; ; page++) {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${LIB}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: KEY, accept: "application/json" } }
    );
    if (!r.ok) throw new Error(`API Bunny HTTP ${r.status}`);
    const j = await r.json();
    tutti.push(...(j.items ?? []));
    if (!j.items?.length || tutti.length >= (j.totalItems ?? 0)) return tutti;
  }
}

/**
 * Ogni guid che il database nomina, ovunque si trovi. Se una lettura fallisce
 * si esce senza cancellare niente: un elenco incompleto qui significherebbe
 * scambiare per orfano un video che invece è in uso.
 */
async function guidNoti() {
  const noti = new Set();

  const { data: video, error } = await db
    .from("artist_videos")
    .select("bunny_guid")
    .not("bunny_guid", "is", null);
  if (error) throw new Error(`lettura artist_videos: ${error.message}`);
  for (const v of video ?? []) noti.add(v.bunny_guid.toLowerCase());

  for (const [tabella, colonna] of [
    ["events", "videos"],
    ["formats", "videos"],
    ["artist_applications", "video_url"],
    ["blog_posts", "content"],
  ]) {
    const { data, error: e } = await db.from(tabella).select(colonna);
    if (e) throw new Error(`lettura ${tabella}: ${e.message}`);
    for (const riga of data ?? []) {
      const valore = riga[colonna];
      const pezzi = Array.isArray(valore) ? valore : valore ? [String(valore)] : [];
      for (const p of pezzi) {
        for (const m of String(p).matchAll(new RegExp(GUID_RE, "gi"))) {
          noti.add(m[1].toLowerCase());
        }
      }
    }
  }
  return noti;
}

const [items, noti] = await Promise.all([videoDellaLibrary(), guidNoti()]);
const orfani = items.filter((v) => !noti.has(v.guid.toLowerCase()));
const spazio = orfani.reduce((s, v) => s + (v.storageSize ?? 0), 0);

console.log(`\nVideo sulla library: ${items.length}`);
console.log(`Guid nominati dal database: ${noti.size}`);
console.log(`Orfani: ${orfani.length} per ${mb(spazio)} MB\n`);

if (orfani.length === 0) {
  console.log("Niente da ripulire.\n");
  process.exit(0);
}

for (const v of orfani) {
  console.log(`  ${(v.title ?? "senza titolo").slice(0, 44).padEnd(44)} ${
    (STATI[v.status] ?? v.status).padEnd(12)} ${mb(v.storageSize ?? 0).padStart(7)} MB  ${v.dateUploaded}`);
}

if (!ELIMINA) {
  console.log(`\nSola lettura: non è stato cancellato niente.`);
  console.log(`Per rimuoverli:  npm run bunny:orfani -- --elimina\n`);
  process.exit(0);
}

console.log(`\nRimozione di ${orfani.length} video…\n`);
let tolti = 0;
for (const v of orfani) {
  const r = await fetch(`https://video.bunnycdn.com/library/${LIB}/videos/${v.guid}`, {
    method: "DELETE",
    headers: { AccessKey: KEY, accept: "application/json" },
  });
  const ok = r.ok || r.status === 404;
  if (ok) tolti++;
  console.log(`  ${ok ? "✅" : "🔴"} ${(v.title ?? "senza titolo").slice(0, 44)}${ok ? "" : ` — HTTP ${r.status}`}`);
}
console.log(`\n${tolti} di ${orfani.length} rimossi, ${mb(spazio)} MB liberati.\n`);

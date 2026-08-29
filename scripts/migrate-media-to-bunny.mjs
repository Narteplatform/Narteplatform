// Sposta su bunny.net i media già caricati su Supabase Storage.
//
//   node --env-file=.env.local scripts/migrate-media-to-bunny.mjs --artist <slug>
//   ... --apply     per scrivere davvero (senza, è una simulazione)
//
// ⚠️ NON CANCELLA NULLA DA SUPABASE. Né durante né dopo. I file restano dove
// sono: si copiano altrove e si riscrive l'indirizzo. Se qualcosa andasse
// storto, il manifest contiene ogni corrispondenza vecchio→nuovo e il ritorno
// indietro è una UPDATE.
//
// Le cinque regole di CLAUDE.md, tradotte in codice:
//  1. sola lettura finché non si passa --apply;
//  2. nessuna cancellazione, mai;
//  3. gli array si riscrivono INTERI e solo se ogni elemento è verificato:
//     su queste colonne un array parziale non "lascia le cose come stanno",
//     le cancella;
//  4. ogni lettura controlla `error` prima di derivarne una scrittura;
//  5. lo snapshot viene verificato NON VUOTO prima di trarne conclusioni.

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const slug = args[args.indexOf("--artist") + 1];
if (!args.includes("--artist") || !slug) {
  console.error("Uso: --artist <slug> [--apply]");
  process.exit(1);
}

const env = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`❌ variabile mancante: ${k}`); process.exit(1); }
  return v;
};
const ZONE = env("BUNNY_STORAGE_ZONE"), PWD = env("BUNNY_STORAGE_PASSWORD");
const SHOST = env("BUNNY_STORAGE_HOST"), STORE_CDN = env("NEXT_PUBLIC_BUNNY_STORAGE_CDN");
const LIB = env("BUNNY_STREAM_LIBRARY_ID"), SKEY = env("BUNNY_STREAM_API_KEY");
const STREAM_CDN = env("NEXT_PUBLIC_BUNNY_STREAM_CDN");

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...a) => console.log(...a);
const manifest = [];
let aborted = false;
const abort = (msg) => { console.error(`\n⛔ ${msg}\n   Nessun'altra scrittura verrà eseguita.`); aborted = true; };

// --- 1. Snapshot -------------------------------------------------------------
const { data: artist, error: aErr } = await db
  .from("artists")
  .select("id, stage_name, slug, cover_image, gallery, videos, audio_files")
  .eq("slug", slug)
  .maybeSingle();
if (aErr) { console.error("❌ lettura artists:", aErr.message); process.exit(1); }
if (!artist) { console.error(`❌ nessun artista con slug "${slug}"`); process.exit(1); }

const { data: videos, error: vErr } = await db
  .from("artist_videos")
  .select("id, title, provider, url, storage_path, size_bytes, mime_type, duration_ms")
  .eq("artist_id", artist.id)
  .order("created_at");
if (vErr) { console.error("❌ lettura artist_videos:", vErr.message); process.exit(1); }

// Regola 5: uno snapshot vuoto non prova niente. Se non c'è nulla da migrare,
// è un'informazione — ma se le colonne non esistessero o la query fosse
// fallita in silenzio, sembrerebbe identico. Per questo si controlla la FORMA.
if (!("gallery" in artist) || !("cover_image" in artist)) {
  console.error("❌ la riga non ha le colonne attese: query sospetta, mi fermo");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(process.cwd(), "scripts", ".migration");
mkdirSync(dir, { recursive: true });
const snapPath = join(dir, `${slug}-${stamp}.snapshot.json`);
writeFileSync(snapPath, JSON.stringify({ artist, videos }, null, 2));
log(`📸 snapshot salvato: ${snapPath}`);

const isSupabaseUrl = (u) =>
  typeof u === "string" && u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`);

log(`\nArtista: ${artist.stage_name} (${slug})`);
log(`Modalità: ${APPLY ? "⚠️  SCRITTURA ATTIVA" : "simulazione (aggiungi --apply per scrivere)"}\n`);

// --- helper ------------------------------------------------------------------
async function copyImageToBunny(sourceUrl, key) {
  const src = await fetch(sourceUrl);
  if (!src.ok) throw new Error(`sorgente non scaricabile (${src.status})`);
  const bytes = Buffer.from(await src.arrayBuffer());
  const ct = src.headers.get("content-type") ?? "image/jpeg";

  const put = await fetch(`https://${SHOST}/${ZONE}/${key}`, {
    method: "PUT", headers: { AccessKey: PWD, "Content-Type": ct }, body: bytes,
  });
  if (!put.ok) throw new Error(`PUT su Bunny fallita (${put.status})`);

  // VERIFICA prima di qualunque scrittura sul database: il file deve essere
  // servito dal CDN e avere la stessa dimensione dell'originale.
  const head = await fetch(`https://${STORE_CDN}/${key}`, { method: "HEAD" });
  if (!head.ok) throw new Error(`non servito dal CDN (${head.status})`);
  const served = Number(head.headers.get("content-length") ?? 0);
  if (served !== bytes.length) throw new Error(`dimensione diversa: ${served} vs ${bytes.length}`);

  return { url: `https://${STORE_CDN}/${key}`, bytes: bytes.length };
}

function probeDimensions(buffer) {
  try {
    const tmp = join(tmpdir(), `narte-probe-${Date.now()}.mp4`);
    writeFileSync(tmp, buffer);
    const out = execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height", "-of", "csv=p=0", tmp,
    ]).toString().trim();
    const [w, h] = out.split(",").map(Number);
    return w && h ? { width: w, height: h } : {};
  } catch { return {}; }
}

const rand = () => Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);

// --- 2. Immagini: cover + gallery --------------------------------------------
log("── Immagini ──");

// cover_image: colonna singola, nessun rischio di array
if (isSupabaseUrl(artist.cover_image)) {
  const key = `artists/${artist.id}/cover/${rand()}.jpg`;
  if (!APPLY) log(`  [simulazione] cover → ${key}`);
  else {
    try {
      const r = await copyImageToBunny(artist.cover_image, key);
      const { error } = await db.from("artists").update({ cover_image: r.url }).eq("id", artist.id);
      if (error) abort(`update cover_image fallita: ${error.message}`);
      else { log(`  ✅ cover copiata e verificata (${(r.bytes/1024).toFixed(0)} KB)`); manifest.push({ campo: "cover_image", da: artist.cover_image, a: r.url }); }
    } catch (e) { abort(`cover: ${e.message}`); }
  }
} else log("  cover: non su Supabase, lasciata com'è");

// gallery: ARRAY — il punto più pericoloso di tutto lo script
const gallery = Array.isArray(artist.gallery) ? artist.gallery : [];
if (gallery.length && !aborted) {
  const next = [];
  let allOk = true;
  for (const [i, url] of gallery.entries()) {
    if (!isSupabaseUrl(url)) { next.push(url); log(`  [${i}] esterna, lasciata com'è`); continue; }
    const key = `artists/${artist.id}/gallery/${rand()}.jpg`;
    if (!APPLY) { next.push(`(→ ${key})`); log(`  [simulazione] foto ${i + 1} → ${key}`); continue; }
    try {
      const r = await copyImageToBunny(url, key);
      next.push(r.url);
      manifest.push({ campo: `gallery[${i}]`, da: url, a: r.url });
      log(`  ✅ foto ${i + 1} copiata e verificata (${(r.bytes/1024).toFixed(0)} KB)`);
    } catch (e) { allOk = false; log(`  ❌ foto ${i + 1}: ${e.message}`); break; }
  }

  if (APPLY && !aborted) {
    // Regola 3: si scrive SOLO se ogni elemento è stato verificato e l'array ha
    // esattamente la stessa lunghezza di prima. Un array più corto qui
    // significherebbe cancellare le foto mancanti.
    const integro = allOk && next.length === gallery.length && next.every((u) => typeof u === "string" && u.length > 10);
    if (!integro) abort(`gallery NON riscritta: ${next.length}/${gallery.length} elementi verificati. Le foto restano quelle di prima.`);
    else {
      const { error } = await db.from("artists").update({ gallery: next }).eq("id", artist.id);
      if (error) abort(`update gallery fallita: ${error.message}`);
      else log(`  ✅ gallery riscritta per intero (${next.length} foto)`);
    }
  }
} else if (!gallery.length) log("  gallery: vuota");

// --- 3. Video ----------------------------------------------------------------
log("\n── Video ──");
for (const v of videos) {
  if (aborted) break;
  if (v.provider !== "supabase" || !v.url) { log(`  «${v.title}» già su ${v.provider}, saltato`); continue; }
  if (!APPLY) { log(`  [simulazione] «${v.title}» → Bunny Stream`); continue; }

  try {
    const src = await fetch(v.url);
    if (!src.ok) throw new Error(`sorgente non scaricabile (${src.status})`);
    const bytes = Buffer.from(await src.arrayBuffer());

    const created = await fetch(`https://video.bunnycdn.com/library/${LIB}/videos`, {
      method: "POST",
      headers: { AccessKey: SKEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title: v.title ?? "Video" }),
    });
    if (!created.ok) throw new Error(`creazione su Bunny fallita (${created.status})`);
    const { guid } = await created.json();

    const up = await fetch(`https://video.bunnycdn.com/library/${LIB}/videos/${guid}`, {
      method: "PUT", headers: { AccessKey: SKEY }, body: bytes,
    });
    if (!up.ok) throw new Error(`upload su Bunny fallito (${up.status})`);

    // VERIFICA: l'originale deve essere servito dal CDN prima di toccare la riga.
    const head = await fetch(`https://${STREAM_CDN}/${guid}/original`, { method: "HEAD" });
    if (!head.ok) throw new Error(`originale non servito dal CDN (${head.status})`);

    const dims = probeDimensions(bytes);

    // Il poster: estratto qui con ffmpeg, così esiste da subito come per i
    // caricamenti nuovi.
    try {
      const tmpIn = join(tmpdir(), `narte-${guid}.mp4`);
      const tmpOut = join(tmpdir(), `narte-${guid}.jpg`);
      writeFileSync(tmpIn, bytes);
      execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "1", "-i", tmpIn, "-frames:v", "1", "-q:v", "5", tmpOut]);
      const { readFileSync } = await import("node:fs");
      await fetch(`https://${SHOST}/${ZONE}/video-posters/${guid}.jpg`, {
        method: "PUT", headers: { AccessKey: PWD, "Content-Type": "image/jpeg" }, body: readFileSync(tmpOut),
      });
    } catch { /* poster assente: si ricade sulla thumbnail di Bunny */ }

    // ⚠️ url e storage_path NON vengono toccati: restano il valore Supabase.
    // È ciò che rende il ritorno indietro una singola UPDATE su `provider`.
    const { error } = await db.from("artist_videos").update({
      provider: "bunny", bunny_guid: guid, bunny_status: 0,
      playback_state: "processing", upload_state: "uploaded", ...dims,
    }).eq("id", v.id).eq("provider", "supabase");
    if (error) { abort(`update video «${v.title}» fallita: ${error.message}`); break; }

    manifest.push({ campo: `artist_videos.${v.id}`, da: v.url, a: `bunny:${guid}` });
    log(`  ✅ «${v.title}» → ${guid.slice(0, 8)} · ${dims.width ?? "?"}x${dims.height ?? "?"} · riproducibile subito dall'originale`);
  } catch (e) { abort(`video «${v.title}»: ${e.message}`); }
}

// --- 4. Manifest -------------------------------------------------------------
if (APPLY && manifest.length) {
  const mPath = join(dir, `${slug}-${stamp}.manifest.json`);
  writeFileSync(mPath, JSON.stringify(manifest, null, 2));
  log(`\n🗂  manifest: ${mPath}`);
}
log(aborted ? "\n⛔ interrotto: vedi sopra." : APPLY ? "\n✅ fatto. Nulla è stato cancellato da Supabase." : "\nSimulazione conclusa. Aggiungi --apply per eseguire.");

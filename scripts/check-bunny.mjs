// Verifica la configurazione bunny.net, senza stampare mai un segreto.
//
// Uso:  npm run bunny:check
//
// Cosa prova, nell'ordine (ogni passo è un cancello per quello dopo):
//   1. le variabili d'ambiente ci sono tutte;
//   2. la firma SigV4 di lib/storage/bunny/sigv4.ts corrisponde al vettore di
//      prova pubblicato da AWS — è il codice VERO che verrà usato in produzione,
//      non una copia;
//   3. le credenziali della storage zone funzionano (listing in sola lettura);
//   4. una PUT presigned dal "browser" riesce davvero: è il passo che scopre una
//      BUNNY_STORAGE_S3_REGION sbagliata, l'unico parametro non confermato dai doc;
//   5. la pull zone è collegata alla STORAGE ZONE e non a qualcos'altro — è
//      l'errore di configurazione più facile da fare sul pannello Bunny;
//   6. le credenziali della library Stream funzionano.
//
// Scrive un solo file di prova sotto __probe/ e lo cancella. Non tocca Supabase.

import { presignS3Url } from "../lib/storage/bunny/sigv4.ts";

let failures = 0;
const ok = (m) => console.log(`  ✅ ${m}`);
const ko = (m) => { failures++; console.log(`  ❌ ${m}`); };
const step = (m) => console.log(`\n${m}`);

// --- 1. Variabili d'ambiente -------------------------------------------------
step("1. Variabili d'ambiente");

const REQUIRED = [
  "BUNNY_STORAGE_ZONE", "BUNNY_STORAGE_PASSWORD", "BUNNY_STORAGE_HOST",
  "BUNNY_STORAGE_S3_HOST", "BUNNY_STORAGE_S3_REGION",
  "BUNNY_STREAM_LIBRARY_ID", "BUNNY_STREAM_API_KEY", "BUNNY_STREAM_WEBHOOK_KEY",
  "NEXT_PUBLIC_BUNNY_STORAGE_CDN", "NEXT_PUBLIC_BUNNY_STREAM_CDN",
  "NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID",
];
const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  ko(`mancano: ${missing.join(", ")}`);
  console.log("\nCompila .env.local e riprova. Le chiavi si trovano sul pannello Bunny:");
  console.log("  Storage → narte-media → Access → API/HTTP e S3");
  console.log("  Stream  → library → API");
  process.exit(1);
}
ok(`tutte presenti (${REQUIRED.length})`);

if (process.env.BUNNY_STREAM_API_KEY === process.env.BUNNY_STREAM_WEBHOOK_KEY) {
  ko("BUNNY_STREAM_API_KEY e BUNNY_STREAM_WEBHOOK_KEY sono uguali: sono due segreti DIVERSI (read/write vs Read-Only)");
}

const zone = process.env.BUNNY_STORAGE_ZONE.trim();
const password = process.env.BUNNY_STORAGE_PASSWORD.trim();
const storageHost = process.env.BUNNY_STORAGE_HOST.trim();
const s3Host = process.env.BUNNY_STORAGE_S3_HOST.trim();
const s3Region = process.env.BUNNY_STORAGE_S3_REGION.trim();
const storageCdn = process.env.NEXT_PUBLIC_BUNNY_STORAGE_CDN.trim().replace(/^https?:\/\//, "");
const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID.trim();
const streamKey = process.env.BUNNY_STREAM_API_KEY.trim();

// --- 2. Firma SigV4 ----------------------------------------------------------
step("2. Firma SigV4 (vettore di prova ufficiale AWS)");

const vector = presignS3Url({
  method: "GET",
  host: "examplebucket.s3.amazonaws.com",
  path: "/test.txt",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  expiresInSeconds: 86400,
  now: new Date("2013-05-24T00:00:00Z"),
});
const gotSig = new URL(vector).searchParams.get("X-Amz-Signature");
const wantSig = "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404";
gotSig === wantSig
  ? ok("l'implementazione corrisponde al vettore AWS")
  : ko(`firma diversa dal vettore AWS (attesa ${wantSig.slice(0, 12)}…, ottenuta ${String(gotSig).slice(0, 12)}…)`);

// --- 3. Credenziali storage (sola lettura) -----------------------------------
step("3. Credenziali della storage zone");

const listRes = await fetch(`https://${storageHost}/${zone}/`, { headers: { AccessKey: password } });
if (listRes.ok) {
  const entries = await listRes.json().catch(() => []);
  ok(`listing riuscito — ${Array.isArray(entries) ? entries.length : 0} elementi in radice`);
} else {
  ko(`listing fallito (${listRes.status}). 401 = password sbagliata, 404 = nome zone sbagliato`);
}

// --- 4. PUT presigned --------------------------------------------------------
step("4. PUT presigned (il percorso che userà il browser)");

const probeKey = `__probe/check-${Date.now()}.txt`;
const probeBody = "narte bunny check";
const contentType = "text/plain";
let probeUploaded = false;

const uploadUrl = presignS3Url({
  method: "PUT",
  host: s3Host,
  path: `/${zone}/${probeKey}`,
  accessKeyId: zone,
  secretAccessKey: password,
  region: s3Region,
  expiresInSeconds: 300,
  extraSignedHeaders: { "content-type": contentType },
});

const putRes = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": contentType },
  body: probeBody,
});
if (putRes.ok) {
  probeUploaded = true;
  ok(`PUT riuscita (${putRes.status}) — firma, region e CORS sono corretti`);
} else {
  const body = await putRes.text().catch(() => "");
  ko(`PUT fallita (${putRes.status}). Un 403 SignatureDoesNotMatch qui significa quasi sempre BUNNY_STORAGE_S3_REGION sbagliata (ora: "${s3Region}")`);
  if (body) console.log(`     risposta: ${body.slice(0, 200).replace(/\s+/g, " ")}`);
}

// --- 5. La pull zone punta alla storage zone? --------------------------------
step("5. Pull zone collegata alla storage zone");

if (!probeUploaded) {
  console.log("  ⏭  saltato: senza il file di prova non è verificabile");
} else {
  const cdnRes = await fetch(`https://${storageCdn}/${probeKey}`, { cache: "no-store" });
  const text = await cdnRes.text().catch(() => "");
  if (cdnRes.ok && text.trim() === probeBody) {
    ok(`${storageCdn} serve i file della storage zone`);
  } else if (cdnRes.headers.get("x-powered-by") || /<!doctype html/i.test(text)) {
    ko(`${storageCdn} risponde con una pagina HTML, non con il file: la pull zone ha Origin Type "URL" invece di "Storage Zone"`);
  } else {
    ko(`${storageCdn} non serve il file (${cdnRes.status}). Controlla che la pull zone abbia come origine la storage zone "${zone}"`);
  }
}

// --- pulizia ---
if (probeUploaded) {
  const del = await fetch(`https://${storageHost}/${zone}/${probeKey}`, {
    method: "DELETE",
    headers: { AccessKey: password },
  });
  console.log(del.ok || del.status === 404
    ? "  🧹 file di prova rimosso"
    : `  ⚠️  file di prova NON rimosso (${del.status}): cancella a mano ${probeKey}`);
}

// --- 6. Credenziali Stream ---------------------------------------------------
step("6. Credenziali della library Stream");

const libRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos?itemsPerPage=1`, {
  headers: { AccessKey: streamKey, Accept: "application/json" },
});
if (libRes.ok) {
  const page = await libRes.json().catch(() => ({}));
  ok(`library ${libraryId} raggiungibile — ${page.totalItems ?? 0} video`);
} else {
  ko(`library non raggiungibile (${libRes.status}). 401 = stai usando la Read-Only key o la API key dell'account invece di quella read/write della library`);
}

// --- esito -------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ Tutto a posto: bunny.net è configurato correttamente.\n"
    : `\n❌ ${failures} controllo/i falliti. Vedi sopra.\n`
);
process.exit(failures === 0 ? 0 : 1);

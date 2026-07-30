# Video artista su Bunny Stream — documento tecnico

> Destinatario: sviluppo. Versione per il cliente: [`VIDEO_SOLUZIONE_CLIENTE.md`](./VIDEO_SOLUZIONE_CLIENTE.md)
> Stato: **analisi e progetto**, nessuna riga implementata. Dati API verificati sulla documentazione ufficiale Bunny il 30/07/2026.
> Convenzione: ✅ = verificato sui doc ufficiali · 🔷 = proposta di design, da validare in implementazione.

---

## 1. Perché Bunny, e non le alternative

La decisione si riduce a un fatto: **il costo del video è la banda, non lo spazio.** Allo scenario più grande lo storage costa fra 7 e 24 $ su *ogni* fornitore; la banda oscilla fra 0 e 195 $. Tutto il resto è secondario.

Scenari — **Avvio** 300 artisti / 250 GB banda · **Crescita** 1.000 / 1,1 TB · **Scala** 3.000 / 3,7 TB, con video da 250 MB e mix 1 Free / 3 Pro / 5 Max:

| | Avvio | Crescita | Scala | Transcodifica | Bitrate adattivo |
|---|---:|---:|---:|:-:|:-:|
| Backblaze B2 + CF | $0,64 | $2,33 | $7,12 | ❌ | ❌ |
| Cloudflare R2 | $1,24 | $4,88 | $15,23 | ❌ | ❌ |
| **Bunny Stream** | **$3,35** | **$13,45** | **$43,00** | ✅ | ✅ |
| Vercel Blob | $14,63 | $63,96 | $211,08 | ❌ | ❌ |
| Supabase Pro | $25,00 | $67,51 | $239,70 | ❌ | ❌ |
| Cloudflare Stream | $19,95 | $78,40 | $248,50 | ✅ | ✅ |

R2 costa un terzo di Bunny. La differenza in valore assoluto è **8-28 $/mese**: irrilevante rispetto a ciò che compra.

**Cosa compra quella differenza:**

- **La transcodifica elimina un problema di prodotto, non lo mitiga.** Oggi `lib/upload/video-limits.ts:24-30` esclude `video/quicktime` perché i `.mov` iPhone sono HEVC e non si riproducono su Chrome/Firefox/Android. Il risultato pratico è che l'artista medio, che gira col telefono, **non riesce a caricare niente**: riceve `MOV_HELP` (`components/forms/VideoUpload.tsx:41`) e si arrende. Con R2 quel muro resta identico. Con Bunny sparisce.
- **Il bitrate adattivo riduce la banda che paghi.** Con file grezzi, chi guarda in 4G scarica i 250 MB pieni. Con HLS riceve la rendition adeguata: nei calcoli sopra ho applicato un fattore 0,6 sulla banda erogata, ed è prudente.
- **Upload resumable.** 250 MB da smartphone sono minuti di trasferimento. Oggi `lib/upload/putWithProgress.ts` con `xhr.timeout = 0` non ha alcun recupero: connessione persa = ricominci da zero.
- **Anteprime e sprite di seek generate da sole.** Nel progetto non esiste un solo attributo `poster`.

**Costo reale per artista Pro (scenario Crescita):** $0,013/mese contro un ricavo di €9,99. Lo 0,13%. La scelta non si gioca sul prezzo, si gioca su cosa funziona.

**I due prezzi da pagare, espliciti:**
1. **Lock-in.** I video sono transcodificati in formato proprietario: uscire significa ri-caricare e ri-transcodificare tutto. R2/B2 sono S3-compatibili, si migrano con una copia.
2. **Latenza di pubblicazione.** Il video non è riproducibile nell'istante in cui l'upload termina. Serve gestire uno stato.

---

## 2. Come è fatto Bunny Stream

Quattro concetti, e basta capire questi. ✅

| Concetto | Cos'è |
|---|---|
| **Video Library** | Il contenitore. Ha un `libraryId` numerico e una propria **API key**. Un progetto = una library. |
| **Video GUID** | L'identificatore del singolo video, creato *prima* di caricare il file. È la chiave che sostituisce `storage_path`. |
| **Pull Zone** | L'hostname CDN da cui escono i file: `{nome}.b-cdn.net` (per le library video è tipicamente `vz-xxxxxxxx-xxx.b-cdn.net`). Creata automaticamente con la library. |
| **Collection** | Cartella logica opzionale dentro la library. Utile per raggruppare per artista. 🔷 |

**Il punto che cambia tutto rispetto a Supabase Storage:** l'upload è in **due tempi**. Prima crei l'oggetto video via API e ottieni un GUID; poi carichi i byte su quel GUID. È esattamente la struttura che serve per firmare lato server senza far passare il file dal server — la stessa idea dei signed upload URL che il progetto già usa in `app/api/upload/video/route.ts`.

### URL dei file sul CDN ✅

```
https://{pullzone}.b-cdn.net/{videoId}/playlist.m3u8      ← HLS adattivo
https://{pullzone}.b-cdn.net/{videoId}/thumbnail.jpg      ← poster
https://{pullzone}.b-cdn.net/{videoId}/preview.webp       ← anteprima animata
https://{pullzone}.b-cdn.net/{videoId}/play_720p.mp4      ← rendition MP4 singola
https://{pullzone}.b-cdn.net/{videoId}/original           ← file originale
https://{pullzone}.b-cdn.net/{videoId}/captions/it.vtt    ← sottotitoli
```

Esistono anche `thumbnail_1.jpg` … `thumbnail_5.jpg` e gli sprite di seek generati ogni 2 secondi.

### URL del player iframe ✅

```
https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
```

*(La documentazione più recente riporta anche `player.mediadelivery.net/embed/...` e `/play/...`. Prendere l'hostname corrente dalla dashboard della library al momento dell'implementazione.)*

Parametri disponibili: `autoplay`, `preload`, `muted`, `loop`, `playsinline`, `t`, `captions`, `showSpeed`, `rememberPosition`, `compactControls`, controlli Chromecast/iOS.

---

## 3. Il flusso di upload: oggi vs domani

### Oggi

```
Browser  ──POST /api/upload/video (JSON, ~200 byte)──▶  Vercel
                                                        ├ getUser()
                                                        ├ size ≤ MAX_VIDEO_BYTES
                                                        ├ MIME ∈ {mp4, webm}
                                                        ├ ownership artista
                                                        ├ checkCollectionLimit()
                                                        └ createSignedUploadUrl()
Browser  ──PUT XHR multipart (il file)──────────────▶  Supabase Storage
Browser  ──addArtistVideo(metadati)─────────────────▶  Server Action → riga in artist_videos
```

### Domani 🔷

```
Browser  ──POST /api/upload/video (JSON)────────────▶  Vercel
                                                        ├ getUser()                        ← invariato
                                                        ├ size ≤ MAX_VIDEO_BYTES           ← invariato
                                                        ├ MIME allargato (accetta .mov)    ← modificato
                                                        ├ ownership artista                ← invariato
                                                        ├ checkCollectionLimit()           ← invariato
                                                        ├ POST video.bunnycdn.com/library/{id}/videos → guid
                                                        └ SHA256(libraryId+apiKey+expire+guid)
Browser  ──TUS upload a chunk (il file)─────────────▶  video.bunnycdn.com/tusupload
Browser  ──addArtistVideo(guid, titolo)─────────────▶  Server Action → riga con status "processing"
Bunny    ──POST webhook {Status: 3}─────────────────▶  /api/webhooks/bunny → riga a "ready"
```

**Il modello di sicurezza non cambia di una virgola.** Tutti e cinque i gate restano dove sono, nelle stesse righe di `app/api/upload/video/route.ts:26-95`. Cambia solo cosa viene firmato alla fine: prima un signed URL Supabase, ora una signature Bunny. Il commento alle righe 14-25 di quel file resta valido parola per parola — è la stessa architettura, con un altro destinatario.

---

## 4. La firma presigned

### Creazione del video ✅

```
POST https://video.bunnycdn.com/library/{libraryId}/videos
AccessKey: {BUNNY_STREAM_API_KEY}
Content-Type: application/json

{ "title": "…", "collectionId": "…" }

→ 200 { "guid": "657bb740-a71b-4529-a012-528021c31a92", "status": 0, … }
```

### Firma per l'upload TUS ✅

```
SHA256_HEX( libraryId + apiKey + expirationTime + videoId )
```

```ts
import { createHash } from "node:crypto";

const expire = Math.floor(Date.now() / 1000) + 86_400; // 24h
const signature = createHash("sha256")
  .update(`${libraryId}${apiKey}${expire}${guid}`)
  .digest("hex");
```

⚠️ **L'API key non deve mai raggiungere il browser.** Al client vanno solo `guid`, `libraryId`, `expire` e `signature`. È lo stesso principio per cui oggi il signed URL è generato con service role lato server.

⚠️ **`expirationTime` va tenuto lungo.** La scadenza vale per l'intero upload, non per la sua apertura: 500 MB da mobile possono richiedere 15 minuti e un utente può mettere in pausa. **24 ore** è il valore giusto; 5 minuti farebbe fallire gli upload lunghi a metà, con un errore incomprensibile per l'artista.

### Upload TUS ✅

Endpoint `https://video.bunnycdn.com/tusupload`, con header:

| Header | Valore |
|---|---|
| `AuthorizationSignature` | la SHA256 sopra |
| `AuthorizationExpire` | timestamp UNIX in secondi |
| `LibraryId` | id numerico della library |
| `VideoId` | il GUID |

Lato client serve la dipendenza **`tus-js-client`**, che sostituisce `lib/upload/putWithProgress.ts`. Espone nativamente `onProgress`, quindi la barra di avanzamento e il pulsante Annulla di `VideoUpload.tsx:215-240` restano identici — cambia solo chi li alimenta. In più si guadagna la ripresa automatica, che oggi non esiste.

---

## 5. Riproduzione: iframe o HLS diretto

Due strade. 🔷

| | iframe Bunny | HLS diretto |
|---|---|---|
| Implementazione | `<iframe src="…/embed/{lib}/{guid}">` | `<video>` + `hls.js` su `playlist.m3u8` |
| Player | quello di Bunny | il nostro |
| Controllo su design | scarso (solo parametri) | totale |
| Peso JS aggiunto | zero | ~40 KB (`hls.js`) |
| Safari/iOS | funziona | HLS nativo, `hls.js` non serve |
| Statistiche di visualizzazione | incluse in Bunny | da costruire |
| Token authentication | supportata sull'embed | supportata sui file |

**Raccomandazione: partire dall'iframe.** Zero JS, statistiche gratis, e il player Bunny è già accessibile e responsive. Il design system di N'arte impone comunque il contenitore (`aspect-video w-full`, bordi, `figcaption`), che è ciò che si vede davvero.

Se poi il player Bunny stona, si passa a HLS diretto **senza ricaricare nulla**: gli stessi file restano accessibili su `playlist.m3u8`. È una decisione reversibile, quindi non va presa adesso.

⚠️ Se si sceglie l'iframe: `next.config.ts` non contiene alcuna direttiva `frame-src`/CSP oggi, quindi non c'è nulla da sbloccare. Se in futuro si aggiunge una CSP, va inclusa `iframe.mediadelivery.net`.
⚠️ Se si sceglie HLS diretto con `next/image` per i poster: aggiungere `*.b-cdn.net` a `images.remotePatterns` in `next.config.ts` (oggi ci sono solo `*.supabase.co` e Unsplash).

---

## 6. Ciclo di vita del video e stati ✅

| Codice | Stato | Significato |
|:-:|---|---|
| 0 | Queued | in coda per l'encoding |
| 1 | Processing | generazione anteprima e metadati |
| 2 | Encoding | transcodifica in corso |
| **3** | **Finished** | **encoding completo, video pienamente disponibile** |
| **4** | **Resolution finished** | **una risoluzione è pronta: il video è già riproducibile** |
| 5 | Failed | encoding fallito |
| 6-8 | PresignedUpload Started/Finished/Failed | ciclo dell'upload presigned |
| 9 | CaptionsGenerated | sottotitoli automatici generati |
| 10 | TitleOrDescriptionGenerated | titolo/descrizione automatici |

**Il dettaglio che conta: lo stato 4 arriva prima del 3.** Appena una risoluzione è pronta il video si guarda già, mentre le altre continuano a essere generate. Quindi la condizione di "pubblicabile" è **`status === 3 || status === 4`**, non solo 3: usare solo il 3 allungherebbe l'attesa percepita senza motivo.

**Conseguenza sul prodotto:** serve uno stato intermedio nell'interfaccia. 🔷
- Nella dashboard artista (`VideoUpload.tsx`): card con "In elaborazione…" al posto del `<video>`, con polling o refresh.
- Sul profilo pubblico (`app/(user)/artisti/[slug]/page.tsx:662`): i video non ancora pronti **non si mostrano affatto**. Un player rotto è peggio di un video assente.
- Stato 5 (Failed): messaggio esplicito e possibilità di ricaricare. Va gestito, non ignorato — è l'unico caso in cui l'artista ha perso il lavoro fatto.

---

## 7. Webhook ✅

Bunny chiama un URL configurato nella library a ogni cambio di stato.

```json
POST /api/webhooks/bunny
{ "VideoLibraryId": 133, "VideoGuid": "657bb740-…", "Status": 3 }
```

Verifica di autenticità:

| Header | Valore |
|---|---|
| `X-BunnyStream-Signature-Version` | `v1` |
| `X-BunnyStream-Signature-Algorithm` | `hmac-sha256` |
| `X-BunnyStream-Signature` | 64 caratteri hex minuscoli |

Si calcola `HMAC-SHA256(rawBody, ReadOnlyAPIKey)` e si confronta **a tempo costante** (`crypto.timingSafeEqual`).

⚠️ **Va usato il body grezzo, mai un JSON riparsato e riserializzato.** Il progetto ha già esattamente questo pattern in `app/api/stripe/webhook/route.ts:153-162` (`const raw = await request.text()` prima di qualunque parsing): il webhook Bunny va modellato su quel file, non reinventato.

🔷 Il webhook aggiorna solo `artist_videos.status`. Nessuna scrittura su `artists`. È lo stesso principio del webhook Stripe, che scrive solo il fatto e lascia il resto ai trigger.

---

## 8. Sicurezza: la mappa di cosa sostituisce cosa

| Oggi (Supabase) | Domani (Bunny) 🔷 |
|---|---|
| Signed upload URL con service role | Signature SHA256 con API key server-side |
| Gate autenticazione/ownership/piano nella route | **Identico, stesse righe** |
| `storage_path` deve iniziare con `user.id` | `bunny_guid` verificato contro la riga in `artist_videos` |
| RLS `videos public read approved` su `artist_videos` | **Invariata** — i metadati restano su Supabase |
| Bucket pubblico, lettura via `/object/public/` | Pull zone pubblica, oppure token authentication |
| `deleteArtistVideo` con service role + `.remove()` | Stessa Server Action + `DELETE` sull'API Bunny |

**Cosa non cambia affatto:** i metadati dei video restano in Postgres, quindi RLS, `revoke insert/update/delete on public.artists` (`0038_artists_column_hardening.sql:50`) e tutta l'impostazione di sicurezza del progetto restano intatti. Bunny è **solo il disco e il CDN**, non diventa la fonte di verità.

**Protezione dei contenuti (opzionale).** ✅ Bunny offre l'*embed view token authentication*: `SHA256_HEX(token_security_key + video_id + expiration)`, aggiunto come `?token=…&expires=…` all'URL dell'iframe. Esiste anche MediaCage, un DRM base che impedisce il download del file.

🔷 **Raccomandazione: non attivarli all'inizio.** I profili artista sono pubblici e indicizzati — l'obiettivo è che i video vengano visti e condivisi, non protetti. La token auth introdurrebbe URL a scadenza incompatibili con la cache statica di Next.js e con la condivisione di un link. Valutarla solo se emergesse un problema concreto di hotlinking.

---

## 9. Modello dati 🔷

`artist_videos` (`supabase/migrations/0025_artist_videos.sql`) resta la tabella, con colonne aggiunte. **Nessuna colonna esistente va rimossa**: i video già caricati devono continuare a funzionare finché non si decide sulla migrazione.

```sql
alter table public.artist_videos
  add column if not exists provider      text    not null default 'supabase',
  add column if not exists bunny_guid    text,
  add column if not exists status        smallint,
  add column if not exists thumbnail_url text;

-- storage_path diventa opzionale: i video Bunny non ne hanno uno
alter table public.artist_videos alter column storage_path drop not null;

create unique index if not exists artist_videos_bunny_guid_key
  on public.artist_videos(bunny_guid) where bunny_guid is not null;

-- il webhook cerca per GUID: senza indice sarebbe un seq scan a ogni cambio di stato
create index if not exists artist_videos_bunny_lookup
  on public.artist_videos(bunny_guid);
```

La colonna `provider` fa convivere i due mondi senza forzare una migrazione immediata: il player sceglie come rendere in base al valore. `url` continua a contenere l'URL riproducibile — pubblico Supabase per i vecchi, `playlist.m3u8` o embed per i nuovi.

⚠️ `duration_ms`, `size_bytes` e `mime_type` oggi arrivano dal client via `probeVideo`. Con Bunny **la durata reale arriva dopo l'encoding**, e le rendition cambiano le dimensioni. Vanno riempite dal webhook o da una `GET` sull'API, non dal browser.

---

## 10. Perimetro di modifica 🔷

| File | Cosa cambia |
|---|---|
| `lib/upload/video-limits.ts` | `MAX_VIDEO_BYTES` → 500 MB · MIME allargato ai `.mov` · `MAX_VIDEO_PER_ARTIST` scollegato dai piani · `MOV_HELP` eliminabile |
| `app/api/upload/video/route.ts` | Gate invariati (righe 26-95). Sostituito solo il blocco finale: `createSignedUploadUrl` → create video Bunny + signature |
| `lib/upload/putWithProgress.ts` | Sostituito da `tus-js-client`. Il file può essere eliminato, `UploadAbortedError` va conservato |
| `lib/upload/probeVideo.ts` | Il controllo `playable` non serve più (Bunny transcodifica). La durata la fornisce Bunny |
| `components/forms/VideoUpload.tsx` | Client TUS · card "in elaborazione" · limite da `ent.videoMax` non dalla costante piatta |
| `app/(artist)/dashboard/_actions.ts` | `addArtistVideo` (riga 389) accetta `bunny_guid`; `deleteArtistVideo` (riga 474) chiama anche l'API Bunny |
| `app/(user)/artisti/[slug]/page.tsx` | Player condizionato su `provider`; nasconde i video non pronti (riga ~662) |
| `lib/billing/plans.ts` | `videoMax` → 1 / 3 / 5 |
| `app/api/webhooks/bunny/route.ts` | **Nuovo.** Modellato su `app/api/stripe/webhook/route.ts` |
| `supabase/migrations/00XX_bunny_stream.sql` | **Nuova.** Le colonne del §9 |
| `package.json` | `+ tus-js-client` |

**Non si tocca:** `lib/billing/entitlements.ts`, l'RLS di `0025`, il middleware, `lib/supabase/*`.

**Il bucket `artist-videos` resta com'è** finché i video legacy sono lì. `0036_artist_videos_limits.sql` va rivisto solo se si decide di dismetterlo.

---

## 11. Variabili d'ambiente 🔷

```bash
BUNNY_STREAM_LIBRARY_ID=            # numerico
BUNNY_STREAM_API_KEY=               # SOLO server. Mai NEXT_PUBLIC_
BUNNY_STREAM_READONLY_KEY=          # verifica HMAC del webhook
BUNNY_STREAM_CDN_HOSTNAME=          # vz-xxxxxxxx-xxx.b-cdn.net

NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=  # solo se si usa l'iframe lato client
```

Da aggiungere a `.env.local.example` e da sincronizzare su Vercel con `npm run vercel:sync-env`.

⚠️ Lo script `scripts/sync-vercel-env.mjs:36` richiede `.vercel/project.json`, che **non esiste** in questa working copy: serve `vercel link` prima di usarlo.

---

## 12. Come si formano i costi, e come tenerli bassi ✅

| Voce | Prezzo |
|---|---|
| Storage | $0,01/GB-mese **per region di replica** |
| Delivery | $0,005–0,01/GB (EU/NA; le region lontane costano di più) |
| Encoding, player, thumbnail, sprite | **gratis** |
| Minimo mensile | $1 |

Tre leve concrete: 🔷

1. **Una sola region di replica.** Lo storage si moltiplica per il numero di region. Il pubblico è italiano: una region europea basta, e il CDN serve comunque tutto il mondo.
2. **Disattivare le rendition inutili.** Lo storage conta *tutte* le versioni generate. Sopra ho stimato 2× l'originale: togliendo 240p e 4K si scende sensibilmente.
3. **Volume tier sulla delivery.** $0,005 invece di $0,01 dimezza la voce più grande a regime.

**Monitoraggio:** la dashboard Bunny mostra storage e banda in tempo reale. Vale la pena guardarla dopo il primo mese reale: le stime qui sopra usano 250 MB come peso medio, ma è il **tetto tipico** dichiarato, non la media. Se la media reale è 150 MB, i costi calano di circa il 40%.

---

## 13. Trappole da conoscere

1. **API key nel browser = library compromessa.** Al client vanno solo GUID, libraryId, expire e signature.
2. **`AuthorizationExpire` troppo corto** = upload lunghi che falliscono a metà, con errore opaco. 24h.
3. **Il webhook HMAC va calcolato sul raw body.** Riparsare il JSON invalida la firma. Pattern già presente in `app/api/stripe/webhook/route.ts:158`.
4. **Lo stato 4 precede il 3.** Trattare "pubblicabile" come `3 || 4`.
5. **Il webhook può non arrivare.** Serve un fallback: `GET` dell'API sullo stato quando l'artista apre la dashboard, altrimenti un video resta "in elaborazione" per sempre.
6. **`createSignedUploadUrl` non è più la fonte di `url`.** Oggi `addArtistVideo` valida che l'URL inizi con il prefisso pubblico Supabase: quel controllo va riscritto sul dominio Bunny, non rimosso — è ciò che impedisce di iniettare un URL arbitrario.
7. **Storage = originale + tutte le rendition.** Non è il peso del file caricato.
8. **`VideoUpload` mostra oggi il limite del piano più alto a tutti** (`VideoUpload.tsx:53,60,178` usano la costante piatta invece di `ent.videoMax`). Passando a 1/3/5 il difetto peggiora: va corretto nella stessa passata.
9. **Portare Max a 5 non richiede migration.** Il commento in `lib/billing/plans.ts:16-20` avverte di un tetto video duplicato in SQL: **verificato, non esiste** — la duplicazione riguarda solo `eventApplicationsPerMonth`. Il commento è fuorviante e va corretto.
10. **Nessuna cancellazione da Supabase Storage** finché non è verificato che ogni file è online su Bunny, e comunque solo su autorizzazione esplicita (regola 2 di `CLAUDE.md`).

---

## 14. Migrazione dei video esistenti 🔷

Sono ~370 righe in `artist_videos` con `provider = 'supabase'`. Due strade:

**A — Convivenza (consigliata).** Non si migra nulla. I vecchi video continuano a funzionare da Supabase, i nuovi vanno su Bunny, `provider` discrimina il rendering. Zero rischio, zero downtime; il costo è un ramo in più nel player finché i vecchi non si esauriscono naturalmente.

**B — Migrazione attiva.** Bunny supporta il *fetch* da URL: si passa l'URL pubblico Supabase e Bunny scarica e transcodifica da solo, senza far transitare i byte da noi. Sequenza obbligata:

1. Per ogni riga: crea il video su Bunny, avvia il fetch dall'URL Supabase.
2. Attendi lo stato 3/4 tramite webhook.
3. **Verifica che il nuovo URL risponda 200 e sia riproducibile.**
4. Solo allora aggiorna la riga a `provider = 'bunny'`.
5. **La cancellazione da Supabase è un passo separato, manuale, autorizzato esplicitamente e successivo alla verifica di tutte le righe.**

In entrambi i casi lo script è **in sola lettura su Supabase Storage**. Non si cancella nulla per liberare spazio "tanto è già copiato".

---

## 15. Cosa resta da decidere

1. **Iframe Bunny o player HLS custom?** Reversibile, si può partire dall'iframe (§5).
2. **Migrazione A o B?** (§14)
3. **Limiti definitivi:** 500 MB · 1/3/5 confermati? Il tetto per piano richiede anche di rendere `VideoUpload` tier-aware (§13.8).
4. **Le rendition da tenere attive**, che determinano la voce storage (§12.2).

---

## Fonti ✅

[TUS resumable uploads](https://docs.bunny.net/stream/tus-resumable-uploads) · [Create video API](https://docs.bunny.net/reference/video_createvideo) · [Webhooks](https://docs.bunny.net/stream/webhooks) · [Embed token authentication](https://docs.bunny.net/stream/token-authentication) · [Storage structure](https://docs.bunny.net/docs/stream-video-storage-structure) · [Embedding videos](https://docs.bunny.net/docs/stream-embedding-videos) · [Stream pricing](https://bunny.net/pricing/stream/)

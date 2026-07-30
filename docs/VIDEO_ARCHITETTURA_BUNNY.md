# Archiviazione contenuti artisti su bunny.net — documento tecnico

> Destinatario: sviluppo. Versione per il cliente: [`VIDEO_SOLUZIONE_CLIENTE.md`](./VIDEO_SOLUZIONE_CLIENTE.md)
> Stato: **analisi e progetto**, nessuna riga implementata. Dati API e prezzi verificati sulla documentazione ufficiale il 30/07/2026.
> Convenzione: ✅ = verificato sui doc ufficiali · 🔷 = proposta di design, da validare in implementazione.
>
> Copre l'intero archivio caricato dagli artisti — video, immagini, audio — non solo i video.

---

## 1. Perché bunny.net, e non le alternative

La decisione si riduce a un fatto: **il costo dei contenuti è la banda, non lo spazio.** Allo scenario più grande lo storage costa fra 7 e 24 $ su *ogni* fornitore; la banda oscilla fra 0 e 195 $. Tutto il resto è secondario.

Scenari — **Avvio** 300 artisti / 250 GB banda · **Crescita** 1.000 / 1,1 TB · **Scala** 3.000 / 3,7 TB, con video da 250 MB e mix 1 Free / 3 Pro / 5 Max:

| | Avvio | Crescita | Scala | Transcodifica | Bitrate adattivo | Copre immagini/audio |
|---|---:|---:|---:|:-:|:-:|:-:|
| Backblaze B2 + CF | $0,64 | $2,33 | $7,12 | ❌ | ❌ | ✅ |
| Cloudflare R2 | $1,24 | $4,88 | $15,23 | ❌ | ❌ | ✅ |
| **bunny.net** | **$3,35** | **$13,45** | **$43,00** | ✅ | ✅ | ✅ |
| Vercel Blob | $14,63 | $63,96 | $211,08 | ❌ | ❌ | ✅ |
| Supabase Pro | $25,00 | $67,51 | $239,70 | ❌ | ❌ | ✅ |
| Cloudflare Stream | $19,95 | $78,40 | $248,50 | ✅ | ✅ | ❌ solo video |

R2 costa un terzo di bunny.net. La differenza in valore assoluto è **8-28 $/mese**: irrilevante rispetto a ciò che compra.

**Cosa compra quella differenza:**

- **La transcodifica elimina un problema di prodotto, non lo mitiga.** Oggi `lib/upload/video-limits.ts:24-30` esclude `video/quicktime` perché i `.mov` iPhone sono HEVC e non si riproducono su Chrome/Firefox/Android. Il risultato pratico è che l'artista medio, che gira col telefono, **non riesce a caricare niente**: riceve `MOV_HELP` (`components/forms/VideoUpload.tsx:41`) e si arrende. Con R2 quel muro resta identico. Con Bunny sparisce.
- **Il bitrate adattivo riduce la banda che paghi.** Con file grezzi, chi guarda in 4G scarica i 250 MB pieni. Con HLS riceve la rendition adeguata: nei calcoli sopra ho applicato un fattore 0,6 sulla banda erogata, ed è prudente.
- **Upload resumable.** 250 MB da smartphone sono minuti di trasferimento. Oggi `lib/upload/putWithProgress.ts` con `xhr.timeout = 0` non ha alcun recupero: connessione persa = ricominci da zero.
- **Un solo fornitore per tutto.** Stream, Storage e CDN vivono nello stesso account, con una sola fattura e un solo pannello. Cloudflare Stream non archivia immagini: servirebbe R2 accanto, cioè due integrazioni.

**Costo reale per artista Pro (scenario Crescita):** $0,013/mese contro un ricavo di €9,99. Lo 0,13%. La scelta non si gioca sul prezzo, si gioca su cosa funziona.

**I due prezzi da pagare, espliciti:**
1. **Lock-in sui video.** Sono transcodificati in formato proprietario: uscire significa ri-caricare e ri-transcodificare. *(Immagini e audio su Bunny Storage restano file normali: nessun lock-in.)*
2. **Latenza di pubblicazione sui video.** Non sono riproducibili nell'istante in cui l'upload termina. Immagini e audio sì.

---

## 2. La mappa completa dell'archivio

Gli 11 bucket Supabase esistenti e la loro destinazione. 🔷

| Bucket oggi | Contenuto | Destinazione | Perché |
|---|---|---|---|
| `artist-videos` | video artista | **Bunny Stream** | transcodifica + ABR |
| `event-videos` | video eventi | **Bunny Stream** | idem |
| `application-videos` | video candidatura | **Bunny Stream** | idem, e risolve i 50 MB dichiarati e irraggiungibili |
| `artist-images` | foto profilo + gallery | **Bunny Storage** | file statici, serviti a ogni visita |
| `event-covers` | cover eventi | **Bunny Storage** | idem |
| `venue-images` | foto locali | **Bunny Storage** | idem |
| `format-covers` | cover format | **Bunny Storage** | idem |
| `blog-covers` | cover articoli | **Bunny Storage** | idem |
| `collaboration-logos` | loghi partner | **Bunny Storage** | idem |
| `artist-audio` | tracce demo | **Bunny Storage** | file statico, `<audio preload="none">` basta |
| `chat-attachments` | PDF, documenti, foto in chat | ⛔ **resta su Supabase** | **contenuto privato** — vedi §10 |

**A regime Supabase conserva solo Postgres, Auth e gli allegati chat.** Rientra ampiamente nel piano gratuito: i $25/mese di Pro non servono più.

### ⚠️ Le immagini sono un problema di banda più grande dei video

Controintuitivo ma decisivo: **un video lo scarichi solo se qualcuno preme play; un'immagine la scarichi a ogni visita**, automaticamente, da chiunque, anche da chi rimbalza dopo due secondi.

Aggravante nel codice attuale: la gallery del profilo (`app/(user)/artisti/[slug]/page.tsx:631`) usa `<img loading="lazy">` grezzo — non `next/image` — e serve **il file originale a piena risoluzione**. Un profilo con 10 foto scarica ~3 MB per apertura. A 45.000 visite/mese sono **~90 GB di sola banda immagini**: diciotto volte l'intera quota gratuita di Supabase, prima che qualcuno guardi un video.

È il motivo per cui la compressione (§4) non è un dettaglio di rifinitura ma la leva economica principale su questo perimetro.

---

## 3. I prodotti Bunny e i prezzi ✅

| Prodotto | Uso | Prezzo |
|---|---|---|
| **Bunny Stream** | video | $0,01/GB-mese storage + delivery CDN |
| **Bunny Storage** (HDD) | immagini, audio, documenti | **$0,01/GB-mese** prime 2 region, +$0,005/GB per region extra |
| **Bunny Storage** (SSD "Edge") | idem, più veloce | $0,02/GB-mese per region |
| **Bunny CDN** | consegna di tutto | $0,01/GB EU-NA · $0,03 Asia · $0,045 Sud America · $0,06 MEA |
| **Volume tier CDN** | consegna, rete ridotta (10 PoP) | **$0,005/GB** fino a 500 TB |
| Bunny Optimizer | resize/WebP al volo via query string | $9,50/mese **per pull zone** |

Due dettagli che semplificano il conto:
- **Il traffico da Bunny Storage al CDN è gratuito**, e non ci sono costi per richiesta API. Si paga lo spazio e la consegna finale, nient'altro.
- **Minimo di $1/mese** per prodotto.

🔷 **Bunny Optimizer: non all'inizio.** $9,50/mese piatti costano più dell'intera bolletta immagini prevista. Lo stesso risultato si ottiene gratis comprimendo lato client (§4.1) e usando `next/image`, già configurato in `next.config.ts`. Diventa conveniente solo oltre ~1 TB/mese di immagini. Nota: **non produce AVIF**, solo WebP.

---

## 4. Compressione: i tre livelli

Il principio, da tenere presente in ogni scelta: **comprimere non significa degradare, significa smettere di trasferire dati che nessuno può percepire.** L'originale resta archiviato; si ottimizza la copia che viaggia.

### 4.1 — Nel browser, prima dell'upload

**Stato reale del codice oggi:**

| Contenuto | Comprime? | Come |
|---|:-:|---|
| Foto profilo, cover evento/format/blog, avatar, venue | ✅ | canvas: ritaglio a dimensione fissa + `toBlob("image/jpeg", 0.88)` (`components/forms/ImageUpload.tsx:106`) |
| **Foto gallery** | ❌ | `fd.append("file", file)` — **file originale**, tetto 5 MB (`GalleryUpload.tsx:33-37`) |
| Audio | ❌ | file originale, tetto 25 MB (`AudioUpload.tsx:46`) |
| Video | ❌ | corretto così: la ricodifica la fa Bunny |

I target di `ImageUpload` (`ImageUpload.tsx:10-18`): `artist` 900×1200 · `event` 1600×900 · `event_home` 900×1200 · `avatar` 400×400 · `venue` 1600×900 · `format` 900×1200 · `blog` 1600×900.

**Il divario è enorme.** Una foto da iPhone 12 MP è 4032×3024 e pesa 4-6 MB. Il pipeline di `ImageUpload` la porta a 900×1200 in JPEG q0.88 → **~250 KB: riduzione ~95%**. La gallery non fa nulla di tutto questo, ed è proprio la gallery a contenere il maggior numero di immagini della piattaforma (fino a 30 sul piano Max).

🔷 **Il fix è riusare il pipeline che esiste già**, non scriverne uno nuovo: estrarre la funzione canvas da `ImageUpload` e chiamarla anche in `GalleryUpload`.

⚠️ **E risolve un bug già attivo oggi.** Il tetto inline di `GalleryUpload` è **5 MB**, ma il body di una funzione Vercel si ferma a **4,5 MB**: una foto fra 4,5 e 5 MB — cioè un normale scatto da smartphone — **fallisce già adesso in produzione** con un errore opaco. Comprimere prima dell'upload lo elimina alla radice.

### 4.2 — All'ingresso, sui video (Bunny Stream) ✅

**Perché ricomprimere un video non ne peggiora la qualità percepita.**

Un telefono codifica in tempo reale: deve decidere quanti bit spendere su ogni fotogramma senza sapere cosa arriverà dopo, e senza poter tornare indietro. Per non rischiare artefatti visibili tiene il bitrate alto ovunque — anche su inquadrature ferme, dove un fotogramma è quasi identico al precedente e i bit sono sprecati.

Bunny ricodifica **offline**: può analizzare tutto il filmato, fare più passate e distribuire i bit dove servono davvero. Ordini di grandezza tipici: una registrazione da smartphone viaggia sui **17 Mbps a 1080p** (e fino a ~50 Mbps in 4K), mentre una rendition di streaming ben calibrata raggiunge la parità percettiva intorno ai **5 Mbps a 1080p** e ~2,5 Mbps a 720p.

Non si sta buttando qualità: si sta buttando ridondanza. E **l'originale resta comunque conservato** su `/{videoId}/original` ✅ — se un giorno servisse il master, è lì.

### 4.3 — Alla consegna (CDN)

- **Video — bitrate adattivo (HLS).** Il player negozia la rendition in base a schermo e banda. Su un display da sei pollici 1080p e 720p sono indistinguibili, ma pesano il doppio. Nei calcoli del §1 questo vale il fattore 0,6 sulla banda.
- **Immagini — WebP al posto di JPEG:** 25-35% in meno a parità di qualità percepita. Via `next/image` (gratis, già configurato) oppure via Bunny Optimizer (a pagamento, §3).
- **Audio — nessuna ricodifica.** 🔷 Un MP3 demo è già compresso; ricodificarlo aggiungerebbe perdita senza guadagno. Basta `preload="none"`, già in uso (`artisti/[slug]/page.tsx:611`), perché nessun byte parta prima del play.

### 4.4 — Effetto combinato

| | Oggi | Dopo 🔷 |
|---|---|---|
| Foto gallery archiviata | fino a 5 MB | ~250 KB |
| Banda immagini per visita profilo | ~3 MB | ~200 KB |
| Video archiviato | 250 MB grezzi | originale + rendition, servite in ~0,6× |
| Foto >4,5 MB | **upload fallito** | funziona |

La compressione delle immagini da sola riduce la voce "banda immagini" di circa il 95%, e **rende le pagine più veloci di adesso** anche a parità di fornitore.

---

## 5. Bunny Stream — video

### Concetti ✅

| Concetto | Cos'è |
|---|---|
| **Video Library** | Il contenitore. Ha un `libraryId` numerico e una propria **API key**. |
| **Video GUID** | Identificatore del singolo video, creato *prima* di caricare i byte. Sostituisce `storage_path`. |
| **Pull Zone** | Hostname CDN dei file: tipicamente `vz-xxxxxxxx-xxx.b-cdn.net`. Creata con la library. |
| **Collection** | Cartella logica opzionale. Utile per raggruppare per artista. 🔷 |

**Formati accettati in ingresso** ✅ — container MP4, MKV, WebM, **MOV**, AVI, FLV, WMV, TS, MPEG · codec H.264, **H.265/HEVC**, VP9, VP8, AV1, MPEG-2, ProRes · durata max **72 ore** · risoluzione max **2160p**.
È questo elenco a chiudere il problema `.mov`: HEVC è supportato in ingresso e ne esce H.264 riproducibile ovunque.

### URL dei file sul CDN ✅

```
https://{pullzone}.b-cdn.net/{videoId}/playlist.m3u8      ← HLS adattivo
https://{pullzone}.b-cdn.net/{videoId}/thumbnail.jpg      ← poster
https://{pullzone}.b-cdn.net/{videoId}/preview.webp       ← anteprima animata
https://{pullzone}.b-cdn.net/{videoId}/play_720p.mp4      ← rendition singola
https://{pullzone}.b-cdn.net/{videoId}/original           ← file originale
https://{pullzone}.b-cdn.net/{videoId}/captions/it.vtt    ← sottotitoli
```

Player iframe: `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}` ✅
*(I doc più recenti riportano anche `player.mediadelivery.net/embed/…` e `/play/…`: prendere l'hostname corrente dalla dashboard in fase di implementazione.)*

### Flusso di upload: oggi vs domani

```
OGGI
Browser ──POST /api/upload/video (JSON)──▶ Vercel ──▶ createSignedUploadUrl()
Browser ──PUT XHR multipart (file)───────▶ Supabase Storage
Browser ──addArtistVideo(metadati)───────▶ Server Action

DOMANI 🔷
Browser ──POST /api/upload/video (JSON)──▶ Vercel
                                            ├ getUser()                     ← invariato
                                            ├ size ≤ MAX_VIDEO_BYTES        ← invariato
                                            ├ MIME allargato (.mov, HEVC)   ← modificato
                                            ├ ownership artista             ← invariato
                                            ├ checkCollectionLimit()        ← invariato
                                            ├ POST library/{id}/videos → guid
                                            └ SHA256(libraryId+apiKey+expire+guid)
Browser ──TUS a chunk (file)─────────────▶ video.bunnycdn.com/tusupload
Browser ──addArtistVideo(guid, titolo)───▶ Server Action → riga "processing"
Bunny   ──POST webhook {Status: 3}───────▶ /api/webhooks/bunny → riga "ready"
```

**Il modello di sicurezza non cambia di una virgola.** Tutti e cinque i gate restano nelle stesse righe di `app/api/upload/video/route.ts:26-95`. Cambia solo cosa viene firmato alla fine. Il commento alle righe 14-25 di quel file resta valido parola per parola.

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

Endpoint `https://video.bunnycdn.com/tusupload`, header: `AuthorizationSignature`, `AuthorizationExpire`, `LibraryId`, `VideoId`.

⚠️ **L'API key non deve mai raggiungere il browser.** Al client vanno solo `guid`, `libraryId`, `expire`, `signature`.
⚠️ **`expirationTime` va tenuto lungo.** Vale per l'intero upload, non per la sua apertura: 500 MB da mobile possono richiedere 15 minuti, e l'utente può mettere in pausa. **24 ore.** Cinque minuti farebbero fallire gli upload lunghi a metà.

Lato client serve **`tus-js-client`**, che sostituisce `lib/upload/putWithProgress.ts`. Espone `onProgress` nativamente: barra e pulsante Annulla di `VideoUpload.tsx:215-240` restano identici, cambia chi li alimenta. In più si guadagna la ripresa automatica.

---

## 6. Bunny Storage — immagini e audio ✅

### API

```
PUT    https://{region}.storage.bunnycdn.com/{storageZone}/{path}
DELETE https://{region}.storage.bunnycdn.com/{storageZone}/{path}
GET    https://{region}.storage.bunnycdn.com/{storageZone}/{path}

AccessKey: {password della storage zone}   ← NON la API key dell'account
```

Region di default `storage.bunnycdn.com` (Falkenstein); alternative `ny.`, `la.`, `sg.`, `syd.`, `uk.`, `se.`, `br.`, `jh.`. Le cartelle intermedie vengono create da sole.

Consegna tramite una **Pull Zone collegata alla storage zone**: `https://{pullzone}.b-cdn.net/{path}` — traffico storage→CDN gratuito.

### Differenza architetturale rispetto a Stream 🔷

Bunny Storage **non ha un meccanismo di firma presigned**: l'`AccessKey` è un segreto e non può raggiungere il browser. Quindi **immagini e audio continuano a passare dal server**, esattamente come oggi in `app/api/upload/route.ts`.

Non è un problema, è una conseguenza della compressione: un'immagine compressa pesa ~250 KB, ben dentro il limite di 4,5 MB del body Vercel. **Vale solo se la gallery viene compressa (§4.1)** — altrimenti resta il bug già presente oggi.

Conseguenza pratica: `/api/upload` mantiene forma e gate attuali, cambia solo la destinazione della scrittura — da `admin.storage.from(bucket).upload()` a una `PUT` su Bunny Storage. 🔷

### Struttura dei path proposta 🔷

```
artists/{artistId}/profile/{timestamp}.jpg
artists/{artistId}/gallery/{timestamp}.jpg
artists/{artistId}/audio/{timestamp}.mp3
events/{eventId}/cover.jpg
venues/{venueId}/{timestamp}.jpg
blog/{slug}/cover.jpg
```

Prefisso per entità anziché per `user.id` come oggi: rende banale la cancellazione a cascata quando un artista viene eliminato — cosa che oggi **non avviene** (§15.6).

---

## 7. Consegna e riproduzione

### Video: iframe o HLS diretto 🔷

| | iframe Bunny | HLS diretto |
|---|---|---|
| Implementazione | `<iframe src="…/embed/{lib}/{guid}">` | `<video>` + `hls.js` su `playlist.m3u8` |
| Controllo sul design | scarso (solo parametri) | totale |
| JS aggiunto | zero | ~40 KB |
| Safari/iOS | funziona | HLS nativo, `hls.js` non serve |
| Statistiche di visualizzazione | incluse | da costruire |

**Raccomandazione: partire dall'iframe.** Zero JS, statistiche gratis, player già accessibile e responsive. Il contenitore lo impone comunque il design system (`aspect-video w-full`, bordi, `figcaption`), ed è quello che si vede. La decisione è **reversibile senza ricaricare nulla**: gli stessi file restano su `playlist.m3u8`.

### Immagini

🔷 Servite dalla pull zone e passate per `next/image`, che si occupa di WebP e delle dimensioni responsive. Richiede di aggiungere `*.b-cdn.net` a `images.remotePatterns` in `next.config.ts` (oggi solo `*.supabase.co` e Unsplash).

⚠️ La gallery usa `<img>` grezzo con `eslint-disable`: va portata a `next/image` nella stessa passata, altrimenti il livello 3 della compressione non si applica proprio dove servirebbe di più.

⚠️ Se in futuro si aggiunge una CSP (oggi `next.config.ts` non ne ha), includere `iframe.mediadelivery.net` in `frame-src` e `*.b-cdn.net` in `img-src`/`media-src`.

---

## 8. Ciclo di vita del video e stati ✅

| Codice | Stato | Significato |
|:-:|---|---|
| 0 | Queued | in coda |
| 1 | Processing | anteprima e metadati |
| 2 | Encoding | transcodifica in corso |
| **3** | **Finished** | encoding completo |
| **4** | **Resolution finished** | **una risoluzione pronta: già riproducibile** |
| 5 | Failed | encoding fallito |
| 6-8 | PresignedUpload Started/Finished/Failed | ciclo upload presigned |
| 9 | CaptionsGenerated | sottotitoli automatici |
| 10 | TitleOrDescriptionGenerated | titolo/descrizione automatici |

**Lo stato 4 arriva prima del 3.** Appena una risoluzione è pronta il video si guarda già. La condizione di "pubblicabile" è **`status === 3 || status === 4`**: usare solo il 3 allungherebbe l'attesa percepita senza motivo.

Conseguenze sull'interfaccia 🔷:
- Dashboard artista: card "In elaborazione…" al posto del `<video>`, con polling o refresh.
- Profilo pubblico (`artisti/[slug]/page.tsx:662`): i video non pronti **non si mostrano**. Un player rotto è peggio di un video assente.
- Stato 5: messaggio esplicito e possibilità di ricaricare. È l'unico caso in cui l'artista ha perso il lavoro fatto.

---

## 9. Webhook ✅

```json
POST /api/webhooks/bunny
{ "VideoLibraryId": 133, "VideoGuid": "657bb740-…", "Status": 3 }
```

Header di verifica: `X-BunnyStream-Signature-Version: v1`, `X-BunnyStream-Signature-Algorithm: hmac-sha256`, `X-BunnyStream-Signature` (64 hex minuscoli).
Si calcola `HMAC-SHA256(rawBody, ReadOnlyAPIKey)` e si confronta **a tempo costante** (`crypto.timingSafeEqual`).

⚠️ **Va usato il body grezzo, mai un JSON riparsato.** Il progetto ha già esattamente questo pattern in `app/api/stripe/webhook/route.ts:158` (`const raw = await request.text()` prima di ogni parsing): il webhook Bunny va modellato su quel file.

🔷 Il webhook aggiorna solo `artist_videos.status`. Nessuna scrittura su `artists` — stesso principio del webhook Stripe, che scrive il fatto e lascia il resto ai trigger.

---

## 10. Sicurezza: pubblico contro privato

**La regola che governa la mappa del §2:**
> Contenuto **pubblico** → CDN Bunny. Contenuto **privato** → Supabase con signed URL.

### Perché `chat-attachments` non va su CDN

Contiene le conversazioni fra artisti e organizzatori: PDF, preventivi, documenti contrattuali. Su una pull zone pubblica sarebbero **accessibili in permanenza a chiunque abbia l'URL, senza possibilità di revoca**.

⚠️ Vanno anzi nella direzione opposta: **restare su Supabase e diventare privati con signed URL**. Oggi il bucket è `public = true` con policy `select to anon, authenticated` (`0012_chat_attachments.sql:65`, `0013_chat_v2.sql:372`) — ed è un problema che **esiste già**, indipendente da questa migrazione. Peggiora: `docs/APPENDICE_TECNICA.md` §6 dichiara «lettura solo parti coinvolte», che è **falso**. Volume basso, quindi il costo non è mai stato il tema.

### Corrispondenze

| Oggi (Supabase) | Domani (Bunny) 🔷 |
|---|---|
| Signed upload URL con service role | Video: signature SHA256 server-side · Immagini: `PUT` server-side con AccessKey |
| Gate auth/ownership/piano nella route | **Identico, stesse righe** |
| `storage_path` inizia con `user.id` | `bunny_guid` verificato contro la riga in `artist_videos` |
| RLS `videos public read approved` | **Invariata** — i metadati restano su Supabase |
| Bucket pubblico | Pull zone pubblica |
| `deleteArtistVideo` service role + `.remove()` | Stessa Server Action + `DELETE` sull'API Bunny |

**Cosa non cambia affatto:** i metadati restano in Postgres, quindi RLS, `revoke insert/update/delete on public.artists` (`0038_artists_column_hardening.sql:50`) e l'impostazione di sicurezza del progetto restano intatti. **Bunny è solo disco e CDN, non diventa la fonte di verità.**

**Protezione dei contenuti (opzionale).** ✅ Bunny offre *embed view token authentication* — `SHA256_HEX(token_security_key + video_id + expiration)` come `?token=…&expires=…` — e MediaCage, un DRM base contro il download.
🔷 **Non attivarli all'inizio:** i profili artista sono pubblici e indicizzati, l'obiettivo è che i contenuti vengano visti e condivisi. URL a scadenza sono incompatibili con la cache statica e con la condivisione di un link. Da valutare solo su hotlinking concreto.

---

## 11. Modello dati 🔷

`artist_videos` (`0025_artist_videos.sql`) resta la tabella. **Nessuna colonna esistente va rimossa**: i contenuti già caricati devono continuare a funzionare.

```sql
alter table public.artist_videos
  add column if not exists provider      text    not null default 'supabase',
  add column if not exists bunny_guid    text,
  add column if not exists status        smallint,
  add column if not exists thumbnail_url text;

alter table public.artist_videos alter column storage_path drop not null;

create unique index if not exists artist_videos_bunny_guid_key
  on public.artist_videos(bunny_guid) where bunny_guid is not null;

-- il webhook cerca per GUID: senza indice sarebbe un seq scan a ogni cambio di stato
create index if not exists artist_videos_bunny_lookup
  on public.artist_videos(bunny_guid);
```

`provider` fa convivere i due mondi senza forzare una migrazione immediata: il player sceglie come rendere in base al valore.

**Immagini e audio non richiedono modifiche di schema:** `artists.gallery` (`text[]`) e `artists.audio_files` (`jsonb`) contengono URL, e cambia solo il dominio. ⚠️ Il che rende la migrazione delle immagini **un'operazione di riscrittura di array** — esattamente il tipo di scrittura che la regola 3 di `CLAUDE.md` segnala come distruttiva se il payload è incompleto. Va fatta leggendo, verificando e riscrivendo per intero, mai con un merge parziale.

⚠️ `duration_ms`, `size_bytes`, `mime_type` oggi arrivano dal client via `probeVideo`. Con Bunny **la durata reale arriva dopo l'encoding** e le rendition cambiano le dimensioni: vanno riempite dal webhook o da una `GET` sull'API, non dal browser.

---

## 12. Perimetro di modifica 🔷

### Video
| File | Cosa cambia |
|---|---|
| `lib/upload/video-limits.ts` | `MAX_VIDEO_BYTES` → 500 MB · MIME allargato ai `.mov` · tetto scollegato dai piani · `MOV_HELP` eliminabile |
| `app/api/upload/video/route.ts` | Gate invariati (26-95). Sostituito il blocco finale: `createSignedUploadUrl` → create video + signature |
| `lib/upload/putWithProgress.ts` | Sostituito da `tus-js-client`. Conservare `UploadAbortedError` |
| `lib/upload/probeVideo.ts` | Il check `playable` non serve più; la durata la dà Bunny |
| `components/forms/VideoUpload.tsx` | Client TUS · card "in elaborazione" · limite da `ent.videoMax` |
| `app/(artist)/dashboard/_actions.ts` | `addArtistVideo` (389) accetta `bunny_guid`; `deleteArtistVideo` (474) chiama l'API Bunny |
| `app/(user)/artisti/[slug]/page.tsx` | Player condizionato su `provider`; nasconde i video non pronti (~662) |
| `app/api/webhooks/bunny/route.ts` | **Nuovo**, modellato su `app/api/stripe/webhook/route.ts` |

### Immagini e audio
| File | Cosa cambia |
|---|---|
| `components/forms/ImageUpload.tsx` | Estrarre la funzione canvas in un modulo riusabile |
| `lib/upload/compressImage.ts` | **Nuovo**: il pipeline canvas condiviso |
| `components/forms/GalleryUpload.tsx` | **Comprimere prima dell'upload** (§4.1) — risolve anche il bug >4,5 MB |
| `components/forms/AudioUpload.tsx` | Solo destinazione; nessuna ricodifica |
| `app/api/upload/route.ts` | Gate invariati; scrittura su Bunny Storage anziché Supabase |
| `lib/storage/bunny.ts` | **Nuovo**: `putObject` / `deleteObject` su Edge Storage |
| `app/(user)/artisti/[slug]/page.tsx` | Gallery da `<img>` a `next/image` (631) |
| `next.config.ts` | `*.b-cdn.net` in `images.remotePatterns` |

### Trasversale
| File | Cosa cambia |
|---|---|
| `lib/billing/plans.ts` | `videoMax` → 1 / 3 / 5 |
| `supabase/migrations/00XX_bunny.sql` | Colonne del §11 |
| `package.json` | `+ tus-js-client` |

**Non si tocca:** `lib/billing/entitlements.ts`, l'RLS di `0025`, il middleware, `lib/supabase/*`.

---

## 13. Variabili d'ambiente 🔷

```bash
# Stream (video)
BUNNY_STREAM_LIBRARY_ID=
BUNNY_STREAM_API_KEY=              # SOLO server. Mai NEXT_PUBLIC_
BUNNY_STREAM_READONLY_KEY=         # verifica HMAC del webhook
BUNNY_STREAM_CDN_HOSTNAME=         # vz-xxxxxxxx-xxx.b-cdn.net

# Storage (immagini, audio)
BUNNY_STORAGE_ZONE=
BUNNY_STORAGE_PASSWORD=            # SOLO server
BUNNY_STORAGE_REGION=              # es. storage.bunnycdn.com
BUNNY_STORAGE_CDN_HOSTNAME=        # narte-assets.b-cdn.net

NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=   # solo se si usa l'iframe lato client
```

Da aggiungere a `.env.local.example` e sincronizzare con `npm run vercel:sync-env`.
⚠️ `scripts/sync-vercel-env.mjs:36` richiede `.vercel/project.json`, che **non esiste** in questa working copy: serve `vercel link` prima.

---

## 14. Costi: come si formano, e tre leve ✅

| Voce | Prezzo |
|---|---|
| Stream storage | $0,01/GB-mese **per region di replica** |
| Storage HDD | $0,01/GB-mese prime 2 region |
| CDN delivery | $0,005-0,01/GB (EU/NA) |
| Encoding, player, thumbnail, sprite | **gratis** |
| Storage → CDN | **gratis** |
| Minimo | $1/mese per prodotto |

**Le tre leve** 🔷
1. **Una sola region di replica.** Lo storage si moltiplica per il numero di region. Pubblico italiano: una region europea basta, il CDN serve comunque il mondo.
2. **Disattivare le rendition inutili.** Lo storage conta *tutte* le versioni. Le stime usano 2× l'originale: togliendo 240p e 4K si scende sensibilmente.
3. **Volume tier sulla delivery.** $0,005 invece di $0,01 dimezza la voce più grande a regime.

**Monitoraggio:** la dashboard Bunny mostra storage e banda in tempo reale. Da guardare dopo il primo mese reale: le stime usano 250 MB come peso medio per video, ma è il **tetto tipico dichiarato**, non una media misurata. Se la media reale è 150 MB, i costi calano di circa il 40%.

---

## 15. Trappole da conoscere

1. **API key / storage password nel browser = account compromesso.** Al client vanno solo GUID, libraryId, expire, signature.
2. **`AuthorizationExpire` troppo corto** = upload lunghi che falliscono a metà con errore opaco. 24h.
3. **HMAC del webhook sul raw body.** Riparsare il JSON invalida la firma. Pattern in `app/api/stripe/webhook/route.ts:158`.
4. **Lo stato 4 precede il 3.** "Pubblicabile" = `3 || 4`.
5. **Il webhook può non arrivare.** Serve un fallback: `GET` dello stato quando l'artista apre la dashboard, altrimenti un video resta "in elaborazione" per sempre.
6. **File orfani.** Rimuovere una foto dalla gallery o una traccia audio oggi cancella **solo l'URL dall'array**: il file resta nello storage. Solo i video hanno `deleteArtistVideo` con `.remove()` (`_actions.ts:474`). Cambiando fornitore il difetto si porta dietro — va corretto ora, non dopo.
7. **`addArtistVideo` valida il prefisso dell'URL.** Oggi controlla che inizi con l'URL pubblico Supabase: va **riscritto** sul dominio Bunny, non rimosso — è ciò che impedisce di iniettare un URL arbitrario.
8. **Storage = originale + tutte le rendition**, non il peso del file caricato.
9. **`VideoUpload` mostra a tutti il limite del piano più alto** (`VideoUpload.tsx:53,60,178` usano la costante piatta invece di `ent.videoMax`). Passando a 1/3/5 peggiora: correggere nella stessa passata.
10. **Portare Max a 5 non richiede migration.** Il commento in `lib/billing/plans.ts:16-20` avverte di un tetto video duplicato in SQL: **verificato, non esiste** — la duplicazione riguarda solo `eventApplicationsPerMonth`. Il commento è fuorviante e va corretto.
11. **`application-videos` accetta INSERT anonimo via RLS** (`0033_lotto_modifiche.sql:39-42`) mentre la route usa già il service role: porta aperta senza motivo.
12. **Nessuna cancellazione da Supabase Storage** finché non è verificato che ogni file è online su Bunny, e comunque solo su autorizzazione esplicita (regola 2 di `CLAUDE.md`).

---

## 16. Migrazione dei contenuti esistenti 🔷

### Video (~370 righe in `artist_videos`)

**A — Convivenza (consigliata).** Non si migra nulla: i vecchi restano su Supabase, i nuovi vanno su Bunny, `provider` discrimina il rendering. Zero rischio, zero downtime; il costo è un ramo in più nel player finché i vecchi non si esauriscono.

**B — Migrazione attiva.** Bunny supporta il *fetch da URL*: gli si passa l'URL pubblico Supabase e scarica e transcodifica da solo, senza far transitare i byte da noi.
1. Crea il video su Bunny, avvia il fetch dall'URL Supabase.
2. Attendi stato 3/4 via webhook.
3. **Verifica che il nuovo URL risponda 200 e sia riproducibile.**
4. Solo allora aggiorna la riga a `provider = 'bunny'`.
5. **La cancellazione da Supabase è un passo separato, manuale, autorizzato esplicitamente e successivo alla verifica di tutte le righe.**

### Immagini e audio

Copia diretta: `GET` da Supabase → `PUT` su Bunny Storage → riscrittura degli array di URL.

⚠️ **È il punto più delicato dell'intera migrazione.** `gallery` e `audio_files` sono array: una riscrittura parziale o un errore di lettura non gestito li **svuota**. Vale integralmente la regola 4 di `CLAUDE.md` — controllare `error` prima di derivare qualunque scrittura, e non proseguire mai con un `?? []`. Lo snapshot pre-migrazione va verificato non vuoto prima di trarne conclusioni (regola 5).

In tutti i casi lo script è **in sola lettura su Supabase Storage**. Non si cancella nulla per liberare spazio "tanto è già copiato".

---

## 17. Cosa resta da decidere

1. **Iframe Bunny o player HLS custom?** Reversibile, si può partire dall'iframe (§7).
2. **Migrazione A o B per i video?** E se e quando migrare le immagini (§16).
3. **Limiti definitivi:** 500 MB · 1/3/5 confermati? Richiede anche di rendere `VideoUpload` tier-aware (§15.9).
4. **Le rendition da tenere attive**, che determinano la voce storage (§14.2).
5. **Storage HDD o SSD?** $0,01 contro $0,02/GB. Per immagini servite da CDN l'HDD basta: il CDN assorbe le letture ripetute.

---

## Fonti ✅

**Stream:** [TUS resumable uploads](https://docs.bunny.net/stream/tus-resumable-uploads) · [Create video API](https://docs.bunny.net/reference/video_createvideo) · [Webhooks](https://docs.bunny.net/stream/webhooks) · [Token authentication](https://docs.bunny.net/stream/token-authentication) · [Storage structure](https://docs.bunny.net/docs/stream-video-storage-structure) · [Embedding](https://docs.bunny.net/docs/stream-embedding-videos) · [Video specification](https://docs.bunny.net/stream/video-specification)
**Storage e CDN:** [Storage API](https://docs.bunny.net/api-reference/storage) · [Storage pricing](https://bunny.net/pricing/storage/) · [CDN pricing](https://bunny.net/pricing/) · [Stream pricing](https://bunny.net/pricing/stream/) · [Optimizer](https://theimagecdn.com/docs/bunnycdn-pricing)
**Piattaforma:** [Vercel Functions limits](https://vercel.com/docs/functions/limitations) · [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits) · [Policy di utilizzo Aruba](https://www.cloud.it/termini-e-condizioni/policy-di-utilizzo-dei-serivizi-aruba)

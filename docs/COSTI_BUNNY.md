# Consumi e costi bunny.net — proiezione

> **Stato:** documento di sola analisi. Nessuna riga di codice, nessuna
> impostazione, nessun dato è stato modificato per produrlo: tutte le
> rilevazioni sono `GET` in sola lettura su Supabase, sull'API Bunny Stream e
> sul listing della storage zone.
>
> **Data:** 07/09/2026 · **Listino Bunny verificato:** 07/09/2026 sulle pagine
> ufficiali (§2) · **Misure sulla library reale:** 07/09/2026 (§4)
>
> Documento fratello: [`VIDEO_ARCHITETTURA_BUNNY.md`](./VIDEO_ARCHITETTURA_BUNNY.md),
> che descrive *come* funziona l'integrazione. Qui si risponde a una sola
> domanda: **quanto costa, e quanto costerà.**
>
> ⚠️ Le stime del §1 di quel documento (250 MB per video, storage «2× l'originale»,
> $3–43/mese) sono state scritte **prima** di avere video veri su Bunny. Adesso
> ce ne sono tre e si possono misurare: il moltiplicatore reale è **2,9×**, non
> 2×, e il peso non si misura in «MB per video» ma in **MB per secondo di
> video**. Questo documento sostituisce quelle stime.

---

## 0. La risposta in sette punti

1. **Oggi si paga il minimo di fatturazione**: il consumo reale vale **meno di
   mezzo centesimo al mese**, la fattura minima Bunny è **$1/mese**.
2. Con **5.000 artisti e 2 milioni di pagine viste al mese** la configurazione
   attuale costa **≈ $97/mese**. Con le impostazioni corrette della library e il
   volume tier scende a **≈ $25/mese**, cioè **−74%**, senza toccare il codice
   per la parte più grossa del risparmio.
3. Anche nello scenario più grande considerato (15.000 artisti, 8 milioni di
   pagine viste) si resta sotto i **$100/mese** in configurazione ottimizzata:
   **lo 0,14% dei ricavi da abbonamento** di quello stesso scenario.
4. **Il costo non scala con gli artisti: scala con i minuti guardati e con le
   pagine viste.** Raddoppiare gli artisti costa poco; raddoppiare il tempo di
   visione costa il doppio esatto.
5. **Le immagini pesano più dei video: il 65% della banda in ogni scenario.**
   Non perché siano grandi, ma perché si scaricano a ogni visita, senza che
   nessuno prema play.
6. Le tre leve più grandi, in ordine: **volume tier** ($0,005 invece di $0,01/GB,
   −50% sulla voce maggiore), **miniature generate al caricamento** (−78% sulla
   banda immagini, cioè −43% dell'intera bolletta), **MP4 fallback e originale
   spenti sulla library** (−67% sullo storage video).
7. Il rischio non è la crescita: è il **picco**. Un video con un milione di
   riproduzioni costa $88–176 in una notte, senza preavviso. La protezione è un
   **tetto di banda sulla pull zone**: si imposta dal pannello in un minuto e va
   verificato che ci sia su entrambe le zone (§9).

---

## 1. Metodo — cosa è misurato e cosa è ipotizzato

Un documento di proiezione vale quanto la distinzione fra i due, quindi è
esplicita ovunque:

| Segno | Significato |
|:-:|---|
| **📏** | **Misurato** sul sistema reale il 07/09/2026. Non è un'ipotesi. |
| **📋** | **Da listino** ufficiale bunny.net, verificato il 07/09/2026. |
| **🔶** | **Ipotesi di comportamento** (quante visite, quanto si guarda). È qui che sta tutta l'incertezza. |

Le ipotesi 🔶 sono raccolte in un unico posto (§5) e sono tutte parametri di un
modello, non numeri sparsi: cambiando un parametro cambiano tutte le tabelle in
modo coerente. Il §15 dice quanto può sbagliare, e in quale direzione.

---

## 2. Il listino 📋

Verificato il 07/09/2026 su [bunny.net/pricing](https://bunny.net/pricing/),
[/pricing/storage](https://bunny.net/pricing/storage/),
[/pricing/stream](https://bunny.net/pricing/stream/) e
[docs/stream-pricing](https://bunny.net/docs/stream-pricing).

### Si paga

| Voce | Prezzo | Note |
|---|---|---|
| **Stream — storage** | **$0,01/GB-mese** | prima region. +$0,01 la seconda, +$0,005 ogni successiva |
| **Storage (HDD) — file** | **$0,01/GB-mese** | fino a 2 region. +$0,005 ogni region oltre la seconda, max 9 |
| **Storage (SSD «Edge»)** | $0,02/GB-mese per region | fino a 15 region |
| **CDN — rete Standard** | $0,01/GB **Europa e Nord America** · $0,03 Asia e Oceania · $0,045 Sud America · $0,06 Medio Oriente e Africa | 119 PoP |
| **CDN — rete Volume** | **$0,005/GB** fino a 500 TB · $0,004 fino a 1 PB · $0,002 oltre | tariffa unica mondiale, 10 PoP |
| **Bunny Optimizer** | $9,50/mese **per pull zone** | trasformazioni e richieste illimitate |
| **Encoding Premium** | $0,15/min a 2160p/1440p · $0,05/min a 1080p/720p · $0,025/min sotto | ⚠️ **è un interruttore nella library: da lasciare spento** |
| **Minimo di fatturazione** | **$1/mese** | è quello che si paga oggi |

### Non si paga

- **Transcodifica standard** — gratuita, e sarebbe la voce più cara altrove.
- **Player** — incluso, senza costi né per riproduzione né per spettatore.
- **Traffico Storage → CDN** — l'origin pull è gratis.
- **Chiamate API e operazioni** — nessun costo per richiesta, né su Storage né su CDN.
- **Upload in entrata** — caricare non costa: si paga solo ciò che esce verso i visitatori.
- **Thumbnail, sprite di seek, anteprime animate** — generati gratis. *(Occupano però storage: vedi §4.2.)*

> **Nota fiscale, da verificare in fattura.** bunny.net è una società slovena
> (UE): con partita IVA italiana valida a registro VIES la fattura dovrebbe
> essere in inversione contabile, senza IVA addebitata. Se la P.IVA non è
> registrata, aggiungere il 22%. Tutti gli importi di questo documento sono
> **in dollari, IVA esclusa**; dove si confrontano con i ricavi si usa
> **1 $ ≈ 0,92 €** 🔶.

---

## 3. Dove nasce il costo su N'arte

Quattro voci, e due di esse sono grandi.

```
                        ┌─────────────────────────── SI PAGA ──────────────┐
Artista carica ──TUS──▶ │ Bunny Stream    storage $0,01/GB-mese            │
  (gratis)              │   ├─ originale                                   │
                        │   ├─ ladder HLS (5 rendition)                    │
                        │   ├─ MP4 fallback (5 file)                       │
                        │   └─ thumbnail, sprite, anteprime                │
Artista carica ──PUT──▶ │ Bunny Storage   storage $0,01/GB-mese            │
  (gratis)              │   └─ foto, audio, poster dei video               │
                        │                                                  │
Visitatore  ◀───────────│ CDN delivery    $0,005–0,01/GB  ← LA VOCE GRANDE │
                        └──────────────────────────────────────────────────┘
```

Le due voci di storage crescono con **quanto è stato caricato** e restano
piccole. Le due voci di banda crescono con **quanto viene visto** e sono il 90%
della bolletta in ogni scenario oltre il lancio.

**La conseguenza pratica, che orienta tutte le leve del §10:** ottimizzare lo
storage fa risparmiare decine di dollari; ottimizzare la banda ne fa
risparmiare centinaia.

---

## 4. La misura reale — 07/09/2026 📏

Tutto ciò che segue è stato letto dal sistema in produzione, senza scrivere
nulla.

### 4.1 Cosa c'è oggi

| | Quantità | Peso |
|---|--:|--:|
| Artisti a catalogo | 11 | — |
| Video su Bunny Stream | 3 | **358,2 MB** |
| File su Bunny Storage | 15 | **2,78 MB** |
| Foto in gallery | 3 (su 1 artista) | 0,41 MB |
| Tracce audio | 0 | 0 |
| Poster video su Storage | 7 | 0,92 MB |
| Riproduzioni totali registrate | 4 | — |

**Bolletta reale:** 0,35 GB × $0,01 + 0,003 GB × $0,01 + banda trascurabile ≈
**$0,004/mese**, fatturati al minimo di **$1**.

⚠️ **Sette poster per tre video.** Quattro file `video-posters/*.jpg`
appartengono a video che non esistono più: sono orfani, esattamente come
previsto dalla trappola 6 di `VIDEO_ARCHITETTURA_BUNNY.md`. Oggi valgono
mezzo megabyte; a 5.000 artisti con lo stesso rapporto varrebbero qualche
gigabyte di storage pagato per niente. *(C'è anche un `__probe/check-*.txt` da
0 KB lasciato da `npm run bunny:check`.)*

### 4.2 Anatomia di un video: 181,4 MB per 21 secondi

Il video `0728499f` è un verticale girato in 4K (2160×3840), 21 secondi,
**74,18 MB** di file originale. Su Bunny occupa **181,4 MB**. Ecco dove
finiscono, misurato file per file:

| Componente | Peso | Quota | Serve al sito? |
|---|--:|--:|---|
| **Originale conservato** | 74,18 MB | 41% | Sì, ma **solo durante la transcodifica** (`BunnyOriginalPlayer`) |
| **MP4 fallback** (240/360/480/720/1080p) | 39,34 MB | 22% | **No. Zero riferimenti nel codice** |
| **Ladder HLS** (5 rendition) | ≈ 41,5 MB | 23% | Sì, è ciò che guarda il pubblico |
| **Sprite di seek, anteprime, thumbnail** | ≈ 26,4 MB | 14% | In parte (il poster viene da noi, non da qui) |

Dettaglio delle rendition MP4, misurato con `HEAD` sul CDN:

| Rendition | Peso | | Rendition | Peso |
|---|--:|:-:|---|--:|
| 240p | 1,67 MB | | 720p | 10,63 MB |
| 360p | 2,75 MB | | 1080p | 19,11 MB |
| 480p | 5,18 MB | | thumbnail + preview | 1,50 MB |

**Il moltiplicatore reale è 2,45× l'originale su questo video, 2,87× sui tre
insieme** (358,2 MB di storage contro 124,6 MB di file caricati). Il documento
di architettura ipotizzava 2×.

### 4.3 La misura che conta davvero: MB per secondo

I tre video hanno durate diverse e sorgenti diverse. Normalizzati:

| Video | Sorgente | Durata | Storage | **MB per secondo** |
|---|---|--:|--:|--:|
| `0728499f` | 2160×3840 (4K verticale) | 21 s | 181,4 MB | **8,64** |
| `4f73ca3d` | 1440×1080 | 28 s | 110,7 MB | **3,95** |
| `b1ad8111` | 1440×1080 | 17 s | 66,1 MB | **3,89** |

> **Questa è la costante da ricordare: circa 4 MB di storage per ogni secondo di
> video da sorgente 1080p, e più del doppio se l'artista carica in 4K.**

Tradotto: un video da 3 minuti costa **720 MB** di storage. Un video al tetto
dei 500 MB consentiti ne costa **circa 1,2 GB**. Ragionare in «numero di video»
porta fuori strada; ragionare in **secondi caricati** no.

### 4.4 I bitrate reali → quanto costa un minuto guardato

Letti dal manifest HLS (`AVERAGE-BANDWIDTH`), che è ciò che il player negozia
davvero:

| Rendition | Video 4K verticale | Video 1080p | **MB per minuto guardato** |
|---|--:|--:|--:|
| 240p | 0,69 Mbps | 0,57 Mbps | 4,3 – 5,1 |
| 360p | 1,23 Mbps | 0,99 Mbps | 7,4 – 9,3 |
| 480p | 2,08 Mbps | 1,46 Mbps | 10,9 – 15,6 |
| 720p | 4,25 Mbps | 2,56 Mbps | 19,2 – 31,9 |
| 1080p | 7,59 Mbps | 4,67 Mbps | 35,0 – 56,9 |

Con un mix realistico (30% 360p, 35% 480p, 25% 720p, 10% 1080p) 🔶 si ottiene
**≈ 18 MB per minuto guardato**, cioè **$0,00018 al minuto** in tariffa
standard e **$0,00009** in volume tier.

**Un'ora di visione costa circa un centesimo.** È il numero che rende
irrilevante il costo per singolo utente e pericoloso solo il picco (§9).

### 4.5 Le immagini, misurate

| File | Peso |
|---|--:|
| Cover artista | 115 KB |
| Foto gallery | 110 KB e 302 KB |
| Foto profilo (4 file) | 316–379 KB |
| Poster video (7 file) | 36–238 KB |

La compressione lato browser di `lib/upload/compressImage.ts` funziona: la media
è **≈ 230 KB**, in linea con i ~250 KB di progetto, contro i 4–6 MB di uno
scatto da telefono. **Questa parte del lavoro è già fatta e già pagata.**

⚠️ **Quello che non è ancora fatto è la consegna.** `ArtistCard`,
`SearchBar`, `PhotoWithFallback` e la gallery del profilo usano `<img>` grezzo
con `eslint-disable`, non `next/image`: **la card del catalogo scarica il file
pieno da 250 KB per mostrarlo a 300 px di larghezza.** Una pagina di catalogo
con 20 card sono **5 MB per visita**. È l'origine del 65% di banda della §7, ed
è la leva **L2**.

---

## 5. Il modello — parametri espliciti

Tutte le tabelle che seguono escono da questi numeri. Cambiarne uno cambia
tutto in modo coerente.

### Costanti misurate 📏

| Parametro | Valore | Da dove |
|---|--:|---|
| Storage per foto | 0,25 MB | §4.5 |
| Storage per traccia audio | 7 MB | MP3 4 min a 192 kbps 🔶 |
| Storage video, config attuale | **4,5 MB/s** | §4.3, media pesata |
| Storage video, MP4 e originale spenti | **1,5 MB/s** | §4.2, tolti il 41% e il 22% |
| Storage video, + ladder ridotta a 360/480/720 | **0,8 MB/s** | §4.4, somma dei bitrate |
| Banda per minuto guardato | **18 MB** | §4.4 |

### Ipotesi di comportamento 🔶

| Parametro | Valore | Perché |
|---|--:|---|
| Durata media di un video | 75 s | i tre reali stanno fra 17 e 28 s; 75 è prudente verso l'alto |
| Riempimento profilo Free | 2,1 foto · 0,5 video | 70% dei 3 slot foto, metà carica un video |
| Riempimento profilo Pro | 6 foto · 1,8 video · 0,7 audio | 60% degli slot |
| Riempimento profilo Max | 15 foto · 2,1 video · 0,8 audio | 50% degli slot (30 foto le riempie in pochi) |
| Mix delle pagine viste | 15% home · 35% catalogo · 40% profilo · 10% altro | il catalogo è la pagina di lavoro dell'organizzatore |
| Banda immagini per pagina, **oggi** | home 2,0 MB · catalogo 5,0 MB · profilo 1,5 MB | §4.5, file pieni |
| Banda immagini per pagina, **con miniature** | home 0,5 · catalogo 0,9 · profilo 0,45 | miniature 400 px in WebP |
| Quota di visite-profilo che avviano un video | 20% | la facciata impedisce i play involontari |
| Minuti guardati per play | 1,0 | video promozionali brevi |
| Mix dei piani | da 85/13/2 a 72/22/6 al crescere | maturazione della base |

---

## 6. Sei scenari — configurazione attuale

Tariffa standard EU-NA ($0,01/GB), library com'è configurata adesso, immagini
servite a piena risoluzione. **È lo scenario "non tocchiamo niente".**

| Scenario | Artisti | Video | Foto | Stream storage | File storage | Banda/mese | Storage | Banda | **Totale/mese** |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| **S0 · Oggi** 📏 | 11 | 3 | 3 | 0,35 GB | 0,003 GB | ~0 | $0,004 | ~$0 | **$1,00** ᵐ |
| **S1 · Lancio** | 100 | 70 | 287 | 23 GB | 0,1 GB | 125 GB | $0,23 | $1,25 | **$1,48** |
| **S2 · Traction** | 500 | 385 | 1.575 | 127 GB | 0,9 GB | 624 GB | $1,28 | $6,24 | **$7,52** |
| **S3 · Crescita** | 1.500 | 1.197 | 4.977 | 394 GB | 2,8 GB | 2,0 TB | $3,97 | $20,80 | **$24,77** |
| **S4 · Scala** | 5.000 | 4.200 | 17.625 | 1,4 TB | 10,5 GB | 8,1 TB | $13,95 | $83,20 | **$97,15** |
| **S5 · Nazionale** | 15.000 | 13.230 | 55.980 | 4,3 TB | 34 GB | 32,5 TB | $43,95 | $332,81 | **$376,76** |

ᵐ = sotto il minimo di fatturazione, si paga $1.

**Pagine viste al mese, per scenario:** S1 30.000 · S2 150.000 · S3 500.000 ·
S4 2.000.000 · S5 8.000.000.

**Prima lettura:** la banda è **l'83% del totale** già a S2 e l'**88%** a S5.
Ogni discorso sul risparmio che parta dallo storage sta guardando dalla parte
sbagliata.

---

## 7. Da dove viene la banda — le immagini pesano più dei video

| Scenario | Pagine viste | Immagini | Video | Totale | **Quota immagini** |
|---|--:|--:|--:|--:|--:|
| S1 · Lancio | 30.000 | 81 GB | 42 GB | 125 GB | **65%** |
| S2 · Traction | 150.000 | 403 GB | 211 GB | 624 GB | **65%** |
| S3 · Crescita | 500.000 | 1,3 TB | 703 GB | 2,0 TB | **65%** |
| S4 · Scala | 2.000.000 | 5,2 TB | 2,7 TB | 8,1 TB | **65%** |
| S5 · Nazionale | 8.000.000 | 21,0 TB | 11,0 TB | 32,5 TB | **65%** |

È il risultato più controintuitivo del documento ed è quello che decide le
priorità: **un video lo scarichi solo se qualcuno preme play; una foto la
scarichi sempre, anche da chi rimbalza dopo due secondi.**

A S4 la banda immagini vale **$53,71/mese**, quella video **$28,13**. Servire
miniature da 45 KB invece di file da 250 KB (leva **L2**) porta i $53,71 a
**$11,72** — e a **$5,86** insieme al volume tier.

---

## 8. Sensibilità — il numero che decide tutto

Il modello assume che il 20% delle visite-profilo avvii un video e che se ne
guardi 1 minuto. Se il prodotto funziona *meglio* di così, il costo sale in
proporzione diretta. Scenario S4 (5.000 artisti, 2 milioni di pagine):

| Minuti per play | Play rate | Banda video | Costo standard | Costo volume |
|--:|--:|--:|--:|--:|
| 0,5 | 10% | 703 GB | $7,03 | $3,52 |
| **1,0** | **20%** | **2,7 TB** | **$28,13** | **$14,06** |
| 2,0 | 30% | 8,2 TB | $84,38 | $42,19 |
| 4,0 | 40% | 22,0 TB | $225,00 | $112,50 |
| 8,0 | 50% | 55,0 TB | $562,50 | $281,25 |

**Il caso peggiore realistico costa 20 volte il caso base**, e resta comunque
sotto i $600/mese a fronte di €18.500/mese di abbonamenti nello stesso
scenario. Il costo dei media non è una minaccia al margine: è una voce che
cresce con il successo, in modo controllabile.

---

## 9. Il rischio vero: il picco, non la crescita

La crescita si vede arrivare. Un video che gira no.

| Evento | Banda generata | Standard EU | Volume tier |
|---|--:|--:|--:|
| 10.000 riproduzioni da 1 minuto | 176 GB | $1,76 | $0,88 |
| 100.000 riproduzioni da 1 minuto | 1,7 TB | $17,58 | $8,79 |
| 100.000 riproduzioni da 3 minuti | 5,1 TB | $52,73 | $26,37 |
| 1.000.000 riproduzioni da 1 minuto | 17,2 TB | $175,78 | $87,89 |

Gli importi sono sopportabili. Il problema è che **bunny.net è pay-as-you-go
senza tetto**: non esiste un limite di spesa che si attivi da solo, e un abuso
(hotlinking da un sito terzo, uno scraper che scarica tutte le gallery, un bot)
produce una fattura senza che nessuno se ne accorga fino al mese dopo.

**Le tre protezioni, tutte gratuite e tutte da configurare nel pannello:**

1. **Tetto di banda mensile sulla pull zone.** Bunny consente di impostare un
   limite oltre il quale la zone si disattiva. Meglio un sito con le immagini
   rotte per mezza giornata che una fattura a tre cifre non prevista. Da
   impostare a ~3× il consumo dell'ultimo mese, e da rialzare a ogni scalino.
2. **Hotlink protection** (referrer consentiti): impedisce che le foto e i video
   di N'arte vengano serviti — a spese di N'arte — dentro il sito di qualcun altro.
3. **Avvisi di consumo** via email sull'account, con soglia bassa.

⚠️ **Il tetto di banda va messo sulla pull zone delle immagini E su quella di
Stream.** Sono due zone distinte (`narte-assets.b-cdn.net` e
`vz-2f6b96ae-677.b-cdn.net`), e proteggerne una sola lascia aperta l'altra.

---

## 10. Le leve di risparmio — in ordine di rapporto fra guadagno e rischio

### L1 — Volume tier sulla consegna 🟢 *pannello, nessun codice*

**Risparmio: −50% sulla voce più grande.** $0,005/GB invece di $0,01, tariffa
unica mondiale fino a 500 TB/mese.
**Costo:** la rete Volume ha 10 PoP invece di 119. Per un pubblico italiano
servito da PoP europei la differenza di latenza è nell'ordine delle decine di
millisecondi su file che comunque si scaricano in blocco.
**Quanto vale:** $41/mese a S4, $166/mese a S5.
**Come:** pull zone → Pricing/Tier → Volume, su entrambe le zone.
⚠️ Da verificare con un test reale su una zona prima di spostare l'altra: se la
latenza percepita sulle immagini peggiora in modo visibile, si torna indietro
con un clic.

### L2 — Miniature generate al caricamento 🟢 *codice, nessun costo ricorrente*

**Risparmio: −78% sulla banda immagini**, cioè **−43% dell'intera bolletta**.
Oggi la card del catalogo scarica 250 KB per mostrarli in 300 px.
**Come:** `lib/upload/compressImage.ts` **fa già** ridimensionamento e
compressione su canvas. Basta produrre una seconda variante da 400 px
(~45 KB) accanto al file pieno e usarla in `ArtistCard`, `SearchBar`,
`FavoritesMenu` e nelle anteprime della gallery, con ripiego sul file pieno per
i contenuti già caricati.
**Costo:** +15% di storage (irrisorio: $1,60/mese a S4) e un intervento di
codice su un pugno di componenti.
**Quanto vale:** $42/mese a S4, $168/mese a S5.
**Perché non `next/image`:** funzionerebbe, ma sposterebbe il costo su Vercel,
che fattura le trasformazioni di immagine a parte e su un piano diverso. Una
miniatura generata una volta al caricamento non costa nulla per sempre.

### L3 — MP4 fallback spento sulla library 🟢 *pannello, nessun codice*

**Risparmio: −22% dello storage video.** Misurato: 39,34 MB su 181,4 MB di un
solo video.
**Costo: nessuno di cui il codice si accorga.** `streamMp4Url()` esiste in
`lib/storage/bunny/urls.ts` ma **non è chiamato da nessuna parte** — verificato
su tutto il repository. Il pubblico guarda l'HLS attraverso l'iframe.
**Quanto vale:** $3,08/mese di solo storage a S4, $9,70 a S5 — piccolo in valore
assoluto, ma è puro spreco: si paga per file che nessuno richiede.
**Come:** Stream → Library → Encoding → MP4 Fallback → off.
⚠️ **Vale solo per i video caricati dopo la modifica**: i tre esistenti tengono
i loro MP4 finché non vengono ricaricati.
⚠️ Da confermare con una prova su un iPhone e un Android reali dopo lo
spegnimento — il player Bunny usa HLS ovunque, ma la verifica costa cinque minuti.

### L4 — Originale non conservato 🟡 *pannello, ma tocca una funzione viva*

**Risparmio: −41% dello storage video.** È la fetta più grande.
**Costo: due cose reali.**
1. `BunnyOriginalPlayer` riproduce `/{guid}/original` **mentre** la
   transcodifica è in corso, così l'artista vede il video subito invece che
   fra venti minuti. La documentazione Bunny non chiarisce se l'originale resti
   disponibile durante l'encoding quando l'impostazione è spenta: **va provato
   su un video di prova prima di decidere**, non dedotto.
2. Si perde il master. Se un giorno servisse ri-esportare, non c'è più.
**Raccomandazione:** **tenerla accesa finché lo storage Stream non supera i
$5/mese** (fra S2 e S3, ~500 GB). Prima di allora si sta discutendo di due
dollari; dopo, si riapre il discorso con i numeri in mano.

### L5 — Ladder di rendition ridotta 🟡 *pannello, effetto visibile*

**Risparmio: da −25% a −45% dello storage video**, a seconda di cosa si toglie.
- **Togliere 240p** (1,67 MB su 181): risparmio minimo, e serve a chi ha una
  connessione pessima. **Da tenere.**
- **Togliere 1080p** (19,11 MB di MP4 + ~11 MB di HLS): risparmio grosso, ma il
  video a schermo intero su desktop si ferma a 720p. Su una piattaforma dove il
  video *è* il biglietto da visita dell'artista, è una scelta di prodotto, non
  di infrastruttura.
**Raccomandazione:** non toccarla adesso. Rientra in gioco solo se lo storage
supera i $20/mese, cioè oltre S4.

### L6 — Una sola region di replica 🟢 *già così, da non cambiare*

Lo storage si moltiplica per il numero di region: la seconda costa **il doppio**,
non un decimo. Con pubblico e artisti italiani, la region europea basta — il CDN
serve comunque il mondo intero pescando da lì.
**Da verificare che sia effettivamente una sola** nel pannello: è
un'impostazione che si attiva con un clic e raddoppia la voce storage per sempre.

### L7 — Tetto di durata per i video 🟡 *codice, scelta di prodotto*

È l'unica leva che agisce **prima** che il costo esista. Lo storage e la banda
non scalano con il *numero* di video ma con i **secondi**: oggi
`MAX_VIDEO_BYTES_BUNNY` limita i megabyte (500), che è un limite sul *peso*, non
sulla *durata*. Un artista può caricare 8 minuti compressi male dentro i 500 MB,
e costano quanto 8 minuti girati bene.
**Proposta 🔶:** un tetto esplicito di **3 minuti** per video, controllato dal
browser con `probeVideo` (che già legge la durata) prima di iniziare l'upload.
Non è solo un risparmio: un provino di 3 minuti è anche un provino migliore.
**Quanto vale:** dipende da quanto si allontana la durata media reale dai 75 s
ipotizzati. È la leva con il maggiore effetto se le ipotesi 🔶 si rivelano ottimiste.

### L8 — Pulizia dei file orfani 🟢 *codice, una tantum + manutenzione*

Oggi ci sono **7 poster per 3 video**. Rimuovere una foto dalla gallery o
cancellare un video lascia il file sullo storage: si paga per sempre un
contenuto che nessuno può più vedere.
**Come:** completare la cancellazione a cascata nelle Server Action che già
esistono, e passare una volta sui file attuali.
⚠️ **Qualsiasi pulizia è una cancellazione**: vale la regola 2 di `CLAUDE.md`,
si chiede prima, si elenca cosa si cancella, e si verifica che l'elenco degli
orfani non nasca da una query fallita (regola 5).

### L9 — Disattivare le region CDN costose 🟢 *pannello, alternativa a L1*

Sulla rete Standard, Sud America costa 4,5× l'Europa e il Medio Oriente 6×.
Bunny consente di spegnere le region: chi visita da lì viene servito dal PoP
attivo più vicino, alla tariffa di *quel* PoP.
**Non serve se si adotta L1**, che ha già tariffa unica mondiale. È l'opzione da
usare se il volume tier venisse scartato per motivi di latenza.

### L10 — Bunny Optimizer: **non adesso** 🔴

$9,50/mese fissi per pull zone, trasformazioni illimitate. Farebbe il lavoro di
L2 senza toccare il codice.
**La soglia, calcolata:** con un taglio del 65% sulla banda immagini, si ripaga
oltre **1,4 TB/mese di sole immagini** in tariffa standard, **2,9 TB/mese** in
volume tier. Sono i volumi di **S4**. Prima di allora costa più della bolletta
che dovrebbe ridurre.
**Nota:** produce WebP, non AVIF.

### L11 — Quello che sembra una leva e non lo è 🔴

- **Alzare il TTL della cache CDN non riduce la fattura.** Si paga il traffico
  che esce dal PoP verso il visitatore, non quello che il PoP prende
  dall'origine — e l'origin pull da Bunny Storage è **gratis**. Un hit rate
  migliore rende il sito più veloce; non fa risparmiare un centesimo.
- **Perma-Cache** risolve un problema di origini a pagamento. Qui l'origine è
  già gratis: aggiungerebbe un costo, non lo toglierebbe.
- **Storage SSD «Edge»** costa il doppio dell'HDD ($0,02 contro $0,01) e non
  serve: davanti c'è il CDN, che assorbe le letture ripetute.
- **Token authentication e Block Direct URL Access** proteggono, non
  risparmiano — e romperebbero `BunnyOriginalPlayer`, che legge l'URL diretto.
- ⚠️ **Encoding Premium** è un interruttore nella library e costa **$0,05 al
  minuto a 1080p**. Su 4.200 video da 75 s sarebbero **$262 una tantum** contro
  $0 dell'encoding standard. **Da controllare che sia spento e lasciarlo spento.**

---

## 11. Le tre configurazioni a confronto

**A** = com'è oggi. **B** = consigliata (L1 + L2 + L3, e L4 quando lo storage lo
giustifica). **C** = minima (B + ladder ridotta, quindi con un tetto di qualità
a 720p).

| Scenario | **A** attuale | **B** consigliata | **C** minima | Risparmio A→B | B per artista | Ricavi abbonamenti | **B in % dei ricavi** |
|---|--:|--:|--:|--:|--:|--:|--:|
| S0 · Oggi | $1,00 | $1,00 | $1,00 | — | — | €0 | — |
| S1 · Lancio | $1,48 | $1,00 | $1,00 | −74% | $0,010 | €184 | 0,50% |
| S2 · Traction | $7,52 | $1,98 | $1,78 | −74% | $0,004 | €1.289 | 0,14% |
| S3 · Crescita | $24,77 | $6,50 | $5,88 | −74% | $0,004 | €4.661 | 0,13% |
| S4 · Scala | $97,15 | $25,33 | $23,18 | −74% | $0,005 | €18.535 | 0,13% |
| S5 · Nazionale | $376,76 | $97,32 | $90,54 | −74% | $0,007 | €64.602 | 0,14% |

⚠️ **La colonna B include anche L4** (originale non conservato), che il §10
consiglia di rinviare finché lo storage non lo giustifica. **Rinviandola, B
costa:** +$0,56 a S2 · +$1,75 a S3 · **+$6,15 a S4** · +$19,38 a S5. Anche così
resta a un terzo di A.

**Due letture, entrambe importanti.**

1. **B costa un quarto di A a ogni scala**, e il grosso del risparmio viene da
   un interruttore nel pannello Bunny (L1) più un intervento di frontend già in
   gran parte scritto (L2): insieme valgono l'**87%** del risparmio ($62,59 dei
   $71,82 risparmiati a S4). Le due leve sullo storage valgono il restante 13%.
2. **C guadagna appena $2 su B a S4.** La configurazione minima non vale la
   perdita di qualità a 1080p: **la risposta giusta è B, e la ladder si tocca
   solo se le ipotesi si rivelano molto sbagliate.**

Il costo dei media resta **fra lo 0,13% e lo 0,14% dei ricavi da abbonamento** a
ogni scala. Per confronto, le commissioni Stripe sugli abbonamenti (ordine di
grandezza: ~1,5% + €0,25 a transazione sulle carte europee) costano **circa
venti volte** l'intera infrastruttura media.

---

## 12. Costi unitari — da tenere a mente

| Unità | Config attuale | Config consigliata |
|---|--:|--:|
| 1 foto archiviata (250 KB) per un mese | $0,0000024 | idem |
| 1 traccia audio (7 MB) per un mese | $0,00007 | idem |
| 1 video da 75 s per un mese | $0,0033 | **$0,0011** |
| 1 video da 3 minuti per un mese | $0,0079 | $0,0026 |
| 1 video al tetto dei 500 MB per un mese | $0,0120 | $0,0040 |
| 1 minuto guardato | $0,00018 | **$0,00009** |
| 1 visita al catalogo (20 card) | $0,00005 | **$0,0000045** |
| **1 profilo Pro pieno per un mese** | **$0,0060** | **$0,0020** |
| **1 profilo Max pieno per un mese** | **$0,0070** | **$0,0023** |

> **Un abbonato Pro paga €9,99 e costa 0,2 centesimi di dollaro al mese di
> infrastruttura media. Lo 0,02% del ricavo.** Un abbonato Max paga €49,99 e ne
> costa 0,23. Il costo marginale di un artista in più è, in pratica, zero: quello
> che costa è il pubblico che lo guarda — ed è esattamente il costo che si vuole
> avere.

---

## 13. Playbook — cosa fare, e a quale soglia

| Quando | Azione | Effetto |
|---|---|---|
| **Adesso** | Tetto di banda mensile su **entrambe** le pull zone + avvisi email | Elimina il rischio di fattura a sorpresa |
| **Adesso** | Verificare che **Encoding Premium** sia spento e che le region di replica siano **una** | Evita due voci che si accendono con un clic |
| **Adesso** | **L3** — MP4 fallback off, dopo prova su iPhone e Android | −22% storage video, per sempre |
| **Adesso** | **L1** — volume tier, prima su una zona sola | −50% sulla voce maggiore |
| **Al primo mese con traffico vero** | Misurare la durata media reale dei video e i minuti guardati (§14) | Sostituisce le due ipotesi 🔶 più fragili |
| **> 300 artisti** | **L2** — miniature al caricamento | −53% della bolletta totale |
| **> 300 artisti** | **L8** — pulizia orfani e cancellazione a cascata | Impedisce l'accumulo silenzioso |
| **Storage Stream > $5/mese** | Decidere su **L4** (originale) con i numeri in mano | −41% storage video |
| **Banda immagini > 1,4 TB/mese** | Valutare **Bunny Optimizer** se L2 non è stata fatta | Si ripaga da solo oltre la soglia |
| **Banda totale > 100 TB/mese** | Contattare Bunny per un contratto a volume | Fuori listino |

---

## 14. Come misurare davvero, ogni mese

Le ipotesi 🔶 hanno una data di scadenza: il primo mese di traffico reale. Da
guardare, in quest'ordine:

1. **Pannello Bunny → Statistics**: banda erogata per zona, storage per prodotto.
   È la verità, tutto il resto è modello.
2. **Durata media dei video caricati.** Se supera i 75 s ipotizzati, storage e
   banda salgono in proporzione diretta. Si legge dall'API Stream (`length`).
3. **Minuti guardati per riproduzione.** È il parametro più sensibile di tutti
   (§8) e Bunny lo espone: `totalWatchTime` diviso per le viste.
4. **Rapporto storage/originale.** Oggi è 2,87×; dopo aver spento MP4 fallback
   deve scendere verso 1,7×. Se non scende, la modifica non ha avuto effetto.

Le rilevazioni di questo documento vengono da due script temporanei in sola
lettura — solo `GET`, nessuna scrittura — tenuti fuori dal progetto. Se hanno da
diventare uno strumento ricorrente (`npm run bunny:costi`), è un lavoro di
mezz'ora, da fare su richiesta.

---

## 15. Quanto può sbagliare questo modello

**In eccesso (il costo reale sarà più basso):**
- I 75 s di durata media sono prudenti: i tre video reali stanno fra 17 e 28 s.
  Se la media vera fosse 30 s, **lo storage video si dimezza abbondantemente**.
- Il riempimento dei profili è probabilmente ottimista: molti profili Free non
  caricano nulla.
- La banda immagini per pagina assume che tutte le foto della gallery vengano
  scaricate; il `loading="lazy"` fa sì che chi non scorre non le scarichi.

**In difetto (il costo reale sarà più alto):**
- **Se gli artisti caricano in 4K, lo storage raddoppia**: 8,64 MB/s misurati
  contro 3,9 dei video 1080p. Nulla oggi lo impedisce, e i telefoni recenti
  girano in 4K di default.
- Se il tempo di visione cresce (ed è ciò che si vuole), la banda video cresce
  linearmente: la tabella §8 mostra fino a 20× il caso base.
- Bot e scraper non sono modellati. Su un catalogo pubblico e indicizzato
  possono valere una quota a due cifre della banda immagini.
- Le pagine viste per scenario sono un'ipotesi commerciale, non tecnica: è il
  parametro su cui questo documento ha meno da dire ed è quello che moltiplica
  tutto.

**Cosa non cambia in nessuno scenario:** l'ordine di grandezza. Anche
sbagliando di 3× ogni ipotesi, si resta sotto i $300/mese in configurazione B a
S5. Il costo bunny.net non è, e difficilmente diventerà, una voce che decide
qualcosa nel conto economico di N'arte.

---

## Fonti

**Listino, verificato il 07/09/2026:**
[CDN](https://bunny.net/pricing/) ·
[Storage](https://bunny.net/pricing/storage/) ·
[Stream](https://bunny.net/pricing/stream/) ·
[Come viene fatturato Stream](https://bunny.net/docs/stream-pricing) ·
[Optimizer](https://bunny.net/optimizer/) ·
[Struttura dei file di Stream](https://bunny.net/docs/stream-video-storage-structure) ·
[Encoding e MP4 fallback](https://docs.bunny.net/stream/mp4-downloads) ·
[Understanding Bunny Stream Storage](https://support.bunny.net/hc/en-us/articles/360020493180-Understanding-Bunny-Stream-Storage)

**Misure sul sistema (07/09/2026, sola lettura):** API Bunny Stream
`GET /library/{id}/videos` e `GET /library/{id}/statistics` · `HEAD` sulle
rendition e sul manifest HLS via CDN · listing della storage zone · Supabase
REST in lettura su `artists` e `artist_videos`.

**Codice:** `lib/storage/bunny/urls.ts` · `lib/upload/video-limits.ts` ·
`lib/upload/compressImage.ts` · `lib/billing/plans.ts` ·
`components/media/BunnyVideoFacade.tsx` · `components/media/BunnyOriginalPlayer.tsx` ·
`components/marketing/ArtistCard.tsx`

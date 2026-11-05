# Foto di sfondo delle intestazioni

Immagini che stanno dietro il titolo in cima a ogni pagina pubblica
(`components/marketing/PageHero.tsx`), al 20% di opacità.

Contiene le copie locali delle foto stock (Unsplash, licenza Unsplash): sono
servite dal nostro dominio perché il browser dei visitatori non contatti server
esteri. Per usare una foto vera di N'arte sovrascrivi il file con lo stesso nome,
oppure caricala da /admin/contenuti.

## Nomi file attesi

| File | Pagina |
|---|---|
| `artisti.jpg` | `/artisti` |
| `eventi.jpg` | `/eventi` |
| `format.jpg` | `/format` |
| `blog.jpg` | `/blog` |
| `help.jpg` | `/help` |
| `chi-siamo.jpg` | `/chi-siamo` |
| `collaborazioni.jpg` | `/collaborazioni` |
| `contatti.jpg` | `/contatti` |
| `prezzi.jpg` | `/prezzi` |
| `candidatura-artista.jpg` | `/candidatura-artista` |

Vanno bene anche `.jpeg`, `.webp` e `.png`: hanno la precedenza in quest'ordine.

## Formato

- **Orizzontale**, almeno **1600 px** di larghezza (meglio 2000): l'immagine
  copre tutta la fascia, e sotto i 1600 px si vede sgranata sui monitor grandi.
- JPEG o WebP, **sotto i 400 KB**. È il primo elemento che si carica sulla
  pagina: un file da 2 MB si vede arrivare.
- Il testo sta **al centro**. Tieni lì lo spazio più calmo dell'immagine e i
  soggetti ai lati, o il titolo finirà sopra una faccia.
- Foto **scure o a contrasto medio** funzionano meglio: sopra c'è una sfumatura
  che scurisce, e una foto già chiarissima diventa una macchia grigia.

L'elenco delle pagine e le foto di riserva stanno in `lib/content/hero-images.ts`.
Per aggiungere una pagina servono una voce in `HeroKey`, una in `STOCK` e la
chiamata `heroImageFor()` nella pagina.

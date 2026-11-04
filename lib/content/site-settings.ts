/**
 * Contenuti del sito modificabili da /admin/contenuti (migration 0074,
 * tabella `site_settings`).
 *
 * Ogni chiave ha qui il suo testo predefinito, che è quello che il sito
 * mostrava prima: una chiave assente in tabella (o la tabella assente) lascia
 * il sito identico. In tabella si scrive solo ciò che l'admin ha cambiato.
 *
 * Questo file non importa nulla dal server: lo usa anche il modulo admin.
 * La lettura dal database sta in lib/content/site-settings-server.ts.
 */

export type TipoContenuto = "testo" | "testo-lungo" | "url" | "telefono" | "immagine";

/** Ritaglio proposto al caricamento di una foto (vedi lib/upload/compressImage.ts). */
export type FormatoImmagine = "site_wide" | "site_square" | "site_portrait";

export type DefinizioneContenuto = {
  gruppo: string;
  etichetta: string;
  tipo: TipoContenuto;
  predefinito: string;
  max: number;
  aiuto?: string;
  /** Vuoto ammesso: l'elemento sparisce dal sito (es. un social non usato). */
  facoltativo?: boolean;
  /** Solo per `immagine`: proporzioni del ritaglio. */
  formato?: FormatoImmagine;
};

/**
 * Foto di intestazione delle pagine. Vuoto = la foto attuale
 * (lib/content/hero-images.ts), quindi nessuna pagina resta senza sfondo.
 */
const fotoIntestazione = (pagina: string) =>
  ({
    gruppo: "Foto di intestazione delle pagine",
    etichetta: pagina,
    tipo: "immagine",
    predefinito: "",
    max: 1000,
    formato: "site_wide",
    facoltativo: true,
    aiuto: "Facoltativa: se vuota resta la foto attuale. Orizzontale, almeno 2000 px di larghezza.",
  }) as const;

export const CONTENUTI = {
  "contatti.telefono": {
    gruppo: "Contatti",
    etichetta: "Telefono",
    tipo: "telefono",
    predefinito: "+39 333 586 0666",
    max: 30,
    aiuto: "Compare nel piè di pagina. Vuoto = il telefono non si mostra.",
    facoltativo: true,
  },
  "social.instagram": {
    gruppo: "Social",
    etichetta: "Instagram",
    tipo: "url",
    predefinito: "https://instagram.com/narte.official",
    max: 200,
    aiuto: "Indirizzo completo del profilo. Piè di pagina, pagina Contatti e dati per Google.",
    facoltativo: true,
  },
  "social.facebook": {
    gruppo: "Social",
    etichetta: "Facebook",
    tipo: "url",
    predefinito: "https://facebook.com/narteofficiall",
    max: 200,
    facoltativo: true,
  },
  "social.tiktok": {
    gruppo: "Social",
    etichetta: "TikTok",
    tipo: "url",
    predefinito: "",
    max: 200,
    aiuto: "Facoltativo: se vuoto non compare.",
    facoltativo: true,
  },
  "footer.descrizione": {
    gruppo: "Piè di pagina",
    etichetta: "Descrizione sotto il logo",
    tipo: "testo-lungo",
    predefinito:
      "La community degli artisti emergenti. Live music dal 2018.",
    max: 300,
  },
  "artisti.hero.descrizione": {
    gruppo: "Pagina «Sei un artista?»",
    etichetta: "Testo introduttivo",
    tipo: "testo-lungo",
    predefinito:
      "Fatti trovare da chi cerca musica dal vivo. Il profilo è gratuito e non scade: le richieste arrivano a te, senza che tu debba scrivere a nessuno.",
    max: 400,
  },
  "artisti.passi.titolo": {
    gruppo: "Pagina «Sei un artista?»",
    etichetta: "Come funziona: titolo",
    tipo: "testo",
    predefinito: "Dalla candidatura alla prima richiesta.",
    max: 120,
  },
  "artisti.passi.sottotitolo": {
    gruppo: "Pagina «Sei un artista?»",
    etichetta: "Come funziona: sottotitolo",
    tipo: "testo-lungo",
    predefinito:
      "Iscriversi non costa nulla e non chiediamo provini né contratti. Bastano quattro passaggi, e il profilo resta gratuito.",
    max: 300,
  },
  // ── Home ────────────────────────────────────────────────────────────────
  "home.hero.riga1": {
    gruppo: "Home",
    etichetta: "Titolo principale, prima riga",
    tipo: "testo",
    predefinito: "L’artista ideale",
    max: 40,
    aiuto: "Breve: su telefono ogni riga deve stare su una riga sola.",
  },
  "home.hero.riga2": {
    gruppo: "Home",
    etichetta: "Titolo principale, seconda riga (in azzurro)",
    tipo: "testo",
    predefinito: "per il tuo evento",
    max: 40,
  },
  "home.hero.sottotitolo": {
    gruppo: "Home",
    etichetta: "Frase sotto il titolo",
    tipo: "testo-lungo",
    predefinito: "Sfoglia gli artisti per genere e tipologia e contattali per la tua serata!",
    max: 200,
  },
  "home.hero.foto": {
    gruppo: "Home",
    etichetta: "Foto di sfondo in apertura",
    tipo: "immagine",
    predefinito: "/hero-concerto.webp",
    max: 1000,
    formato: "site_wide",
  },
  "home.about.titolo": {
    gruppo: "Home",
    etichetta: "«Cosa è N'arte»: titolo",
    tipo: "testo-lungo",
    predefinito: "Dal 2018 diamo palchi agli artisti e musica vera ai locali che la cercano",
    max: 160,
  },
  "home.about.testo": {
    gruppo: "Home",
    etichetta: "«Cosa è N'arte»: testo",
    tipo: "testo-lungo",
    predefinito:
      "N’arte è nata con una missione chiara: fare in modo che anche i talenti emergenti trovino un palco, aumentando la qualità dell’offerta musicale di locali e organizzazioni.",
    max: 600,
  },
  "home.about.foto": {
    gruppo: "Home",
    etichetta: "«Cosa è N'arte»: foto",
    tipo: "immagine",
    predefinito: "/hero-terrazza.webp",
    max: 1000,
    formato: "site_portrait",
  },
  // ── Chi siamo ───────────────────────────────────────────────────────────
  "chisiamo.intro": {
    gruppo: "Chi siamo",
    etichetta: "Testo in apertura",
    tipo: "testo-lungo",
    predefinito:
      "La piattaforma N’arte offre visibilità ad artisti emergenti mettendoli in contatto con gli organizzatori di eventi e locali.",
    max: 400,
  },
  "chisiamo.fondatore.foto": {
    gruppo: "Chi siamo",
    etichetta: "Foto del fondatore",
    tipo: "immagine",
    predefinito: "/brand/fondatore-eduardo.jpg",
    max: 1000,
    formato: "site_square",
  },
  "chisiamo.fondatore.nome": {
    gruppo: "Chi siamo",
    etichetta: "Nome del fondatore",
    tipo: "testo",
    predefinito: "Eduardo Castronuovo",
    max: 80,
  },
  "chisiamo.fondatore.bio": {
    gruppo: "Chi siamo",
    etichetta: "Biografia del fondatore",
    tipo: "testo-lungo",
    predefinito:
      "Giovane visionario fondatore di N’arte e presente nel settore della musica da oltre 8 anni. Eduardo ha dato la possibilità a tantissimi giovani emergenti di crescere ed esprimersi su migliaia di palchi, gestendo anche la direzione artistica di grandi eventi.",
    max: 800,
  },
  "chisiamo.tappe.titolo": {
    gruppo: "Chi siamo",
    etichetta: "Le tappe: titolo",
    tipo: "testo",
    predefinito: "Come siamo arrivati fin qui.",
    max: 80,
    aiuto: "Le tappe una per una (testi e foto) si modificano nella scheda «Tappe di Chi siamo».",
  },
  "chisiamo.tappe.sottotitolo": {
    gruppo: "Chi siamo",
    etichetta: "Le tappe: sottotitolo",
    tipo: "testo-lungo",
    predefinito: "Otto anni, una città e un mucchio di serate. Tocca una tappa per leggerne la storia.",
    max: 300,
  },
  "chisiamo.missione.titolo": {
    gruppo: "Chi siamo",
    etichetta: "La missione: titolo",
    tipo: "testo",
    predefinito: "Dare voce a chi crea cultura.",
    max: 80,
  },
  "chisiamo.missione.testo": {
    gruppo: "Chi siamo",
    etichetta: "La missione: testo",
    tipo: "testo-lungo",
    predefinito:
      "Sosteniamo musicisti, performer e creativi emergenti costruendo occasioni concrete: serate, festival, format originali. Diamo spazio, contesto e visibilità — non solo un palco.",
    max: 600,
  },
  "chisiamo.cta.titolo": {
    gruppo: "Chi siamo",
    etichetta: "Chiusura: titolo",
    tipo: "testo",
    predefinito: "Vuoi farne parte?",
    max: 80,
  },
  "chisiamo.cta.testo": {
    gruppo: "Chi siamo",
    etichetta: "Chiusura: testo",
    tipo: "testo-lungo",
    predefinito: "Sei un artista, un organizzatore o una realtà culturale? Costruiamo qualcosa insieme.",
    max: 300,
  },
  // ── Collaborazioni ──────────────────────────────────────────────────────
  "collaborazioni.intro": {
    gruppo: "Collaborazioni",
    etichetta: "Testo in apertura",
    tipo: "testo-lungo",
    predefinito:
      "Ogni serata qui sotto è nata insieme a qualcuno: un parco, un ristorante, un comune, un festival. Questo è quello che abbiamo costruito finora.",
    max: 400,
    aiuto: "I loghi che scorrono si gestiscono nella scheda «Loghi delle collaborazioni».",
  },
  // ── Kit brand ───────────────────────────────────────────────────────────
  "kitbrand.intro.organizzatore": {
    gruppo: "Kit brand",
    etichetta: "Introduzione per gli organizzatori",
    tipo: "testo-lungo",
    predefinito:
      "Loghi, colori e indicazioni per citare N'arte nelle locandine e negli annunci delle serate nate sulla piattaforma.",
    max: 300,
  },
  "kitbrand.intro.artista": {
    gruppo: "Kit brand",
    etichetta: "Introduzione per gli artisti",
    tipo: "testo-lungo",
    predefinito:
      "Loghi, colori e indicazioni per parlare di N'arte sui tuoi canali e presentarti come artista del roster.",
    max: 300,
  },
  // ── Foto di intestazione ────────────────────────────────────────────────
  "hero.artisti": fotoIntestazione("Artisti"),
  "hero.eventi": fotoIntestazione("Eventi"),
  "hero.format": fotoIntestazione("Format"),
  "hero.chi_siamo": fotoIntestazione("Chi siamo"),
  "hero.collaborazioni": fotoIntestazione("Collaborazioni"),
  "hero.blog": fotoIntestazione("Blog"),
  "hero.contatti": fotoIntestazione("Contatti"),
  "hero.prezzi": fotoIntestazione("Prezzi"),
  "hero.candidatura_artista": fotoIntestazione("Sei un artista?"),
  "hero.help": fotoIntestazione("Centro assistenza"),
} as const satisfies Record<string, DefinizioneContenuto>;

export type ChiaveContenuto = keyof typeof CONTENUTI;
export type Contenuti = Record<ChiaveContenuto, string>;

export const CHIAVI_CONTENUTI = Object.keys(CONTENUTI) as ChiaveContenuto[];

export function contenutiPredefiniti(): Contenuti {
  const out = {} as Contenuti;
  for (const k of CHIAVI_CONTENUTI) out[k] = CONTENUTI[k].predefinito;
  return out;
}

/** «+39 333 586 0666» → «tel:+393335860666». */
export function hrefTelefono(numero: string): string {
  return `tel:${numero.replace(/[^\d+]/g, "")}`;
}

/** «https://instagram.com/narte.official» → «@narte.official». */
export function handleSocial(url: string): string {
  try {
    const parte = new URL(url).pathname.split("/").filter(Boolean)[0];
    return parte ? `@${parte.replace(/^@/, "")}` : url;
  } catch {
    return url;
  }
}

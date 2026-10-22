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

export type TipoContenuto = "testo" | "testo-lungo" | "url" | "telefono";

export type DefinizioneContenuto = {
  gruppo: string;
  etichetta: string;
  tipo: TipoContenuto;
  predefinito: string;
  max: number;
  aiuto?: string;
  /** Vuoto ammesso: l'elemento sparisce dal sito (es. un social non usato). */
  facoltativo?: boolean;
};

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
      "La community napoletana degli artisti emergenti. Booking professionale di live music dal 2018.",
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
